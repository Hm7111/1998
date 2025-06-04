import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '../types';

/**
 * هوك متخصص لإدارة المستخدمين
 */
export function useUsers() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * إنشاء مستخدم جديد
   */
  const createUser = useCallback(async (userData: any) => {
    try {
      setIsLoading(true);

      // التحقق من وجود المستخدم قبل إنشائه
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', userData.email)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing user:', checkError);
      }

      // إذا كان المستخدم موجوداً بالفعل، نظهر رسالة خطأ
      if (existingUser) {
        toast({
          title: 'خطأ',
          description: 'البريد الإلكتروني مسجل مسبقاً',
          type: 'error',
        });
        return false;
      }

      // استدعاء Edge Function لإنشاء المستخدم
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          ...userData,
          // تحويل الصلاحيات إلى الشكل المناسب
          permissions: userData.permissions ? 
            Array.isArray(userData.permissions) ? 
              userData.permissions : 
              [userData.permissions] : 
            []
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // معالجة خطأ البريد المكرر بشكل واضح
        if (errorData.error && (
          errorData.error.includes('البريد الإلكتروني مسجل مسبقاً في نظام المصادقة') ||
          errorData.error.includes('already registered') || 
          errorData.error.includes('duplicate key') ||
          errorData.error.includes('users_email_key')
        )) {
          throw new Error('البريد الإلكتروني مسجل مسبقاً');
        } else {
          throw new Error(errorData.error || 'فشل إنشاء المستخدم');
        }
      }

      const result = await response.json();
      
      if (!result.user) {
        throw new Error('فشل في إنشاء المستخدم بشكل صحيح');
      }

      // تحديث ذاكرة التخزين المؤقت للاستعلامات
      queryClient.invalidateQueries({ queryKey: ['users'] });

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
  }, [toast, queryClient]);

  /**
   * تحديث مستخدم موجود
   */
  const updateUser = useCallback(async (userId: string, userData: any) => {
    try {
      setIsLoading(true);

      // تحديث بيانات المستخدم في الجدول
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
        // استخدام Edge Function لتحديث كلمة المرور
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            userId,
            password: userData.password
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'فشل في تحديث كلمة المرور');
        }
      }

      // تحديث ذاكرة التخزين المؤقت للاستعلامات
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });

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
  }, [toast, queryClient]);

  /**
   * تغيير حالة تنشيط المستخدم
   */
  const toggleUserStatus = useCallback(async (userId: string, isActive: boolean) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('users')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // تحديث ذاكرة التخزين المؤقت للاستعلامات
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });

      toast({
        title: isActive ? 'تم تنشيط المستخدم' : 'تم تعطيل المستخدم',
        description: isActive ? 'تم تنشيط حساب المستخدم بنجاح' : 'تم تعطيل حساب المستخدم بنجاح',
        type: 'success'
      });

      return true;
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث حالة المستخدم',
        type: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  /**
   * استرداد كلمة مرور المستخدم
   */
  const resetUserPassword = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);

      // البريد الإلكتروني للمستخدم مطلوب لإرسال إعادة تعيين كلمة المرور
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('لم يتم العثور على المستخدم');

      // استخدام Edge Function لإعادة تعيين كلمة المرور
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'reset_password',
          email: userData.email
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في إرسال رابط إعادة تعيين كلمة المرور');
      }

      toast({
        title: 'تم الإرسال',
        description: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريد المستخدم الإلكتروني',
        type: 'success'
      });

      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إعادة تعيين كلمة المرور',
        type: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * تحديث صلاحيات المستخدم
   */
  const updateUserPermissions = useCallback(async (userId: string, permissions: any[]) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('users')
        .update({
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // تحديث ذاكرة التخزين المؤقت للاستعلامات
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث صلاحيات المستخدم بنجاح',
        type: 'success'
      });

      return true;
    } catch (error) {
      console.error('Error updating user permissions:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث صلاحيات المستخدم',
        type: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  return {
    isLoading,
    createUser,
    updateUser,
    toggleUserStatus,
    resetUserPassword,
    updateUserPermissions
  };
}