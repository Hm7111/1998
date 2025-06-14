import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  List, 
  LayoutGrid, 
  RefreshCw,
  BarChartHorizontal,
  Calendar,
  Clock
} from 'lucide-react';
import { useTaskList } from '../hooks/useTaskList';
import { useTaskActions } from '../hooks/useTaskActions';
import { KanbanBoard } from '../components/KanbanBoard';
import { TasksList as TasksListComponent } from '../components/TasksList';
import { TaskReport } from '../components/TaskReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { useAuth } from '../../../lib/auth';

/**
 * صفحة إدارة المهام المحسنة
 */
export function TasksList() {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = useAuth();
  
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar' | 'report'>('list');
  
  const { 
    tasks, 
    isLoading, 
    error, 
    taskSummary, 
    isSummaryLoading, 
    filters, 
    updateFilters, 
    resetFilters, 
    refetchTasks 
  } = useTaskList();
  
  const {
    updateTaskStatus,
    loading
  } = useTaskActions();

  // فتح صفحة إنشاء مهمة جديدة
  const handleCreateTask = () => {
    navigate('/admin/tasks/new');
  };
  
  // الانتقال إلى تفاصيل المهمة
  const handleViewTask = (taskId: string) => {
    navigate(`/admin/tasks/${taskId}`);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة المهام</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isSummaryLoading ? 'جارِ التحميل...' : `${taskSummary.total} مهمة`}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 p-1 flex">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${
                viewMode === 'list' 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="عرض قائمة"
            >
              <List className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg ${
                viewMode === 'kanban' 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="عرض كانبان"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setViewMode('report')}
              className={`p-2 rounded-lg ${
                viewMode === 'report' 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="التقارير والإحصائيات"
            >
              <BarChartHorizontal className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-lg ${
                viewMode === 'calendar' 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="عرض التقويم"
            >
              <Calendar className="h-5 w-5" />
            </button>
          </div>
          
          <button
            onClick={refetchTasks}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="تحديث"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          
          {hasPermission('create:tasks') && (
            <button
              onClick={handleCreateTask}
              className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              إضافة مهمة جديدة
            </button>
          )}
        </div>
      </div>

      {/* الملخص */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.status === 'all' ? 'bg-primary/5 border-primary' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ status: 'all' })}
          >
            <Clock className="h-6 w-6 mb-2 text-primary" />
            <span className="text-sm font-medium">الكل</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.total}</span>
          </button>
        </div>
        
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.status === 'new' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ status: 'new' })}
          >
            <span className="h-6 w-6 mb-2 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </span>
            <span className="text-sm font-medium">جديدة</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.new}</span>
          </button>
        </div>
        
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.status === 'in_progress' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/30' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ status: 'in_progress' })}
          >
            <span className="h-6 w-6 mb-2 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-300" />
            </span>
            <span className="text-sm font-medium">قيد التنفيذ</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.inProgress}</span>
          </button>
        </div>
        
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ status: 'completed' })}
          >
            <span className="h-6 w-6 mb-2 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-300" />
            </span>
            <span className="text-sm font-medium">مكتملة</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.completed}</span>
          </button>
        </div>
        
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.status === 'postponed' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-900/30' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ status: 'postponed' })}
          >
            <span className="h-6 w-6 mb-2 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Pause className="h-4 w-4 text-purple-600 dark:text-purple-300" />
            </span>
            <span className="text-sm font-medium">مؤجلة</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.postponed}</span>
          </button>
        </div>
        
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.timeframe === 'overdue' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ timeframe: filters.timeframe === 'overdue' ? 'all' : 'overdue' })}
          >
            <span className="h-6 w-6 mb-2 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Clock className="h-4 w-4 text-red-600 dark:text-red-300" />
            </span>
            <span className="text-sm font-medium">متأخرة</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.overdue}</span>
          </button>
        </div>
      </div>

      {/* محتوى العرض حسب الوضع المحدد */}
      {viewMode === 'list' && (
        <TasksListComponent />
      )}
      
      {viewMode === 'kanban' && (
        <KanbanBoard 
          tasks={tasks} 
          isLoading={isLoading} 
          onCreateTask={hasPermission('create:tasks') ? handleCreateTask : undefined}
          onTaskClick={handleViewTask}
        />
      )}
      
      {viewMode === 'report' && (
        <TaskReport />
      )}
      
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-6 text-center py-16">
          <Calendar className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="text-lg font-medium mb-2">عرض التقويم</h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            سيتم إضافة عرض التقويم قريباً لمشاهدة المهام حسب التواريخ وتوزيعها على أيام الأسبوع والشهر
          </p>
        </div>
      )}
    </div>
  );
}

function AlertTriangle(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 9v4"></path>
      <path d="M12 17h.01"></path>
      <path d="M3 12a9 9 0 0 1 18 0 9 9 0 0 1-18 0Z"></path>
    </svg>
  )
}

function Pause(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <rect width="4" height="16" x="6" y="4"></rect>
      <rect width="4" height="16" x="14" y="4"></rect>
    </svg>
  )
}