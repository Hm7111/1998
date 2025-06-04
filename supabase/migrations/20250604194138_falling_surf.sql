/*
  # System Cleanup and Optimization

  1. Data Cleanup
    - Removes old draft letters (older than 90 days)
    - Deactivates completed or rejected tasks (older than 90 days)
    - Removes old read notifications (older than 30 days)
    - Removes old audit logs (older than 180 days)
  
  2. Performance Optimization
    - Adds indexes for commonly queried columns to improve query performance
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

-- ملاحظة: تم إزالة أوامر VACUUM لأنها لا يمكن تنفيذها داخل كتلة المعاملات
-- يمكن تنفيذ هذه الأوامر يدويًا بعد تطبيق الهجرة من خلال اتصال مباشر بقاعدة البيانات