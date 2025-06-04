import { useState } from 'react';
import { Trash2, RefreshCw, CheckCircle, AlertCircle, Clock, Calendar, FileText, Bell, History } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { cleanupSystem, clearAppCache, cleanupDraftLetters, cleanupReadNotifications, cleanupAuditLogs, cleanupCompletedTasks } from '../../../lib/system-cleanup';

export function SystemCleanup() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [daysThreshold, setDaysThreshold] = useState(30);

  if (!isAdmin) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-8 rounded-lg shadow text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
        <p>هذه الصفحة متاحة فقط للمدراء.</p>
      </div>
    );
  }

  // تنظيف المسودات القديمة
  const handleCleanupDrafts = async () => {
    if (!confirm('هل أنت متأكد من حذف المسودات القديمة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    setIsLoading(prev => ({ ...prev, drafts: true }));
    try {
      const result = await cleanupDraftLetters(daysThreshold);
      setResults(prev => ({ ...prev, drafts: result }));
      
      toast({
        title: 'تم التنظيف',
        description: result.message,
        type: 'success'
      });
    } catch (error) {
      console.error('Error cleaning up drafts:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تنظيف المسودات',
        type: 'error'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, drafts: false }));
    }
  };

  // تنظيف الإشعارات المقروءة
  const handleCleanupNotifications = async () => {
    if (!confirm('هل أنت متأكد من حذف الإشعارات المقروءة القديمة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    setIsLoading(prev => ({ ...prev, notifications: true }));
    try {
      const result = await cleanupReadNotifications(daysThreshold);
      setResults(prev => ({ ...prev, notifications: result }));
      
      toast({
        title: 'تم التنظيف',
        description: result.message,
        type: 'success'
      });
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تنظيف الإشعارات',
        type: 'error'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, notifications: false }));
    }
  };

  // تنظيف سجلات الأحداث
  const handleCleanupAuditLogs = async () => {
    if (!confirm('هل أنت متأكد من حذف سجلات الأحداث القديمة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    setIsLoading(prev => ({ ...prev, auditLogs: true }));
    try {
      const result = await cleanupAuditLogs(90); // سجلات أقدم من 90 يوم
      setResults(prev => ({ ...prev, auditLogs: result }));
      
      toast({
        title: 'تم التنظيف',
        description: result.message,
        type: 'success'
      });
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تنظيف سجلات الأحداث',
        type: 'error'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, auditLogs: false }));
    }
  };

  // تنظيف المهام المكتملة
  const handleCleanupTasks = async () => {
    if (!confirm('هل أنت متأكد من تعطيل المهام المكتملة أو المرفوضة القديمة؟')) {
      return;
    }

    setIsLoading(prev => ({ ...prev, tasks: true }));
    try {
      const result = await cleanupCompletedTasks(90); // مهام أقدم من 90 يوم
      setResults(prev => ({ ...prev, tasks: result }));
      
      toast({
        title: 'تم التنظيف',
        description: result.message,
        type: 'success'
      });
    } catch (error) {
      console.error('Error cleaning up tasks:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تنظيف المهام',
        type: 'error'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, tasks: false }));
    }
  };

  // تنظيف ذاكرة التخزين المؤقت
  const handleClearCache = () => {
    if (!confirm('هل أنت متأكد من تنظيف ذاكرة التخزين المؤقت؟ سيتم الاحتفاظ بمعلومات تسجيل الدخول.')) {
      return;
    }

    setIsLoading(prev => ({ ...prev, cache: true }));
    try {
      const result = clearAppCache();
      setResults(prev => ({ ...prev, cache: result }));
      
      toast({
        title: 'تم التنظيف',
        description: 'تم تنظيف ذاكرة التخزين المؤقت بنجاح',
        type: 'success'
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تنظيف ذاكرة التخزين المؤقت',
        type: 'error'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, cache: false }));
    }
  };

  // تنظيف شامل للنظام
  const handleFullCleanup = async () => {
    if (!confirm('هل أنت متأكد من تنفيذ تنظيف شامل للنظام؟ سيتم تنظيف جميع البيانات القديمة.')) {
      return;
    }

    setIsLoading(prev => ({ ...prev, full: true }));
    try {
      const result = await cleanupSystem({ days: daysThreshold, type: 'all' });
      setResults(prev => ({ ...prev, full: result }));
      
      toast({
        title: 'تم التنظيف',
        description: 'تم تنفيذ تنظيف شامل للنظام بنجاح',
        type: 'success'
      });
    } catch (error) {
      console.error('Error performing full cleanup:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تنفيذ التنظيف الشامل',
        type: 'error'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, full: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-primary" />
            تنظيف النظام
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تنظيف البيانات القديمة وغير الضرورية لتحسين أداء النظام
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 text-blue-800 dark:text-blue-300">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">تنبيه هام</h3>
            <p className="text-sm">
              عمليات التنظيف تحذف البيانات بشكل نهائي ولا يمكن التراجع عنها. تأكد من أنك تريد حذف هذه البيانات قبل المتابعة.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-4">
        <h3 className="font-medium mb-4">إعدادات التنظيف</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm text-gray-500 mb-1">عتبة الأيام (حذف البيانات الأقدم من)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={daysThreshold}
              onChange={(e) => setDaysThreshold(parseInt(e.target.value) || 30)}
              className="w-full p-2 border dark:border-gray-700 rounded-lg"
            />
          </div>
          <div>
            <button
              onClick={handleFullCleanup}
              disabled={isLoading.full}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 h-10"
            >
              {isLoading.full ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>جارٍ التنظيف...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>تنظيف شامل</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* تنظيف المسودات القديمة */}
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium">تنظيف المسودات</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">حذف مسودات الخطابات القديمة</p>
                </div>
              </div>
              <button
                onClick={handleCleanupDrafts}
                disabled={isLoading.drafts}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm flex items-center gap-1.5"
              >
                {isLoading.drafts ? (
                  <div className="h-3.5 w-3.5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>تنظيف</span>
              </button>
            </div>
            {results.drafts && (
              <div className="text-sm bg-blue-50 dark:bg-blue-900/10 p-2 rounded">
                <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>تم حذف {results.drafts.count} مسودة قديمة</span>
                </div>
              </div>
            )}
          </div>

          {/* تنظيف الإشعارات المقروءة */}
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-medium">تنظيف الإشعارات</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">حذف الإشعارات المقروءة القديمة</p>
                </div>
              </div>
              <button
                onClick={handleCleanupNotifications}
                disabled={isLoading.notifications}
                className="px-3 py-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 text-sm flex items-center gap-1.5"
              >
                {isLoading.notifications ? (
                  <div className="h-3.5 w-3.5 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin"></div>
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>تنظيف</span>
              </button>
            </div>
            {results.notifications && (
              <div className="text-sm bg-purple-50 dark:bg-purple-900/10 p-2 rounded">
                <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>تم حذف {results.notifications.count} إشعار مقروء</span>
                </div>
              </div>
            )}
          </div>

          {/* تنظيف سجلات الأحداث */}
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <History className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-medium">تنظيف سجلات الأحداث</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">حذف سجلات الأحداث القديمة (أقدم من 90 يوم)</p>
                </div>
              </div>
              <button
                onClick={handleCleanupAuditLogs}
                disabled={isLoading.auditLogs}
                className="px-3 py-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 text-sm flex items-center gap-1.5"
              >
                {isLoading.auditLogs ? (
                  <div className="h-3.5 w-3.5 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin"></div>
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>تنظيف</span>
              </button>
            </div>
            {results.auditLogs && (
              <div className="text-sm bg-amber-50 dark:bg-amber-900/10 p-2 rounded">
                <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>تم حذف {results.auditLogs.count} سجل أحداث</span>
                </div>
              </div>
            )}
          </div>

          {/* تنظيف المهام المكتملة */}
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium">تنظيف المهام</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">تعطيل المهام المكتملة أو المرفوضة القديمة</p>
                </div>
              </div>
              <button
                onClick={handleCleanupTasks}
                disabled={isLoading.tasks}
                className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 text-sm flex items-center gap-1.5"
              >
                {isLoading.tasks ? (
                  <div className="h-3.5 w-3.5 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin"></div>
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>تنظيف</span>
              </button>
            </div>
            {results.tasks && (
              <div className="text-sm bg-green-50 dark:bg-green-900/10 p-2 rounded">
                <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>تم تعطيل {results.tasks.count} مهمة مكتملة</span>
                </div>
              </div>
            )}
          </div>

          {/* تنظيف ذاكرة التخزين المؤقت */}
          <div className="border dark:border-gray-700 rounded-lg p-4 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h4 className="font-medium">تنظيف ذاكرة التخزين المؤقت</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">مسح البيانات المؤقتة المخزنة في المتصفح</p>
                </div>
              </div>
              <button
                onClick={handleClearCache}
                disabled={isLoading.cache}
                className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm flex items-center gap-1.5"
              >
                {isLoading.cache ? (
                  <div className="h-3.5 w-3.5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>تنظيف الذاكرة</span>
              </button>
            </div>
            {results.cache && (
              <div className="text-sm bg-red-50 dark:bg-red-900/10 p-2 rounded">
                <div className="flex items-center gap-1 text-red-700 dark:text-red-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>تم تنظيف ذاكرة التخزين المؤقت بنجاح</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {results.full && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            نتائج التنظيف الشامل
          </h3>
          
          <div className="space-y-2">
            {results.full.results?.inactiveUsers && (
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>المستخدمين غير النشطين:</span>
                <span className="font-medium">{results.full.results.inactiveUsers.count} مستخدم</span>
              </div>
            )}
            
            {results.full.results?.oldDrafts && (
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>المسودات القديمة:</span>
                <span className="font-medium">{results.full.results.oldDrafts.deleted || 0} / {results.full.results.oldDrafts.count} مسودة</span>
              </div>
            )}
            
            {results.full.results?.oldTasks && (
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>المهام القديمة:</span>
                <span className="font-medium">{results.full.results.oldTasks.deactivated || 0} / {results.full.results.oldTasks.count} مهمة</span>
              </div>
            )}
            
            {results.full.results?.oldNotifications && (
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>الإشعارات القديمة:</span>
                <span className="font-medium">{results.full.results.oldNotifications.deleted || 0} / {results.full.results.oldNotifications.count} إشعار</span>
              </div>
            )}
            
            {results.full.results?.oldLogs && (
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>سجلات الأحداث:</span>
                <span className="font-medium">{results.full.results.oldLogs.deleted || 0} / {results.full.results.oldLogs.count} سجل</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}