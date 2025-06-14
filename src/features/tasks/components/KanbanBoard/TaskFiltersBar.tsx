import { useEffect, useRef, useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  User,
  Building,
  Calendar,
  Flag,
  SortAsc,
  SortDesc,
  X,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { TaskFilters, TaskPriority } from '../../types';
import { BranchSelector } from '../../../../components/branches/BranchSelector';
import { useAuth } from '../../../../lib/auth';
import { UserSelector } from '../UserSelector';

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onUpdateFilters: (filters: Partial<TaskFilters>) => void;
  onCreateTask?: () => void;
}

/**
 * شريط البحث والتصفية للوحة الكانبان
 */
export function TaskFiltersBar({ filters, onUpdateFilters, onCreateTask }: TaskFiltersBarProps) {
  const { isAdmin } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  // إغلاق قائمة الفلاتر عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => onUpdateFilters({ search: e.target.value })}
              placeholder="بحث في المهام..."
              className="w-full min-w-[240px] pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
            />
          </div>
          
          <div className="relative" ref={filtersRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2.5 border dark:border-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="فلترة"
            >
              <Filter className="h-5 w-5 text-gray-500" />
            </button>
            
            {showFilters && (
              <div className="absolute z-10 top-full right-0 mt-2 w-72 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأولوية</label>
                    <select
                      value={filters.priority || 'all'}
                      onChange={(e) => onUpdateFilters({ priority: e.target.value as TaskPriority | 'all' })}
                      className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="all">جميع الأولويات</option>
                      <option value="high">عالية</option>
                      <option value="medium">متوسطة</option>
                      <option value="low">منخفضة</option>
                    </select>
                  </div>
                  
                  {isAdmin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المكلف</label>
                      <UserSelector
                        value={filters.assigned_to || ''}
                        onChange={(userId) => onUpdateFilters({ assigned_to: userId })}
                        placeholder="جميع المستخدمين"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفرع</label>
                    <BranchSelector
                      value={filters.branch_id}
                      onChange={(branchId) => onUpdateFilters({ branch_id: branchId })}
                      showAll
                      placeholder="جميع الفروع"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الإطار الزمني</label>
                    <select
                      value={filters.timeframe || 'all'}
                      onChange={(e) => onUpdateFilters({ timeframe: e.target.value as any })}
                      className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="all">كل الفترات</option>
                      <option value="today">اليوم</option>
                      <option value="week">هذا الأسبوع</option>
                      <option value="month">هذا الشهر</option>
                      <option value="overdue">متأخرة</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        onUpdateFilters({
                          search: '',
                          priority: 'all',
                          assigned_to: null,
                          branch_id: null,
                          timeframe: 'all',
                          status: 'all'
                        });
                        setShowFilters(false);
                      }}
                      className="px-3 py-1.5 text-xs border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <X className="h-3 w-3 inline-block ml-1" />
                      إعادة ضبط
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* فلاتر سريعة بشكل أزرار */}
          <div className="flex flex-wrap gap-1.5">
            {/* حسب الأولوية */}
            <button
              onClick={() => onUpdateFilters({ priority: filters.priority === 'high' ? 'all' : 'high' })}
              className={`px-2 py-1.5 text-xs flex items-center gap-1 rounded-lg ${
                filters.priority === 'high' 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                  : 'bg-white dark:bg-gray-800 border dark:border-gray-700'
              }`}
            >
              <Flag className="h-3 w-3" />
              عالية الأولوية
            </button>
            
            {/* المتأخرة */}
            <button
              onClick={() => onUpdateFilters({ timeframe: filters.timeframe === 'overdue' ? 'all' : 'overdue' })}
              className={`px-2 py-1.5 text-xs flex items-center gap-1 rounded-lg ${
                filters.timeframe === 'overdue' 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                  : 'bg-white dark:bg-gray-800 border dark:border-gray-700'
              }`}
            >
              <Clock className="h-3 w-3" />
              متأخرة
            </button>
            
            {/* هذا الأسبوع */}
            <button
              onClick={() => onUpdateFilters({ timeframe: filters.timeframe === 'week' ? 'all' : 'week' })}
              className={`px-2 py-1.5 text-xs flex items-center gap-1 rounded-lg ${
                filters.timeframe === 'week' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                  : 'bg-white dark:bg-gray-800 border dark:border-gray-700'
              }`}
            >
              <Calendar className="h-3 w-3" />
              هذا الأسبوع
            </button>
            
            {/* المسندة لي */}
            <button
              onClick={() => onUpdateFilters({ taskType: filters.taskType === 'assigned_to_me' ? 'all' : 'assigned_to_me' })}
              className={`px-2 py-1.5 text-xs flex items-center gap-1 rounded-lg ${
                filters.taskType === 'assigned_to_me' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                  : 'bg-white dark:bg-gray-800 border dark:border-gray-700'
              }`}
            >
              <User className="h-3 w-3" />
              المسندة لي
            </button>
            
            {/* التي أنشأتها */}
            <button
              onClick={() => onUpdateFilters({ taskType: filters.taskType === 'created_by_me' ? 'all' : 'created_by_me' })}
              className={`px-2 py-1.5 text-xs flex items-center gap-1 rounded-lg ${
                filters.taskType === 'created_by_me' 
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' 
                  : 'bg-white dark:bg-gray-800 border dark:border-gray-700'
              }`}
            >
              <Plus className="h-3 w-3" />
              التي أنشأتها
            </button>
          </div>
        </div>
        
        {onCreateTask && (
          <button
            onClick={onCreateTask}
            className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm whitespace-nowrap flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            إضافة مهمة جديدة
          </button>
        )}
      </div>
    </div>
  );
}