import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { Task, TaskFilters, TaskSummary } from '../types';

/**
 * Hook para obtener la lista de tareas y filtrarla
 */
export function useTaskList() {
  const { toast } = useToast();
  const { dbUser, isAdmin, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  // Estado de filtros
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    priority: 'all',
    assigned_to: null,
    branch_id: null,
    search: '',
    timeframe: 'all',
    taskType: 'all' // Agregar filtro para tipo de tarea
  });

  // Consulta para obtener las tareas
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tasks', filters, dbUser?.id],
    queryFn: async () => {
      try {
        let query = supabase
          .from('tasks')
          .select(`
            *,
            creator:created_by(id, full_name, email, role),
            assignee:assigned_to(id, full_name, email, role),
            branch:branch_id(id, name, code)
          `);

        // Aplicar filtros
        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        
        if (filters.priority && filters.priority !== 'all') {
          query = query.eq('priority', filters.priority);
        }
        
        if (filters.assigned_to) {
          query = query.eq('assigned_to', filters.assigned_to);
        } else {
          // Verificar permisos para filtrar tareas
          const canViewAllTasks = isAdmin || hasPermission('view:tasks:all');
          const canViewCreatedTasks = hasPermission('view:tasks:own');
          const canViewAssignedTasks = hasPermission('view:tasks:assigned');
          
          if (!canViewAllTasks) {
            if (filters.taskType === 'assigned_to_me' && canViewAssignedTasks) {
              // Ver solo tareas asignadas al usuario
              query = query.eq('assigned_to', dbUser?.id);
            } 
            else if (filters.taskType === 'created_by_me' && canViewCreatedTasks) {
              // Ver solo tareas creadas por el usuario
              query = query.eq('created_by', dbUser?.id);
            } 
            else {
              // Por defecto, ver tareas según permisos
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
                // Fallback si no hay permisos específicos
                return [];
              }
            }
          }
        }
        
        // Aplicar filtro de sucursal solo cuando sea necesario
        if (filters.branch_id) {
          query = query.eq('branch_id', filters.branch_id);
        } else if (!isAdmin && dbUser?.branch_id && filters.taskType !== 'created_by_me') {
          // Mejora: No aplicar filtro de sucursal cuando se están viendo tareas creadas por el usuario
          if (!hasPermission('view:tasks:all') && !hasPermission('view:tasks:own') && filters.taskType !== 'created_by_me') {
            query = query.eq('branch_id', dbUser.branch_id);
          }
        }
        
        // Filtrar por marco de tiempo
        if (filters.timeframe && filters.timeframe !== 'all') {
          const now = new Date().toISOString();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (filters.timeframe === 'today') {
            // Tareas para hoy
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', tomorrow.toISOString());
          } else if (filters.timeframe === 'week') {
            // Tareas para esta semana
            const weekLater = new Date(today);
            weekLater.setDate(weekLater.getDate() + 7);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', weekLater.toISOString());
          } else if (filters.timeframe === 'month') {
            // Tareas para este mes
            const monthLater = new Date(today);
            monthLater.setMonth(monthLater.getMonth() + 1);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', monthLater.toISOString());
          } else if (filters.timeframe === 'overdue') {
            // Tareas vencidas
            query = query
              .lt('due_date', now)
              .not('status', 'eq', 'completed')
              .not('status', 'eq', 'rejected');
          }
        }

        // Ordenar
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // Filtrar adicionalmente por búsqueda
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

        return filteredTasks as Task[];
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: 'Error',
          description: 'Error al cargar las tareas',
          type: 'error'
        });
        return [];
      }
    },
    enabled: !!dbUser?.id
  });
  
  // Consulta para obtener resumen de tareas
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
        // Crear consulta base
        const createBaseQuery = () => {
          let baseQuery = supabase.from('tasks').select('*');
          
          // Aplicar filtros por permisos
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
              // Si no tiene permisos, no mostrar nada
              return baseQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // ID que no existe
            }
          }
          
          if (filters.branch_id) {
            baseQuery = baseQuery.eq('branch_id', filters.branch_id);
          } else if (!isAdmin && dbUser?.branch_id && !hasPermission('view:tasks:all') && !hasPermission('view:tasks:own')) {
            // Aplicar filtro de sucursal solo cuando sea necesario
            baseQuery = baseQuery.eq('branch_id', dbUser.branch_id);
          }
          
          return baseQuery;
        };
        
        // Total
        const { data: totalData, error: totalError } = await createBaseQuery().select('id');
        if (totalError) throw totalError;
        const total = totalData?.length || 0;
        
        // Nuevas
        const { data: newData } = await createBaseQuery()
          .eq('status', 'new')
          .select('id');
        const newCount = newData?.length || 0;
        
        // En progreso
        const { data: inProgressData } = await createBaseQuery()
          .eq('status', 'in_progress')
          .select('id');
        const inProgressCount = inProgressData?.length || 0;
        
        // Completadas
        const { data: completedData } = await createBaseQuery()
          .eq('status', 'completed')
          .select('id');
        const completedCount = completedData?.length || 0;
        
        // Rechazadas
        const { data: rejectedData } = await createBaseQuery()
          .eq('status', 'rejected')
          .select('id');
        const rejectedCount = rejectedData?.length || 0;
        
        // Pospuestas
        const { data: postponedData } = await createBaseQuery()
          .eq('status', 'postponed')
          .select('id');
        const postponedCount = postponedData?.length || 0;
        
        // Vencidas
        const now = new Date().toISOString();
        const { data: overdueData } = await createBaseQuery()
          .lt('due_date', now)
          .not('status', 'eq', 'completed')
          .not('status', 'eq', 'rejected')
          .select('id');
        const overdueCount = overdueData?.length || 0;
        
        // Asignadas a mí
        const { data: assignedToMeData } = await supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', dbUser?.id);
        const assignedToMeCount = assignedToMeData?.length || 0;
        
        // Creadas por mí
        const { data: createdByMeData } = await supabase
          .from('tasks')
          .select('id')
          .eq('created_by', dbUser?.id);
        const createdByMeCount = createdByMeData?.length || 0;
        
        return {
          total,
          new: newCount,
          inProgress: inProgressCount,
          completed: completedCount,
          rejected: rejectedCount,
          postponed: postponedCount,
          overdue: overdueCount,
          assignedToMe: assignedToMeCount,
          createdByMe: createdByMeCount
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
    enabled: !!dbUser?.id,
    refetchInterval: 60000 // Actualizar cada minuto
  });

  /**
   * Actualizar filtros
   */
  const updateFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Reiniciar filtros
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