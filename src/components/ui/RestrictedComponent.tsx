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
 * مكون يقوم بعرض محتواه فقط إذا كان المستخدم يملك الصلاحيات المطلوبة
 * @param permissions - قائمة الصلاحيات المطلوبة (يجب أن يملك المستخدم واحدة على الأقل)
 * @param children - المحتوى الذي سيعرض إذا كان المستخدم يملك الصلاحية
 * @param fallback - محتوى بديل يعرض إذا لم يكن المستخدم يملك الصلاحية
 * @param showWarningToast - إظهار تنبيه إذا لم يكن المستخدم يملك الصلاحية
 */
export function RestrictedComponent({ 
  permissions, 
  children, 
  fallback = null,
  showWarningToast = false
}: RestrictedComponentProps) {
  const { hasPermission, hasAnyPermission, user } = useAuth();
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
  
  // إذا لم تكن هناك صلاحيات مطلوبة، اعرض المحتوى دائماً
  if (permissions.length === 0) {
    return <>{children}</>;
  }
  
  // التحقق إذا كان المستخدم يملك أي من الصلاحيات المطلوبة
  if (hasAnyPermission(permissions)) {
    return <>{children}</>;
  }
  
  // إذا تم توفير محتوى بديل، اعرضه
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // إذا لم يكن هناك محتوى بديل، لا تعرض شيئاً
  return null;
}