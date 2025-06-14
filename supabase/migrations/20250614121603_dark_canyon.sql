-- Function to get time records for a task
CREATE OR REPLACE FUNCTION get_task_time_records(p_task_id uuid)  -- Changed parameter name to p_task_id
RETURNS TABLE (
  id uuid,
  task_id uuid,
  user_id uuid,
  duration integer,
  notes text,
  created_at timestamptz,
  user_info jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has access to the task
  IF NOT EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = p_task_id  -- Updated to use p_task_id
    AND (
      t.created_by = auth.uid() 
      OR t.assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to task';
  END IF;

  RETURN QUERY
  SELECT 
    tl.id,
    tl.task_id,
    tl.user_id,
    CASE 
      WHEN tl.notes ~ '^\d+' THEN 
        CAST(SPLIT_PART(tl.notes, ' ', 1) AS INTEGER)
      ELSE 0
    END as duration,
    CASE 
      WHEN tl.notes ~ '^\d+ seconds - ' THEN 
        SUBSTRING(tl.notes FROM '\d+ seconds - (.*)$')
      WHEN tl.notes ~ '^\d+ seconds$' THEN 
        NULL
      ELSE tl.notes
    END as notes,
    tl.created_at,
    jsonb_build_object(
      'id', u.id,
      'full_name', u.full_name,
      'email', u.email,
      'role', u.role
    ) as user_info
  FROM task_logs tl
  JOIN users u ON tl.user_id = u.id
  WHERE tl.task_id = p_task_id  -- Updated to use p_task_id
  AND tl.action = 'time_record'
  ORDER BY tl.created_at DESC;
END;
$$;

-- Function to update task status
CREATE OR REPLACE FUNCTION update_task_status(
  p_task_id uuid,
  p_status task_status,
  p_completion_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_status task_status;
  updated_task jsonb;
BEGIN
  -- Check if user has permission to update the task
  IF NOT EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = p_task_id 
    AND (
      t.created_by = auth.uid() 
      OR t.assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to task';
  END IF;

  -- Get current status
  SELECT status INTO old_status FROM tasks WHERE id = p_task_id;

  -- Update the task
  UPDATE tasks 
  SET 
    status = p_status,
    completion_date = CASE 
      WHEN p_status = 'completed' THEN COALESCE(p_completion_date, NOW())
      ELSE NULL 
    END,
    updated_at = NOW()
  WHERE id = p_task_id
  RETURNING jsonb_build_object(
    'id', id,
    'status', status,
    'completion_date', completion_date,
    'updated_at', updated_at
  ) INTO updated_task;

  -- Log the status change
  INSERT INTO task_logs (task_id, user_id, action, previous_status, new_status, notes)
  VALUES (
    p_task_id, 
    auth.uid(), 
    'status_change', 
    old_status, 
    p_status,
    CASE 
      WHEN p_status = 'completed' THEN 'تم تحديد المهمة كمكتملة'
      WHEN p_status = 'in_progress' THEN 'تم بدء العمل على المهمة'
      WHEN p_status = 'rejected' THEN 'تم رفض المهمة'
      WHEN p_status = 'postponed' THEN 'تم تأجيل المهمة'
      ELSE 'تم تحديث حالة المهمة'
    END
  );

  RETURN updated_task;
END;
$$;

-- Function to add a comment to a task
CREATE OR REPLACE FUNCTION add_task_comment(
  p_task_id uuid,
  p_user_id uuid,
  p_comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  comment_record jsonb;
BEGIN
  -- Check if user has access to the task
  IF NOT EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = p_task_id 
    AND (
      t.created_by = auth.uid() 
      OR t.assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to task';
  END IF;

  -- Verify user_id matches authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID mismatch';
  END IF;

  -- Insert the comment
  INSERT INTO task_logs (task_id, user_id, action, notes)
  VALUES (p_task_id, p_user_id, 'comment', p_comment)
  RETURNING jsonb_build_object(
    'id', id,
    'task_id', task_id,
    'user_id', user_id,
    'action', action,
    'notes', notes,
    'created_at', created_at
  ) INTO comment_record;

  RETURN comment_record;
END;
$$;

-- Function to save a time record for a task
CREATE OR REPLACE FUNCTION save_task_time_record(
  p_task_id uuid,
  p_user_id uuid,
  p_duration integer,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  time_record jsonb;
  formatted_notes text;
BEGIN
  -- Check if user has access to the task
  IF NOT EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = p_task_id 
    AND (
      t.created_by = auth.uid() 
      OR t.assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to task';
  END IF;

  -- Verify user_id matches authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID mismatch';
  END IF;

  -- Format the notes with duration
  formatted_notes := p_duration::text || ' seconds';
  IF p_notes IS NOT NULL AND p_notes != '' THEN
    formatted_notes := formatted_notes || ' - ' || p_notes;
  END IF;

  -- Insert the time record
  INSERT INTO task_logs (task_id, user_id, action, notes)
  VALUES (p_task_id, p_user_id, 'time_record', formatted_notes)
  RETURNING jsonb_build_object(
    'id', id,
    'task_id', task_id,
    'user_id', user_id,
    'action', action,
    'notes', notes,
    'created_at', created_at
  ) INTO time_record;

  RETURN time_record;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_task_time_records(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_status(uuid, task_status, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION add_task_comment(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION save_task_time_record(uuid, uuid, integer, text) TO authenticated;