import { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import type { User as AuthUser } from '@supabase/supabase-js'
import type { User as DbUser } from '../types/database'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// تبسيط نظام الصلاحيات بقائمة ثابتة للصلاحيات الأساسية
export const DEFAULT_PERMISSIONS = {
  admin: [
    // نظام الخطابات
    'view:letters',
    'create:letters',
    'edit:letters',
    'delete:letters',
    'export:letters',
    
    // نظام القوالب
    'view:templates',
    'create:templates',
    'edit:templates',
    'delete:templates',
    
    // نظام المستخدمين
    'view:users',
    'create:users',
    'edit:users',
    'delete:users',
    
    // نظام الفروع
    'view:branches',
    'create:branches',
    'edit:branches',
    'delete:branches',
    
    // إعدادات النظام
    'view:settings',
    'edit:settings',
    
    // سجلات التدقيق
    'view:audit_logs',
    
    // نظام الموافقات
    'view:approvals',
    'approve:letters',
    'reject:letters',
    'request:approval',
    
    // نظام المهام
    'view:tasks',
    'create:tasks',
    'edit:tasks',
    'delete:tasks',
    'assign:tasks',
    'complete:tasks',
    'view:tasks:all'
  ],
  user: [
    // لا يوجد صلاحيات افتراضية للمستخدم العادي
  ]
}

// نوع بيانات سياق المصادقة
interface AuthContextType {
  user: AuthUser | null;
  dbUser: DbUser | null;
  loading: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string | string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  logout: () => Promise<void>;
  reloadPermissions: () => Promise<void>;
}

// إنشاء سياق المصادقة
const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  isAdmin: false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  logout: async () => {},
  reloadPermissions: async () => {},
});

// مكون مزود المصادقة
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // تحميل بيانات المستخدم من Supabase
  const { data: dbUser, isLoading: isDbUserLoading, refetch: refetchUser } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      try {
        // استخدام دالة RPC للحصول على بيانات المستخدم مع تفاصيل الفرع
        const { data, error } = await supabase
          .rpc('get_user_with_branch_details', { user_id: user.id })
          .single()
        
        if (error) {
          console.error('خطأ في جلب بيانات المستخدم:', error);
          throw error;
        }
        
        // التحقق من أن المستخدم نشط
        if (data && !data.is_active && data.role !== 'admin') {
          // إذا كان المستخدم غير نشط، قم بتسجيل خروجه وتوجيهه لصفحة الدخول
          await supabase.auth.signOut()
          setUser(null)
          navigate('/login', { 
            state: { 
              message: 'تم تعطيل حسابك. يرجى التواصل مع المسؤول.' 
            } 
          })
          return null
        }
        
        return data
      } catch (error) {
        console.error('خطأ في جلب بيانات المستخدم:', error);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 60000, // تقليل وقت الصلاحية إلى دقيقة واحدة
    cacheTime: 1000 * 60 * 30, // 30 دقيقة
    retry: 3
  })

  // دالة لإعادة تحميل صلاحيات المستخدم
  const reloadPermissions = useCallback(async () => {
    if (user?.id) {
      await refetchUser();
    }
  }, [user?.id, refetchUser]);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('خطأ في تحميل المستخدم:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        queryClient.clear()
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  // دالة للتحقق من صلاحية محددة أو مجموعة صلاحيات (يجب أن تكون جميعها متوفرة)
  const hasPermission = useCallback((permission: string | string[]): boolean => {
    // إذا كان المستخدم غير موجود أو البيانات غير متوفرة
    if (!dbUser) return false;
    
    // إذا كان المستخدم مدير، لديه جميع الصلاحيات
    if (dbUser.role === 'admin') {
      return true;
    }
    
    // صلاحيات المستخدم من الجدول
    const userPermissions = dbUser.permissions || [];
    
    // إذا كان المطلوب التحقق من مجموعة صلاحيات (يجب توفرها جميعاً)
    if (Array.isArray(permission)) {
      return permission.every(p => userPermissions.includes(p));
    }
    
    // التحقق من صلاحية واحدة
    return userPermissions.includes(permission);
  }, [dbUser]);

  // دالة للتحقق من وجود أي صلاحية من مجموعة صلاحيات
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!permissions.length) return true; // إذا لم تكن هناك صلاحيات مطلوبة، السماح
    
    // إذا كان المستخدم غير موجود
    if (!dbUser) return false;
    
    // إذا كان المستخدم مدير، لديه جميع الصلاحيات
    if (dbUser.role === 'admin') {
      return true;
    }
    
    // التحقق من وجود أي صلاحية من القائمة
    const userPermissions = dbUser.permissions || [];
    return permissions.some(permission => userPermissions.includes(permission));
  }, [dbUser]);

  // دالة تسجيل الخروج
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login', {
        state: {
          message: 'تم تسجيل الخروج بنجاح'
        }
      });
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
    }
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      dbUser, 
      loading: loading || isDbUserLoading, 
      isAdmin: dbUser?.role === 'admin',
      hasPermission,
      hasAnyPermission,
      logout,
      reloadPermissions
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// دالة للاستخدام في المكونات
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('يجب استخدام useAuth داخل AuthProvider')
  }
  return context
}