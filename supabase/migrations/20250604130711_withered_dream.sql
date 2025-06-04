/*
  # تحديث نظام الأدوار والصلاحيات

  1. النظام الجديد
    - تعديل نظام الأدوار لدعم ربط المستخدمين بأدوار مخصصة
    - الاحتفاظ بالدور الأساسي (admin/user) مع دعم أدوار إضافية
    - تحسين التكامل بين نظام الأدوار والمستخدمين

  2. التغييرات
    - تعديل حقل permissions في جدول المستخدمين ليكون أكثر مرونة
    - إضافة تدقيق لضمان عدم تعيين دور محذوف للمستخدمين
    - إضافة سجلات للتغييرات على الأدوار
*/

-- تأكد من أن حقل permissions في جدول المستخدمين يقبل JSONB
-- هذا يسمح بتخزين معلومات الدور المخصص
ALTER TABLE users ALTER COLUMN permissions TYPE JSONB USING permissions::JSONB;

-- إضافة دالة وظيفية لتسجيل التغييرات على الأدوار
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    action_type,
    target_type,
    target_id,
    summary,
    details,
    performed_by,
    user_name,
    user_role
  )
  VALUES (
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'delete'
      ELSE NULL
    END,
    'role',
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'إنشاء دور جديد: ' || NEW.name
      WHEN TG_OP = 'UPDATE' THEN 'تحديث الدور: ' || NEW.name
      WHEN TG_OP = 'DELETE' THEN 'حذف الدور: ' || OLD.name
      ELSE NULL
    END,
    CASE
      WHEN TG_OP = 'INSERT' THEN jsonb_build_object(
        'role_name', NEW.name,
        'role_description', NEW.description,
        'permissions', NEW.permissions
      )
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'old', jsonb_build_object(
          'role_name', OLD.name,
          'role_description', OLD.description,
          'permissions', OLD.permissions
        ),
        'new', jsonb_build_object(
          'role_name', NEW.name,
          'role_description', NEW.description,
          'permissions', NEW.permissions
        )
      )
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object(
        'role_name', OLD.name,
        'role_description', OLD.description,
        'permissions', OLD.permissions
      )
      ELSE NULL
    END,
    auth.uid(),
    (SELECT full_name FROM users WHERE id = auth.uid()),
    (SELECT role FROM users WHERE id = auth.uid())
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة محفز لتسجيل التغييرات على الأدوار
DROP TRIGGER IF EXISTS tr_log_role_changes ON user_roles;
CREATE TRIGGER tr_log_role_changes
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION log_role_change();

-- إضافة دالة للتحقق من صحة الأدوار المخصصة
CREATE OR REPLACE FUNCTION validate_custom_roles()
RETURNS TRIGGER AS $$
DECLARE
  perm_obj JSONB;
  role_id TEXT;
  role_exists BOOLEAN;
BEGIN
  -- تحقق فقط إذا كان حقل permissions غير فارغ
  IF NEW.permissions IS NOT NULL AND jsonb_array_length(NEW.permissions) > 0 THEN
    -- المرور على كل عنصر في مصفوفة permissions
    FOR i IN 0..jsonb_array_length(NEW.permissions) - 1 LOOP
      perm_obj := NEW.permissions->i;
      
      -- إذا كان هذا العنصر دوراً مخصصاً، تحقق من وجوده
      IF perm_obj->>'type' = 'role' AND perm_obj->>'id' IS NOT NULL THEN
        role_id := perm_obj->>'id';
        
        -- التحقق من وجود الدور
        SELECT EXISTS (
          SELECT 1 FROM user_roles WHERE id = role_id
        ) INTO role_exists;
        
        -- إذا لم يكن الدور موجوداً، قم بإزالته من المصفوفة
        IF NOT role_exists THEN
          RAISE WARNING 'Removing non-existent role with ID % from user %', role_id, NEW.id;
          -- إزالة الدور غير الموجود من المصفوفة
          NEW.permissions := NEW.permissions - i;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة محفز للتحقق من صحة الأدوار المخصصة عند تحديث المستخدمين
DROP TRIGGER IF EXISTS tr_validate_user_custom_roles ON users;
CREATE TRIGGER tr_validate_user_custom_roles
BEFORE UPDATE OF permissions ON users
FOR EACH ROW
EXECUTE FUNCTION validate_custom_roles();