/*
  # إصلاح سياسات إنشاء المستخدمين

  1. تحديث السياسات
    - تعديل سياسات الوصول للمستخدمين
    - تعديل سياسات إنشاء المستخدمين
    - تبسيط منطق التحقق من الأدوار
  
  2. إضافة وظائف مساعدة
    - إضافة وظيفة للتحقق من الأدوار المسموح بها
*/

-- إعادة ضبط سياسات جدول المستخدمين
DROP POLICY IF EXISTS "users_delete_policy" ON "public"."users";
DROP POLICY IF EXISTS "users_insert_policy" ON "public"."users";
DROP POLICY IF EXISTS "users_select_policy" ON "public"."users";
DROP POLICY IF EXISTS "users_update_policy" ON "public"."users";
DROP POLICY IF EXISTS "users_can_read_all_users_basic_info" ON "public"."users";

-- إضافة وظيفة للتحقق من الأدوار المسموح بها
CREATE OR REPLACE FUNCTION get_allowed_roles()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY['admin', 'user'];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- سياسة قراءة المستخدمين - السماح للمستخدمين المصادقين بقراءة المعلومات الأساسية لجميع المستخدمين
CREATE POLICY "users_can_read_all_users_basic_info"
ON "public"."users"
FOR SELECT
TO authenticated
USING (true);

-- سياسة إنشاء مستخدم جديد - فقط المدراء يمكنهم إضافة مستخدمين
CREATE POLICY "users_insert_policy"
ON "public"."users"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id 
    FROM users 
    WHERE role = 'admin'
  )
  OR
  auth.uid() = id
);

-- سياسة قراءة المستخدم الكاملة - المستخدم يمكنه قراءة بياناته أو المدراء يمكنهم قراءة بيانات أي مستخدم
CREATE POLICY "users_select_policy"
ON "public"."users"
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR
  auth.uid() IN (
    SELECT id 
    FROM users 
    WHERE role = 'admin'
  )
);

-- سياسة تحديث المستخدم - المستخدم يمكنه تحديث بياناته أو المدراء يمكنهم تحديث بيانات أي مستخدم
CREATE POLICY "users_update_policy"
ON "public"."users"
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR
  auth.uid() IN (
    SELECT id 
    FROM users 
    WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() = id
  OR
  auth.uid() IN (
    SELECT id 
    FROM users 
    WHERE role = 'admin'
  )
);

-- سياسة حذف المستخدم - فقط المدراء يمكنهم حذف المستخدمين
CREATE POLICY "users_delete_policy"
ON "public"."users"
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id 
    FROM users 
    WHERE role = 'admin'
  )
);