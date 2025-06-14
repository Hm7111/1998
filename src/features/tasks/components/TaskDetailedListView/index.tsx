import { useState, useRef, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  User, 
  Building, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Pause, 
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  Flag,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskDetailedListViewProps {
  tasks: Task[];
  onUpdateStatus: (taskData: { id: string, status: TaskStatus }) => void;
  isStatusLoading: Record<string, boolean>;
  onTaskClick?: (taskId: string) => void;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

const TaskDetailedListView = ({
  tasks,
  onUpdateStatus,
  isStatusLoading,
  onTaskClick,
  onEditTask,
  onDeleteTask
}: TaskDetailedListViewProps) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'created_at' | 'due_date' | 'priority'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // المرجع للعنصر المتوسع
  const expandedRowRef = useRef<HTMLDivElement>(null);

  // تأثير للتمرير إلى العنصر المتوسع
  useEffect(() => {
    if (expandedTaskId && expandedRowRef.current) {
      setTimeout(() => {
        expandedRowRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  }, [expandedTaskId]);

  // تبديل توسيع/طي التفاصيل
  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  // دالة لتنسيق التاريخ
  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: ar });
  };
  
  // دالة لحساب الوقت المتبقي
  const getTimeRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    
    if (due < now) {
      return { isOverdue: true, text: 'متأخرة' };
    }
    
    return { 
      isOverdue: false, 
      text: formatDistanceToNow(due, { locale: ar, addSuffix: true })
    };
  };

  // دالة للحصول على معلومات الحالة
  const getStatusInfo = (status: TaskStatus) => {
    switch(status) {
      case 'new':
        return {
          label: 'جديدة',
          icon: <Clock className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/30',
          indicatorColor: 'bg-blue-500'
        };
      case 'in_progress':
        return {
          label: 'قيد التنفيذ',
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/30',
          indicatorColor: 'bg-yellow-500'
        };
      case 'completed':
        return {
          label: 'مكتملة',
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800/30',
          indicatorColor: 'bg-green-500'
        };
      case 'rejected':
        return {
          label: 'مرفوضة',
          icon: <X className="h-4 w-4" />,
          color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800/30',
          indicatorColor: 'bg-red-500'
        };
      case 'postponed':
        return {
          label: 'مؤجلة',
          icon: <Pause className="h-4 w-4" />,
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800/30',
          indicatorColor: 'bg-purple-500'
        };
      default:
        return {
          label: 'غير معروفة',
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
          indicatorColor: 'bg-gray-500'
        };
    }
  };

  // دالة للحصول على معلومات الأولوية
  const getPriorityInfo = (priority: TaskPriority) => {
    switch(priority) {
      case 'high':
        return {
          label: 'عالية',
          icon: <Flag className="h-4 w-4" />,
          color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800/30',
        };
      case 'medium':
        return {
          label: 'متوسطة',
          icon: <Flag className="h-4 w-4" />,
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/30',
        };
      case 'low':
        return {
          label: 'منخفضة',
          icon: <Flag className="h-4 w-4" />,
          color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800/30',
        };
      default:
        return {
          label: 'غير محددة',
          icon: <Flag className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
        };
    }
  };

  // ترتيب المهام
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortField === 'created_at') {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortField === 'due_date') {
      // إذا لم يكن هناك تاريخ استحقاق، ضعه في آخر القائمة
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return sortDirection === 'asc' ? 1 : -1;
      if (!b.due_date) return sortDirection === 'asc' ? -1 : 1;
      
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortField === 'priority') {
      const priorityOrder: Record<TaskPriority, number> = { 
        high: 3, 
        medium: 2, 
        low: 1 
      };
      const orderA = priorityOrder[a.priority] || 0;
      const orderB = priorityOrder[b.priority] || 0;
      return sortDirection === 'asc' ? orderA - orderB : orderB - orderA;
    }
    
    // افتراضي: ترتيب حسب تاريخ الإنشاء
    return sortDirection === 'asc' 
      ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // تغيير معيار الترتيب
  const handleSortChange = (field: 'created_at' | 'due_date' | 'priority') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // افتراضي: ترتيب تنازلي عند تغيير الحقل
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 overflow-hidden">
      {/* رأس الجدول */}
      <div className="sticky top-0 bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-800 z-10">
        <div className="grid grid-cols-12 py-4 px-4 gap-4 font-medium text-sm text-gray-600 dark:text-gray-400">
          <div className="col-span-5 md:col-span-3 flex items-center cursor-pointer" onClick={() => handleSortChange('created_at')}>
            <span>المهمة</span>
            {sortField === 'created_at' && (
              sortDirection === 'asc' 
                ? <ChevronUp className="h-4 w-4 ml-1" /> 
                : <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </div>
          
          <div className="hidden md:flex md:col-span-2 items-center">
            <span>المكلف بها</span>
          </div>
          
          <div className="col-span-3 md:col-span-2 flex items-center justify-center cursor-pointer" onClick={() => handleSortChange('priority')}>
            <span>الأولوية</span>
            {sortField === 'priority' && (
              sortDirection === 'asc' 
                ? <ChevronUp className="h-4 w-4 ml-1" /> 
                : <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </div>
          
          <div className="col-span-3 md:col-span-2 flex items-center justify-center cursor-pointer" onClick={() => handleSortChange('due_date')}>
            <span>تاريخ الاستحقاق</span>
            {sortField === 'due_date' && (
              sortDirection === 'asc' 
                ? <ChevronUp className="h-4 w-4 ml-1" /> 
                : <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </div>
          
          <div className="hidden md:flex md:col-span-2 items-center justify-center">
            <span>الحالة</span>
          </div>
          
          <div className="col-span-1 flex items-center justify-center">
            <span></span>
          </div>
        </div>
      </div>

      {/* جسم الجدول */}
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {sortedTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            لا توجد مهام للعرض
          </div>
        ) : (
          sortedTasks.map(task => {
            const statusInfo = getStatusInfo(task.status);
            const priorityInfo = getPriorityInfo(task.priority);
            const isExpanded = expandedTaskId === task.id;
            
            // حساب حالة تاريخ الاستحقاق
            let dueInfo = { isOverdue: false, text: 'غير محدد' };
            if (task.due_date) {
              dueInfo = getTimeRemaining(task.due_date);
            }
            
            return (
              <React.Fragment key={task.id}>
                {/* صف المهمة */}
                <div 
                  className={`grid grid-cols-12 py-4 px-4 gap-4 items-center hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                    isExpanded ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''
                  }`}
                  onClick={() => toggleExpand(task.id)}
                >
                  {/* عنوان المهمة وشريط الحالة */}
                  <div className="col-span-5 md:col-span-3 flex items-center gap-3">
                    <div className={`w-1 h-10 rounded-full self-stretch ${statusInfo.indicatorColor}`} />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">{task.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                        {new Date(task.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  
                  {/* المكلف بالمهمة */}
                  <div className="hidden md:flex md:col-span-2 items-center">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-medium truncate max-w-[100px]">
                          {task.assignee.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">غير مسند</span>
                    )}
                  </div>
                  
                  {/* الأولوية */}
                  <div className="col-span-3 md:col-span-2 flex justify-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${priorityInfo.color} border gap-1`}>
                      {priorityInfo.icon}
                      <span className="hidden md:inline">{priorityInfo.label}</span>
                    </span>
                  </div>
                  
                  {/* تاريخ الاستحقاق */}
                  <div className="col-span-3 md:col-span-2 flex justify-center">
                    {task.due_date ? (
                      <span className={`inline-flex items-center gap-1 text-xs ${
                        dueInfo.isOverdue 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{dueInfo.text}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">غير محدد</span>
                    )}
                  </div>
                  
                  {/* حالة المهمة */}
                  <div className="hidden md:flex md:col-span-2 items-center justify-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${statusInfo.color} border gap-1`}>
                      {statusInfo.icon}
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>
                  
                  {/* زر التوسيع */}
                  <div className="col-span-1 flex justify-center">
                    <button 
                      className={`p-1.5 rounded-full text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors transform ${
                        isExpanded ? 'rotate-180' : 'rotate-0'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(task.id);
                      }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* تفاصيل المهمة الموسعة */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      ref={expandedRowRef}
                      key={`details-${task.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="col-span-12 overflow-hidden bg-gray-50 dark:bg-gray-900/30 border-t dark:border-gray-800"
                    >
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* القسم الأيسر: التفاصيل الرئيسية */}
                          <div className="md:col-span-2 space-y-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{task.title}</h3>
                              
                              {task.description && (
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 mt-3">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {task.description}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {/* المرفقات والتعليقات */}
                            <div className="mt-6 pt-4 border-t dark:border-gray-800">
                              <div className="flex flex-wrap gap-4">
                                {(task.attachmentsCount || 0) > 0 && (
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Paperclip className="h-4 w-4" />
                                    <span>{task.attachmentsCount} مرفق</span>
                                  </div>
                                )}
                                
                                {(task.commentsCount || 0) > 0 && (
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <MessageSquare className="h-4 w-4" />
                                    <span>{task.commentsCount} تعليق</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* القسم الأيمن: البطاقة الجانبية */}
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                            <h4 className="font-medium mb-4 text-gray-900 dark:text-white">تفاصيل المهمة</h4>
                            
                            <div className="space-y-4">
                              {/* الحالة */}
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">الحالة</span>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${statusInfo.color} border gap-1`}>
                                  {statusInfo.icon}
                                  <span>{statusInfo.label}</span>
                                </span>
                              </div>
                              
                              {/* الأولوية */}
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">الأولوية</span>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${priorityInfo.color} border gap-1`}>
                                  {priorityInfo.icon}
                                  <span>{priorityInfo.label}</span>
                                </span>
                              </div>
                              
                              {/* المكلف بها */}
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">المكلف بها</span>
                                {task.assignee ? (
                                  <span className="text-sm font-medium">{task.assignee.full_name}</span>
                                ) : (
                                  <span className="text-sm text-gray-500 dark:text-gray-400">غير مسند</span>
                                )}
                              </div>
                              
                              {/* تاريخ الإنشاء */}
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">تاريخ الإنشاء</span>
                                <span className="text-sm">
                                  {formatDate(task.created_at)}
                                </span>
                              </div>
                              
                              {/* تاريخ الاستحقاق */}
                              {task.due_date && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">تاريخ الاستحقاق</span>
                                  <span className={`text-sm ${dueInfo.isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                                    {formatDate(task.due_date)}
                                  </span>
                                </div>
                              )}
                              
                              {/* الفرع */}
                              {task.branch && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">الفرع</span>
                                  <div className="flex items-center gap-1">
                                    <Building className="h-3.5 w-3.5 text-gray-500" />
                                    <span className="text-sm">{task.branch.name}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* الملاحظات */}
                            {task.notes && (
                              <div className="mt-6 pt-4 border-t dark:border-gray-700">
                                <h5 className="text-sm font-medium mb-2 text-gray-900 dark:text-white">ملاحظات</h5>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                                  {task.notes}
                                </p>
                              </div>
                            )}
                            
                            {/* أزرار الإجراءات */}
                            <div className="mt-6 pt-4 border-t dark:border-gray-700 flex justify-between">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onTaskClick) onTaskClick(task.id);
                                }}
                                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>عرض</span>
                              </button>
                              
                              <div className="flex gap-2">
                                {onEditTask && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditTask(task.id);
                                    }}
                                    className="px-2 py-1.5 text-sm bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                
                                {onDeleteTask && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteTask(task.id);
                                    }}
                                    className="px-2 py-1.5 text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskDetailedListView;