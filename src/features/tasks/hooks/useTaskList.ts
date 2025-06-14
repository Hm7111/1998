import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { Task, TaskFilters, TaskSummary } from '../types';

/**
 * هوك محسن للحصول على قائمة المهام وتصفيتها
 */
export function useTaskList() {
  const { toast } = useToast();
  const { dbUser, isAdmin, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  // حالة الفلاتر المحسنة
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    priority: 'all',
    assigned_to: null,
    branch_id: null,
    search: '',
    timeframe: 'all',
    taskType: 'all' // إضافة فلتر لنوع المهمة
  });

  // استعلام لجلب المهام
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tasks', filters, dbUser?.id],
    queryFn: async () => {
      try {
        // التحقق من صلاحيات المستخدم
        if (!hasPermission('view:tasks') && 
            !hasPermission('view:tasks:assigned') && 
            !hasPermission('view:tasks:own')) {
          toast({
            title: 'خطأ',
            description: 'ليس لديك صلاحية لعرض المهام',
            type: 'error'
          });
          return [];
        }
        
        // إنشاء استعلام قاعدة بيانات ديناميكي
        let query = supabase
          .from('tasks')
          .select(`
            *,
            creator:created_by(id, full_name, email, role),
            assignee:assigned_to(id, full_name, email, role),
            branch:branch_id(id, name, code)
          `).eq('is_active', true);

        // تطبيق الفلاتر
        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        
        if (filters.priority && filters.priority !== 'all') {
          query = query.eq('priority', filters.priority);
        }
        
        if (filters.assigned_to) {
          query = query.eq('assigned_to', filters.assigned_to);
        } else {
          // التحقق من صلاحيات المستخدم لفلترة المهام
          const canViewAllTasks = isAdmin || hasPermission('view:tasks:all');
          const canViewCreatedTasks = hasPermission('view:tasks:own');
          const canViewAssignedTasks = hasPermission('view:tasks:assigned');
          
          if (!canViewAllTasks) {
            if (filters.taskType === 'assigned_to_me' && canViewAssignedTasks) {
              // عرض المهام المسندة للمستخدم فقط
              query = query.eq('assigned_to', dbUser?.id);
            } 
            else if (filters.taskType === 'created_by_me' && canViewCreatedTasks) {
              // عرض المهام التي أنشأها المستخدم فقط
              query = query.eq('created_by', dbUser?.id);
            } 
            else {
              // افتراضيًا، عرض المهام حسب الصلاحيات
              let conditions = [];
              
              if (canViewCreatedTasks) {
                conditions.push(`created_by.eq.${dbUser?.id}`);
              }
              
              if (canViewAssignedTasks) {
                conditions.push(`assigned_to.eq.${dbUser?.id}`);
              }
              
              if (conditions.length > 0) {
                query = query.or(conditions.join(','));
              } else {
                // إذا لم تكن هناك صلاحيات محددة
                return [];
              }
            }
          }
        }
        
        // تطبيق فلتر الفرع
        if (filters.branch_id) {
          query = query.eq('branch_id', filters.branch_id);
        } else if (!isAdmin && dbUser?.branch_id && filters.taskType !== 'created_by_me') {
          // عدم تطبيق فلتر الفرع عند عرض المهام التي أنشأها المستخدم
          if (!hasPermission('view:tasks:all') && !hasPermission('view:tasks:own') && filters.taskType !== 'created_by_me') {
            query = query.eq('branch_id', dbUser.branch_id);
          }
        }
        
        // تطبيق فلتر الإطار الزمني
        if (filters.timeframe && filters.timeframe !== 'all') {
          const now = new Date().toISOString();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (filters.timeframe === 'today') {
            // المهام المستحقة اليوم
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', tomorrow.toISOString());
          } else if (filters.timeframe === 'week') {
            // المهام المستحقة خلال الأسبوع
            const weekLater = new Date(today);
            weekLater.setDate(weekLater.getDate() + 7);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', weekLater.toISOString());
          } else if (filters.timeframe === 'month') {
            // المهام المستحقة خلال الشهر
            const monthLater = new Date(today);
            monthLater.setMonth(monthLater.getMonth() + 1);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', monthLater.toISOString());
          } else if (filters.timeframe === 'overdue') {
            // المهام المتأخرة
            query = query
              .lt('due_date', now)
              .not('status', 'in', '(completed,rejected)');
          }
        }

        // الترتيب
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // فلترة إضافية حسب البحث
        let filteredTasks = data || [];
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredTasks = filteredTasks.filter(task =>
            task.title?.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower) ||
            task.assignee?.full_name?.toLowerCase().includes(searchLower) ||
            task.creator?.full_name?.toLowerCase().includes(searchLower)
          );
        }
        
        // إضافة معلومات إضافية للمهام
        const enhancedTasks = await Promise.all(filteredTasks.map(async task => {
          // عدد المرفقات
          const { count: attachmentsCount, error: attachmentsError } = await supabase
            .from('task_attachments')
            .select('id', { count: 'exact', head: true })
            .eq('task_id', task.id);
            
          // عدد التعليقات
          const { data: comments, error: commentsError } = await supabase
            .from('task_logs')
            .select('id')
            .eq('task_id', task.id)
            .eq('action', 'comment');
            
          return {
            ...task,
            attachmentsCount: attachmentsCount || 0,
            commentsCount: comments?.length || 0
          };
        }));

        return enhancedTasks as Task[];
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: 'Error',
          description: 'حدث خطأ أثناء تحميل المهام',
          type: 'error'
        });
        return [];
      }
    },
    enabled: !!dbUser?.id && (
      hasPermission('view:tasks') || 
      hasPermission('view:tasks:assigned') || 
      hasPermission('view:tasks:own')
    ),
    staleTime: 1000 * 60 * 2, // دقيقتان
    refetchInterval: 1000 * 60 * 5, // 5 دقائق
    refetchOnWindowFocus: true
  });
  
  // استعلام لجلب ملخص المهام
  const {
    data: taskSummary = {
      total: 0,
      new: 0,
      inProgress: 0,
      completed: 0,
      rejected: 0,
      postponed: 0,
      overdue: 0,
      assignedToMe: 0,
      createdByMe: 0
    },
    isLoading: isSummaryLoading
  } = useQuery({
    queryKey: ['task-summary', dbUser?.id, filters.branch_id],
    queryFn: async () => {
      try {
        // إنشاء استعلام أساسي
        const createBaseQuery = () => {
          let baseQuery = supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('is_active', true);
          
          // تطبيق الفلاتر حسب صلاحيات المستخدم
          if (!isAdmin && !hasPermission('view:tasks:all')) {
            let conditions = [];
            
            if (hasPermission('view:tasks:own')) {
              conditions.push(`created_by.eq.${dbUser?.id}`);
            }
            
            if (hasPermission('view:tasks:assigned')) {
              conditions.push(`assigned_to.eq.${dbUser?.id}`);
            }
            
            if (conditions.length > 0) {
              baseQuery = baseQuery.or(conditions.join(','));
            } else {
              // إذا لم تكن هناك صلاحيات، لا تعرض أي شيء
              return baseQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // معرّف غير موجود
            }
          }
          
          if (filters.branch_id) {
            baseQuery = baseQuery.eq('branch_id', filters.branch_id);
          } else if (!isAdmin && dbUser?.branch_id && !hasPermission('view:tasks:all') && !hasPermission('view:tasks:own')) {
            // تطبيق فلتر الفرع فقط عند الضرورة
            baseQuery = baseQuery.eq('branch_id', dbUser.branch_id);
          }
          
          return baseQuery;
        };
        
        // إجمالي عدد المهام
        const { count: total, error: totalError } = await createBaseQuery();
        if (totalError) throw totalError;
        
        // المهام الجديدة
        const { count: newCount, error: newError } = await createBaseQuery()
          .eq('status', 'new');
        if (newError) throw newError;
        
        // المهام قيد التنفيذ
        const { count: inProgressCount, error: inProgressError } = await createBaseQuery()
          .eq('status', 'in_progress');
        if (inProgressError) throw inProgressError;
        
        // المهام المكتملة
        const { count: completedCount, error: completedError } = await createBaseQuery()
          .eq('status', 'completed');
        if (completedError) throw completedError;
        
        // المهام المرفوضة
        const { count: rejectedCount, error: rejectedError } = await createBaseQuery()
          .eq('status', 'rejected');
        if (rejectedError) throw rejectedError;
        
        // المهام المؤجلة
        const { count: postponedCount, error: postponedError } = await createBaseQuery()
          .eq('status', 'postponed');
        if (postponedError) throw postponedError;
        
        // المهام المتأخرة
        const now = new Date().toISOString();
        const { count: overdueCount, error: overdueError } = await createBaseQuery()
          .lt('due_date', now)
          .not('status', 'in', '(completed,rejected)');
        if (overdueError) throw overdueError;
        
        // المهام المسندة للمستخدم
        const { count: assignedToMeCount, error: assignedToMeError } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', dbUser?.id)
          .eq('is_active', true);
        if (assignedToMeError) throw assignedToMeError;
        
        // المهام التي أنشأها المستخدم
        const { count: createdByMeCount, error: createdByMeError } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', dbUser?.id)
          .eq('is_active', true);
        if (createdByMeError) throw createdByMeError;
        
        return {
          total: total || 0,
          new: newCount || 0,
          inProgress: inProgressCount || 0,
          completed: completedCount || 0,
          rejected: rejectedCount || 0,
          postponed: postponedCount || 0,
          overdue: overdueCount || 0,
          assignedToMe: assignedToMeCount || 0,
          createdByMe: createdByMeCount || 0
        } as TaskSummary;
      } catch (error) {
        console.error('Error fetching task summary:', error);
        return {
          total: 0,
          new: 0,
          inProgress: 0,
          completed: 0,
          rejected: 0,
          postponed: 0,
          overdue: 0,
          assignedToMe: 0,
          createdByMe: 0
        } as TaskSummary;
      }
    },
    enabled: !!dbUser?.id && (
      hasPermission('view:tasks') || 
      hasPermission('view:tasks:assigned') || 
      hasPermission('view:tasks:own')
    ),
    staleTime: 1000 * 60 * 5, // 5 دقائق
    refetchInterval: 1000 * 60 * 10 // 10 دقائق
  });

  /**
   * تحديث الفلاتر
   */
  const updateFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * إعادة ضبط الفلاتر
   */
  const resetFilters = useCallback(() => {
    setFilters({
      status: 'all',
      priority: 'all',
      assigned_to: null,
      branch_id: null,
      search: '',
      timeframe: 'all',
      taskType: 'all'
    });
  }, []);

  return {
    tasks,
    isLoading,
    error,
    taskSummary,
    isSummaryLoading,
    filters,
    updateFilters,
    resetFilters,
    refetchTasks: refetch
  };
}