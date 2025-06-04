/*
  # Fix for User Roles System and Permissions Column

  1. Changes
    - Update permissions column to JSONB type with proper handling of dependent policies
    - Add role change logging functionality
    - Add validation for custom roles

  2. Security
    - Maintains existing policy-based security
    - Adds proper validation for role assignments
*/

-- First disable the existing policy that depends on permissions column
DROP POLICY IF EXISTS users_view_based_on_permissions ON tasks;

-- Now safely alter the permissions column
DO $$
BEGIN
  -- Check if permissions is already JSONB
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'permissions') != 'jsonb' THEN
    
    -- Alter the permissions column type
    ALTER TABLE users 
    ALTER COLUMN permissions TYPE JSONB USING 
      CASE 
        WHEN permissions IS NULL THEN '[]'::JSONB
        WHEN permissions::TEXT = '' THEN '[]'::JSONB
        ELSE permissions::JSONB
      END;
  END IF;
END;
$$;

-- Recreate the policy with updated references to the permissions column
CREATE POLICY users_view_based_on_permissions 
  ON tasks 
  USING ((EXISTS ( SELECT 1
    FROM users
    WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))) OR 
  (EXISTS ( SELECT 1
    FROM users
    WHERE ((users.id = auth.uid()) AND (jsonb_path_exists(users.permissions, '$[*] ? (@.code == "view:tasks:all")')
      OR jsonb_path_exists(users.permissions, '$[*] ? (@.type == "role")')))
  )) OR (created_by = auth.uid()) OR (assigned_to = auth.uid()));

-- Add function to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
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
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'delete'
      ELSE NULL
    END,
    'role',
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'إنشاء دور جديد: ' || NEW.name
      WHEN TG_OP = 'UPDATE' THEN 'تحديث الدور: ' || NEW.name
      WHEN TG_OP = 'DELETE' THEN 'حذف الدور: ' || OLD.name
      ELSE NULL
    END,
    CASE
      WHEN TG_OP = 'INSERT' THEN jsonb_build_object(
        'role_name', NEW.name,
        'role_description', NEW.description,
        'permissions', NEW.permissions
      )
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'old', jsonb_build_object(
          'role_name', OLD.name,
          'role_description', OLD.description,
          'permissions', OLD.permissions
        ),
        'new', jsonb_build_object(
          'role_name', NEW.name,
          'role_description', NEW.description,
          'permissions', NEW.permissions
        )
      )
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object(
        'role_name', OLD.name,
        'role_description', OLD.description,
        'permissions', OLD.permissions
      )
      ELSE NULL
    END,
    auth.uid(),
    (SELECT full_name FROM users WHERE id = auth.uid()),
    (SELECT role FROM users WHERE id = auth.uid())
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add role change trigger
DROP TRIGGER IF EXISTS tr_log_role_changes ON user_roles;
CREATE TRIGGER tr_log_role_changes
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION log_role_change();

-- Add function to validate custom roles
CREATE OR REPLACE FUNCTION validate_custom_roles()
RETURNS TRIGGER AS $$
DECLARE
  role_items JSONB;
  role_item JSONB;
  role_id TEXT;
  role_exists BOOLEAN;
  i INTEGER;
BEGIN
  -- Only check if permissions field is not null and is an array
  IF NEW.permissions IS NOT NULL AND jsonb_typeof(NEW.permissions) = 'array' THEN
    role_items := '[]'::JSONB;
    
    -- Loop through all items
    FOR i IN 0..jsonb_array_length(NEW.permissions)-1 LOOP
      role_item := NEW.permissions->i;
      
      -- Check if this is a role type permission
      IF jsonb_typeof(role_item) = 'object' AND 
         role_item->>'type' = 'role' AND 
         role_item->>'id' IS NOT NULL THEN
        
        role_id := role_item->>'id';
        
        -- Check if role exists
        SELECT EXISTS (
          SELECT 1 FROM user_roles WHERE id = role_id
        ) INTO role_exists;
        
        -- If role doesn't exist, remove it
        IF NOT role_exists THEN
          RAISE WARNING 'Removing non-existent role with ID % from user %', role_id, NEW.id;
          -- Skip this role in the final array
        ELSE
          -- Keep this valid role
          role_items := role_items || role_item;
        END IF;
      ELSE
        -- Not a role type permission, keep it
        role_items := role_items || role_item;
      END IF;
    END LOOP;
    
    -- Update permissions with filtered array
    NEW.permissions := role_items;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate custom roles
DROP TRIGGER IF EXISTS tr_validate_user_custom_roles ON users;
CREATE TRIGGER tr_validate_user_custom_roles
BEFORE UPDATE OF permissions ON users
FOR EACH ROW
EXECUTE FUNCTION validate_custom_roles();