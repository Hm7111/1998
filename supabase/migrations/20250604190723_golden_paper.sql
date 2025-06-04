/*
  # Add 'role' to audit_logs target_type check constraint

  1. Changes
    - Update the CHECK constraint on audit_logs.target_type to include 'role'
    - This allows audit logging for role management operations

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

DO $$ 
BEGIN
  -- Drop existing constraint
  ALTER TABLE audit_logs 
  DROP CONSTRAINT IF EXISTS audit_logs_target_type_check;

  -- Add updated constraint with 'role' as valid target_type
  ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_target_type_check 
  CHECK (target_type = ANY (ARRAY['letter'::text, 'template'::text, 'user'::text, 'system'::text, 'role'::text]));
END $$;