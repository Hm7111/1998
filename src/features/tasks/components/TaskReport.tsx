import { useState, useEffect } from 'react';
import { Calendar, User, Building, CheckCircle, Clock, File, Download, Filter, BarChart } from 'lucide-react';
import { useTaskList } from '../hooks/useTaskList';
import { BranchSelector } from '../../../components/branches/BranchSelector';
import { useAuth } from '../../../lib/auth';
import { UserSelector } from './UserSelector';
import { TaskStatus, TaskPriority } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';

// تسجيل كل مكونات Chart.js
ChartJS.register(...registerables);

/**
 * مكون لعرض تقارير وتحليلات المهام
 */
export function TaskReport() {
  const { isAdmin, dbUser, hasPermission } = useAuth();
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'all' | 'completion' | 'status' | 'priority' | 'distribution'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  
  const { tasks, isLoading: tasksLoading } = useTaskList();
  
  // تحميل بيانات التقرير
  useEffect(() => {
    loadReportData();
  }, [startDate, endDate, selectedBranch, selectedUser, reportType, tasks]);
  
  // تحميل بيانات التقرير
  const loadReportData = async () => {
    setIsLoading(true);
    
    try {
      // يمكن استخدام رست API أو RPC لجلب بيانات التقارير
      // هنا نستخدم البيانات المتوفرة في الذاكرة للبساطة
      
      let filteredTasks = [...tasks];
      
      // تطبيق الفلاتر
      if (selectedBranch) {
        filteredTasks = filteredTasks.filter(task => task.branch_id === selectedBranch);
      }
      
      if (selectedUser) {
        filteredTasks = filteredTasks.filter(task => 
          task.assigned_to === selectedUser || task.created_by === selectedUser
        );
      }
      
      // تطبيق نطاق التاريخ
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // نهاية اليوم
      
      filteredTasks = filteredTasks.filter(task => {
        const createdDate = new Date(task.created_at);
        return createdDate >= start && createdDate <= end;
      });
      
      // تحليل البيانات
      const statusCounts = {
        new: 0,
        in_progress: 0,
        completed: 0,
        rejected: 0,
        postponed: 0
      };
      
      const priorityCounts = {
        high: 0,
        medium: 0,
        low: 0
      };
      
      const branchCounts = {};
      const userCounts = {};
      const overdueTasks = filteredTasks.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        const now = new Date();
        return dueDate < now && task.status !== 'completed' && task.status !== 'rejected';
      }).length;
      
      const completedOnTime = filteredTasks.filter(task => {
        if (!task.due_date || !task.completion_date) return false;
        const dueDate = new Date(task.due_date);
        const completionDate = new Date(task.completion_date);
        return completionDate <= dueDate && task.status === 'completed';
      }).length;
      
      const completedLate = filteredTasks.filter(task => {
        if (!task.due_date || !task.completion_date) return false;
        const dueDate = new Date(task.due_date);
        const completionDate = new Date(task.completion_date);
        return completionDate > dueDate && task.status === 'completed';
      }).length;
      
      // تحليل تفصيلي حسب الحالة والأولوية
      filteredTasks.forEach(task => {
        // حسب الحالة
        statusCounts[task.status]++;
        
        // حسب الأولوية
        priorityCounts[task.priority]++;
        
        // حسب الفرع
        if (task.branch) {
          const branchName = task.branch.name;
          branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
        }
        
        // حسب المستخدم
        if (task.assignee) {
          const userName = task.assignee.full_name;
          userCounts[userName] = (userCounts[userName] || 0) + 1;
        }
      });
      
      // بيانات رسم بياني للتوزيع حسب الحالة
      const statusChartData = {
        labels: ['جديدة', 'قيد التنفيذ', 'مكتملة', 'مرفوضة', 'مؤجلة'],
        datasets: [
          {
            label: 'عدد المهام',
            data: [
              statusCounts.new, 
              statusCounts.in_progress, 
              statusCounts.completed, 
              statusCounts.rejected, 
              statusCounts.postponed
            ],
            backgroundColor: [
              'rgba(59, 130, 246, 0.6)', // جديدة - أزرق
              'rgba(245, 158, 11, 0.6)', // قيد التنفيذ - أصفر
              'rgba(16, 185, 129, 0.6)', // مكتملة - أخضر
              'rgba(239, 68, 68, 0.6)',  // مرفوضة - أحمر
              'rgba(139, 92, 246, 0.6)'  // مؤجلة - أرجواني
            ],
            borderColor: [
              'rgb(59, 130, 246)',
              'rgb(245, 158, 11)',
              'rgb(16, 185, 129)',
              'rgb(239, 68, 68)',
              'rgb(139, 92, 246)'
            ],
            borderWidth: 1,
          },
        ],
      };
      
      // بيانات رسم بياني للتوزيع حسب الأولوية
      const priorityChartData = {
        labels: ['عالية', 'متوسطة', 'منخفضة'],
        datasets: [
          {
            label: 'عدد المهام',
            data: [
              priorityCounts.high,
              priorityCounts.medium,
              priorityCounts.low
            ],
            backgroundColor: [
              'rgba(239, 68, 68, 0.6)',  // عالية - أحمر
              'rgba(245, 158, 11, 0.6)', // متوسطة - أصفر
              'rgba(16, 185, 129, 0.6)'  // منخفضة - أخضر
            ],
            borderColor: [
              'rgb(239, 68, 68)',
              'rgb(245, 158, 11)',
              'rgb(16, 185, 129)'
            ],
            borderWidth: 1,
          },
        ],
      };
      
      // تجميع البيانات
      setReportData({
        totalTasks: filteredTasks.length,
        statusCounts,
        priorityCounts,
        overdueTasks,
        completedOnTime,
        completedLate,
        branchCounts,
        userCounts,
        completionRate: filteredTasks.length > 0 
          ? (statusCounts.completed / filteredTasks.length) * 100 
          : 0,
        statusChartData,
        priorityChartData
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // تصدير التقرير
  const exportReport = () => {
    // سيتم تنفيذ تصدير التقرير كملف CSV أو Excel
    // هنا مجرد محاكاة للعملية
    
    alert('سيتم تنفيذ تصدير التقرير قريباً');
  };
  
  if (tasksLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart className="h-6 w-6 text-primary" />
          تقارير وإحصائيات المهام
        </h2>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            تصدير التقرير
          </button>
        </div>
      </div>
      
      {/* فلاتر التقرير */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div>
          <label className="block text-sm font-medium mb-1">من تاريخ</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border dark:border-gray-700 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border dark:border-gray-700 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">الفرع</label>
          <BranchSelector
            value={selectedBranch}
            onChange={setSelectedBranch}
            showAll
            placeholder="جميع الفروع"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">المستخدم</label>
          <UserSelector
            value={selectedUser || ''}
            onChange={setSelectedUser}
            placeholder="جميع المستخدمين"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">نوع التقرير</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="w-full p-2 border dark:border-gray-700 rounded-lg"
          >
            <option value="all">تقرير شامل</option>
            <option value="completion">معدل الإنجاز</option>
            <option value="status">حسب الحالة</option>
            <option value="priority">حسب الأولوية</option>
            <option value="distribution">توزيع المهام</option>
          </select>
        </div>
      </div>
      
      {reportData ? (
        <div className="space-y-6">
          {/* ملخص التقرير */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-400">إجمالي المهام</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{reportData.totalTasks}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                  <File className="h-6 w-6 text-blue-700 dark:text-blue-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400">نسبة الإنجاز</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                    {reportData.completionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-700 dark:text-green-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 dark:text-red-400">المهام المتأخرة</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-300">{reportData.overdueTasks}</p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg">
                  <Clock className="h-6 w-6 text-red-700 dark:text-red-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 dark:text-purple-400">المهمة في الوقت المحدد</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{reportData.completedOnTime}</p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-700 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>
          
          {/* الرسوم البيانية */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* توزيع المهام حسب الحالة */}
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">توزيع المهام حسب الحالة</h3>
              <div className="h-80">
                <Pie data={reportData.statusChartData} options={{
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  },
                  responsive: true,
                  maintainAspectRatio: false
                }} />
              </div>
            </div>
            
            {/* توزيع المهام حسب الأولوية */}
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">توزيع المهام حسب الأولوية</h3>
              <div className="h-80">
                <Bar data={reportData.priorityChartData} options={{
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} />
              </div>
            </div>
          </div>
          
          {/* إحصائيات تفصيلية */}
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">إحصائيات تفصيلية</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  حسب الحالة
                </h4>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center">
                    <span>جديدة</span>
                    <span className="font-medium">{reportData.statusCounts.new}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>قيد التنفيذ</span>
                    <span className="font-medium">{reportData.statusCounts.in_progress}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>مكتملة</span>
                    <span className="font-medium">{reportData.statusCounts.completed}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>مرفوضة</span>
                    <span className="font-medium">{reportData.statusCounts.rejected}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>مؤجلة</span>
                    <span className="font-medium">{reportData.statusCounts.postponed}</span>
                  </li>
                </ul>
              </div>
              
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  حسب الأولوية
                </h4>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center">
                    <span>عالية</span>
                    <span className="font-medium">{reportData.priorityCounts.high}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>متوسطة</span>
                    <span className="font-medium">{reportData.priorityCounts.medium}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>منخفضة</span>
                    <span className="font-medium">{reportData.priorityCounts.low}</span>
                  </li>
                </ul>
              </div>
              
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  معدلات الإنجاز
                </h4>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center">
                    <span>معدل الإنجاز</span>
                    <span className="font-medium">{reportData.completionRate.toFixed(1)}%</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>منجزة في الوقت المحدد</span>
                    <span className="font-medium">{reportData.completedOnTime}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>منجزة متأخرة</span>
                    <span className="font-medium">{reportData.completedLate}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>متأخرة حالياً</span>
                    <span className="font-medium">{reportData.overdueTasks}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">لا توجد بيانات متاحة للعرض</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            حاول تغيير معايير التصفية أو اختيار نطاق زمني مختلف
          </p>
        </div>
      )}
    </div>
  );
}