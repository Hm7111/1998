import { useState, useEffect } from 'react';
import { X, Shield, Check, Lock } from 'lucide-react';
import { User, Permission } from '../../types/database';
import { useUsers } from '../../features/users/hooks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface UserPermissionsDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserPermissionsDialog({ user, isOpen, onClose, onSuccess }: UserPermissionsDialogProps) {
  const { updateUserPermissions, isLoading } = useUsers();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // جلب الصلاحيات
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data as Permission[];
    }
  });

  // تحميل صلاحيات المستخدم عند فتح النافذة
  useEffect(() => {
    if (user && user.permissions) {
      if (Array.isArray(user.permissions)) {
        // تصفية الصلاحيات للحصول على المعرفات فقط
        const permIds = user.permissions
          .filter(p => typeof p === 'string')
          .map(p => p);
        
        setSelectedPermissions(permIds);
      } else {
        setSelectedPermissions([]);
      }
    } else {
      setSelectedPermissions([]);
    }
  }, [user]);

  // تبديل اختيار صلاحية
  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  // تجميع الصلاحيات حسب الفئة
  const permissionsByCategory = permissions.reduce((groups, permission) => {
    const parts = permission.code.split(':');
    const category = parts[1]; // استخدام المورد كفئة
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);
  
  // ترجمة فئة الصلاحية إلى العربية
  const translateCategory = (category: string): string => {
    const translations: Record<string, string> = {
      'letters': 'الخطابات',
      'templates': 'القوالب',
      'users': 'المستخدمين',
      'branches': 'الفروع',
      'settings': 'الإعدادات',
      'system': 'النظام',
      'audit_logs': 'سجلات الأحداث',
      'approvals': 'الموافقات',
      'tasks': 'المهام'
    };
    
    return translations[category] || category;
  };
  
  // حفظ الصلاحيات
  const handleSave = async () => {
    const success = await updateUserPermissions(user.id, selectedPermissions);
    if (success && onSuccess) {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center overflow-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            إدارة صلاحيات {user.full_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {/* معلومات المستخدم */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">البريد الإلكتروني</h3>
                <p className="font-medium">{user.email}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">الدور الأساسي</h3>
                <div className="flex items-center gap-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    <Shield className="h-3.5 w-3.5 mr-1" />
                    {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">الفرع</h3>
                <p className="font-medium">{user.branches?.name || 'غير محدد'}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">الحالة</h3>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  user.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {user.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            </div>
          </div>

          <div className="border dark:border-gray-800 rounded-lg mb-4">
            <div className="border-b dark:border-gray-800 p-4 flex justify-between items-center">
              <h3 className="font-medium">تحديد الصلاحيات</h3>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedPermissions.length} صلاحية محددة
                </span>
                
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary/80"
                  onClick={() => setSelectedPermissions([])}
                >
                  إعادة ضبط
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto p-4 space-y-6">
              {/* تنبيه للمدراء */}
              {user.role === 'admin' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-lg text-yellow-800 dark:text-yellow-300 mb-4">
                  <div className="flex items-center gap-2 mb-1 font-medium">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>تنبيه: المستخدم ذو دور "مدير"</span>
                  </div>
                  <p className="text-sm">
                    المستخدم بدور "مدير" لديه جميع الصلاحيات في النظام بشكل افتراضي.
                    يمكنك إضافة صلاحيات محددة إضافية، لكنها لن تؤثر على وصول المدير للنظام.
                  </p>
                </div>
              )}

              {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                <div key={category}>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-primary" />
                    {translateCategory(category)}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryPermissions.map(permission => (
                      <div
                        key={permission.id}
                        onClick={() => togglePermission(permission.id)}
                        className={`p-4 rounded-lg cursor-pointer border transition-colors ${
                          selectedPermissions.includes(permission.id)
                            ? 'border-primary bg-primary/10 dark:bg-primary/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium">{permission.name}</div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            selectedPermissions.includes(permission.id)
                              ? 'bg-primary border-primary text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedPermissions.includes(permission.id) && (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                        
                        {permission.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {permission.description}
                          </p>
                        )}
                        
                        <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded inline-block mt-2">
                          {permission.code}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t dark:border-gray-800 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>جارِ الحفظ...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>حفظ الصلاحيات</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}