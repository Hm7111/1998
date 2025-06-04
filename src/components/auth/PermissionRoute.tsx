import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { AlertCircle } from 'lucide-react';

interface PermissionRouteProps {
  permissions: string[];
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Componente que protege rutas basado en permisos del usuario
 * Si el usuario no tiene al menos uno de los permisos requeridos, se redirecciona
 * @param permissions - Lista de permisos requeridos (el usuario debe tener al menos uno)
 * @param children - Componentes a renderizar si el usuario tiene permiso
 * @param redirectTo - Ruta de redirección en caso de falta de permisos (por defecto: /admin)
 */
export function PermissionRoute({ permissions, children, redirectTo = '/admin' }: PermissionRouteProps) {
  const { hasAnyPermission, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Si el usuario no está autenticado, redirigir a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Verificar si el usuario tiene al menos uno de los permisos requeridos
  if (!hasAnyPermission(permissions)) {
    // Mostrar mensaje de error con opción de redirigir
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mt-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-red-700 dark:text-red-300">غير مصرح بالوصول</h1>
          <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
            ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة.
          </p>
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => window.location.href = redirectTo}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              العودة إلى الصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // El usuario tiene permiso, mostrar el contenido
  return <>{children}</>;
}