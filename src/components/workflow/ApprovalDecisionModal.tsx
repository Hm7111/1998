import { useState } from 'react';
import { X, ClipboardCheck } from 'lucide-react';
import { ApprovalRequest } from '../../types/database';
import { ApprovalDecisionForm } from '../../features/workflow/components/ApprovalDecisionForm';

interface ApprovalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ApprovalRequest;
  onApprove?: () => void;
  onReject?: () => void;
}

/**
 * نافذة اتخاذ قرار بشأن طلب موافقة
 */
export function ApprovalDecisionModal({ isOpen, onClose, request, onApprove, onReject }: ApprovalDecisionModalProps) {
  if (!isOpen) return null;

  console.log('Rendering ApprovalDecisionModal with request:', request);
  
  const handleSuccess = () => {
    if (request.status === 'approved' && onApprove) {
      onApprove();
    } else if (request.status === 'rejected' && onReject) {
      onReject();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
        <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            اتخاذ قرار بشأن الخطاب
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
          <ApprovalDecisionForm 
            request={request}
            onClose={onClose}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
}
