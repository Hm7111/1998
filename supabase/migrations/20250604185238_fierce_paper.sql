/*
  # Fix audit logs RLS policy

  1. Changes
    - Update RLS policies for audit_logs table to allow system operations
    - Add policy for system-triggered audit log entries
    - Ensure admins can create audit logs

  2. Security
    - Maintains read restrictions to admin users only
    - Allows system operations to create audit logs
    - Preserves existing RLS policies
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "system_can_create_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "admins_can_create_audit_logs" ON audit_logs;

-- Create new policy to allow system operations to create audit logs
CREATE POLICY "system_can_create_audit_logs"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow admins to create audit logs explicitly
CREATE POLICY "admins_can_create_audit_logs"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);