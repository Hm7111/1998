import { useState, useEffect } from 'react';
import { User, Branch, UserRole } from '../types';
import { BranchSelector } from '../../../components/branches/BranchSelector';
import { Eye, EyeOff, Shield } from 'lucide-react';

interface UserFormProps {
  user?: User;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  branches: Branch[];
  roles: UserRole[];
}

export function UserForm({ user, onSubmit, isLoading, branches, roles }: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleId, setRoleId] = useState<string>(''); // معرف الدور الموحد
  const [branchId, setBranchId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // إعادة تعيين النموذج عند تغيير المستخدم المحدد
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFullName(user.full_name);
      setBranchId(user.branch_id);
      setPassword('');
      setIsActive(user.is_active !== false);
      
      // البحث عن الدور في permissions
      if (user.permissions && Array.isArray(user.permissions)) {
        const customRole = user.permissions.find(p => 
          typeof p === 'object' && p.type === 'role'
        );
        
        if (customRole && customRole.id) {
          setRoleId(customRole.id);
        } else {
          // إذا لم يكن هناك دور مخصص، نستخدم الدور الأساسي
          const defaultRoleId = roles.find(r => r.name.toLowerCase() === user.role.toLowerCase())?.id;
          setRoleId(defaultRoleId || '');
        }
      } else {
        // إذا لم يكن هناك permissions، نستخدم الدور الأساسي
        const defaultRoleId = roles.find(r => r.name.toLowerCase() === user.role.toLowerCase())?.id;
        setRoleId(defaultRoleId || '');
      }
    } else {
      setEmail('');
      setFullName('');
      setRoleId('');
      setBranchId(null);
      setPassword('');
      setIsActive(true);
    }
  }, [user, roles]);
  
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
    
    if (!roleId) {
      newErrors.role = 'يجب اختيار دور للمستخدم';
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
    
    // الحصول على الدور المحدد
    const selectedRole = roles.find(r => r.id === roleId);
    if (!selectedRole) {
      setErrors({ role: 'الدور المحدد غير موجود' });
      return;
    }
    
    // إنشاء مصفوفة permissions مع الدور المحدد
    const permissions = [{
      type: 'role',
      id: roleId,
      name: selectedRole.name
    }];
    
    // تحديد الدور الأساسي من الدور المحدد
    // نستخدم اسم الدور المحدد كدور أساسي إذا كان "admin" أو "user"، وإلا نستخدم "user"
    const baseRole = selectedRole.name.toLowerCase() === 'admin' || selectedRole.name.toLowerCase() === 'user' 
      ? selectedRole.name.toLowerCase() 
      : 'user';
    
    const userData = {
      email,
      full_name: fullName,
      role: baseRole, // الدور الأساسي - إما 'admin' أو 'user'
      branch_id: branchId,
      password,
      is_active: isActive,
      permissions: permissions
    };
    
    onSubmit(userData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
      </div>

      <div className="border-t dark:border-gray-800 pt-4 mt-4">
        <div>
          <label className="block text-sm font-medium mb-1">الدور <span className="text-red-500">*</span></label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className={`w-full p-2 border rounded-lg ${
              errors.role ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
            required
          >
            <option value="">اختر دور المستخدم</option>
            {roles.map(roleItem => (
              <option key={roleItem.id} value={roleItem.id}>
                {roleItem.name} {roleItem.permissions?.length === 0 ? '(بدون صلاحيات)' : ''}
              </option>
            ))}
          </select>
          {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
          <div className="flex items-center mt-2 text-xs text-gray-500">
            <Shield className="h-3.5 w-3.5 mr-1 text-primary" />
            <span>الدور يحدد صلاحيات المستخدم في النظام</span>
          </div>
        </div>
      </div>

      <div>
      </div>
    </form>
  );
}