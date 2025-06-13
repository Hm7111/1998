import { ReactNode, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../hooks/useToast';
import { Shield } from 'lucide-react';

interface RestrictedComponentProps {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
  showWarningToast?: boolean;
}

/**
 * Component that shows its content only if the user has the necessary permissions
 * @param permissions - List of permissions required (must have at least one)
 * @param children - Content to show if the user has permission
 * @param fallback - Alternative content to show if the user does not have permission
 * @param showWarningToast - Whether to show a warning toast if the user doesn't have permission
 */
export function RestrictedComponent({ 
  permissions, 
  children, 
  fallback = null,
  showWarningToast = false
}: RestrictedComponentProps) {
  const { hasAnyPermission, user } = useAuth();
  const { toast } = useToast();
  
  // عرض تنبيه إذا لم يكن لدى المستخدم الصلاحيات
  useEffect(() => {
    if (showWarningToast && user && !hasAnyPermission(permissions)) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك الصلاحيات اللازمة للوصول إلى هذا المحتوى',
        type: 'warning'
      });
    }
  }, [user, hasAnyPermission, permissions, showWarningToast, toast]);
  
  if (permissions.length === 0 || hasAnyPermission(permissions)) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // عرض رسالة افتراضية إذا لم يتم توفير محتوى بديل
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-6 rounded-lg">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
        <div>
          <h3 className="text-lg font-bold text-red-700 dark:text-red-300">غير مصرح بالوصول</h3>
          <p className="text-red-600 dark:text-red-400">
            ليس لديك الصلاحيات اللازمة للوصول إلى هذا المحتوى
          </p>
        </div>
      </div>
    </div>
  );
}