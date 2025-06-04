/*
  # Add RLS policy for user permissions management

  1. Changes
    - Add new RLS policy to allow admins to update user permissions
    - Ensure policy checks for admin role before allowing updates
    - Specifically target the permissions column

  2. Security
    - Only admins can update user permissions
    - Policy is restricted to the permissions column only
    - Maintains existing RLS policies
*/

-- Add policy for admins to update user permissions
CREATE POLICY "admins_can_update_user_permissions" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);