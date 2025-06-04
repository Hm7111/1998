/*
  # Fix Role Check Constraint and Permission System

  1. Adds function to get allowed roles
  2. Enhances validation for custom role permissions
  3. Adds logging for role changes and user permission updates
  4. Fixes role_check constraint
*/

-- Function to get allowed roles from the CHECK constraint
CREATE OR REPLACE FUNCTION get_allowed_roles() 
RETURNS text[] AS $$
DECLARE
    constraint_def text;
    roles text[];
BEGIN
    -- Get the constraint definition for the role check constraint
    SELECT pg_get_constraintdef(pg_constraint.oid)
    INTO constraint_def
    FROM pg_constraint
    JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
    WHERE pg_class.relname = 'users'
    AND pg_namespace.nspname = 'public'
    AND pg_constraint.conname = 'users_role_check';
    
    -- Extract role values from the constraint definition using regex
    roles := regexp_matches(constraint_def, '\(\(role = ANY \(ARRAY\[(.*?)\]\)\)\)', 'i');
    
    -- Split the comma-separated string into an array and remove quotes
    IF array_length(roles, 1) > 0 THEN
        roles := string_to_array(roles[1], ', ');
        -- Remove quotes from each item
        FOR i IN 1..array_length(roles, 1) LOOP
            roles[i] := trim(both '''' from roles[i]);
        END LOOP;
        RETURN roles;
    ELSE
        -- Return default roles if constraint not found or not in expected format
        RETURN ARRAY['admin', 'user'];
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to validate custom role permissions
CREATE OR REPLACE FUNCTION validate_custom_roles() 
RETURNS TRIGGER AS $$
DECLARE
    perm jsonb;
    role_id text;
    role_exists boolean;
BEGIN
    -- Only process if permissions is an array
    IF NEW.permissions IS NULL OR jsonb_typeof(NEW.permissions) != 'array' THEN
        RETURN NEW;
    END IF;
    
    -- Loop through each permission object
    FOR perm IN SELECT jsonb_array_elements(NEW.permissions)
    LOOP
        -- Check if it's a role type permission
        IF perm->>'type' = 'role' AND perm->>'id' IS NOT NULL THEN
            role_id := perm->>'id';
            
            -- Check if the role exists
            SELECT EXISTS(
                SELECT 1 FROM user_roles WHERE id = role_id
            ) INTO role_exists;
            
            -- If role doesn't exist, raise an error
            IF NOT role_exists THEN
                RAISE EXCEPTION 'Custom role with id % does not exist', role_id;
            END IF;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add or replace the trigger for validating custom roles
DROP TRIGGER IF EXISTS tr_validate_user_custom_roles ON users;
CREATE TRIGGER tr_validate_user_custom_roles
    BEFORE INSERT OR UPDATE OF permissions ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_custom_roles();

-- Function to log role changes
CREATE OR REPLACE FUNCTION log_role_change() 
RETURNS TRIGGER AS $$
DECLARE
    action_type text;
    changes jsonb;
BEGIN
    -- Determine the action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'create';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
    ELSE
        action_type := 'delete';
    END IF;
    
    -- Create changes JSON
    IF TG_OP = 'UPDATE' THEN
        changes := jsonb_build_object(
            'old', row_to_json(OLD)::jsonb,
            'new', row_to_json(NEW)::jsonb
        );
    ELSIF TG_OP = 'INSERT' THEN
        changes := jsonb_build_object('new', row_to_json(NEW)::jsonb);
    ELSE
        changes := jsonb_build_object('old', row_to_json(OLD)::jsonb);
    END IF;
    
    -- Log the action
    INSERT INTO audit_logs (
        action_type, 
        target_type, 
        target_id, 
        summary, 
        details, 
        performed_by, 
        user_name,
        user_role
    )
    VALUES (
        action_type,
        'role',
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'إنشاء دور جديد: ' || NEW.name
            WHEN TG_OP = 'UPDATE' THEN 'تعديل الدور: ' || NEW.name
            WHEN TG_OP = 'DELETE' THEN 'حذف الدور: ' || OLD.name
        END,
        changes,
        auth.uid(),
        (SELECT full_name FROM users WHERE id = auth.uid()),
        (SELECT role FROM users WHERE id = auth.uid())
    );
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Check for orphaned role permissions
CREATE OR REPLACE FUNCTION check_for_orphaned_roles() 
RETURNS TABLE (user_id uuid, user_name text, orphaned_role_id text) AS $$
BEGIN
    RETURN QUERY
    WITH user_roles_expanded AS (
        SELECT 
            u.id AS user_id,
            u.full_name AS user_name,
            jsonb_array_elements(u.permissions) AS permission_obj
        FROM 
            users u
        WHERE 
            u.permissions IS NOT NULL AND 
            jsonb_typeof(u.permissions) = 'array'
    )
    SELECT 
        ur.user_id,
        ur.user_name,
        (ur.permission_obj->>'id') AS orphaned_role_id
    FROM 
        user_roles_expanded ur
    WHERE 
        ur.permission_obj->>'type' = 'role' AND
        NOT EXISTS (
            SELECT 1 FROM user_roles r WHERE r.id = (ur.permission_obj->>'id')::uuid
        );
END;
$$ LANGUAGE plpgsql;

-- Function to check and fix orphaned role permissions
CREATE OR REPLACE FUNCTION fix_orphaned_role_permissions(default_role_id text DEFAULT NULL) 
RETURNS integer AS $$
DECLARE
    orphaned_rec record;
    updated_count integer := 0;
    user_permissions jsonb;
    new_permissions jsonb;
BEGIN
    FOR orphaned_rec IN SELECT * FROM check_for_orphaned_roles()
    LOOP
        -- Get current permissions for this user
        SELECT permissions INTO user_permissions 
        FROM users 
        WHERE id = orphaned_rec.user_id;
        
        -- Prepare new permissions array by filtering out the orphaned role
        SELECT jsonb_agg(perm)
        INTO new_permissions
        FROM jsonb_array_elements(user_permissions) AS perm
        WHERE perm->>'type' != 'role' OR perm->>'id' != orphaned_rec.orphaned_role_id;
        
        -- If default role provided, add it
        IF default_role_id IS NOT NULL AND default_role_id != '' THEN
            SELECT EXISTS(SELECT 1 FROM user_roles WHERE id = default_role_id::uuid) 
            INTO STRICT orphaned_rec;
            
            IF orphaned_rec THEN
                -- Get role name
                SELECT name INTO STRICT orphaned_rec.user_name
                FROM user_roles WHERE id = default_role_id::uuid;
                
                -- Add default role
                new_permissions := new_permissions || jsonb_build_array(
                    jsonb_build_object(
                        'type', 'role',
                        'id', default_role_id,
                        'name', orphaned_rec.user_name
                    )
                );
            END IF;
        END IF;
        
        -- Update user permissions
        UPDATE users
        SET permissions = COALESCE(new_permissions, '[]'::jsonb)
        WHERE id = orphaned_rec.user_id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for the user_roles table
DROP TRIGGER IF EXISTS tr_log_role_changes ON user_roles;
CREATE TRIGGER tr_log_role_changes
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION log_role_change();