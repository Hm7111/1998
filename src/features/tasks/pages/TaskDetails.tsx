import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  X,
  Clock,
  Edit,
  Trash2,
  AlertTriangle,
  Calendar,
  User,
  Building,
  Flag,
  MessageSquare,
  Pause,
  ChevronDown,
  FileText,
  Paperclip
} from 'lucide-react';
import { useTaskActions } from '../hooks/useTaskActions';
import { TaskStatus, TaskComment, TaskPriority } from '../types';
import { TaskStatusBadge } from '../components/TaskStatusBadge';
import { TaskPriorityBadge } from '../components/TaskPriorityBadge';
import { TaskTimeline } from '../components/TaskTimeline';
import { TaskAttachments } from '../components/TaskAttachments';
import { TaskCommentForm } from '../components/TaskCommentForm';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../lib/auth';
import { TaskForm } from '../components/TaskForm';
import { NotificationBadge } from '../../notifications/components';
import { StatusChangeDialog } from '../components/StatusChangeDialog';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * صفحة عرض تفاصيل المهمة المحسنة
 */
export function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, dbUser, hasPermission } = useAuth();
  
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentTab, setCurrentTab] = useState<'details' | 'activity' | 'attachments'>('details');
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);
  
  const {
    useTaskDetails,
    updateTask,
    updateTaskStatus,
    addTaskComment,
    deleteTask,
    uploadTaskAttachment,
    deleteTaskAttachment,
    loading
  } = useTaskActions();
  
  // جلب تفاصيل المهمة
  const { data: task, isLoading, error, refetch } = useTaskDetails(id);
  
  // تنسيق التاريخ
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // تنسيق الوقت
  const formatTime = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // حساب الوقت المستغرق
  const calculateDuration = () => {
    if (!task) return null;
    
    // إذا كانت المهمة مكتملة نحسب الوقت من تاريخ الإنشاء حتى تاريخ الإكمال
    if (task.status === 'completed' && task.completion_date) {
      const start = new Date(task.created_at).getTime();
      const end = new Date(task.completion_date).getTime();
      const durationMs = end - start;
      const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
      const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (durationDays > 0) {
        return `${durationDays} يوم${durationDays > 1 ? '' : ''} و ${durationHours} ساعة${durationHours > 1 ? '' : ''}`;
      } else {
        return `${durationHours} ساعة${durationHours > 1 ? '' : ''}`;
      }
    }
    
    // إذا كانت المهمة لا تزال جارية أو مؤجلة أو مرفوضة
    // نحسب الوقت من تاريخ الإنشاء حتى الآن
    const start = new Date(task.created_at).getTime();
    const now = new Date().getTime();
    return formatDistanceToNow(new Date(task.created_at), { locale: ar, addSuffix: false });
  };
  
  // التحقق من تأخر المهمة
  const isOverdue = () => {
    if (!task?.due_date || task.status === 'completed' || task.status === 'rejected') {
      return false;
    }
    
    const dueDate = new Date(task.due_date);
    const now = new Date();
    return dueDate < now;
  };
  
  // التحقق إذا كان المستخدم الحالي هو المكلف بالمهمة
  const isAssignee = () => {
    return task?.assigned_to === dbUser?.id;
  };
  
  // التحقق إذا كان المستخدم الحالي هو منشئ المهمة
  const isCreator = () => {
    return task?.created_by === dbUser?.id;
  };
  
  // التحقق من صلاحيات التعديل
  const canEdit = () => {
    return isAdmin || isCreator() || (isAssignee() && hasPermission('edit:tasks:own'));
  };
  
  // التحقق من صلاحيات الحذف
  const canDelete = () => {
    return isAdmin || isCreator();
  };
  
  // التحقق من صلاحيات تغيير الحالة
  const canChangeStatus = () => {
    return isAdmin || isAssignee() || (isCreator() && hasPermission('edit:tasks:own'));
  };

  // تغيير حالة المهمة
  const handleStatusChange = (status: TaskStatus) => {
    if (!id || !canChangeStatus()) return;

    // إظهار مربع حوار لتوضيح سبب التأجيل أو الرفض
    if (status === 'postponed' || status === 'rejected' || status === 'completed') {
      setSelectedStatus(status);
      setShowStatusChangeDialog(true);
    } else {
      // حالات أخرى يمكن تغييرها مباشرة
      updateTaskStatus(
        { id, status },
        {
          onSuccess: () => {
            const statusNames = {
              new: 'جديدة',
              in_progress: 'قيد التنفيذ',
              completed: 'مكتملة',
              rejected: 'مرفوضة',
              postponed: 'مؤجلة'
            };
            
            toast({
              title: 'تم تحديث الحالة',
              description: `تم تغيير حالة المهمة إلى "${statusNames[status]}"`,
              type: 'success'
            });
            
            refetch();
          }
        }
      );
    }
  };
  
  // تأكيد تغيير الحالة مع السبب
  const handleConfirmStatusChange = (status: TaskStatus, reason: string) => {
    if (!id) return;
    
    updateTaskStatus(
      { id, status, reason },
      {
        onSuccess: () => {
          const statusNames = {
            new: 'جديدة',
            in_progress: 'قيد التنفيذ',
            completed: 'مكتملة',
            rejected: 'مرفوضة',
            postponed: 'مؤجلة'
          };
          
          toast({
            title: 'تم تحديث الحالة',
            description: `تم تغيير حالة المهمة إلى "${statusNames[status]}"`,
            type: 'success'
          });
          
          setShowStatusChangeDialog(false);
          refetch();
        }
      }
    );
  };
  
  // تحديث المهمة
  const handleUpdateTask = async (formData: any) => {
    if (!id || !canEdit()) return;
    
    try {
      await updateTask({ id, ...formData });
      setShowEditForm(false);
      refetch();
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث المهمة بنجاح',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating task:', error);
      
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المهمة',
        type: 'error'
      });
    }
  };
  
  // حذف المهمة
  const handleDeleteTask = () => {
    if (!id || !canDelete()) return;
    
    deleteTask(id, {
      onSuccess: () => {
        toast({
          title: 'تم الحذف',
          description: 'تم حذف المهمة بنجاح',
          type: 'success'
        });
        
        navigate('/admin/tasks');
      }
    });
  };
  
  // إضافة تعليق
  const handleAddComment = (commentText: string) => {
    if (!id) return;
    
    const comment: TaskComment = {
      task_id: id,
      notes: commentText
    };
    
    addTaskComment(comment, {
      onSuccess: () => {
        refetch();
        
        toast({
          title: 'تم إضافة التعليق',
          description: 'تم إضافة التعليق بنجاح',
          type: 'success'
        });
      }
    });
  };
  
  // رفع مرفق
  const handleUploadAttachment = (file: File) => {
    if (!id) return;
    
    uploadTaskAttachment({ taskId: id, file }, {
      onSuccess: () => {
        refetch();
      }
    });
  };
  
  // حذف مرفق
  const handleDeleteAttachment = (attachmentId: string) => {
    if (!id || !task) return;
    
    const attachment = task.attachments?.find(a => a.id === attachmentId);
    if (!attachment) return;
    
    deleteTaskAttachment({
      id: attachmentId,
      taskId: id,
      fileUrl: attachment.file_url
    }, {
      onSuccess: () => {
        refetch();
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-x-2 mb-6">
          <button
            onClick={() => navigate('/admin/tasks')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">تفاصيل المهمة</h1>
        </div>
        
        <div className="bg-red-50 text-red-600 p-6 rounded-lg text-center flex flex-col items-center">
          <AlertTriangle className="h-16 w-16 mb-4" />
          <h2 className="text-xl font-bold mb-2">لا يمكن العثور على المهمة</h2>
          <p className="mb-4">الرجاء التأكد من الرابط أو أن المهمة لم تحذف</p>
          <button
            onClick={() => navigate('/admin/tasks')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
          >
            العودة للخلف
          </button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-x-2 mb-6">
          <button
            onClick={() => navigate('/admin/tasks')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">تفاصيل المهمة</h1>
        </div>
        
        <div className="bg-red-50 text-red-600 p-6 rounded-lg text-center">
          <h2 className="text-xl font-bold mb-2">لا يمكن العثور على المهمة</h2>
          <p>المهمة غير موجودة أو ليس لديك صلاحية الوصول إليها</p>
        </div>
      </div>
    );
  }

  // نموذج التعديل
  if (showEditForm) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-x-2 mb-6">
          <button
            onClick={() => setShowEditForm(false)}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">تعديل المهمة</h1>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-6">
          <TaskForm
            initialData={task}
            onSubmit={handleUpdateTask}
            isLoading={loading[id] || false}
            isEditMode
          />
        </div>
      </div>
    );
  }

  // نافذة تأكيد الحذف
  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 dark:text-gray-400">
              هل أنت متأكد من رغبتك في حذف هذه المهمة؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
          </div>
          
          <div className="flex justify-center gap-3">
            <button
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg"
              onClick={() => setShowDeleteConfirm(false)}
            >
              إلغاء
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              onClick={handleDeleteTask}
              disabled={loading[`delete_${id}`] || false}
            >
              {loading[`delete_${id}`] ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>جارِ الحذف...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>تأكيد الحذف</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* نافذة تغيير الحالة مع توضيح السبب */}
      {showStatusChangeDialog && selectedStatus && (
        <StatusChangeDialog 
          isOpen={showStatusChangeDialog}
          onClose={() => setShowStatusChangeDialog(false)}
          onConfirm={handleConfirmStatusChange}
          status={selectedStatus}
          isLoading={loading[`status_${id}`] || false}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-x-2">
          <button
            onClick={() => navigate('/admin/tasks')}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">تفاصيل المهمة</h1>
          <TaskStatusBadge status={task.status} size="md" className="mr-2" />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBadge />
          
          {canEdit() && (
            <button
              onClick={() => setShowEditForm(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title="تعديل المهمة"
            >
              <Edit className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          
          {canDelete() && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title="حذف المهمة"
            >
              <Trash2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* العمود الرئيسي */}
        <div className="md:col-span-2 space-y-6">
          {/* بطاقة التبويب */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 overflow-hidden">
            <div className="border-b dark:border-gray-800 p-0">
              <div className="flex overflow-x-auto">
                <button
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 ${
                    currentTab === 'details' ? 'border-primary text-primary' : 'border-transparent'
                  }`}
                  onClick={() => setCurrentTab('details')}
                >
                  <FileText className="inline-block h-4 w-4 mr-2" />
                  التفاصيل
                </button>
                <button
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 ${
                    currentTab === 'activity' ? 'border-primary text-primary' : 'border-transparent'
                  }`}
                  onClick={() => setCurrentTab('activity')}
                >
                  <Clock className="inline-block h-4 w-4 mr-2" />
                  سجل النشاط
                </button>
                <button
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 ${
                    currentTab === 'attachments' ? 'border-primary text-primary' : 'border-transparent'
                  }`}
                  onClick={() => setCurrentTab('attachments')}
                >
                  <Paperclip className="inline-block h-4 w-4 mr-2" />
                  المرفقات
                  {(task.attachments?.length || 0) > 0 && (
                    <span className="inline-block ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-xs rounded-full">
                      {task.attachments?.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {/* محتوى التبويب */}
            <div className="p-6">
              {currentTab === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold mb-4">{task.title}</h2>
                    
                    <div className="flex items-center flex-wrap gap-2 mb-4">
                      <TaskPriorityBadge priority={task.priority} size="md" />
                      
                      {isOverdue() && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          <Clock className="h-4 w-4" />
                          متأخرة
                        </span>
                      )}
                    </div>
                    
                    {task.description && (
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
                        <h3 className="font-medium mb-2">وصف المهمة</h3>
                        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {task.description}
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">المكلف بالمهمة</h3>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{task.assignee?.full_name || 'غير مسند'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">منشئ المهمة</h3>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <User className="h-4 w-4 text-green-600 dark:text-green-300" />
                          </div>
                          <span className="font-medium">{task.creator?.full_name || 'غير معروف'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">الفرع</h3>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Building className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                          </div>
                          <span className="font-medium">{task.branch?.name || 'غير محدد'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">تاريخ الإنشاء</h3>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{formatDate(task.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">تاريخ الاستحقاق</h3>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full ${
                            isOverdue() 
                              ? 'bg-red-100 dark:bg-red-900/30' 
                              : 'bg-amber-100 dark:bg-amber-900/30'
                          } flex items-center justify-center`}>
                            <Calendar className={`h-4 w-4 ${
                              isOverdue() 
                                ? 'text-red-600 dark:text-red-300' 
                                : 'text-amber-600 dark:text-amber-300'
                            }`} />
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-medium ${
                              isOverdue() ? 'text-red-600 dark:text-red-400' : ''
                            }`}>
                              {task.due_date ? formatDate(task.due_date) : 'غير محدد'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {task.completion_date && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">تاريخ الإكمال</h3>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-300" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{formatDate(task.completion_date)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* عرض الوقت المستغرق في المهمة */}
                    <div className="border dark:border-gray-700 rounded-lg p-4 mb-6">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        معلومات الوقت
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                          <div className="text-sm text-blue-800 dark:text-blue-300">مدة العمل</div>
                          <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                            {calculateDuration() || 'لم يحسب بعد'}
                          </div>
                        </div>
                        
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400">الحالة الزمنية</div>
                          <div className="text-lg font-bold">
                            {task.status === 'completed' ? (
                              <span className="text-green-600 dark:text-green-400">مكتملة</span>
                            ) : task.status === 'rejected' ? (
                              <span className="text-red-600 dark:text-red-400">مرفوضة</span>
                            ) : task.status === 'postponed' ? (
                              <span className="text-purple-600 dark:text-purple-400">مؤجلة</span>
                            ) : isOverdue() ? (
                              <span className="text-red-600 dark:text-red-400">متأخرة</span>
                            ) : (
                              <span className="text-blue-600 dark:text-blue-400">جارية</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {task.notes && (
                      <div>
                        <h3 className="font-medium mb-2">ملاحظات</h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* التعليقات */}
                  <div className="pt-6 border-t dark:border-gray-800">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      التعليقات
                      {task.logs && task.logs.filter(log => log.action === 'comment').length > 0 && (
                        <span className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                          {task.logs.filter(log => log.action === 'comment').length}
                        </span>
                      )}
                    </h3>
                    
                    <div className="space-y-4">
                      {task.logs && task.logs
                        .filter(log => log.action === 'comment')
                        .map(log => (
                          <div key={log.id} className="flex gap-3 pb-4 border-b dark:border-gray-700 last:border-0">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-gray-500" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <p className="font-medium">{log.user?.full_name || 'مستخدم'}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(log.created_at).toLocaleDateString()} • 
                                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                              {log.notes && (
                                <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {log.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      
                      {/* نموذج إضافة تعليق */}
                      <TaskCommentForm
                        taskId={id}
                        onSubmit={handleAddComment}
                        isLoading={loading[`comment_${id}`] || false}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {currentTab === 'activity' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    سجل النشاط
                  </h3>
                  
                  <TaskTimeline logs={task.logs || []} />
                </div>
              )}
              
              {currentTab === 'attachments' && (
                <div className="space-y-4">
                  <TaskAttachments
                    attachments={task.attachments || []}
                    taskId={id}
                    onUpload={handleUploadAttachment}
                    onDelete={handleDeleteAttachment}
                    isUploading={loading[`upload_${id}`] || false}
                    isDeleting={loading}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* الشريط الجانبي */}
        <div className="space-y-6">
          {/* إجراءات المهمة */}
          {canChangeStatus() && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-4">
              <h3 className="font-medium mb-4">تغيير حالة المهمة</h3>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleStatusChange('new')}
                  disabled={task.status === 'new' || loading[`status_${id}`]}
                  className="w-full flex items-center gap-2 p-3 rounded-lg border border-blue-200 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Clock className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                  </div>
                  <span>تعيين كجديدة</span>
                </button>
                
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={task.status === 'in_progress' || loading[`status_${id}`]}
                  className="w-full flex items-center gap-2 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/30 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                    <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <span>قيد التنفيذ</span>
                </button>
                
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={task.status === 'completed' || loading[`status_${id}`]}
                  className="w-full flex items-center gap-2 p-3 rounded-lg border border-green-200 dark:border-green-900/30 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-300" />
                  </div>
                  <span>تمت</span>
                </button>
                
                <button
                  onClick={() => handleStatusChange('postponed')}
                  disabled={task.status === 'postponed' || loading[`status_${id}`]}
                  className="w-full flex items-center gap-2 p-3 rounded-lg border border-purple-200 dark:border-purple-900/30 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                    <Pause className="h-3 w-3 text-purple-600 dark:text-purple-300" />
                  </div>
                  <span>تأجيل</span>
                </button>
                
                <button
                  onClick={() => handleStatusChange('rejected')}
                  disabled={task.status === 'rejected' || loading[`status_${id}`]}
                  className="w-full flex items-center gap-2 p-3 rounded-lg border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <X className="h-3 w-3 text-red-600 dark:text-red-300" />
                  </div>
                  <span>رفض</span>
                </button>
                
                {loading[`status_${id}`] && (
                  <div className="text-center mt-2">
                    <div className="inline-block h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* أزرار الإجراءات السريعة */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-4">
            <h3 className="font-medium mb-3">إجراءات سريعة</h3>
            <div className="space-y-2">
              {canEdit() && (
                <button
                  onClick={() => setShowEditForm(true)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Edit className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span>تعديل المهمة</span>
                </button>
              )}
              
              <button
                onClick={() => setCurrentTab('attachments')}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Paperclip className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>إضافة مرفق</span>
              </button>
              
              {canDelete() && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>حذف المهمة</span>
                </button>
              )}
            </div>
          </div>
          
          {/* معلومات المدة الزمنية */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              معلومات المدة الزمنية
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">تاريخ الإنشاء:</span>
                <span>{formatDate(task.created_at)}</span>
              </div>
              
              {task.due_date && (
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm font-medium">تاريخ الاستحقاق:</span>
                  <span className={isOverdue() ? 'text-red-600 dark:text-red-400' : ''}>
                    {formatDate(task.due_date)}
                  </span>
                </div>
              )}
              
              {task.completion_date && (
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm font-medium">تاريخ الإنجاز:</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatDate(task.completion_date)}
                  </span>
                </div>
              )}
              
              {/* المدة الإجمالية */}
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg">
                <span className="text-sm font-medium">المدة الإجمالية:</span>
                <span className="font-bold">
                  {calculateDuration() || 'غير محسوبة'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}