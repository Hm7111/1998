import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { User, UserFormData, UserFilters } from '../types';
import { useQueryClient } from '@tanstack/react-query';

/**
 * هوك لإدارة المستخدمين
 */
export function useUsers() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * جلب قائمة المستخدمين مع إمكانية التصفية
   */
  const getUsers = useCallback(async (filters?: UserFilters) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('users')
        .select('*, branches(*)');
      
      // تطبيق الفلاتر
      if (filters) {
        if (filters.branch_id) {
          query = query.eq('branch_id', filters.branch_id);
        }
        
        if (filters.role) {
          query = query.eq('role', filters.role);
        }
        
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }
      }
      
      // ترتيب النتائج
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // تطبيق فلتر البحث (يتم تطبيقه بعد جلب البيانات لأن Supabase لا يدعم البحث في عدة حقول)
      let filteredData = data || [];
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredData = filteredData.filter(user => 
          user.full_name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          (user.branches?.name && user.branches.name.toLowerCase().includes(searchTerm))
        );
      }
      
      return filteredData as User[];
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب المستخدمين';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * إنشاء مستخدم جديد
   */
  const createUser = useCallback(async (userData: UserFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // التحقق من وجود المستخدم مسبقًا
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email) 
        .maybeSingle();

      if (existingUser) {
        throw new Error('البريد الإلكتروني مسجل مسبقاً');
      }

      // التحقق من أن الدور الأساسي مسموح به (admin أو user)
      const { data: allowedRoles } = await supabase.rpc('get_allowed_roles');
      
      if (Array.isArray(allowedRoles) && !allowedRoles.includes(userData.role)) {
        throw new Error(`الدور الأساسي غير مسموح به. الأدوار المسموح بها هي: ${allowedRoles.join(', ')}`);
      }
      
      // إنشاء مستخدم جديد باستخدام Supabase Auth
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role,
          branch_id: userData.branch_id
        }
      });
      
      if (createError) {
        throw new Error(`فشل إنشاء المستخدم: ${createError.message || 'خطأ غير معروف'}`);
      }

      if (!data.user || !data.user.id) {
        throw new Error('لم يتم إنشاء المستخدم بشكل صحيح');
      }
      
      const userId = data.user.id;

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          branch_id: userData.branch_id,
          permissions: userData.permissions,
          is_active: userData.is_active !== undefined ? userData.is_active : true
        });
      
      if (insertError) {
        console.error('Error inserting user record:', insertError);
        throw insertError;
      }
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء المستخدم بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء المستخدم';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  /**
   * تحديث مستخدم موجود
   */
  const updateUser = useCallback(async (userId: string, userData: Partial<UserFormData>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Updating user with data:', userData);
      
      // التحقق من أن الدور الأساسي مسموح به (admin أو user)
      if (userData.role) {
        const { data: allowedRoles } = await supabase.rpc('get_allowed_roles');
        
        if (Array.isArray(allowedRoles) && !allowedRoles.includes(userData.role)) {
          throw new Error(`الدور الأساسي غير مسموح به. الأدوار المسموح بها هي: ${allowedRoles.join(', ')}`);
        }
      }
      
      // تحديث بيانات المستخدم في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          branch_id: userData.branch_id || null,
          is_active: userData.is_active,
          permissions: userData.permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;
      
      // تحديث كلمة المرور إذا تم توفيرها
      if (userData.password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(userId, {
          password: userData.password
        });
        
        if (passwordError) {
          throw new Error(
            `فشل تحديث كلمة المرور: ${
              passwordError.message || 'خطأ غير معروف'
            }`
          );
        }
      }
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث المستخدم بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث المستخدم';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  /**
   * تغيير حالة تنشيط المستخدم
   */
  const toggleUserActive = useCallback(async (userId: string, isActive: boolean) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast({
        title: isActive ? 'تم تنشيط الحساب' : 'تم تعطيل الحساب',
        description: isActive ? 'تم تنشيط حساب المستخدم بنجاح' : 'تم تعطيل حساب المستخدم بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error toggling user active state:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تغيير حالة المستخدم';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  /**
   * حذف مستخدم
   */
  const deleteUser = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // التحقق من وجود خطابات مرتبطة بالمستخدم
      const { count, error: countError } = await supabase
        .from('letters')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        throw new Error(`لا يمكن حذف هذا المستخدم لأنه مرتبط بـ ${count} خطاب. يمكنك تعطيل حسابه بدلاً من حذفه.`);
      }
      
      // حذف المستخدم من قاعدة البيانات
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف المستخدم بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف المستخدم';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  return {
    isLoading,
    error,
    getUsers,
    createUser,
    updateUser,
    toggleUserActive,
    deleteUser
  };
}