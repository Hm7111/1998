import { LetterEditor as NewLetterEditorComponent } from '../components/LetterEditor'
import { useAuth } from '../../../lib/auth';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export function LetterEditor() {
  const { hasPermission } = useAuth();
  
  // التحقق من صلاحية إنشاء الخطابات على مستوى الصفحة
  if (!hasPermission('create:letters')) {
    // إذا لم يكن لديه الصلاحية، عرض رسالة خطأ وتوجيهه إلى صفحة قائمة الخطابات
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-4">غير مصرح بالوصول</h2>
          <p className="text-lg text-red-600 dark:text-red-400 mb-6">
            ليس لديك الصلاحيات اللازمة لإنشاء خطابات جديدة.
          </p>
          <p className="text-md text-gray-600 dark:text-gray-400 mb-6">
            يرجى التواصل مع مدير النظام للحصول على الصلاحيات المناسبة.
          </p>
          <div className="mt-4">
            <Navigate to="/admin/letters" replace />
          </div>
        </div>
      </div>
    );
  }

  return <NewLetterEditorComponent />
}