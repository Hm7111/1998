/*
  # Fix User and Letter Permissions

  1. User Policies
    - Drops problematic policies that might cause infinite recursion
    - Creates helper function to check if a user is an admin
    - Creates policies for user management with proper checks
    - Ensures users can only update their own basic info but not role or permissions
  
  2. Letter Permissions
    - Creates function to check if a user has specific permissions
    - Implements proper RLS policies for letters based on permissions
    - Ensures proper access control for viewing, creating, updating, and deleting letters
*/

-- First, drop any problematic policies that might be causing infinite recursion
DROP POLICY IF EXISTS "users_update_policy" ON "public"."users";
DROP POLICY IF EXISTS "admins_can_update_user_permissions" ON "public"."users";
DROP POLICY IF EXISTS "users_can_update_own_permissions" ON "public"."users";

-- Create a helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies before recreating them to avoid conflicts
DROP POLICY IF EXISTS "admins_can_update_users" ON "public"."users";
DROP POLICY IF EXISTS "users_can_update_own_basic_info" ON "public"."users";
DROP POLICY IF EXISTS "admins_can_insert_users" ON "public"."users";
DROP POLICY IF EXISTS "admins_can_delete_users" ON "public"."users";
DROP POLICY IF EXISTS "users_can_view_all_users" ON "public"."users";
DROP POLICY IF EXISTS "admins_can_update_user_permissions" ON "public"."users";

-- Create a new policy for admins to update any user
CREATE POLICY "admins_can_update_users" ON "public"."users"
FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Create a policy for users to update their own basic info (but not role or permissions)
CREATE POLICY "users_can_update_own_basic_info" ON "public"."users"
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent users from changing their own role
  role = (SELECT role FROM public.users WHERE id = auth.uid())
);

-- Create a policy for admins to insert users
CREATE POLICY "admins_can_insert_users" ON "public"."users"
FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- Create a policy for admins to delete users
CREATE POLICY "admins_can_delete_users" ON "public"."users"
FOR DELETE TO authenticated
USING (is_admin());

-- Create a policy for all authenticated users to view users
CREATE POLICY "users_can_view_all_users" ON "public"."users"
FOR SELECT TO authenticated
USING (true);

-- Create a policy for admins to update user permissions
CREATE POLICY "admins_can_update_user_permissions" ON "public"."users"
FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Make sure RLS is enabled on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Now, let's fix the letters table permissions

-- Create a function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(permission_code text)
RETURNS BOOLEAN AS $$
DECLARE
  user_role text;
  user_permissions jsonb;
BEGIN
  -- Get user role and permissions
  SELECT role, permissions INTO user_role, user_permissions 
  FROM public.users 
  WHERE id = auth.uid();
  
  -- Admins have all permissions
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if the permission is in the user's permissions array
  IF user_permissions IS NOT NULL AND jsonb_array_length(user_permissions) > 0 THEN
    -- Check direct string permissions
    FOR i IN 0..jsonb_array_length(user_permissions) - 1 LOOP
      IF jsonb_typeof(user_permissions->i) = 'string' AND 
         user_permissions->>i = permission_code THEN
        RETURN true;
      END IF;
    END LOOP;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing letter policies to recreate them
DROP POLICY IF EXISTS "users_can_create_own_letters" ON "public"."letters";
DROP POLICY IF EXISTS "users_can_delete_own_letters" ON "public"."letters";
DROP POLICY IF EXISTS "users_can_read_own_letters" ON "public"."letters";
DROP POLICY IF EXISTS "users_can_update_own_letters" ON "public"."letters";
DROP POLICY IF EXISTS "users_view_based_on_permissions" ON "public"."letters";
DROP POLICY IF EXISTS "approvers_can_view_assigned_letters" ON "public"."letters";
DROP POLICY IF EXISTS "approvers_can_update_assigned_letters" ON "public"."letters";
DROP POLICY IF EXISTS "approvers_can_view_letters_in_approval" ON "public"."letters";
DROP POLICY IF EXISTS "view_letters_policy" ON "public"."letters";
DROP POLICY IF EXISTS "create_letters_policy" ON "public"."letters";
DROP POLICY IF EXISTS "update_letters_policy" ON "public"."letters";
DROP POLICY IF EXISTS "delete_letters_policy" ON "public"."letters";

-- Create new policies for letters based on permissions

-- View letters policy
CREATE POLICY "view_letters_policy" ON "public"."letters"
FOR SELECT TO authenticated
USING (
  -- User has view:letters permission and either:
  -- 1. Has view:letters:all permission, or
  -- 2. Is the owner of the letter
  (has_permission('view:letters') AND 
   (has_permission('view:letters:all') OR user_id = auth.uid()))
  OR
  -- User is an approver for this letter
  EXISTS (
    SELECT 1 FROM approval_requests 
    WHERE approval_requests.letter_id = letters.id 
    AND approval_requests.assigned_to = auth.uid()
  )
);

-- Create letters policy
CREATE POLICY "create_letters_policy" ON "public"."letters"
FOR INSERT TO authenticated
WITH CHECK (
  has_permission('create:letters') AND auth.uid() = user_id
);

-- Update letters policy
CREATE POLICY "update_letters_policy" ON "public"."letters"
FOR UPDATE TO authenticated
USING (
  -- User has edit:letters permission and either:
  -- 1. Has edit:letters:all permission, or
  -- 2. Has edit:letters:own permission and is the owner
  (has_permission('edit:letters') AND has_permission('edit:letters:all')) OR
  (has_permission('edit:letters:own') AND user_id = auth.uid()) OR
  -- User is an approver for this letter
  EXISTS (
    SELECT 1 FROM approval_requests 
    WHERE approval_requests.letter_id = letters.id 
    AND approval_requests.assigned_to = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for check clause
  (has_permission('edit:letters') AND has_permission('edit:letters:all')) OR
  (has_permission('edit:letters:own') AND user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM approval_requests 
    WHERE approval_requests.letter_id = letters.id 
    AND approval_requests.assigned_to = auth.uid()
  )
);

-- Delete letters policy
CREATE POLICY "delete_letters_policy" ON "public"."letters"
FOR DELETE TO authenticated
USING (
  -- User has delete:letters permission and either:
  -- 1. Has delete:letters:all permission, or
  -- 2. Has delete:letters:own permission and is the owner
  (has_permission('delete:letters') AND has_permission('delete:letters:all')) OR
  (has_permission('delete:letters:own') AND user_id = auth.uid())
);

-- Make sure RLS is enabled on the letters table
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;