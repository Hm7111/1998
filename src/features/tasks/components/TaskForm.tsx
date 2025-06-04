import { useState, useEffect } from 'react';
import { Save, Calendar, User, Clock, Flag, AlertCircle as CircleAlert } from 'lucide-react';
import { TaskFormData, TaskPriority, TaskStatus, Task } from '../types';
import { useAuth } from '../../../lib/auth';
import { BranchSelector } from '../../../components/branches/BranchSelector';
import { UserSelector } from './UserSelector';

interface TaskFormProps {
  initialData?: Task;
  onSubmit: (data: TaskFormData) => Promise<void>;
  isLoading: boolean;
  isEditMode?: boolean;
}

/**
 * Formulario de creación y edición de tareas
 */
export function TaskForm({ initialData, onSubmit, isLoading, isEditMode = false }: TaskFormProps) {
  const { isAdmin, dbUser, hasPermission } = useAuth();
  
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    assigned_to: null,
    priority: 'medium',
    status: 'new',
    due_date: null,
    notes: '',
    branch_id: null
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Cargar datos iniciales en caso de edición
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description || '',
        assigned_to: initialData.assigned_to || null,
        priority: initialData.priority,
        status: initialData.status,
        due_date: initialData.due_date || null,
        notes: initialData.notes || '',
        branch_id: initialData.branch_id || null
      });
    } else if (dbUser?.branch_id) {
      // Establecer sucursal predeterminada del usuario actual
      setFormData(prev => ({
        ...prev,
        branch_id: dbUser.branch_id || null
      }));
    }
  }, [initialData, dbUser]);

  // Actualizar campo en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error al editar el campo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'عنوان المهمة مطلوب';
    }
    
    if (!formData.assigned_to && !isAdmin && !hasPermission('assign:tasks')) {
      newErrors.assigned_to = 'يجب تعيين المهمة لموظف';
    }
    
    if (!formData.branch_id) {
      newErrors.branch_id = 'يجب تحديد الفرع';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    await onSubmit(formData);
  };

  // Asignar tarea a un usuario
  const handleAssignToUser = (userId: string | null, userData?: any) => {
    setFormData(prev => {
      // Crear objeto de actualizaciones
      const updates: Partial<TaskFormData> = {
        assigned_to: userId
      };
      
      // Si tenemos datos de usuario con información de sucursal, actualizar automáticamente la sucursal
      if (userData?.branch?.id && !isEditMode) {
        updates.branch_id = userData.branch.id;
      }
      
      return { ...prev, ...updates };
    });
    
    // Limpiar error al asignar usuario
    if (errors.assigned_to) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.assigned_to;
        return newErrors;
      });
    }
  };
  
  // Asignar sucursal a la tarea
  const handleSelectBranch = (branchId: string | null) => {
    setFormData(prev => ({ ...prev, branch_id: branchId }));
    
    // Limpiar error al seleccionar sucursal
    if (errors.branch_id) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.branch_id;
        return newErrors;
      });
    }
  };

  // Asignar fecha de vencimiento a la tarea
  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, due_date: e.target.value || null }));
  };

  // Verificar si el usuario tiene permiso para asignar tareas
  const canAssignTasks = isAdmin || hasPermission('assign:tasks');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            عنوان المهمة <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            placeholder="أدخل عنوان المهمة"
            dir="rtl"
          />
          {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            وصف المهمة
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            placeholder="وصف تفصيلي للمهمة"
            dir="rtl"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              تعيين إلى {canAssignTasks ? '' : <span className="text-red-500">*</span>}
            </label>
            <UserSelector
              value={formData.assigned_to || ''}
              onChange={handleAssignToUser}
              error={errors.assigned_to}
            />
          </div>

          <div>
            <label htmlFor="branch_id" className="block text-sm font-medium mb-1">
              الفرع {formData.assigned_to && "(تم التحديد تلقائيًا من الموظف)"}
              <span className="text-red-500">*</span>
            </label>
            <BranchSelector
              value={formData.branch_id}
              onChange={handleSelectBranch}
              showAll
              disabled={formData.assigned_to !== null && !isEditMode && !canAssignTasks}
              error={errors.branch_id}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium mb-1">
              الأولوية
            </label>
            <div className="relative">
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-md appearance-none bg-white dark:bg-gray-800"
              >
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
              </select>
              <Flag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </div>

          <div>
            <label htmlFor="due_date" className="block text-sm font-medium mb-1">
              تاريخ الاستحقاق
            </label>
            <div className="relative">
              <input
                id="due_date"
                name="due_date"
                type="date"
                value={formData.due_date || ''}
                onChange={handleDueDateChange}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                min={new Date().toISOString().split('T')[0]}
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </div>
        </div>

        {isEditMode && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">
              الحالة
            </label>
            <div className="relative">
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-md appearance-none bg-white dark:bg-gray-800"
              >
                <option value="new">جديدة</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">مكتملة</option>
                <option value="postponed">مؤجلة</option>
                <option value="rejected">مرفوضة</option>
              </select>
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            ملاحظات
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            placeholder="أي ملاحظات إضافية حول المهمة"
            dir="rtl"
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-700">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{isEditMode ? 'جارِ التحديث...' : 'جارِ الإنشاء...'}</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{isEditMode ? 'حفظ التغييرات' : 'إنشاء المهمة'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}