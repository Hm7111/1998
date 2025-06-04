/*
  # وظيفة حذف المستخدمين غير المدراء

  1. الوظيفة
    - تقوم بحذف جميع المستخدمين غير المدراء مع بياناتهم المرتبطة
    - تحافظ على حسابات المدراء فقط
    - تحذف جميع البيانات المرتبطة بالمستخدمين (الخطابات، المهام، الموافقات، إلخ)
  
  2. الأمان
    - تتحقق من وجود مدير واحد على الأقل قبل الحذف
    - تستخدم المعاملات لضمان اتساق البيانات
    
  3. الاستخدام
    - يتم استدعاء الوظيفة باستخدام: SELECT delete_non_admin_users();
*/

-- حذف الوظيفة إذا كانت موجودة
DROP FUNCTION IF EXISTS delete_non_admin_users();

-- إنشاء وظيفة حذف المستخدمين غير المدراء
CREATE OR REPLACE FUNCTION delete_non_admin_users()
RETURNS JSONB AS $$
DECLARE
    admin_count INTEGER;
    non_admin_users JSONB;
    deleted_count INTEGER := 0;
    result JSONB;
    user_record RECORD;
BEGIN
    -- التحقق من وجود مدير واحد على الأقل
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    
    IF admin_count = 0 THEN
        RAISE EXCEPTION 'لا يمكن حذف جميع المستخدمين: لا يوجد مدراء في النظام';
    END IF;
    
    -- جمع معلومات المستخدمين غير المدراء للتقرير
    SELECT jsonb_agg(jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'full_name', u.full_name,
        'role', u.role
    ))
    INTO non_admin_users
    FROM users u
    WHERE u.role != 'admin';
    
    -- بدء معاملة لضمان اتساق البيانات
    BEGIN
        -- حذف الإشعارات المرتبطة بالمستخدمين غير المدراء
        DELETE FROM notifications
        WHERE user_id IN (SELECT id FROM users WHERE role != 'admin');
        
        -- حذف سجلات المهام ومرفقاتها
        DELETE FROM task_logs
        WHERE task_id IN (
            SELECT id FROM tasks 
            WHERE created_by IN (SELECT id FROM users WHERE role != 'admin')
        );
        
        DELETE FROM task_attachments
        WHERE task_id IN (
            SELECT id FROM tasks 
            WHERE created_by IN (SELECT id FROM users WHERE role != 'admin')
        );
        
        -- حذف المهام
        DELETE FROM tasks
        WHERE created_by IN (SELECT id FROM users WHERE role != 'admin');
        
        -- حذف سجلات الموافقات وطلبات الموافقة
        DELETE FROM approval_logs
        WHERE user_id IN (SELECT id FROM users WHERE role != 'admin');
        
        DELETE FROM approval_requests
        WHERE requested_by IN (SELECT id FROM users WHERE role != 'admin');
        
        -- حذف التوقيعات
        DELETE FROM signatures
        WHERE user_id IN (SELECT id FROM users WHERE role != 'admin');
        
        -- حذف الخطابات
        DELETE FROM letters
        WHERE user_id IN (SELECT id FROM users WHERE role != 'admin');
        
        -- حذف المستخدمين أنفسهم
        DELETE FROM users
        WHERE role != 'admin';
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        -- إنشاء تقرير بالنتائج
        result := jsonb_build_object(
            'success', true,
            'deleted_count', deleted_count,
            'deleted_users', non_admin_users
        );
        
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            -- التراجع عن التغييرات في حالة حدوث خطأ
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليق للوظيفة
COMMENT ON FUNCTION delete_non_admin_users() IS 'حذف جميع المستخدمين غير المدراء مع بياناتهم المرتبطة';