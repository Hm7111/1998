import { ReactNode } from 'react';
import { useAuth } from '../../lib/auth';

interface RestrictedComponentProps {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente que muestra su contenido solo si el usuario tiene los permisos necesarios
 * @param permissions - Lista de permisos requeridos (debe tener al menos uno)
 * @param children - Contenido a mostrar si el usuario tiene permiso
 * @param fallback - Contenido alternativo a mostrar si el usuario no tiene permiso
 */
export function RestrictedComponent({ permissions, children, fallback = null }: RestrictedComponentProps) {
  const { hasAnyPermission } = useAuth();
  
  if (permissions.length === 0 || hasAnyPermission(permissions)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}