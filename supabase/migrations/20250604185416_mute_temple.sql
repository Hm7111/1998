/*
  # Add user_role to audit logs target types

  1. Changes
    - Modify the audit_logs_target_type_check constraint to include 'user_role'
    
  2. Purpose
    - Allow logging of user role management actions in the audit logs
    - Maintain consistent audit trail for role-based access control changes
*/

DO $$ BEGIN
  -- Drop existing constraint
  ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_target_type_check;
  
  -- Add updated constraint with user_role type
  ALTER TABLE audit_logs 
    ADD CONSTRAINT audit_logs_target_type_check 
    CHECK (target_type = ANY (ARRAY['letter'::text, 'template'::text, 'user'::text, 'system'::text, 'user_role'::text]));
END $$;