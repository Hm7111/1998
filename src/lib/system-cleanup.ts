import { supabase } from './supabase';
import { useToast } from '../hooks/useToast';

/**
 * وظائف تنظيف النظام وتحسين الأداء
 */
export async function cleanupSystem(options = { days: 30, type: 'all' }) {
  try {
    // الحصول على توكن المصادقة
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('يجب تسجيل الدخول لتنفيذ عملية التنظيف');
    }

    // استدعاء وظيفة Edge Function للتنظيف
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-system?days=${options.days}&type=${options.type}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'فشل تنفيذ عملية التنظيف');
    }

    return await response.json();
  } catch (error) {
    console.error('Error cleaning up system:', error);
    throw error;
  }
}

/**
 * تنظيف التخزين المؤقت للتطبيق
 */
export function clearAppCache() {
  // تنظيف التخزين المحلي (مع الاحتفاظ ببعض العناصر الأساسية)
  const keysToKeep = ['theme', 'letters-system-auth'];
  
  // حفظ القيم التي نريد الاحتفاظ بها
  const savedValues = {};
  keysToKeep.forEach(key => {
    savedValues[key] = localStorage.getItem(key);
  });
  
  // مسح التخزين المحلي
  localStorage.clear();
  
  // استعادة القيم المحفوظة
  Object.entries(savedValues).forEach(([key, value]) => {
    if (value) localStorage.setItem(key, value);
  });
  
  // تنظيف ذاكرة التخزين المؤقت للجلسة
  sessionStorage.clear();
  
  // تنظيف ملفات تعريف الارتباط غير الضرورية
  const cookies = document.cookie.split(';');
  cookies.forEach(cookie => {
    const cookieName = cookie.split('=')[0].trim();
    if (!keysToKeep.includes(cookieName)) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  });
  
  return { success: true, message: 'تم تنظيف ذاكرة التخزين المؤقت بنجاح' };
}

/**
 * تنظيف الخطابات المسودة القديمة
 */
export async function cleanupDraftLetters(olderThanDays = 30) {
  try {
    // حساب التاريخ قبل X يوم
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    // حذف المسودات القديمة
    const { data, error } = await supabase
      .from('letters')
      .delete()
      .eq('status', 'draft')
      .lt('updated_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) throw error;
    
    return { 
      success: true, 
      count: data?.length || 0, 
      message: `تم حذف ${data?.length || 0} مسودة قديمة بنجاح` 
    };
  } catch (error) {
    console.error('Error cleaning up draft letters:', error);
    throw error;
  }
}

/**
 * تنظيف الإشعارات المقروءة القديمة
 */
export async function cleanupReadNotifications(olderThanDays = 30) {
  try {
    // حساب التاريخ قبل X يوم
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    // حذف الإشعارات المقروءة القديمة
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .lt('created_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) throw error;
    
    return { 
      success: true, 
      count: data?.length || 0, 
      message: `تم حذف ${data?.length || 0} إشعار مقروء قديم بنجاح` 
    };
  } catch (error) {
    console.error('Error cleaning up read notifications:', error);
    throw error;
  }
}

/**
 * تنظيف سجلات الأحداث القديمة
 */
export async function cleanupAuditLogs(olderThanDays = 90) {
  try {
    // حساب التاريخ قبل X يوم
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    // حذف سجلات الأحداث القديمة
    const { data, error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('performed_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) throw error;
    
    return { 
      success: true, 
      count: data?.length || 0, 
      message: `تم حذف ${data?.length || 0} سجل أحداث قديم بنجاح` 
    };
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    throw error;
  }
}

/**
 * تنظيف المهام المكتملة أو المرفوضة القديمة
 */
export async function cleanupCompletedTasks(olderThanDays = 90) {
  try {
    // حساب التاريخ قبل X يوم
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    // تعطيل المهام المكتملة أو المرفوضة القديمة
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_active: false })
      .in('status', ['completed', 'rejected'])
      .lt('updated_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) throw error;
    
    return { 
      success: true, 
      count: data?.length || 0, 
      message: `تم تعطيل ${data?.length || 0} مهمة مكتملة قديمة بنجاح` 
    };
  } catch (error) {
    console.error('Error cleaning up completed tasks:', error);
    throw error;
  }
}

/**
 * تنظيف شامل للنظام
 */
export async function runSystemCleanup() {
  const { toast } = useToast();
  const results = {
    draftLetters: null,
    readNotifications: null,
    auditLogs: null,
    completedTasks: null,
    appCache: null
  };
  
  try {
    // تنظيف المسودات القديمة
    results.draftLetters = await cleanupDraftLetters(30);
    
    // تنظيف الإشعارات المقروءة
    results.readNotifications = await cleanupReadNotifications(30);
    
    // تنظيف سجلات الأحداث
    results.auditLogs = await cleanupAuditLogs(90);
    
    // تنظيف المهام المكتملة
    results.completedTasks = await cleanupCompletedTasks(90);
    
    // تنظيف ذاكرة التخزين المؤقت
    results.appCache = clearAppCache();
    
    toast({
      title: 'تم التنظيف',
      description: 'تم تنظيف النظام بنجاح',
      type: 'success'
    });
    
    return results;
  } catch (error) {
    console.error('Error running system cleanup:', error);
    
    toast({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'حدث خطأ أثناء تنظيف النظام',
      type: 'error'
    });
    
    throw error;
  }
}