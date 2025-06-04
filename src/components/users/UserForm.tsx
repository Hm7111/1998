import { useState, useEffect } from 'react';
import { User, Branch, UserRole, Permission } from '../../../types/database';
import { BranchSelector } from '../../components/branches/BranchSelector';
import { Eye, EyeOff, Shield, Info, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { FormField } from '../ui/FormField';

interface UserFormProps {
  user?: User;
  onSubmit: (userData: any) => Promise<void>;
  isLoading: boolean;
  branches: Branch[];
  roles: UserRole[];
}

/**
 * نموذج إنشاء وتعديل المستخدم
 */
export function UserForm({ user, onSubmit, isLoading, branches, roles }: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPermissionSelector, setShowPermissionSelector] = useState(false);

  // جلب قائمة الصلاحيات
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data as Permission[];
    },
    staleTime: 60000 // 1 دقيقة
  });

  // إعادة تعيين النموذج عند تغيير المستخدم
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFullName(user.full_name);
      setBranchId(user.branch_id || null);
      setPassword('');
      setIsActive(user.is_active !== false);
      setSelectedRole(user.role);
      
      // استخراج الصلاحيات
      if (user.permissions && Array.isArray(user.permissions)) {
        const perms = user.permissions
          .filter(p => typeof p === 'string')
          .map(p => p);
        setSelectedPermissions(perms);
      } else {
        setSelectedPermissions([]);
      }
    } else {
      setEmail('');
      setFullName('');
      setSelectedRole('user');
      setSelectedPermissions([]);
      setBranchId(null);
      setPassword('');
      setIsActive(true);
    }
  }, [user]);

  // التحقق من صحة النموذج
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }
    
    if (!fullName) {
      newErrors.full_name = 'الاسم الكامل مطلوب';
    }
    
    if (!branchId) {
      newErrors.branch_id = 'الفرع مطلوب';
    }
    
    if (!user && !password) {
      newErrors.password = 'كلمة المرور مطلوبة للمستخدمين الجدد';
    } else if (password && password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    const parts = permission.code.split(':');
    const category = parts[1]; // استخدام القسم الثاني كفئة
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
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
  
  // معالجة تقديم النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const userData = {
      email,
      full_name: fullName,
      role: selectedRole,
      branch_id: branchId,
      password,
      is_active: isActive,
      permissions: selectedPermissions
    };
    
    await onSubmit(userData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 text-blue-800 dark:text-blue-300 mb-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium mb-1">إرشادات استخدام</h3>
            <ul className="text-sm list-disc list-inside space-y-1 mr-1">
              <li>أدخل البيانات الأساسية للمستخدم وقم باختيار الفرع التابع له</li>
              <li>حدد الدور الأساسي للمستخدم (مدير أو مستخدم عادي)</li>
              <li>يمكنك تحديد الصلاحيات المخصصة بشكل مباشر عند النقر على "إدارة الصلاحيات"</li>
              <li>تأكد من تعيين كلمة مرور قوية للمستخدم الجديد</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="البريد الإلكتروني"
          name="email"
          required
          error={errors.email}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full p-2.5 border rounded-lg focus:ring-primary focus:border-primary transition-all ${
              errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder="أدخل البريد الإلكتروني"
          />
        </FormField>

        <FormField
          label="الاسم الكامل"
          name="full_name"
          required
          error={errors.full_name}
        >
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={`w-full p-2.5 border rounded-lg focus:ring-primary focus:border-primary transition-all ${
              errors.full_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder="أدخل الاسم الكامل للمستخدم"
          />
        </FormField>

        <FormField
          label="الفرع"
          name="branch_id"
          required
          error={errors.branch_id}
        >
          <BranchSelector
            value={branchId}
            onChange={(value) => setBranchId(value)}
            error={errors.branch_id}
            required
          />
        </FormField>

        <FormField
          label="الدور الأساسي"
          name="role"
          required
        >
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-4 border rounded-lg cursor-pointer flex flex-col items-center gap-2 transition-colors ${
                selectedRole === 'admin' 
                  ? 'border-primary bg-primary/5 dark:bg-primary/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary'
              }`}
              onClick={() => setSelectedRole('admin')}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedRole === 'admin' 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                <Shield className="h-5 w-5" />
              </div>
              <div className="font-medium">مدير</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">صلاحيات كاملة للنظام</div>
              
              {selectedRole === 'admin' && (
                <div className="mt-2 text-xs bg-primary text-white px-3 py-1 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" /> محدد
                </div>
              )}
            </div>
            
            <div
              className={`p-4 border rounded-lg cursor-pointer flex flex-col items-center gap-2 transition-colors ${
                selectedRole === 'user' 
                  ? 'border-primary bg-primary/5 dark:bg-primary/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary'
              }`}
              onClick={() => setSelectedRole('user')}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedRole === 'user' 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="font-medium">مستخدم</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">صلاحيات محدودة</div>
              
              {selectedRole === 'user' && (
                <div className="mt-2 text-xs bg-primary text-white px-3 py-1 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" /> محدد
                </div>
              )}
            </div>
          </div>
        </FormField>

        <FormField
          label="كلمة المرور"
          name="password"
          required={!user}
          error={errors.password}
        >
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-2.5 border rounded-lg pr-10 focus:ring-primary focus:border-primary transition-all ${
                errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder={user ? "اتركها فارغة للاحتفاظ بكلمة المرور الحالية" : "أدخل كلمة المرور"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </FormField>
        
        <div className="md:col-span-2">
          <FormField
            label="الصلاحيات المخصصة"
            name="permissions"
            description="حدد الصلاحيات التي ستمنح للمستخدم"
          >
            <button
              type="button"
              onClick={() => setShowPermissionSelector(!showPermissionSelector)}
              className="w-full p-3 flex justify-between items-center border border-gray-300 dark:border-gray-700 rounded-lg hover:border-primary"
            >
              <span>
                {selectedPermissions.length > 0 
                  ? `تم تحديد ${selectedPermissions.length} صلاحية` 
                  : 'انقر لتحديد الصلاحيات'}
              </span>
              <span className="text-primary">إدارة الصلاحيات</span>
            </button>
          </FormField>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="is-active" className="block text-sm">
              حساب نشط
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1 mr-7">
            المستخدمون غير النشطين لن يتمكنوا من تسجيل الدخول للنظام
          </p>
        </div>
      </div>

      {showPermissionSelector && (
        <div className="border dark:border-gray-800 rounded-lg">
          <div className="border-b dark:border-gray-800 p-4 flex justify-between items-center">
            <h3 className="font-medium">تحديد الصلاحيات</h3>
            <button
              type="button"
              className="text-sm text-primary"
              onClick={() => setSelectedPermissions([])}
            >
              إعادة ضبط
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-4 space-y-6">
            {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
              <div key={category}>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  {translateCategory(category)}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {categoryPermissions.map(permission => (
                    <div
                      key={permission.id}
                      onClick={() => togglePermission(permission.id)}
                      className={`p-3 rounded-lg cursor-pointer border ${
                        selectedPermissions.includes(permission.id)
                          ? 'border-primary bg-primary/10 dark:bg-primary/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
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
                      <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded mt-2">
                        {permission.code}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t dark:border-gray-800 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-primary text-white rounded-lg"
              onClick={() => setShowPermissionSelector(false)}
            >
              تم
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t dark:border-gray-800">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>جارٍ الحفظ...</span>
            </>
          ) : (
            <>
              {user ? 'تحديث المستخدم' : 'إضافة مستخدم'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}