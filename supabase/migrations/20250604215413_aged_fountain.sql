/*
  # Fix infinite recursion in users RLS policies

  1. Changes
    - Add is_admin() security definer function
    - Update users table RLS policies to use the function
    - Remove recursive policy checks
  
  2. Security
    - Function runs with definer's privileges
    - Policies updated to prevent infinite recursion
    - Maintains existing access control logic
*/

-- Create is_admin function as SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
DROP POLICY IF EXISTS "users_can_read_all_users_basic_info" ON public.users;
DROP POLICY IF EXISTS "admins_can_update_user_permissions" ON public.users;

-- Recreate policies without recursion
CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = id OR is_admin()
);

CREATE POLICY "users_select_policy" ON public.users
FOR SELECT
TO public
USING (
  auth.uid() = id OR is_admin()
);

CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE
TO public
USING (
  auth.uid() = id OR is_admin()
)
WITH CHECK (
  auth.uid() = id OR is_admin()
);

CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE
TO public
USING (
  is_admin()
);

-- Policy for reading basic user info (non-sensitive data)
CREATE POLICY "users_can_read_all_users_basic_info" ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Policy for admins to update user permissions
CREATE POLICY "admins_can_update_user_permissions" ON public.users
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());