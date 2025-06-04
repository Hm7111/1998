import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';

export function useUsers() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // إنشاء مستخدم جديد
  const createUser = useCallback(async (userData: any) => {
    try {
      setIsLoading(true);

      // التحقق من وجود المستخدم قبل إنشائه
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing user:', checkError);
      }

      if (existingUser) {
        toast({
          title: 'خطأ',
          description: 'البريد الإلكتروني مسجل مسبقاً',
          type: 'error',
        });
        return false;
      }

      // Call the Edge Function to create user
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Handle specific error cases from the Edge Function
        if (errorData.error && errorData.error.includes('already been registered')) {
          throw new Error('البريد الإلكتروني مسجل مسبقاً');
        } else if (errorData.error && errorData.error.includes('Unauthorized')) {
          throw new Error('غير مصرح لك بإنشاء مستخدمين');
        } else {
          throw new Error(errorData.error || 'فشل إنشاء المستخدم');
        }
      }

      const result = await response.json();
      
      if (!result.user) {
        throw new Error('لم يتم إنشاء المستخدم بشكل صحيح');
      }

      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء المستخدم بنجاح',
        type: 'success'
      });

      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء المستخدم',
        type: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // تحديث مستخدم موجود
  const updateUser = useCallback(async (userId: string, userData: any) => {
    try {
      setIsLoading(true);

      // تحديث بيانات المستخدم
      const { error } = await supabase
        .from('users')
        .update({
          full_name: userData.full_name,
          role: userData.role,
          branch_id: userData.branch_id,
          permissions: userData.permissions,
          is_active: userData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // تحديث كلمة المرور إذا تم تغييرها
      if (userData.password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          userId,
          { password: userData.password }
        );

        if (passwordError) throw passwordError;
      }

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث بيانات المستخدم بنجاح',
        type: 'success'
      });

      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث بيانات المستخدم',
        type: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // حذف المستخدمين غير النشطين
  const cleanupInactiveUsers = useCallback(async (olderThanDays = 90) => {
    try {
      setIsLoading(true);
      
      // حساب التاريخ قبل X يوم
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      // الحصول على المستخدمين غير النشطين القديمين
      const { data: inactiveUsers, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', false)
        .lt('updated_at', cutoffDate.toISOString());
      
      if (fetchError) throw fetchError;
      
      if (!inactiveUsers || inactiveUsers.length === 0) {
        return { count: 0, message: 'لا يوجد مستخدمين غير نشطين للتنظيف' };
      }
      
      // حذف المستخدمين غير النشطين
      const userIds = inactiveUsers.map(user => user.id);
      
      // حذف من جدول المستخدمين
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .in('id', userIds);
      
      if (deleteError) throw deleteError;
      
      // حذف من نظام المصادقة
      for (const userId of userIds) {
        await supabase.auth.admin.deleteUser(userId);
      }
      
      return { 
        count: userIds.length, 
        message: `تم حذف ${userIds.length} مستخدم غير نشط بنجاح` 
      };
    } catch (error) {
      console.error('Error cleaning up inactive users:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    createUser,
    updateUser,
    cleanupInactiveUsers
  };
}