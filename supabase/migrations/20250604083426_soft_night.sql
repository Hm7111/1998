/*
# Add RLS policies for tasks table

1. New Tables
   - No new tables are created in this migration

2. Security
   - Enable Row Level Security on tasks table
   - Add policies for authenticated users to manage tasks
   - Add policies for task creators and assignees

3. Changes
   - Add RLS policies to allow proper access to tasks
*/

-- Enable RLS on tasks table if not already enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy for admins to see all tasks
CREATE POLICY "Admins can see all tasks" 
ON tasks 
FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Policy for users to see tasks they created or are assigned to
CREATE POLICY "Users can see their own tasks" 
ON tasks 
FOR SELECT 
TO authenticated 
USING (
  created_by = auth.uid() OR 
  assigned_to = auth.uid() OR
  auth.uid() = ANY(assignees)
);

-- Policy for users to create tasks
CREATE POLICY "Users can create tasks" 
ON tasks 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = created_by
);

-- Policy for users to update tasks they created
CREATE POLICY "Users can update tasks they created" 
ON tasks 
FOR UPDATE 
TO authenticated 
USING (
  created_by = auth.uid()
);

-- Policy for assignees to update their assigned tasks
CREATE POLICY "Assignees can update their tasks" 
ON tasks 
FOR UPDATE 
TO authenticated 
USING (
  assigned_to = auth.uid() OR
  auth.uid() = ANY(assignees)
);

-- Policy for users to delete tasks they created
CREATE POLICY "Users can delete tasks they created" 
ON tasks 
FOR DELETE 
TO authenticated 
USING (
  created_by = auth.uid()
);

-- Policy for admins to manage all tasks
CREATE POLICY "Admins can manage all tasks" 
ON tasks 
FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Add RLS policies for task_logs table
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;

-- Policy for users to see logs of tasks they created or are assigned to
CREATE POLICY "Users can see logs of their tasks" 
ON task_logs 
FOR SELECT 
TO authenticated 
USING (
  task_id IN (
    SELECT id FROM tasks 
    WHERE created_by = auth.uid() OR assigned_to = auth.uid() OR auth.uid() = ANY(assignees)
  )
);

-- Policy for users to create logs
CREATE POLICY "Users can create task logs" 
ON task_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (
  user_id = auth.uid() AND
  task_id IN (
    SELECT id FROM tasks 
    WHERE created_by = auth.uid() OR assigned_to = auth.uid() OR auth.uid() = ANY(assignees)
  )
);

-- Add RLS policies for task_attachments table
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Policy for users to see attachments of tasks they created or are assigned to
CREATE POLICY "Users can see attachments of their tasks" 
ON task_attachments 
FOR SELECT 
TO authenticated 
USING (
  task_id IN (
    SELECT id FROM tasks 
    WHERE created_by = auth.uid() OR assigned_to = auth.uid() OR auth.uid() = ANY(assignees)
  )
);

-- Policy for users to add attachments to their tasks
CREATE POLICY "Users can add attachments to their tasks" 
ON task_attachments 
FOR INSERT 
TO authenticated 
WITH CHECK (
  uploaded_by = auth.uid() AND
  task_id IN (
    SELECT id FROM tasks 
    WHERE created_by = auth.uid() OR assigned_to = auth.uid() OR auth.uid() = ANY(assignees)
  )
);

-- Policy for users to delete their own attachments
CREATE POLICY "Users can delete their own attachments" 
ON task_attachments 
FOR DELETE 
TO authenticated 
USING (
  uploaded_by = auth.uid()
);

-- Add RLS policies for task_comments table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_comments') THEN
    EXECUTE 'ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Users can see comments of their tasks" 
    ON task_comments 
    FOR SELECT 
    TO authenticated 
    USING (
      task_id IN (
        SELECT id FROM tasks 
        WHERE created_by = auth.uid() OR assigned_to = auth.uid() OR auth.uid() = ANY(assignees)
      )
    )';
    
    EXECUTE 'CREATE POLICY "Users can add comments to their tasks" 
    ON task_comments 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
      user_id = auth.uid() AND
      task_id IN (
        SELECT id FROM tasks 
        WHERE created_by = auth.uid() OR assigned_to = auth.uid() OR auth.uid() = ANY(assignees)
      )
    )';
  END IF;
END $$;

-- Add RLS policies for task_notifications table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_notifications') THEN
    EXECUTE 'ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Users can see their own notifications" 
    ON task_notifications 
    FOR SELECT 
    TO authenticated 
    USING (
      user_id = auth.uid()
    )';
    
    EXECUTE 'CREATE POLICY "Users can update their own notifications" 
    ON task_notifications 
    FOR UPDATE 
    TO authenticated 
    USING (
      user_id = auth.uid()
    )';
  END IF;
END $$;