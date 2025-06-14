import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, MoreVertical, Building, MessageSquare, Paperclip, CheckCircle, AlertTriangle, X, Pause } from 'lucide-react';
import { Task, TaskStatus } from '../types';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface TaskCardProps {
  task: Task;
  onUpdateStatus?: (taskData: { id: string, status: TaskStatus }) => void;
  isStatusLoading?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * بطاقة عرض المهمة المحسنة
 * تدعم وضع العرض المضغوط للوحة كانبان
 */
export function TaskCard({ task, onUpdateStatus, isStatusLoading, compact = false, className = '' }: TaskCardProps) {
  const navigate = useNavigate();
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  
  // تنسيق التاريخ
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // عرض الوقت المتبقي بطريقة ودية
  const formatTimeRemaining = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    
    // إذا كان التاريخ في الماضي
    if (date < now) {
      if (task.status === 'completed' || task.status === 'rejected') {
        return 'تم الإنجاز';
      }
      return 'متأخرة';
    }
    
    return formatDistanceToNow(date, { locale: ar, addSuffix: true });
  };
  
  // التحقق من تأخر المهمة
  const isOverdue = () => {
    if (!task.due_date || task.status === 'completed' || task.status === 'rejected') {
      return false;
    }
    
    const dueDate = new Date(task.due_date);
    const now = new Date();
    return dueDate < now;
  };
  
  // حساب نسبة الإكمال بناءً على الحالة
  const getCompletionPercentage = () => {
    switch (task.status) {
      case 'new':
        return 0;
      case 'in_progress':
        return 50;
      case 'completed':
        return 100;
      case 'rejected':
        return 100;
      case 'postponed':
        return 25;
      default:
        return 0;
    }
  };
  
  // عرض تفاصيل المهمة
  const handleViewTask = () => {
    navigate(`/admin/tasks/${task.id}`);
  };
  
  // فتح قائمة الإجراءات
  const handleToggleActions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActionsMenu(!showActionsMenu);
  };
  
  // تحديث حالة المهمة
  const handleUpdateStatus = (e: React.MouseEvent, status: TaskStatus) => {
    e.stopPropagation();
    if (onUpdateStatus) {
      onUpdateStatus({ id: task.id, status });
    }
    setShowActionsMenu(false);
  };
  
  // الحصول على أيقونة الحالة
  const getStatusIcon = (status: TaskStatus) => {
    switch(status) {
      case 'new':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-500" />;
      case 'postponed':
        return <Pause className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // في الوضع المضغوط (للكانبان) نعرض بطاقة مصغرة
  if (compact) {
    return (
      <motion.div
        className={`border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-all cursor-pointer group overflow-hidden ${className}`}
        whileHover={{ scale: 1.02, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}
        onClick={handleViewTask}
        layout
      >
        {/* شريط الأولوية */}
        <div className={`h-1 w-full ${
          task.priority === 'high' 
            ? 'bg-red-500'
            : task.priority === 'medium'
            ? 'bg-yellow-500'
            : 'bg-green-500'
        }`} />
        
        <div className="p-3">
          {/* العنوان مع شارة الحالة */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm line-clamp-1">{task.title}</h3>
            <TaskStatusBadge status={task.status} size="sm" />
          </div>
          
          {/* شريط التقدم */}
          <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full mb-2">
            <div 
              className={`h-full rounded-full ${
                task.status === 'completed' 
                  ? 'bg-green-500' 
                  : task.status === 'rejected'
                  ? 'bg-red-500'
                  : task.status === 'in_progress'
                  ? 'bg-yellow-500'
                  : task.status === 'postponed'
                  ? 'bg-purple-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${getCompletionPercentage()}%` }}
            />
          </div>
          
          {/* المعلومات الأساسية فقط */}
          <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{task.assignee?.full_name || 'غير مسند'}</span>
            </div>
            
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className={isOverdue() ? 'text-red-500 dark:text-red-400' : ''}>
                  {formatTimeRemaining(task.due_date)}
                </span>
              </div>
            )}
          </div>
          
          {/* المؤشرات والأيقونات */}
          <div className="mt-2 pt-2 border-t dark:border-gray-700 flex justify-between">
            <div className="flex items-center gap-2">
              <TaskPriorityBadge priority={task.priority} size="sm" />
              
              {/* عدد المرفقات إذا وجدت */}
              {task.attachmentsCount && task.attachmentsCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-gray-500">
                  <Paperclip className="h-3 w-3" />
                  <span className="text-xs">{task.attachmentsCount}</span>
                </span>
              )}
              
              {/* عدد التعليقات إذا وجدت */}
              {task.commentsCount && task.commentsCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-gray-500">
                  <MessageSquare className="h-3 w-3" />
                  <span className="text-xs">{task.commentsCount}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // العرض الكامل للبطاقة
  return (
    <motion.div
      className={`border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-all cursor-pointer group overflow-hidden ${className}`}
      onClick={handleViewTask}
      whileHover={{ scale: 1.01 }}
      layout
    >
      {/* شريط الأولوية */}
      <div className={`h-1 w-full ${
        task.priority === 'high' 
          ? 'bg-red-500'
          : task.priority === 'medium'
          ? 'bg-yellow-500'
          : 'bg-green-500'
      }`} />
      
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold line-clamp-1 text-gray-900 dark:text-white">{task.title}</h3>
            
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <TaskStatusBadge status={task.status} size="sm" />
              <TaskPriorityBadge priority={task.priority} size="sm" />
              
              {isOverdue() && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                  <Clock className="h-3 w-3" />
                  متأخرة
                </span>
              )}
            </div>
          </div>
          
          {/* قائمة الإجراءات */}
          <div className="relative">
            <button
              onClick={handleToggleActions}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            {showActionsMenu && (
              <div className="absolute left-0 top-full mt-1 z-10 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <div className="py-1">
                  <button
                    onClick={(e) => handleUpdateStatus(e, 'new')}
                    disabled={isStatusLoading || task.status === 'new'}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500 ml-2"></span>
                    تعيين كجديدة
                  </button>
                  <button
                    onClick={(e) => handleUpdateStatus(e, 'in_progress')}
                    disabled={isStatusLoading || task.status === 'in_progress'}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="h-2 w-2 rounded-full bg-yellow-500 ml-2"></span>
                    قيد التنفيذ
                  </button>
                  <button
                    onClick={(e) => handleUpdateStatus(e, 'completed')}
                    disabled={isStatusLoading || task.status === 'completed'}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="h-2 w-2 rounded-full bg-green-500 ml-2"></span>
                    تمت
                  </button>
                  <button
                    onClick={(e) => handleUpdateStatus(e, 'postponed')}
                    disabled={isStatusLoading || task.status === 'postponed'}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="h-2 w-2 rounded-full bg-purple-500 ml-2"></span>
                    تأجيل
                  </button>
                  <button
                    onClick={(e) => handleUpdateStatus(e, 'rejected')}
                    disabled={isStatusLoading || task.status === 'rejected'}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="h-2 w-2 rounded-full bg-red-500 ml-2"></span>
                    رفض
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* وصف المهمة */}
        {task.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">
            {task.description}
          </p>
        )}
        
        {/* شريط التقدم */}
        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full my-3">
          <div 
            className={`h-full rounded-full ${
              task.status === 'completed' 
                ? 'bg-green-500' 
                : task.status === 'rejected'
                ? 'bg-red-500'
                : task.status === 'in_progress'
                ? 'bg-yellow-500'
                : task.status === 'postponed'
                ? 'bg-purple-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${getCompletionPercentage()}%` }}
          />
        </div>
        
        {/* معلومات المهمة */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{task.assignee.full_name}</span>
            </div>
          )}
          
          {task.branch && (
            <div className="flex items-center gap-1">
              <Building className="h-3.5 w-3.5" />
              <span className="truncate">{task.branch.name}</span>
            </div>
          )}
          
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className={isOverdue() ? 'text-red-600 dark:text-red-400' : ''}>
                {formatDate(task.due_date)}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(task.created_at)}</span>
          </div>
        </div>
        
        {/* تعليقات ومرفقات */}
        <div className="mt-2 pt-2 border-t dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* أيقونة عدد التعليقات */}
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{task.commentsCount || 0}</span>
            </div>
            
            {/* أيقونة عدد المرفقات */}
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" />
              <span>{task.attachmentsCount || 0}</span>
            </div>
          </div>
          
          {isStatusLoading && (
            <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
          )}
        </div>
      </div>
    </motion.div>
  );
}