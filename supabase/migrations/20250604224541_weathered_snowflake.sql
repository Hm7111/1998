/*
  # Fix Letter Permissions System

  1. New Functions
    - Create a more robust has_permission function to check user permissions
    - Add helper function to check if user has any permission from a list
  
  2. Security
    - Update letter policies to properly enforce permissions
    - Ensure consistent permission checks across all operations
    - Fix permission inheritance for own vs all access
  
  3. Changes
    - Drop and recreate letter policies with proper permission checks
    - Ensure proper RLS enforcement
*/

-- First, create an improved has_permission function
CREATE OR REPLACE FUNCTION has_permission(permission_code text)
RETURNS BOOLEAN AS $$
DECLARE
  user_role text;
  user_permissions jsonb;
  perm_item jsonb;
  role_perms jsonb;
  role_item jsonb;
  i integer;
  j integer;
BEGIN
  -- Get user role and permissions
  SELECT role, permissions INTO user_role, user_permissions 
  FROM public.users 
  WHERE id = auth.uid();
  
  -- Admins have all permissions
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check direct string permissions
  IF user_permissions IS NOT NULL AND jsonb_array_length(user_permissions) > 0 THEN
    -- Check direct string permissions
    FOR i IN 0..jsonb_array_length(user_permissions) - 1 LOOP
      IF jsonb_typeof(user_permissions->i) = 'string' AND 
         user_permissions->>i = permission_code THEN
        RETURN true;
      END IF;
      
      -- Check if this is a role object with permissions
      IF jsonb_typeof(user_permissions->i) = 'object' AND 
         user_permissions->i->>'type' = 'role' AND
         user_permissions->i->>'id' IS NOT NULL THEN
         
        -- Get the role's permissions
        SELECT permissions INTO role_perms
        FROM public.user_roles
        WHERE id = (user_permissions->i->>'id')::uuid;
        
        -- Check if the role has the permission
        IF role_perms IS NOT NULL AND jsonb_array_length(role_perms) > 0 THEN
          FOR j IN 0..jsonb_array_length(role_perms) - 1 LOOP
            IF role_perms->>j = permission_code THEN
              RETURN true;
            END IF;
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user has any of the specified permissions
CREATE OR REPLACE FUNCTION has_any_permission(permission_codes text[])
RETURNS BOOLEAN AS $$
DECLARE
  perm text;
BEGIN
  FOREACH perm IN ARRAY permission_codes LOOP
    IF has_permission(perm) THEN
      RETURN true;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing letter policies to recreate them
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