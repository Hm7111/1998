import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Pause, 
  Plus, 
  Filter,
  Search,
  Calendar,
  User,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { TaskCard } from '../TaskCard';
import { TaskStatus, Task } from '../../types';
import { useTaskActions } from '../../hooks/useTaskActions';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { TaskColumnHeader } from './TaskColumnHeader';
import { TaskFiltersBar } from './TaskFiltersBar';
import { useTaskList } from '../../hooks/useTaskList';

interface KanbanBoardProps {
  tasks: Task[];
  isLoading: boolean;
  onCreateTask?: () => void;
  onTaskClick?: (taskId: string) => void;
}

/**
 * لوحة كانبان متقدمة لإدارة المهام
 * تدعم السحب والإفلات لتغيير حالة المهام
 */
export function KanbanBoard({ tasks = [], isLoading, onCreateTask, onTaskClick }: KanbanBoardProps) {
  const { updateTaskStatus, loading } = useTaskActions();
  const { filters, updateFilters } = useTaskList();
  const [columns, setColumns] = useState<Record<TaskStatus, Task[]>>({
    new: [],
    in_progress: [],
    completed: [],
    rejected: [],
    postponed: []
  });

  // تنظيم المهام في الأعمدة المناسبة
  useEffect(() => {
    const newColumns: Record<TaskStatus, Task[]> = {
      new: [],
      in_progress: [],
      completed: [],
      rejected: [],
      postponed: []
    };
    
    tasks.forEach(task => {
      if (newColumns[task.status]) {
        newColumns[task.status].push(task);
      }
    });
    
    setColumns(newColumns);
  }, [tasks]);

  // التعامل مع سحب المهام وإفلاتها لتغيير الحالة
  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;

    // إذا تم الإفلات خارج منطقة قابلة للإفلات
    if (!destination) return;
    
    // إذا لم يتغير الموقع
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    // الحصول على العمود المصدر والهدف
    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;
    
    // إذا تم الإفلات في نفس العمود، قم فقط بإعادة ترتيب المهام
    if (sourceStatus === destStatus) {
      const newColumnTasks = [...columns[sourceStatus]];
      const [movedTask] = newColumnTasks.splice(source.index, 1);
      newColumnTasks.splice(destination.index, 0, movedTask);
      
      setColumns({
        ...columns,
        [sourceStatus]: newColumnTasks
      });
      return;
    }
    
    // إذا تم الإفلات في عمود آخر، قم بنقل المهمة وتحديث حالتها
    const sourceColumnTasks = [...columns[sourceStatus]];
    const destColumnTasks = [...columns[destStatus]];
    const [movedTask] = sourceColumnTasks.splice(source.index, 1);
    destColumnTasks.splice(destination.index, 0, movedTask);
    
    setColumns({
      ...columns,
      [sourceStatus]: sourceColumnTasks,
      [destStatus]: destColumnTasks
    });
    
    // تحديث حالة المهمة في قاعدة البيانات
    updateTaskStatus({ id: draggableId, status: destStatus });
  };

  // الحصول على أيقونة العمود وعنوانه
  const getColumnIcon = (status: TaskStatus) => {
    switch (status) {
      case 'new':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'in_progress':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <X className="h-5 w-5 text-red-500" />;
      case 'postponed':
        return <Pause className="h-5 w-5 text-purple-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getColumnTitle = (status: TaskStatus) => {
    switch (status) {
      case 'new':
        return 'جديدة';
      case 'in_progress':
        return 'قيد التنفيذ';
      case 'completed':
        return 'مكتملة';
      case 'rejected':
        return 'مرفوضة';
      case 'postponed':
        return 'مؤجلة';
      default:
        return 'غير معروفة';
    }
  };
  
  const getColumnColor = (status: TaskStatus) => {
    switch (status) {
      case 'new':
        return 'border-blue-400 bg-blue-50 dark:bg-blue-950/20';
      case 'in_progress':
        return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20';
      case 'completed':
        return 'border-green-400 bg-green-50 dark:bg-green-950/20';
      case 'rejected':
        return 'border-red-400 bg-red-50 dark:bg-red-950/20';
      case 'postponed':
        return 'border-purple-400 bg-purple-50 dark:bg-purple-950/20';
      default:
        return 'border-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  // ترتيب الأعمدة
  const columnOrder: TaskStatus[] = ['new', 'in_progress', 'completed', 'rejected', 'postponed'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="لا توجد مهام"
        description="لا توجد مهام مطابقة لمعايير البحث الحالية"
        action={onCreateTask ? {
          label: "إضافة مهمة جديدة",
          onClick: onCreateTask,
          icon: <Plus className="h-4 w-4" />
        } : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col">
      {/* شريط الفلاتر والبحث */}
      <TaskFiltersBar 
        filters={filters}
        onUpdateFilters={updateFilters}
        onCreateTask={onCreateTask}
      />
      
      <div className="h-[calc(100vh-260px)] overflow-auto pb-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex space-x-4 rtl:space-x-reverse h-full p-1">
            {columnOrder.map(status => (
              <div key={status} className={`flex-1 min-w-[300px] flex flex-col rounded-lg border-t-4 ${getColumnColor(status)}`}>
                <TaskColumnHeader 
                  icon={getColumnIcon(status)}
                  title={getColumnTitle(status)}
                  count={columns[status].length}
                />
                
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 overflow-y-auto bg-white dark:bg-gray-900 rounded-b-lg ${
                        snapshot.isDraggingOver ? 'bg-gray-50 dark:bg-gray-800' : ''
                      }`}
                    >
                      {columns[status].map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-2 ${snapshot.isDragging ? 'opacity-75' : ''}`}
                              onClick={() => onTaskClick && onTaskClick(task.id)}
                            >
                              <TaskCard 
                                task={task} 
                                isStatusLoading={loading[`status_${task.id}`]}
                                onUpdateStatus={updateTaskStatus}
                                compact={true}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}