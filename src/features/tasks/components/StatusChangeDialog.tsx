import { useState } from 'react';
import { X, Clock, Calendar, AlertTriangle, CheckCircle, Pause } from 'lucide-react';
import { TaskStatus } from '../types';

interface StatusChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: TaskStatus, reason: string) => void;
  status: TaskStatus;
  isLoading: boolean;
}

/**
 * نافذة منبثقة لتوضيح سبب تغيير حالة المهمة
 * تُستخدم خاصة مع حالات التأجيل والرفض
 */
export function StatusChangeDialog({
  isOpen,
  onClose,
  onConfirm,
  status,
  isLoading
}: StatusChangeDialogProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  // الحصول على عنوان وأيقونة الحالة
  const getStatusInfo = () => {
    switch(status) {
      case 'postponed':
        return {
          title: 'تأجيل المهمة',
          description: 'يرجى توضيح سبب تأجيل المهمة',
          icon: <Pause className="h-6 w-6 text-purple-500" />,
          color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
        };
      case 'rejected':
        return {
          title: 'رفض المهمة',
          description: 'يرجى توضيح سبب رفض المهمة',
          icon: <X className="h-6 w-6 text-red-500" />,
          color: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
        };
      case 'completed':
        return {
          title: 'إنجاز المهمة',
          description: 'هل تريد إضافة ملاحظات حول الإنجاز؟',
          icon: <CheckCircle className="h-6 w-6 text-green-500" />,
          color: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
        };
      case 'in_progress':
        return {
          title: 'بدء العمل على المهمة',
          description: 'هل تريد إضافة ملاحظات حول بدء العمل؟',
          icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
          color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
        };
      default:
        return {
          title: 'تغيير حالة المهمة',
          description: 'هل تريد إضافة ملاحظات؟',
          icon: <Clock className="h-6 w-6 text-blue-500" />,
          color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const isReasonRequired = status === 'postponed' || status === 'rejected';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${statusInfo.color}`}>
              {statusInfo.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold">{statusInfo.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{statusInfo.description}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            السبب {isReasonRequired && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-3 border dark:border-gray-700 rounded-lg resize-none h-32 focus:border-primary focus:ring-primary/20"
            placeholder={
              status === 'postponed' 
                ? 'أدخل سبب تأجيل المهمة...'
                : status === 'rejected'
                ? 'أدخل سبب رفض المهمة...' 
                : 'أدخل ملاحظاتك...'
            }
            required={isReasonRequired}
          />
          {isReasonRequired && !reason && (
            <p className="text-sm text-red-500 mt-1">السبب مطلوب لتغيير الحالة</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            إلغاء
          </button>
          <button
            onClick={() => onConfirm(status, reason)}
            disabled={isLoading || (isReasonRequired && !reason)}
            className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 transition ${
              status === 'postponed'
                ? 'bg-purple-600 hover:bg-purple-700'
                : status === 'rejected'
                ? 'bg-red-600 hover:bg-red-700'
                : status === 'completed'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-primary hover:bg-primary/90'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>جارِ المعالجة...</span>
              </>
            ) : (
              <>
                {statusInfo.icon}
                <span>تأكيد</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}