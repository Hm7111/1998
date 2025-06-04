import { useState } from 'react';
import { X } from 'lucide-react';
import type { User } from '../../types/database';
import { useUsers } from '../../features/users/hooks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { UserForm } from './UserForm';

interface Props {
  user?: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserDialog({ user, isOpen, onClose, onSuccess }: Props) {
  const { createUser, updateUser, isLoading } = useUsers();

  // جلب الفروع
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 دقائق
    refetchOnWindowFocus: false
  });

  // معالجة تقديم النموذج
  async function handleSubmit(userData: any) {
    try {
      let success;

      if (user?.id) {
        // تحديث مستخدم موجود
        success = await updateUser(user.id, userData);
      } else {
        // إنشاء مستخدم جديد
        success = await createUser(userData);
      }
      
      if (success) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error handling user submission:', error);
    }
  }

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center overflow-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-3xl">
        <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {user ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto">
          <UserForm
            user={user}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            branches={branches}
          />
        </div>
      </div>
    </div>
  );
}