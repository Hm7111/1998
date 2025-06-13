import { useState, useEffect } from 'react';
import { User, Branch } from '../../../types/database';
import { BranchSelector } from '../../components/branches/BranchSelector';
import { Eye, EyeOff, Shield, Info } from 'lucide-react';
import { FormField } from '../ui/FormField';

interface UserFormProps {
  user?: User;
  onSubmit: (userData: any) => Promise<void>;
  isLoading: boolean;
  branches: Branch[];
}

/**
 * نموذج إنشاء وتعديل المستخدم
 * تم تحديثه ليدعم نظام الصلاحيات المبسط
 */
export function UserForm({ user, onSubmit, isLoading, branches }: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('user'); // الدور الأساسي - إما 'admin' أو 'user' فقط
  const [branchId, setBranchId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // صلاحيات المستخدم
  const [permissions, setPermissions] = useState<string[]>([]);
  
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
    { id: 'request:approval', name: 'طلب موافقة', description: 'السماح للمستخدم بإرسال طلبات موافقة' },
    { id: 'view:tasks', name: 'عرض المهام', description: 'السماح للمستخدم بعرض المهام' },
    { id: 'create:tasks', name: 'إنشاء المهام', description: 'السماح للمستخدم بإنشاء مهام جديدة' },
  ];
  
  // تعبئة بيانات المستخدم عند التعديل
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFullName(user.full_name);
      setRole(user.role || 'user');
      setBranchId(user.branch_id);
      setPassword('');
      setIsActive(user.is_active !== false);
      setPermissions(user.permissions || []);
    } else {
      // إعادة تعيين النموذج عند الإنشاء
      setEmail('');
      setFullName('');
      setRole('user');
      setBranchId(null);
      setPassword('');
      setIsActive(true);
      setPermissions([]);
    }
  }, [user]);

  // التحقق من صحة البيانات
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
    setPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };
  
  // تقديم النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // تحضير بيانات المستخدم
    const userData = {
      email,
      full_name: fullName,
      role, // الدور الأساسي - 'admin' أو 'user'
      branch_id: branchId,
      password,
      is_active: isActive,
      permissions // قائمة الصلاحيات المختارة
    };
    
    await onSubmit(userData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 text-blue-800 dark:text-blue-300 mb-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium mb-1">إرشادات استخدام</h3>
            <ul className="text-sm list-disc list-inside space-y-1 mr-1">
              <li>أدخل البيانات الأساسية للمستخدم وقم باختيار الفرع التابع له</li>
              <li>حدد الدور الأساسي للمستخدم (مدير أو مستخدم عادي)</li>
              <li>قم بتحديد الصلاحيات المطلوبة لهذا المستخدم</li>
              <li>المستخدم ذو دور "مدير" سيحصل تلقائياً على جميع الصلاحيات</li>
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
                role === 'admin' 
                  ? 'border-primary bg-primary/5 dark:bg-primary/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary'
              }`}
              onClick={() => setRole('admin')}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                role === 'admin' 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                <Shield className="h-5 w-5" />
              </div>
              <div className="font-medium">مدير</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 text-center">صلاحيات كاملة للنظام</div>
              
              {role === 'admin' && (
                <div className="mt-2 text-xs bg-primary text-white px-3 py-1 rounded-full flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>محدد</span>
                </div>
              )}
            </div>
            
            <div
              className={`p-4 border rounded-lg cursor-pointer flex flex-col items-center gap-2 transition-colors ${
                role === 'user' 
                  ? 'border-primary bg-primary/5 dark:bg-primary/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary'
              }`}
              onClick={() => setRole('user')}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                role === 'user' 
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
              <div className="text-xs text-gray-600 dark:text-gray-400 text-center">صلاحيات محددة</div>
              
              {role === 'user' && (
                <div className="mt-2 text-xs bg-primary text-white px-3 py-1 rounded-full flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>محدد</span>
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
      </div>

      {/* قسم الصلاحيات */}
      <div className="mt-6 border-t pt-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Shield className="h-5 w-5 ml-2 text-primary" />
          الصلاحيات
        </h3>
        
        {role === 'admin' ? (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 p-4 rounded-lg mb-4">
            <p className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
              <Info className="h-5 w-5 flex-shrink-0" />
              <span>المستخدم ذو دور "مدير" لديه جميع الصلاحيات في النظام تلقائياً ولا حاجة لتحديد صلاحيات إضافية.</span>
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {availablePermissions.map(permission => (
                <div
                  key={permission.id}
                  onClick={() => togglePermission(permission.id)}
                  className={`p-3 rounded-lg cursor-pointer border ${
                    permissions.includes(permission.id) 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 h-5 w-5 rounded flex items-center justify-center ${
                      permissions.includes(permission.id) 
                        ? 'bg-primary text-white' 
                        : 'border border-gray-300 dark:border-gray-600'
                    }`}>
                      {permissions.includes(permission.id) && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{permission.name}</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 p-3 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>تنبيه: عند تغيير الصلاحيات، يجب عليك التأكد من منح المستخدم جميع الصلاحيات اللازمة لعمله.</span>
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center mt-4">
        <input
          type="checkbox"
          id="is-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
        <label htmlFor="is-active" className="mr-2 block text-sm">
          حساب نشط
        </label>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        المستخدمون غير النشطين لا يمكنهم تسجيل الدخول إلى النظام
      </p>

      <div className="flex justify-end pt-4">
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