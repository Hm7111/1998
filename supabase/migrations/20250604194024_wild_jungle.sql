/*
  # تنظيف البيانات غير المستخدمة

  1. تنظيف الجداول
    - حذف السجلات غير النشطة والقديمة
    - تحسين استخدام المساحة
  
  2. تحسين الأداء
    - إضافة مؤشرات للاستعلامات الشائعة
    - تحسين بنية الجداول
*/

-- تنظيف الخطابات المسودة القديمة (أقدم من 90 يوم)
DELETE FROM public.letters
WHERE status = 'draft'
AND updated_at < NOW() - INTERVAL '90 days';

-- تعطيل المهام المكتملة أو المرفوضة القديمة (أقدم من 90 يوم)
UPDATE public.tasks
SET is_active = false
WHERE status IN ('completed', 'rejected')
AND updated_at < NOW() - INTERVAL '90 days';

-- حذف الإشعارات المقروءة القديمة (أقدم من 30 يوم)
DELETE FROM public.notifications
WHERE is_read = true
AND created_at < NOW() - INTERVAL '30 days';

-- حذف سجلات الأحداث القديمة (أقدم من 180 يوم)
DELETE FROM public.audit_logs
WHERE performed_at < NOW() - INTERVAL '180 days';

-- تحسين الاستعلامات الشائعة بإضافة مؤشرات
-- مؤشر على تاريخ آخر تحديث للخطابات
CREATE INDEX IF NOT EXISTS idx_letters_updated_at ON public.letters (updated_at);

-- مؤشر على حالة المهام وتاريخ التحديث
CREATE INDEX IF NOT EXISTS idx_tasks_status_updated_at ON public.tasks (status, updated_at);

-- مؤشر على حالة الإشعارات وتاريخ الإنشاء
CREATE INDEX IF NOT EXISTS idx_notifications_read_created_at ON public.notifications (is_read, created_at);

-- مؤشر على تاريخ تنفيذ سجلات الأحداث
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON public.audit_logs (performed_at);

-- تنظيف الجداول وإعادة تنظيم المساحة
VACUUM ANALYZE public.letters;
VACUUM ANALYZE public.tasks;
VACUUM ANALYZE public.notifications;
VACUUM ANALYZE public.audit_logs;