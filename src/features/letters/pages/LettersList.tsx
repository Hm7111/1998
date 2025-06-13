import { LettersList as LettersListComponent } from '../../../components/letters/LettersList';
import { RestrictedComponent } from '../../../components/ui/RestrictedComponent';
import { AlertCircle, Shield, Info } from 'lucide-react';
import { useAuth } from '../../../lib/auth';

export function LettersList() {
  const { hasPermission } = useAuth();

  return (
    <RestrictedComponent 
      permissions={['view:letters']}
      fallback={
        <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-lg shadow-sm border border-red-200 dark:border-red-900/30 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-4">غير مصرح بالوصول</h2>
          <p className="text-lg text-red-600 dark:text-red-400 mb-6 max-w-md mx-auto">
            ليس لديك الصلاحيات اللازمة للوصول إلى نظام الخطابات.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            يرجى التواصل مع مدير النظام للحصول على الصلاحيات المناسبة.
          </p>
        </div>
      }
    >
      <LettersListComponent />
    </RestrictedComponent>
  );
}