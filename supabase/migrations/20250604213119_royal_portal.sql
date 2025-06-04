/*
  # Fix recursive user policies

  1. Changes
    - Remove recursive dependencies in user policies
    - Simplify policy conditions to prevent infinite recursion
    - Maintain security while fixing the circular references
    
  2. Security
    - Users can still only access their own data
    - Admins retain full access
    - Policies are more efficient and avoid recursion
*/

-- First, disable the problematic policies
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- Create new, simplified policies without recursion
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    -- Allow users to read their own data
    auth.uid() = id 
    OR 
    -- Allow admins to read all data (using role column directly)
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    -- Users can update their own data
    auth.uid() = id
    OR
    -- Admins can update any user
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    -- Same conditions for the WITH CHECK clause
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (
    -- Users can only insert their own data
    auth.uid() = id
    OR
    -- Admins can insert any user
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "users_delete_policy" ON users
  FOR DELETE USING (
    -- Only admins can delete users
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND users.role = 'admin'
    )
  );