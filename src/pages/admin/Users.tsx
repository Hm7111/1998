import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Building, UserCheck, UserX, Shield, Key, Trash2 } from 'lucide-react';
import type { User } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { UserDialog } from '../../components/users/UserDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BranchSelector } from '../../components/branches/BranchSelector';
import { useToast } from '../../hooks/useToast';
import { EmptyState } from '../../components/ui/EmptyState';
import { useUsers } from '../../features/users/hooks';
import { UserPermissionsDialog } from '../../components/users/UserPermissionsDialog';

export function Users() {
  const queryClient = useQueryClient();
  const { isAdmin, dbUser } = useAuth();
  const { toast } = useToast();
  const { toggleUserStatus } = useUsers();
  
  const [selectedUser, setSelectedUser] = useState<User>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [confirmAction, setConfirmAction] = useState<{type: 'activate' | 'deactivate', user: User} | null>(null);

  // جلب المستخدمين
  const { 
    data: users = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['users', branchFilter, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('*, branches(*)');
      
      if (branchFilter) {
        query = query.eq('branch_id', branchFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading users:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل المستخدمين',
          type: 'error'
        });
        return [];
      }
      
      return data as User[];
    },
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2, // 2 دقيقة
    refetchInterval: 1000 * 60 * 5, // 5 دقائق
    refetchOnWindowFocus: false
  });

  // جلب الأدوار
  const { data: roles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5, // 5 دقائق
    refetchOnWindowFocus: false
  });

  // فلترة المستخدمين
  const filteredUsers = users.filter(user => {
    // فلتر البحث
    const matchesSearch = !searchQuery || 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.branches?.name && user.branches.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // فلتر الدور
    const matchesRole = roleFilter === 'all' || 
                        (roleFilter === 'admin' && user.role === 'admin') || 
                        (roleFilter === 'user' && user.role === 'user') ||
                        (roleFilter !== 'admin' && roleFilter !== 'user' && 
                          user.permissions?.some(p => p === roleFilter));
    
    return matchesSearch && matchesRole;
  });

  // تعديل مستخدم
  function handleEdit(user: User) {
    setSelectedUser(user);
    setIsDialogOpen(true);
  }

  // إضافة مستخدم جديد
  function handleAdd() {
    setSelectedUser(undefined);
    setIsDialogOpen(true);
  }

  // عرض نافذة إدارة الصلاحيات
  function handleManagePermissions(user: User) {
    setSelectedUser(user);
    setIsPermissionsDialogOpen(true);
  }

  // تعطيل حساب المستخدم
  async function handleDeactivateUser(user: User) {
    if (user.id === dbUser?.id) {
      toast({
        title: 'تنبيه',
        description: 'لا يمكنك تعطيل حسابك الحالي',
        type: 'warning'
      });
      return;
    }
    
    setConfirmAction({ type: 'deactivate', user });
  }
  
  // تفعيل حساب المستخدم
  async function handleActivateUser(user: User) {
    setConfirmAction({ type: 'activate', user });
  }

  // تنفيذ تغيير حالة المستخدم بعد التأكيد
  async function executeStatusChange() {
    if (!confirmAction) return;
    
    const { type, user } = confirmAction;
    const success = await toggleUserStatus(user.id, type === 'activate');
    
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
    
    setConfirmAction(null);
  }

  // منع الوصول إذا لم يكن المستخدم مديراً
  if (!isAdmin) {
    return (
      <EmptyState
        title="غير مصرح بالوصول"
        description="عذراً، يجب أن تكون مديراً للوصول إلى صفحة إدارة المستخدمين"
        icon={<Trash2 className="h-12 w-12 text-red-500" />}
        isError={true}
      />
    );
  }

  return (
    <>
      {/* نافذة تأكيد تغيير حالة المستخدم */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {confirmAction.type === 'deactivate' ? 'تأكيد تعطيل المستخدم' : 'تأكيد تفعيل المستخدم'}
            </h3>
            <p className="mb-6">
              {confirmAction.type === 'deactivate'
                ? `هل أنت متأكد من رغبتك في تعطيل حساب ${confirmAction.user.full_name}؟ لن يتمكن من تسجيل الدخول إلى النظام بعد التعطيل.`
                : `هل أنت متأكد من رغبتك في تفعيل حساب ${confirmAction.user.full_name}؟ سيتمكن من تسجيل الدخول إلى النظام بعد التفعيل.`
              }
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 border rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={executeStatusChange}
                className={`px-4 py-2 text-white rounded-lg ${
                  confirmAction.type === 'deactivate' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {confirmAction.type === 'deactivate' ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة/تعديل المستخدم */}
      <UserDialog
        user={selectedUser}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={refetch}
      />

      {/* نافذة إدارة الصلاحيات */}
      {isPermissionsDialogOpen && selectedUser && (
        <UserPermissionsDialog
          user={selectedUser}
          isOpen={isPermissionsDialogOpen}
          onClose={() => setIsPermissionsDialogOpen(false)}
          onSuccess={refetch}
        />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">إدارة المستخدمين</h1>
        <p className="text-gray-600 dark:text-gray-400">
          إدارة حسابات المستخدمين وصلاحياتهم في النظام
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في المستخدمين..."
              className="w-full pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2.5 border dark:border-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="فلترة"
          >
            <Filter className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <button
          onClick={handleAdd}
          className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          إضافة مستخدم جديد
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-sm">
          <h3 className="text-sm font-medium mb-3">تصفية المستخدمين</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">تصفية حسب الفرع</label>
              <BranchSelector
                value={branchFilter}
                onChange={setBranchFilter}
                placeholder="جميع الفروع"
                showAll
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-500 mb-1">تصفية حسب الدور</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full p-2.5 border dark:border-gray-700 rounded-lg"
              >
                <option value="all">جميع الأدوار</option>
                <option value="admin">مدير</option>
                <option value="user">مستخدم</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setBranchFilter(null);
                  setRoleFilter('all');
                }}
                className="px-3 py-1.5 text-sm border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                إعادة ضبط
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="لا يوجد مستخدمين"
          description={searchQuery || branchFilter || roleFilter !== 'all' ? "لا يوجد مستخدمين مطابقين لمعايير البحث" : "لم يتم إضافة أي مستخدم بعد"}
          action={{
            label: "إضافة مستخدم جديد",
            onClick: handleAdd,
            icon: <Plus className="h-4 w-4" />
          }}
          secondaryAction={searchQuery || branchFilter || roleFilter !== 'all' ? {
            label: "إعادة ضبط الفلاتر",
            onClick: () => {
              setSearchQuery("");
              setBranchFilter(null);
              setRoleFilter('all');
            }
          } : undefined}
        />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الفرع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الدور</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.full_name}</span>
                        {user.id === dbUser?.id && (
                          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                            أنت
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.branches ? (
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4 text-primary" />
                          <span>{user.branches.name}</span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {user.branches.code}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">غير محدد</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        <Shield className="h-3.5 w-3.5" />
                        {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </span>
                      
                      {user.permissions && user.permissions.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">
                            {user.permissions.length} صلاحية
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        user.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {user.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-1 text-gray-600 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                          title="تعديل المستخدم"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleManagePermissions(user)}
                          className="p-1 text-gray-600 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                          title="إدارة الصلاحيات"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        
                        {user.id !== dbUser?.id && (
                          user.is_active ? (
                            <button
                              onClick={() => handleDeactivateUser(user)}
                              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                              title="تعطيل المستخدم"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user)}
                              className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full"
                              title="تفعيل المستخدم"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* بطاقات المعلومات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 text-blue-800 dark:text-blue-300">
          <h3 className="font-bold text-lg mb-2">إدارة المستخدمين</h3>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>يمكنك إضافة مستخدمين جدد وتحديد أدوارهم وصلاحياتهم</li>
            <li>تعديل بيانات المستخدم الأساسية من خلال زر التعديل</li>
            <li>يمكنك تفعيل أو تعطيل المستخدمين حسب الحاجة</li>
            <li>إدارة صلاحيات المستخدمين من خلال زر الصلاحيات</li>
          </ul>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-lg p-4 text-green-800 dark:text-green-300">
          <h3 className="font-bold text-lg mb-2">نظام الأدوار والصلاحيات</h3>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>الدور الأساسي: يحدد إما "مدير" أو "مستخدم" فقط</li>
            <li>الصلاحيات المخصصة: تمنح المستخدم صلاحيات إضافية محددة</li>
            <li>يمكن تحديد صلاحيات متعددة لكل مستخدم بشكل مستقل</li>
            <li>المدراء لديهم جميع الصلاحيات تلقائياً</li>
          </ul>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 rounded-lg p-4 text-purple-800 dark:text-purple-300">
          <h3 className="font-bold text-lg mb-2">أمان وسياسة الحسابات</h3>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>المستخدم غير النشط لا يمكنه تسجيل الدخول للنظام</li>
            <li>يجب استخدام كلمات مرور قوية (6 أحرف على الأقل)</li>
            <li>يجب ربط المستخدم بفرع محدد</li>
            <li>يمكنك تغيير صلاحيات المستخدم في أي وقت</li>
          </ul>
        </div>
      </div>
    </>
  );
}