import { useState, useEffect } from 'react';
import { User, Branch } from '../types';
import { BranchSelector } from '../../../components/branches/BranchSelector';
import { Eye, EyeOff, Shield, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

interface UserFormProps {
  user?: User;
  onSubmit: (userData: any) => Promise<void>;
  isLoading: boolean;
  branches: Branch[];
}

/**
 * نموذج إنشاء وتعديل المستخدم
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
  const [permissions, setPermissions] = useState<string[]>([]);
  
  // جلب قائمة الصلاحيات
  const { data: permissionsList = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('id, name, code, description')
        .order('code');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5 // 5 دقائق
  });
  
  // إعادة تعيين النموذج عند تغيير المستخدم
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFullName(user.full_name);
      setRole(user.role); // الدور الأساسي - إما 'admin' أو 'user' فقط
      setBranchId(user.branch_id);
      setPassword('');
      setIsActive(user.is_active !== false);
      
      // استخراج الصلاحيات من permissions
      if (user.permissions && Array.isArray(user.permissions)) {
        setPermissions(user.permissions.filter(p => typeof p === 'string'));
      } else {
        setPermissions([]);
      }
    } else {
      setEmail('');
      setFullName('');
      setRole('user');
      setPermissions([]);
      setBranchId(null);
      setPassword('');
      setIsActive(true);
    }
  }, [user]);

  // التحقق من وجود جميع الأدوار المخصصة الموجودة في قاعدة البيانات
  const { data: allowedRoles = [] } = useQuery({
    queryKey: ['allowed-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_allowed_roles');
      
      if (error) {
        console.error('Error fetching allowed roles:', error);
        return ['admin', 'user'];
      }
      
      return data || ['admin', 'user'];
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
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
    
    if (!role || (Array.isArray(allowedRoles) && !allowedRoles.includes(role))) {
      newErrors.role = `الدور الأساسي يجب أن يكون أحد القيم المسموح بها: ${
        Array.isArray(allowedRoles) 
          ? allowedRoles.join(', ') 
          : 'admin, user'
      }`;
    }
    
    if (!branchId) {
      newErrors.branch_id = 'الفرع مطلوب';
    }
    
    if (!user && !password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (password && password.length < 6) {
      newErrors.password = 'كلمة المرور يجب ألا تقل عن 6 أحرف';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // معالجة تقديم النموذج
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const userData = {
      email,
      full_name: fullName,
      role, // الدور الأساسي - إما 'admin' أو 'user' فقط
      branch_id: branchId,
      password,
      is_active: isActive,
      permissions: permissions.length > 0 ? permissions : undefined
    };
    
    onSubmit(userData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">البريد الإلكتروني <span className="text-red-500">*</span></label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full p-2 border rounded-lg ${
            errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          required
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={`w-full p-2 border rounded-lg ${
            errors.full_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          required
        />
        {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">الفرع <span className="text-red-500">*</span></label>
        <BranchSelector 
          value={branchId} 
          onChange={(value) => setBranchId(value)}
          required
          error={errors.branch_id}
        />
      </div>

      <div className="border-t dark:border-gray-800 pt-4 mt-4">
        <div className="mb-4">
          <h3 className="text-md font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            إعدادات الدور والصلاحيات
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            حدد دور المستخدم الأساسي والصلاحيات الإضافية المطلوبة
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">الدور الأساسي <span className="text-red-500">*</span></label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={`w-full p-2 border rounded-lg ${
              errors.role ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
            required
          >
            {Array.isArray(allowedRoles) && allowedRoles.length > 0 ? (
              allowedRoles.map(allowedRole => (
                <option key={allowedRole} value={allowedRole}>
                  {allowedRole === 'admin' ? 'مدير' : allowedRole === 'user' ? 'مستخدم' : allowedRole}
                </option>
              ))
            ) : (
              <>
                <option value="user">مستخدم</option>
                <option value="admin">مدير</option>
              </>
            )}
          </select>
          {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">الصلاحيات الإضافية</label>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
              <div className="absolute bottom-full right-0 mb-2 w-60 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                يمكنك تعديل صلاحيات المستخدم بشكل مفصل بعد إنشاء الحساب من صفحة إدارة المستخدمين
              </div>
            </div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  سيتم تمكينك من إدارة صلاحيات المستخدم بشكل مفصل بعد إنشاء الحساب
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {user ? 'كلمة المرور (اتركها فارغة إذا لم ترد تغييرها)' : 'كلمة المرور'} {!user && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-2 border rounded-lg pr-10 ${
              errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
            required={!user}
            minLength={6}
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
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>
      
      <div className="flex items-center">
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

      <div className="flex justify-end gap-x-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>جارٍ الحفظ...</span>
            </>
          ) : (
            <span>حفظ</span>
          )}
        </button>
      </div>
    </form>
  );
}