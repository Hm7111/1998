import { useState, useEffect } from 'react';
import { X, Shield, Check, Lock } from 'lucide-react';
import { User } from '../../types/database';
import { useUsers } from '../../features/users/hooks';
import { useToast } from '../../hooks/useToast';

interface UserPermissionsDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserPermissionsDialog({ user, isOpen, onClose, onSuccess }: UserPermissionsDialogProps) {
  const { updateUserPermissions, isLoading } = useUsers();
  const { toast } = useToast();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // الصلاحيات المتاحة
  const availablePermissions = [
    { id: 'view:letters', name: 'عرض الخطابات', description: 'السماح للمستخدم بعرض الخطابات' },
    { id: 'create:letters', name: 'إنشاء الخطابات', description: 'السماح للمستخدم بإنشاء خطابات جديدة' },
    { id: 'edit:letters', name: 'تعديل الخطابات', description: 'السماح للمستخدم بتعديل جميع الخطابات' },
    { id: 'edit:letters:own', name: 'تعديل الخطابات الخاصة', description: 'السماح للمستخدم بتعديل خطاباته فقط' },
    { id: 'delete:letters', name: 'حذف الخطابات', description: 'السماح للمستخدم بحذف جميع الخطابات' },
    { id: 'delete:letters:own', name: 'حذف الخطابات الخاصة', description: 'السماح للمستخدم بحذف خطاباته فقط' },
    { id: 'export:letters', name: 'تصدير الخطابات', description: 'السماح للمستخدم بتصدير الخطابات' },
    { id: 'view:approvals', name: 'عرض طلبات الموافقة', description: 'السماح للمستخدم بعرض طلبات الموافقة' },
    { id: 'view:approvals:own', name: 'عرض طلبات الموافقة الخاصة', description: 'السماح للمستخدم بعرض طلبات الموافقة الخاصة به' },
    { id: 'approve:letters', name: 'الموافقة على الخطابات', description: 'السماح للمستخدم بالموافقة على الخطابات' },
    { id: 'reject:letters', name: 'رفض الخطابات', description: 'السماح للمستخدم برفض الخطابات' },
    { id: 'request:approval', name: 'طلب موافقة', description: 'السماح للمستخدم بطلب موافقة على الخطابات' },
    { id: 'view:tasks', name: 'عرض المهام', description: 'السماح للمستخدم بعرض المهام' },
    { id: 'view:tasks:assigned', name: 'عرض المهام المسندة', description: 'السماح للمستخدم بعرض المهام المسندة إليه' },
    { id: 'view:tasks:own', name: 'عرض المهام الخاصة', description: 'السماح للمستخدم بعرض المهام الخاصة به' },
    { id: 'create:tasks', name: 'إنشاء المهام', description: 'السماح للمستخدم بإنشاء مهام جديدة' },
    { id: 'create:tasks:own', name: 'إنشاء المهام الخاصة', description: 'السماح للمستخدم بإنشاء مهام خاصة به' },
    { id: 'edit:tasks', name: 'تعديل المهام', description: 'السماح للمستخدم بتعديل المهام' },
    { id: 'edit:tasks:own', name: 'تعديل المهام الخاصة', description: 'السماح للمستخدم بتعديل المهام الخاصة به' },
    { id: 'delete:tasks', name: 'حذف المهام', description: 'السماح للمستخدم بحذف المهام' },
    { id: 'delete:tasks:own', name: 'حذف المهام الخاصة', description: 'السماح للمستخدم بحذف المهام الخاصة به' },
    { id: 'assign:tasks', name: 'تعيين المهام', description: 'السماح للمستخدم بتعيين المهام لمستخدمين آخرين' },
    { id: 'complete:tasks', name: 'إكمال المهام', description: 'السماح للمستخدم بإكمال المهام' },
    { id: 'complete:tasks:own', name: 'إكمال المهام الخاصة', description: 'السماح للمستخدم بإكمال المهام الخاصة به' },
    { id: 'view:branches', name: 'عرض الفروع', description: 'السماح للمستخدم بعرض الفروع' },
    { id: 'view:audit_logs', name: 'عرض سجلات النظام', description: 'السماح للمستخدم بعرض سجلات النظام' },
  ];
  
  // تصنيف الصلاحيات حسب النوع
  const permissionCategories = {
    'letters': { name: 'الخطابات', permissions: availablePermissions.filter(p => p.id.includes('letters') && !p.id.includes('approve')) },
    'approvals': { name: 'الموافقات', permissions: availablePermissions.filter(p => p.id.includes('approval') || p.id.includes('approve')) },
    'tasks': { name: 'المهام', permissions: availablePermissions.filter(p => p.id.includes('task')) },
    'other': { name: 'أخرى', permissions: availablePermissions.filter(p => !p.id.includes('letters') && !p.id.includes('approval') && !p.id.includes('approve') && !p.id.includes('task')) },
  };
  
  // تحميل صلاحيات المستخدم الحالية عند فتح النافذة
  useEffect(() => {
    if (user) {
      if (Array.isArray(user.permissions)) {
        setSelectedPermissions(user.permissions);
      } else {
        setSelectedPermissions([]);
      }
    }
  }, [user]);
  
  // تبديل تحديد الصلاحية
  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };
  
  // حفظ الصلاحيات
  const handleSavePermissions = async () => {
    try {
      const success = await updateUserPermissions(user.id, selectedPermissions);
      
      if (success) {
        toast({
          title: 'تم الحفظ',
          description: 'تم تحديث صلاحيات المستخدم بنجاح',
          type: 'success'
        });
        
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث الصلاحيات',
        type: 'error'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center overflow-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full">
        <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold flex items-center">
            <Shield className="h-5 w-5 ml-2 text-primary" />
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
          <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">البريد الإلكتروني</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الفرع</p>
                <p className="font-medium">
                  {user.branch?.name || 'غير محدد'}
                  {user.branch?.code && ` (${user.branch.code})`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الدور</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    <Shield className="h-3.5 w-3.5 ml-1" />
                    {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الحالة</p>
                <p className="font-medium">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {user.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          {/* رسالة إذا كان المستخدم مديراً */}
          {user.role === 'admin' ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-lg">
              <div className="flex items-start">
                <Shield className="h-5 w-5 mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div className="mr-3">
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-300">تنبيه: المستخدم ذو دور "مدير"</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    المستخدم بدور "مدير" لديه جميع الصلاحيات في النظام بشكل افتراضي. 
                    لا حاجة لتحديد صلاحيات إضافية.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* قائمة الصلاحيات المتاحة */}
              <div className="space-y-6">
                {Object.entries(permissionCategories).map(([category, { name, permissions }]) => (
                  <div key={category} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b dark:border-gray-700">
                      <h3 className="font-medium flex items-center">
                        <Lock className="h-4 w-4 ml-2 text-primary" />
                        {name}
                      </h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {permissions.map(permission => (
                        <div
                          key={permission.id}
                          onClick={() => togglePermission(permission.id)}
                          className={`p-3 rounded-lg cursor-pointer border ${
                            selectedPermissions.includes(permission.id)
                              ? 'bg-primary/10 dark:bg-primary/20 border-primary'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`h-5 w-5 mt-0.5 rounded flex-shrink-0 ${
                              selectedPermissions.includes(permission.id)
                                ? 'bg-primary text-white'
                                : 'border border-gray-300 dark:border-gray-600'
                            }`}>
                              {selectedPermissions.includes(permission.id) && (
                                <Check className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{permission.name}</div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* تلميح للمساعدة */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>الصلاحيات المحددة ستؤثر على ما يمكن للمستخدم رؤيته وفعله في النظام. تأكد من منح الصلاحيات المناسبة لمسؤوليات المستخدم.</span>
                </p>
              </div>
            </>
          )}
        </div>
        
        <div className="p-5 border-t dark:border-gray-800 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إلغاء
          </button>
          <button
            onClick={handleSavePermissions}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
            disabled={isLoading || user.role === 'admin'}
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