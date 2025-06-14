import { ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface TaskColumnHeaderProps {
  icon: ReactNode;
  title: string;
  count: number;
  onAddTask?: () => void;
}

/**
 * عنوان عمود مهام في واجهة الكانبان
 */
export function TaskColumnHeader({ icon, title, count, onAddTask }: TaskColumnHeaderProps) {
  return (
    <div className="p-3 flex items-center justify-between bg-white dark:bg-gray-900 border-b dark:border-gray-700 rounded-t-lg">
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
          {count}
        </span>
      </div>
      
      {onAddTask && (
        <button
          onClick={onAddTask}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          title={`إضافة مهمة جديدة في ${title}`}
        >
          <Plus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
}