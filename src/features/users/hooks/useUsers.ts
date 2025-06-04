import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';

export function useUsers() {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const createUser = async (userData: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    branch_id?: string;
    permissions?: string[];
    is_active?: boolean;
  }) => {
    try {
      setLoading(true);

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();
      
      if (existingUser) {
        throw new Error('البريد الإلكتروني مسجل مسبقاً');
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
        const error = await response.json();
        throw new Error(error.error || 'فشل إنشاء المستخدم');
      }

      const result = await response.json();
      
      if (!result.user) {
        throw new Error('لم يتم إنشاء المستخدم بشكل صحيح');
      }

      showToast({
        type: 'success',
        message: 'تم إنشاء المستخدم بنجاح'
      });

      return result.user;
    } catch (error) {
      console.error('Error creating user:', error);
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء المستخدم'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createUser
  };
}