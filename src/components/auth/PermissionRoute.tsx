import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { ShieldAlert } from 'lucide-react';

interface PermissionRouteProps {
  permissions: string[];
  children: ReactNode;
  redirectTo?: string;
  fallbackComponent?: ReactNode;
}

/**
 * Componente que protege rutas basado en permisos del usuario
 * Si el usuario no tiene al menos uno de los permisos requeridos, se redirecciona
 * @param permissions - Lista de permisos requeridos (el usuario debe tener al menos uno)
 * @param children - Componentes a renderizar si el usuario tiene permiso
 * @param redirectTo - Ruta de redirección en caso de falta de permisos (por defecto: /admin)
 * @param fallbackComponent - Componente a mostrar en caso de falta de permisos (opcional)
 */
export function PermissionRoute({ permissions, children, redirectTo = '/admin', fallbackComponent }: PermissionRouteProps) {
  const { hasAnyPermission, loading, user } = useAuth();
  const navigate = useNavigate();
  
  // تحقق من الصلاحيات عند تحميل المكون
  useEffect(() => {
    if (!loading && user) {
      if (!hasAnyPermission(permissions)) {
        console.warn('User does not have required permissions:', permissions);
      }
    }
  }, [hasAnyPermission, loading, permissions, user]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // إذا كان المستخدم غير مسجل، توجيه إلى صفحة تسجيل الدخول
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // التحقق من الصلاحيات
  if (!hasAnyPermission(permissions)) {
    // إذا تم توفير مكون بديل، عرضه
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    // عرض رسالة خطأ مع خيار العودة
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mt-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-red-700 dark:text-red-300">غير مصرح بالوصول</h1>
          <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
            ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة:
            <span className="block mt-2 text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
              {permissions.join(' أو ')}
            </span>
          </p>
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => navigate(redirectTo)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              العودة إلى الصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // المستخدم لديه صلاحية، عرض المحتوى
  return <>{children}</>;
}