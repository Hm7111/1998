/**
 * أنواع بيانات المشروع الأساسية
 */

// أنواع المستخدمين
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branch_id?: string;
  created_at: string;
  avatar_url?: string;
  active: boolean;
}

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

// أنواع الخطابات
export interface Letter {
  id: string;
  title: string;
  content: string;
  status: LetterStatus;
  template_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  reference_number?: string;
  branch_id?: string;
  recipient?: string;
  external_reference?: string;
  approval_status: ApprovalStatus;
  zones?: Record<string, string>;
}

export type LetterStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
export type ApprovalStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

// أنواع القوالب
export interface LetterTemplate {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_default: boolean;
  category?: string;
  zones?: Zone[];
}

export interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
}

// أنواع الفروع
export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  manager_id?: string;
  created_at: string;
}

// أنواع الموافقات
export interface ApprovalRequest {
  id: string;
  letter_id: string;
  requested_by: string;
  requested_to: string;
  status: ApprovalStatus;
  created_at: string;
  updated_at: string;
  comments?: string;
}

// أنواع المهام
export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  related_letter_id?: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'canceled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
