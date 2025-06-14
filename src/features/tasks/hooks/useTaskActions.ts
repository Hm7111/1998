import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { TaskFormData, TaskUpdate, TaskComment, Task, TaskLog, TaskTimeRecord } from '../types';

/**
 * هوك لإدارة عمليات المهام مثل الإنشاء والتحديث والحذف
 * تمت إضافة وظائف متقدمة لتتبع الوقت والتقارير
 */
export function useTaskActions() {
  const { toast } = useToast();
  const { dbUser, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  
  /**
   * جلب تفاصيل مهمة محددة مع سجلات التغييرات
   */
  const useTaskDetails = (taskId: string | undefined) => {
    return useQuery({
      queryKey: ['task', taskId],
      queryFn: async () => {
        if (!taskId) return null;
        
        // التحقق من صلاحيات المستخدم
        if (!hasPermission('view:tasks') && !hasPermission('view:tasks:assigned') && !hasPermission('view:tasks:own')) {
          throw new Error('ليس لديك صلاحية لعرض المهام');
        }
        
        try {
          // جلب بيانات المهمة الأساسية
          const { data, error } = await supabase
            .from('tasks')
            .select(`
              *,
              creator:created_by(id, full_name, email, role),
              assignee:assigned_to(id, full_name, email, role),
              branch:branch_id(id, name, code)
            `)
            .eq('id', taskId)
            .single();
            
          if (error) throw error;
          
          // التحقق من صلاحية الوصول للمهمة
          if (!hasPermission('view:tasks:all') && 
              !hasPermission('view:tasks') &&
              !hasPermission('view:tasks:own') && 
              data.created_by !== dbUser?.id && 
              !hasPermission('view:tasks:assigned') && 
              data.assigned_to !== dbUser?.id) {
            throw new Error('ليس لديك صلاحية للوصول إلى هذه المهمة');
          }
          
          // جلب سجلات التغييرات
          const { data: logs, error: logsError } = await supabase
            .from('task_logs')
            .select(`
              *,
              user:user_id(id, full_name, email, role)
            `)
            .eq('task_id', taskId)
            .order('created_at', { ascending: false });
            
          if (logsError) throw logsError;
          
          // جلب المرفقات
          const { data: attachments, error: attachmentsError } = await supabase
            .from('task_attachments')
            .select(`
              *,
              user:uploaded_by(id, full_name, email, role)
            `)
            .eq('task_id', taskId)
            .order('uploaded_at', { ascending: false });
            
          if (attachmentsError) throw attachmentsError;
          
          // محاولة جلب سجلات الوقت المسجل (مع التعامل مع الخطأ إذا لم تكن الدالة موجودة)
          let timeRecords = [];
          try {
            const { data: timeData, error: timeError } = await supabase.rpc(
              'get_task_time_records',
              { p_task_id: taskId }
            );
            
            if (timeError) {
              console.warn('Function get_task_time_records not found, using fallback method');
              // استخدام طريقة بديلة لجلب البيانات من جدول task_logs
              const { data: fallbackTimeData, error: fallbackError } = await supabase
                .from('task_logs')
                .select(`
                  id,
                  created_at,
                  notes,
                  user:user_id(id, full_name, email, role)
                `)
                .eq('task_id', taskId)
                .eq('action', 'time_record')
                .order('created_at', { ascending: false });
              
              if (!fallbackError && fallbackTimeData) {
                // تحويل البيانات إلى تنسيق سجلات الوقت
                timeRecords = fallbackTimeData.map(record => ({
                  id: record.id,
                  task_id: taskId,
                  user_id: record.user?.id,
                  duration: 0, // لا يمكن الحصول على المدة من السجلات القديمة
                  notes: record.notes,
                  created_at: record.created_at,
                  user: record.user
                }));
              }
            } else {
              timeRecords = timeData || [];
            }
          } catch (rpcError) {
            console.warn('Error fetching time records:', rpcError);
            // نتجاهل الخطأ ونستمر بالتنفيذ مع بيانات فارغة
            timeRecords = [];
          }
          
          return {
            ...data,
            logs: logs || [],
            attachments: attachments || [],
            timeRecords: timeRecords
          };
        } catch (error) {
          console.error('Error fetching task details:', error);
          throw error;
        }
      },
      enabled: !!taskId && !!dbUser?.id,
      staleTime: 1000 * 60, // دقيقة واحدة
      refetchOnWindowFocus: true
    });
  };

  /**
   * إنشاء مهمة جديدة
   */
  const createTask = useMutation({
    mutationFn: async (taskData: TaskFormData) => {
      // التحقق من صلاحيات المستخدم
      if (!hasPermission('create:tasks') && !hasPermission('create:tasks:own')) {
        throw new Error('ليس لديك صلاحية لإنشاء مهام');
      }
      
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لإنشاء مهمة');
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          created_by: dbUser.id,
          branch_id: taskData.branch_id || dbUser.branch_id
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'تم بنجاح',
        description: 'تم إنشاء المهمة بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-summary'] });
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في إنشاء المهمة',
        type: 'error'
      });
    }
  });

  /**
   * تحديث بيانات مهمة
   */
  const updateTask = useMutation({
    mutationFn: async (taskUpdate: TaskUpdate) => {
      // التحقق من صلاحيات المستخدم
      if (!hasPermission('edit:tasks') && 
          !(hasPermission('edit:tasks:own') && await isTaskOwner(taskUpdate.id))) {
        throw new Error('ليس لديك صلاحية لتعديل هذه المهمة');
      }
      
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لتحديث المهمة');
      
      const { id, ...updateData } = taskUpdate;
      
      setLoading(prev => ({ ...prev, [id]: true }));
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      setLoading(prev => ({ ...prev, [id]: false }));
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث المهمة بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['task-summary'] });
    },
    onError: (error, variables) => {
      console.error('Error updating task:', error);
      setLoading(prev => ({ ...prev, [variables.id]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في تحديث المهمة',
        type: 'error'
      });
    }
  });

  /**
   * تغيير حالة المهمة
   */
  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: Task['status'] }) => {
      // التحقق من صلاحيات المستخدم
      if (!hasPermission('edit:tasks') && 
          !(hasPermission('edit:tasks:own') && await isTaskOwner(id)) &&
          !(hasPermission('complete:tasks:own') && await isTaskAssignee(id))) {
        throw new Error('ليس لديك صلاحية لتحديث حالة المهمة');
      }
      
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لتحديث حالة المهمة');
      
      setLoading(prev => ({ ...prev, [`status_${id}`]: true }));
      
      // محاولة استخدام الدالة المخصصة أو استخدام التحديث المباشر
      try {
        const { data, error } = await supabase.rpc('update_task_status', {
          p_task_id: id,
          p_status: status,
          p_completion_date: status === 'completed' ? new Date().toISOString() : null
        });

        if (error) throw error;
        
        setLoading(prev => ({ ...prev, [`status_${id}`]: false }));
        return data;
      } catch (rpcError) {
        console.warn('RPC function not available, using direct update');
        
        // استخدام التحديث المباشر كبديل
        const updateData: any = { 
          status, 
          updated_at: new Date().toISOString() 
        };
        
        if (status === 'completed') {
          updateData.completion_date = new Date().toISOString();
        }
        
        const { data, error } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
          
        if (error) throw error;
        
        setLoading(prev => ({ ...prev, [`status_${id}`]: false }));
        return data;
      }
    },
    onSuccess: (_, variables) => {
      const statusLabels = {
        new: 'جديدة',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتملة',
        rejected: 'مرفوضة',
        postponed: 'مؤجلة'
      };
      
      toast({
        title: 'تم تحديث الحالة',
        description: `تم تغيير حالة المهمة إلى "${statusLabels[variables.status]}"`,
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['task-summary'] });
    },
    onError: (error, variables) => {
      console.error('Error updating task status:', error);
      setLoading(prev => ({ ...prev, [`status_${variables.id}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في تحديث حالة المهمة',
        type: 'error'
      });
    }
  });

  /**
   * إضافة تعليق للمهمة
   */
  const addTaskComment = useMutation({
    mutationFn: async (comment: TaskComment) => {
      // التحقق من صلاحيات المستخدم
      if (!await canAccessTask(comment.task_id)) {
        throw new Error('ليس لديك صلاحية للتعليق على هذه المهمة');
      }
      
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لإضافة تعليق');
      
      setLoading(prev => ({ ...prev, [`comment_${comment.task_id}`]: true }));
      
      // محاولة استخدام الدالة المخصصة أو استخدام الإدراج المباشر
      try {
        const { data, error } = await supabase.rpc('add_task_comment', {
          p_task_id: comment.task_id,
          p_user_id: dbUser.id,
          p_comment: comment.notes
        });
        
        if (error) throw error;
        
        setLoading(prev => ({ ...prev, [`comment_${comment.task_id}`]: false }));
        return data;
      } catch (rpcError) {
        console.warn('RPC function not available, using direct insert');
        
        // استخدام الإدراج المباشر كبديل
        const { data, error } = await supabase
          .from('task_logs')
          .insert({
            task_id: comment.task_id,
            user_id: dbUser.id,
            action: 'comment',
            notes: comment.notes
          })
          .select()
          .single();
          
        if (error) throw error;
        
        setLoading(prev => ({ ...prev, [`comment_${comment.task_id}`]: false }));
        return data;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'تم إضافة التعليق',
        description: 'تم إضافة التعليق بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['task', variables.task_id] });
    },
    onError: (error, variables) => {
      console.error('Error adding comment:', error);
      setLoading(prev => ({ ...prev, [`comment_${variables.task_id}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في إضافة التعليق',
        type: 'error'
      });
    }
  });

  /**
   * حذف (إلغاء تنشيط) مهمة
   */
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      // التحقق من صلاحيات المستخدم
      if (!hasPermission('delete:tasks') && 
          !(hasPermission('delete:tasks:own') && await isTaskOwner(id))) {
        throw new Error('ليس لديك صلاحية لحذف هذه المهمة');
      }
      
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لحذف المهمة');
      
      setLoading(prev => ({ ...prev, [`delete_${id}`]: true }));
      
      const { error } = await supabase
        .from('tasks')
        .update({ is_active: false })
        .eq('id', id);
        
      if (error) throw error;
      
      setLoading(prev => ({ ...prev, [`delete_${id}`]: false }));
      return true;
    },
    onSuccess: () => {
      toast({
        title: 'تم الحذف',
        description: 'تم حذف المهمة بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-summary'] });
    },
    onError: (error, id) => {
      console.error('Error deleting task:', error);
      setLoading(prev => ({ ...prev, [`delete_${id}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في حذف المهمة',
        type: 'error'
      });
    }
  });

  /**
   * رفع مرفق للمهمة
   */
  const uploadTaskAttachment = useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string, file: File }) => {
      // التحقق من صلاحيات المستخدم
      if (!await canAccessTask(taskId)) {
        throw new Error('ليس لديك صلاحية لرفع مرفقات لهذه المهمة');
      }
      
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لرفع مرفق');
      
      setLoading(prev => ({ ...prev, [`upload_${taskId}`]: true }));
      
      try {
        // رفع الملف إلى التخزين
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${taskId}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('task_attachments')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        // الحصول على الرابط العام
        const { data: { publicUrl } } = supabase.storage
          .from('task_attachments')
          .getPublicUrl(filePath);
        
        // تسجيل المرفق في قاعدة البيانات
        const { data, error } = await supabase
          .from('task_attachments')
          .insert({
            task_id: taskId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            file_url: publicUrl,
            uploaded_by: dbUser.id
          })
          .select()
          .single();
          
        if (error) throw error;
        
        setLoading(prev => ({ ...prev, [`upload_${taskId}`]: false }));
        return data;
      } catch (error) {
        setLoading(prev => ({ ...prev, [`upload_${taskId}`]: false }));
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'تم الرفع',
        description: 'تم رفع المرفق بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
    onError: (error, variables) => {
      console.error('Error uploading attachment:', error);
      setLoading(prev => ({ ...prev, [`upload_${variables.taskId}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في رفع المرفق',
        type: 'error'
      });
    }
  });

  /**
   * حذف مرفق للمهمة
   */
  const deleteTaskAttachment = useMutation({
    mutationFn: async ({ id, taskId, fileUrl }: { id: string, taskId: string, fileUrl: string }) => {
      // التحقق من صلاحيات المستخدم
      if (!await canAccessTask(taskId)) {
        throw new Error('ليس لديك صلاحية لحذف مرفقات من هذه المهمة');
      }
      
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لحذف المرفق');
      
      setLoading(prev => ({ ...prev, [`delete_attachment_${id}`]: true }));
      
      // حذف الملف من التخزين
      const filePath = fileUrl.split('/').slice(-2).join('/');
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('task_attachments')
          .remove([filePath]);
        
        if (storageError) {
          console.warn('Error removing file from storage:', storageError);
          // نستمر على الرغم من ذلك لحذف السجل
        }
      }
      
      // حذف السجل من قاعدة البيانات
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setLoading(prev => ({ ...prev, [`delete_attachment_${id}`]: false }));
      return true;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'تم الحذف',
        description: 'تم حذف المرفق بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
    onError: (error, variables) => {
      console.error('Error deleting attachment:', error);
      setLoading(prev => ({ ...prev, [`delete_attachment_${variables.id}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في حذف المرفق',
        type: 'error'
      });
    }
  });
  
  /**
   * حفظ وقت مسجل
   */
  const saveTimeRecord = useMutation({
    mutationFn: async (timeData: TaskTimeRecord) => {
      // التحقق من صلاحيات المستخدم
      if (!await canAccessTask(timeData.taskId)) {
        throw new Error('ليس لديك صلاحية لتسجيل وقت لهذه المهمة');
      }
      
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لتسجيل وقت المهمة');
      
      setLoading(prev => ({ ...prev, [`time_${timeData.taskId}`]: true }));
      
      // محاولة استخدام الدالة المخصصة أو استخدام الإدراج المباشر
      try {
        const { data, error } = await supabase.rpc('save_task_time_record', {
          p_task_id: timeData.taskId,
          p_user_id: dbUser.id,
          p_duration: timeData.duration,
          p_notes: timeData.notes || null
        });
        
        if (error) throw error;
        
        setLoading(prev => ({ ...prev, [`time_${timeData.taskId}`]: false }));
        return data;
      } catch (rpcError) {
        console.warn('RPC function not available, using direct insert');
        
        // استخدام الإدراج المباشر كبديل
        const { data, error } = await supabase
          .from('task_logs')
          .insert({
            task_id: timeData.taskId,
            user_id: dbUser.id,
            action: 'time_record',
            notes: `${timeData.duration} seconds${timeData.notes ? ` - ${timeData.notes}` : ''}`
          })
          .select()
          .single();
          
        if (error) throw error;
        
        setLoading(prev => ({ ...prev, [`time_${timeData.taskId}`]: false }));
        return data;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ الوقت المسجل بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
    onError: (error, variables) => {
      console.error('Error saving time record:', error);
      setLoading(prev => ({ ...prev, [`time_${variables.taskId}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في حفظ الوقت المسجل',
        type: 'error'
      });
    }
  });

  // وظائف مساعدة للتحقق من الصلاحيات
  
  /**
   * التحقق ما إذا كان المستخدم هو مالك المهمة
   */
  const isTaskOwner = async (taskId: string) => {
    if (!dbUser?.id) return false;
    
    const { data, error } = await supabase
      .from('tasks')
      .select('created_by')
      .eq('id', taskId)
      .single();
      
    if (error || !data) return false;
    return data.created_by === dbUser.id;
  };
  
  /**
   * التحقق ما إذا كان المستخدم هو المكلف بالمهمة
   */
  const isTaskAssignee = async (taskId: string) => {
    if (!dbUser?.id) return false;
    
    const { data, error } = await supabase
      .from('tasks')
      .select('assigned_to')
      .eq('id', taskId)
      .single();
      
    if (error || !data) return false;
    return data.assigned_to === dbUser.id;
  };
  
  /**
   * التحقق من صلاحية الوصول إلى المهمة
   */
  const canAccessTask = async (taskId: string) => {
    if (!dbUser?.id) return false;
    
    // المدير لديه وصول إلى كل المهام
    if (hasPermission('view:tasks:all') || hasPermission('view:tasks')) {
      return true;
    }
    
    // التحقق ما إذا كان المستخدم هو مالك المهمة
    if (hasPermission('view:tasks:own') && await isTaskOwner(taskId)) {
      return true;
    }
    
    // التحقق ما إذا كان المستخدم هو المكلف بالمهمة
    if (hasPermission('view:tasks:assigned') && await isTaskAssignee(taskId)) {
      return true;
    }
    
    return false;
  };

  return {
    loading,
    useTaskDetails,
    createTask: createTask.mutate,
    isCreateLoading: createTask.isLoading,
    updateTask: updateTask.mutate,
    updateTaskStatus: updateTaskStatus.mutate,
    addTaskComment: addTaskComment.mutate,
    deleteTask: deleteTask.mutate,
    uploadTaskAttachment: uploadTaskAttachment.mutate,
    deleteTaskAttachment: deleteTaskAttachment.mutate,
    saveTimeRecord: saveTimeRecord.mutate,
    isTaskOwner,
    isTaskAssignee,
    canAccessTask
  };
}