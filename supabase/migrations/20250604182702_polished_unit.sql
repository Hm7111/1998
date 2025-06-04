/*
# Create stored procedure to delete non-admin users

1. Function Details
  - Creates a reusable function to delete non-admin users
  - Handles all dependencies in proper order
  - Can be called from SQL or application code

2. Usage
  - Call with: SELECT delete_non_admin_users();
*/

-- Create function to delete non-admin users and their dependencies
CREATE OR REPLACE FUNCTION delete_non_admin_users() 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count INT;
  admin_count INT;
  deleted_count INT;
BEGIN
  -- Create temporary table to store non-admin user IDs
  CREATE TEMP TABLE temp_non_admin_users AS
  SELECT id, email, full_name FROM users WHERE role != 'admin';
  
  -- Count users for logging
  SELECT COUNT(*) INTO user_count FROM temp_non_admin_users;
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
  
  -- Safety check - make sure we have at least one admin
  IF admin_count = 0 THEN
    RAISE EXCEPTION 'CRITICAL ERROR: No admin users found! Aborting deletion process.';
  END IF;
  
  -- Delete letter-related dependencies
  DELETE FROM letters WHERE user_id IN (SELECT id FROM temp_non_admin_users);
  
  -- Delete signatures
  DELETE FROM signatures WHERE user_id IN (SELECT id FROM temp_non_admin_users);
  
  -- Delete approval-related dependencies
  DELETE FROM approval_logs 
  WHERE user_id IN (SELECT id FROM temp_non_admin_users);
  
  DELETE FROM approval_requests 
  WHERE requested_by IN (SELECT id FROM temp_non_admin_users) 
     OR assigned_to IN (SELECT id FROM temp_non_admin_users);
  
  -- Delete task-related dependencies
  DELETE FROM task_attachments 
  WHERE uploaded_by IN (SELECT id FROM temp_non_admin_users);
  
  DELETE FROM task_logs 
  WHERE user_id IN (SELECT id FROM temp_non_admin_users);
  
  -- Delete tasks
  DELETE FROM tasks 
  WHERE created_by IN (SELECT id FROM temp_non_admin_users) 
     OR assigned_to IN (SELECT id FROM temp_non_admin_users);
  
  -- Delete notifications
  DELETE FROM notifications 
  WHERE user_id IN (SELECT id FROM temp_non_admin_users);
  
  -- Delete the non-admin users
  DELETE FROM users WHERE id IN (SELECT id FROM temp_non_admin_users);
  
  -- Get the count of deleted users
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up temp table
  DROP TABLE temp_non_admin_users;
  
  -- Return success
  RETURN TRUE;
END;
$$;

-- Create function to get allowed roles from check constraint
CREATE OR REPLACE FUNCTION get_allowed_roles()
RETURNS text[]
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  constraint_def text;
  roles_array text[];
BEGIN
  -- Get the definition of the check constraint for the role column
  SELECT pg_get_constraintdef(c.oid)
  INTO constraint_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE t.relname = 'users'
    AND n.nspname = 'public'
    AND c.conname = 'users_role_check';

  -- Extract the allowed roles from the constraint definition
  -- The constraint will be like: CHECK ((role = ANY (ARRAY['admin'::text, 'user'::text])))
  -- We need to extract the array part
  SELECT regexp_matches(constraint_def, 'ANY \(ARRAY\[(.*?)\]\)') INTO roles_array;
  
  -- Clean up the extracted string to get an array of role values
  IF roles_array IS NULL OR array_length(roles_array, 1) = 0 THEN
    -- Fallback to default roles if we can't parse the constraint
    RETURN ARRAY['admin', 'user'];
  ELSE
    -- Extract the role values using regexp
    SELECT ARRAY(
      SELECT trim(both '''' from r)
      FROM regexp_split_to_table(
        regexp_replace(roles_array[1], '::text', '', 'g'),  -- Remove ::text
        ','
      ) AS r
    ) INTO roles_array;
    
    -- Return the cleaned array
    RETURN roles_array;
  END IF;
END;
$$;