/*
  # حذف جميع المستخدمين غير المدراء مع بياناتهم

  1. الوظيفة
    - إنشاء وظيفة `delete_non_admin_users()` لحذف جميع المستخدمين غير المدراء
    - حذف جميع البيانات المرتبطة بهم (الخطابات، المهام، الموافقات، إلخ)
    - التأكد من وجود مدير واحد على الأقل قبل الحذف
  
  2. الأمان
    - استخدام المعاملات (transactions) لضمان اتساق البيانات
    - التحقق من وجود مدراء قبل الحذف
    - تسجيل المستخدمين المحذوفين
*/

-- إنشاء وظيفة لحذف جميع المستخدمين غير المدراء مع بياناتهم
CREATE OR REPLACE FUNCTION delete_non_admin_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_count INTEGER;
    deleted_users JSONB := '[]';
    user_record RECORD;
    deleted_count INTEGER := 0;
    deleted_letters INTEGER := 0;
    deleted_tasks INTEGER := 0;
    deleted_approvals INTEGER := 0;
    deleted_signatures INTEGER := 0;
    deleted_notifications INTEGER := 0;
BEGIN
    -- التحقق من وجود مدير واحد على الأقل
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    
    IF admin_count = 0 THEN
        RAISE EXCEPTION 'لا يمكن حذف جميع المستخدمين: لا يوجد مدراء في النظام';
    END IF;

    -- بدء المعاملة
    BEGIN
        -- جمع معلومات المستخدمين غير المدراء قبل الحذف
        FOR user_record IN SELECT id, email, full_name FROM users WHERE role != 'admin' LOOP
            deleted_users := deleted_users || jsonb_build_object(
                'id', user_record.id,
                'email', user_record.email,
                'full_name', user_record.full_name
            );
        END LOOP;

        -- حذف الإشعارات المرتبطة بالمستخدمين غير المدراء
        WITH deleted_rows AS (
            DELETE FROM notifications
            WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')
            RETURNING id
        )
        SELECT COUNT(*) INTO deleted_notifications FROM deleted_rows;

        -- حذف سجلات المهام المرتبطة بالمستخدمين غير المدراء
        DELETE FROM task_logs
        WHERE user_id IN (SELECT id FROM users WHERE role != 'admin');

        -- حذف مرفقات المهام المرتبطة بالمستخدمين غير المدراء
        DELETE FROM task_attachments
        WHERE uploaded_by IN (SELECT id FROM users WHERE role != 'admin')
        OR task_id IN (SELECT id FROM tasks WHERE created_by IN (SELECT id FROM users WHERE role != 'admin'));

        -- حذف المهام المرتبطة بالمستخدمين غير المدراء
        WITH deleted_rows AS (
            DELETE FROM tasks
            WHERE created_by IN (SELECT id FROM users WHERE role != 'admin')
            OR assigned_to IN (SELECT id FROM users WHERE role != 'admin')
            RETURNING id
        )
        SELECT COUNT(*) INTO deleted_tasks FROM deleted_rows;

        -- حذف سجلات الموافقات المرتبطة بالمستخدمين غير المدراء
        DELETE FROM approval_logs
        WHERE user_id IN (SELECT id FROM users WHERE role != 'admin');

        -- حذف طلبات الموافقة المرتبطة بالمستخدمين غير المدراء
        WITH deleted_rows AS (
            DELETE FROM approval_requests
            WHERE requested_by IN (SELECT id FROM users WHERE role != 'admin')
            OR assigned_to IN (SELECT id FROM users WHERE role != 'admin')
            RETURNING id
        )
        SELECT COUNT(*) INTO deleted_approvals FROM deleted_rows;

        -- حذف التوقيعات المرتبطة بالمستخدمين غير المدراء
        WITH deleted_rows AS (
            DELETE FROM signatures
            WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')
            RETURNING id
        )
        SELECT COUNT(*) INTO deleted_signatures FROM deleted_rows;

        -- حذف الخطابات المرتبطة بالمستخدمين غير المدراء
        WITH deleted_rows AS (
            DELETE FROM letters
            WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')
            RETURNING id
        )
        SELECT COUNT(*) INTO deleted_letters FROM deleted_rows;

        -- حذف المستخدمين غير المدراء
        WITH deleted_rows AS (
            DELETE FROM users
            WHERE role != 'admin'
            RETURNING id
        )
        SELECT COUNT(*) INTO deleted_count FROM deleted_rows;

        -- إرجاع ملخص العملية
        RETURN jsonb_build_object(
            'success', TRUE,
            'deleted_users_count', deleted_count,
            'deleted_users', deleted_users,
            'deleted_letters', deleted_letters,
            'deleted_tasks', deleted_tasks,
            'deleted_approvals', deleted_approvals,
            'deleted_signatures', deleted_signatures,
            'deleted_notifications', deleted_notifications
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- التراجع عن المعاملة في حالة حدوث خطأ
            RAISE;
    END;
END;
$$;

-- تنفيذ الوظيفة لحذف المستخدمين غير المدراء
SELECT delete_non_admin_users();

-- إضافة تعليق للوظيفة
COMMENT ON FUNCTION delete_non_admin_users() IS 'حذف جميع المستخدمين غير المدراء مع جميع بياناتهم المرتبطة مثل الخطابات والمهام وطلبات الموافقة';