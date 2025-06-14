import { Task, TaskLog, TaskAttachment, TaskStatus, TaskPriority, User, Branch, TaskComment, TaskNotification, TaskReport } from '../../../types/database';

export type { Task, TaskLog, TaskAttachment, TaskStatus, TaskPriority, TaskComment };

// واجهات إضافية خاصة بنظام المهام

export interface TaskFormData {
  title: string;
  description?: string;
  assigned_to?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
  notes?: string | null;
  branch_id?: string | null;
  // دعم تعيين مهمة لأكثر من شخص
  assignees?: string[] | null;
  // ربط المهمة بمشروع أو خطاب أو جهة
  project_id?: string | null;
  letter_id?: string | null;
  entity_id?: string | null;
  entity_type?: 'project' | 'department' | 'letter';
}

export interface TaskFilters {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assigned_to?: string | null;
  branch_id?: string | null;
  search?: string;
  timeframe?: 'all' | 'today' | 'week' | 'month' | 'overdue';
  // تصفية إضافية حسب المشروع أو الخطاب أو الجهة
  project_id?: string | null;
  letter_id?: string | null;
  entity_id?: string | null;
  // تصفية حسب التقييم
  rating?: number | null;
  // تصفية حسب نوع المهمة (مهام مكلف بها، مهام كلفت بها الآخرين)
  taskType?: 'all' | 'assigned_to_me' | 'created_by_me';
}

export interface TaskUpdate {
  id: string;
  status?: TaskStatus;
  notes?: string;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  description?: string;
  title?: string;
  // تحديثات للميزات الجديدة
  assignees?: string[] | null;
  project_id?: string | null;
  letter_id?: string | null;
  entity_id?: string | null;
  rating?: number | null;
  rating_notes?: string | null;
}

export interface TaskComment {
  task_id: string;
  notes: string;
}

export interface TaskSummary {
  total: number;
  new: number;
  inProgress: number;
  completed: number;
  rejected: number;
  postponed: number;
  overdue: number;
  // إضافة إحصائيات لكل نوع
  assignedToMe: number;
  createdByMe: number;
}

export interface TaskTimeRecord {
  id?: string;
  taskId: string;
  userId?: string;
  duration: number; // بالثواني
  notes?: string;
  created_at?: string;
  user?: User;
}

interface TaskWithRelations extends Task {
  creator?: User;
  assignee?: User;
  branch?: Branch;
  logs?: TaskLog[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  notifications?: TaskNotification[];
  timeRecords?: TaskTimeRecord[];
  commentsCount?: number;
  attachmentsCount?: number;
}

interface TaskLogWithRelations extends TaskLog {
  user?: User;
  task?: Task;
}

interface TaskAttachmentWithRelations extends TaskAttachment {
  user?: User;
}

interface TaskCommentWithRelations extends TaskComment {
  user?: User;
}

interface TaskNotificationWithRelations extends TaskNotification {
  user?: User;
  task?: Task;
}

interface TaskReportData {
  userId?: string;
  branchId?: string;
  startDate: string;
  endDate: string;
  reportType: 'user' | 'team' | 'branch' | 'system';
}