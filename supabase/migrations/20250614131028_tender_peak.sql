/*
  # إزالة تتبع الوقت وتحسين وظائف المهام

  1. التغييرات
    - إزالة وظائف تتبع الوقت اليدوي
    - تحسين وظيفة تغيير حالة المهمة مع إضافة سبب
    - تبسيط وظيفة إضافة التعليقات

  2. السبب
    - تحسين الأداء وتبسيط النظام
    - التركيز على حساب الوقت بناء على تواريخ بدء وإتمام المهمة
*/

-- إزالة وظائف تتبع الوقت الزائدة
DROP FUNCTION IF EXISTS get_task_time_records(uuid);
DROP FUNCTION IF EXISTS get_task_time_records(p_task_id uuid);
DROP FUNCTION IF EXISTS save_task_time_record(uuid, uuid, integer, text);

-- تحديث وظيفة تغيير حالة المهمة لتشمل السبب
CREATE OR REPLACE FUNCTION update_task_status(
  p_task_id uuid,
  p_status task_status,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_status task_status;
  updated_task jsonb;
BEGIN
  -- التحقق من صلاحية المستخدم لتغيير حالة المهمة
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

  -- الحصول على الحالة الحالية
  SELECT status INTO old_status FROM tasks WHERE id = p_task_id;

  -- تحديث المهمة
  UPDATE tasks 
  SET 
    status = p_status,
    -- تعيين تاريخ الإكمال تلقائيًا عند اكتمال المهمة
    completion_date = CASE 
      WHEN p_status = 'completed' THEN NOW()
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

  -- تسجيل التغيير في السجل مع السبب
  INSERT INTO task_logs (task_id, user_id, action, previous_status, new_status, notes)
  VALUES (
    p_task_id, 
    auth.uid(), 
    'status_change', 
    old_status, 
    p_status,
    COALESCE(p_reason, 
      CASE 
        WHEN p_status = 'completed' THEN 'تم تحديد المهمة كمكتملة'
        WHEN p_status = 'in_progress' THEN 'تم بدء العمل على المهمة'
        WHEN p_status = 'rejected' THEN 'تم رفض المهمة'
        WHEN p_status = 'postponed' THEN 'تم تأجيل المهمة'
        ELSE 'تم تحديث حالة المهمة'
      END
    )
  );

  RETURN updated_task;
END;
$$;

-- تحسين وظيفة إضافة تعليق
CREATE OR REPLACE FUNCTION add_task_comment(
  p_task_id uuid,
  p_comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  comment_record jsonb;
BEGIN
  -- التحقق من صلاحية المستخدم للتعليق على المهمة
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

  -- إضافة التعليق
  INSERT INTO task_logs (task_id, user_id, action, notes)
  VALUES (p_task_id, auth.uid(), 'comment', p_comment)
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

-- منح صلاحيات التنفيذ للمستخدمين المسجلين
GRANT EXECUTE ON FUNCTION update_task_status(uuid, task_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION add_task_comment(uuid, text) TO authenticated;