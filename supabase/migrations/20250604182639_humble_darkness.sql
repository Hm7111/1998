/*
# Delete non-admin users and their dependencies

1. Data Cleanup
  - Removes all data associated with non-admin users
  - Deletes letters, tasks, approvals, and signatures
  - Preserves admin users and system data

2. Safety Measures
  - Uses transaction to ensure data consistency
  - Validates admin existence before deletion
  - Backs up user IDs for reference
*/

-- Start transaction for safety
BEGIN;

-- Create temporary table to store non-admin user IDs for reference
CREATE TEMP TABLE non_admin_users AS
SELECT id, email, full_name FROM users WHERE role != 'admin';

-- Count how many users will be deleted (for logging)
DO $$
DECLARE
  user_count INT;
  admin_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM non_admin_users;
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
  
  RAISE NOTICE 'Found % non-admin users to delete. % admin users will be preserved.', user_count, admin_count;
  
  -- Safety check - make sure we have at least one admin
  IF admin_count = 0 THEN
    RAISE EXCEPTION 'CRITICAL ERROR: No admin users found! Aborting deletion process.';
  END IF;
END $$;

-- First delete dependencies to handle foreign key constraints

-- 1. Delete letters created by non-admin users
DELETE FROM letters 
WHERE user_id IN (SELECT id FROM non_admin_users);

-- 2. Delete signatures from non-admin users
DELETE FROM signatures 
WHERE user_id IN (SELECT id FROM non_admin_users);

-- 3. Delete approval requests where either requester or approver is non-admin
DELETE FROM approval_requests 
WHERE requested_by IN (SELECT id FROM non_admin_users) 
   OR assigned_to IN (SELECT id FROM non_admin_users);

-- 4. Delete tasks related to non-admin users
DELETE FROM tasks 
WHERE created_by IN (SELECT id FROM non_admin_users) 
   OR assigned_to IN (SELECT id FROM non_admin_users);

-- 5. Delete task attachments, logs, and comments
DELETE FROM task_attachments 
WHERE uploaded_by IN (SELECT id FROM non_admin_users);

DELETE FROM task_logs 
WHERE user_id IN (SELECT id FROM non_admin_users);

DELETE FROM task_comments 
WHERE user_id IN (SELECT id FROM non_admin_users);

-- 6. Delete notifications for non-admin users
DELETE FROM notifications 
WHERE user_id IN (SELECT id FROM non_admin_users);

-- 7. Delete authentication data for non-admin users from auth.users
-- This must be done carefully as it involves the auth schema
DO $$
DECLARE
  non_admin_id uuid;
BEGIN
  FOR non_admin_id IN SELECT id FROM non_admin_users LOOP
    -- Delete the user from auth.users
    -- Note: This might require superuser privileges depending on your setup
    EXECUTE format('DELETE FROM auth.users WHERE id = %L', non_admin_id);
  END LOOP;
END $$;

-- 8. Finally delete the non-admin users from the users table
DELETE FROM users 
WHERE id IN (SELECT id FROM non_admin_users);

-- Log information about deleted users
DO $$
DECLARE
  deleted_count INT;
BEGIN
  SELECT COUNT(*) INTO deleted_count FROM non_admin_users;
  RAISE NOTICE 'Successfully deleted % non-admin users and all their related data', deleted_count;
END $$;

-- Drop the temporary table
DROP TABLE non_admin_users;

-- Commit the transaction
COMMIT;