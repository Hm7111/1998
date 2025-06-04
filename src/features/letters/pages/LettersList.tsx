import { LettersList as LettersListComponent } from '../../../components/letters/LettersList';
import { RestrictedComponent } from '../../../components/ui/RestrictedComponent';

export function LettersList() {
  return (
    <RestrictedComponent 
      permissions={['view:letters']}
      fallback={
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-8 rounded-lg shadow text-center">
          <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
          <p>ليس لديك الصلاحيات اللازمة لعرض الخطابات.</p>
        </div>
      }
    >
      <LettersListComponent />
    </RestrictedComponent>
  );
}