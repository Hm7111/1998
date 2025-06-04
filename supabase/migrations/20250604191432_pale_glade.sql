/*
  # Add 'role' to audit_logs target_type constraint

  1. Changes
    - Drops the existing constraint on audit_logs.target_type
    - Creates a new constraint that includes 'role' as a valid target type
  
  This migration allows the audit logging system to properly record role management operations.
*/

-- Drop the existing constraint
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_target_type_check;

-- Create a new constraint with 'role' added to the valid target types
ALTER TABLE public.audit_logs 
  ADD CONSTRAINT audit_logs_target_type_check 
  CHECK (target_type = ANY (ARRAY['letter'::text, 'template'::text, 'user'::text, 'system'::text, 'role'::text]));