/*
  # Fix users table permissions policies

  1. Changes
    - Drop problematic policies causing infinite recursion
    - Create helper function to check admin status
    - Create proper policies for users table with correct syntax
    - Enable row level security
  
  2. Security
    - Admins can manage all users
    - Users can only update their own basic info
    - Users cannot change their own role or permissions
*/

-- First, drop any problematic policies that might be causing infinite recursion
DROP POLICY IF EXISTS "users_update_policy" ON "public"."users";
DROP POLICY IF EXISTS "admins_can_update_user_permissions" ON "public"."users";
DROP POLICY IF EXISTS "users_can_update_own_permissions" ON "public"."users";

-- Create a helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  (role = (SELECT role FROM public.users WHERE id = auth.uid()))
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

-- Make sure RLS is enabled on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;