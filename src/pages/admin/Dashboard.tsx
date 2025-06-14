import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { 
  Clock, 
  Calendar, 
  FileText, 
  CheckCircle, 
  ClipboardCheck, 
  AlertTriangle,
  User,
  Building,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Droplets,
  RefreshCw
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { useNavigate } from 'react-router-dom';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

export function Dashboard() {
  const { dbUser, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  
  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        // Using a mock weather data for demonstration
        // In production, you would use a real weather API
        const mockWeather = {
          location: 'الرياض، المملكة العربية السعودية',
          temperature: 32,
          condition: 'مشمس',
          humidity: 20,
          windSpeed: 12,
          forecast: [
            { day: 'اليوم', temp: 32, condition: 'مشمس' },
            { day: 'غداً', temp: 33, condition: 'غائم جزئياً' },
            { day: 'بعد غد', temp: 30, condition: 'غائم' }
          ]
        };
        
        // Simulate API delay
        setTimeout(() => {
          setWeather(mockWeather);
          setWeatherLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeatherError(true);
        setWeatherLoading(false);
      }
    };
    
    fetchWeather();
  }, []);
  
  // Fetch letters statistics
  const { data: lettersStats = { total: 0, draft: 0, completed: 0 }, isLoading: lettersLoading } = useQuery({
    queryKey: ['letters-stats', dbUser?.id],
    queryFn: async () => {
      if (!dbUser?.id || !hasPermission('view:letters')) return { total: 0, draft: 0, completed: 0 };
      
      try {
        // Get total letters
        const { count: total, error: totalError } = await supabase
          .from('letters')
          .select('*', { count: 'exact', head: true });
          
        if (totalError) throw totalError;
        
        // Get draft letters
        const { count: draft, error: draftError } = await supabase
          .from('letters')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft');
          
        if (draftError) throw draftError;
        
        // Get completed letters
        const { count: completed, error: completedError } = await supabase
          .from('letters')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');
          
        if (completedError) throw completedError;
        
        return { total: total || 0, draft: draft || 0, completed: completed || 0 };
      } catch (error) {
        console.error('Error fetching letters stats:', error);
        return { total: 0, draft: 0, completed: 0 };
      }
    },
    enabled: !!dbUser?.id && hasPermission('view:letters'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch tasks statistics
  const { data: tasksStats = { total: 0, new: 0, inProgress: 0, completed: 0, overdue: 0 }, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks-stats', dbUser?.id],
    queryFn: async () => {
      if (!dbUser?.id || !hasPermission('view:tasks') && !hasPermission('view:tasks:assigned') && !hasPermission('view:tasks:own')) {
        return { total: 0, new: 0, inProgress: 0, completed: 0, overdue: 0 };
      }
      
      try {
        // Create base query
        const createBaseQuery = () => {
          let query = supabase.from('tasks').select('*', { count: 'exact', head: true });
          
          // Apply filters based on permissions
          if (!hasPermission('view:tasks:all')) {
            let conditions = [];
            
            if (hasPermission('view:tasks:own')) {
              conditions.push(`created_by.eq.${dbUser.id}`);
            }
            
            if (hasPermission('view:tasks:assigned')) {
              conditions.push(`assigned_to.eq.${dbUser.id}`);
            }
            
            if (conditions.length > 0) {
              query = query.or(conditions.join(','));
            }
          }
          
          return query;
        };
        
        // Get total tasks
        const { count: total, error: totalError } = await createBaseQuery();
        if (totalError) throw totalError;
        
        // Get new tasks
        const { count: newCount, error: newError } = await createBaseQuery()
          .eq('status', 'new');
        if (newError) throw newError;
        
        // Get in-progress tasks
        const { count: inProgressCount, error: inProgressError } = await createBaseQuery()
          .eq('status', 'in_progress');
        if (inProgressError) throw inProgressError;
        
        // Get completed tasks
        const { count: completedCount, error: completedError } = await createBaseQuery()
          .eq('status', 'completed');
        if (completedError) throw completedError;
        
        // Get overdue tasks
        const now = new Date().toISOString();
        const { count: overdueCount, error: overdueError } = await createBaseQuery()
          .lt('due_date', now)
          .not('status', 'in', '(completed,rejected)');
        if (overdueError) throw overdueError;
        
        return { 
          total: total || 0, 
          new: newCount || 0, 
          inProgress: inProgressCount || 0, 
          completed: completedCount || 0,
          overdue: overdueCount || 0
        };
      } catch (error) {
        console.error('Error fetching tasks stats:', error);
        return { total: 0, new: 0, inProgress: 0, completed: 0, overdue: 0 };
      }
    },
    enabled: !!dbUser?.id && (hasPermission('view:tasks') || hasPermission('view:tasks:assigned') || hasPermission('view:tasks:own')),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch approvals statistics
  const { data: approvalsStats = { pending: 0, approved: 0, rejected: 0 }, isLoading: approvalsLoading } = useQuery({
    queryKey: ['approvals-stats', dbUser?.id],
    queryFn: async () => {
      if (!dbUser?.id || !hasPermission('view:approvals')) {
        return { pending: 0, approved: 0, rejected: 0 };
      }
      
      try {
        // Get pending approvals
        const { count: pending, error: pendingError } = await supabase
          .from('approval_requests')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', dbUser.id)
          .eq('status', 'submitted');
          
        if (pendingError) throw pendingError;
        
        // Get approved requests
        const { count: approved, error: approvedError } = await supabase
          .from('approval_requests')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', dbUser.id)
          .eq('status', 'approved');
          
        if (approvedError) throw approvedError;
        
        // Get rejected requests
        const { count: rejected, error: rejectedError } = await supabase
          .from('approval_requests')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', dbUser.id)
          .eq('status', 'rejected');
          
        if (rejectedError) throw rejectedError;
        
        return { pending: pending || 0, approved: approved || 0, rejected: rejected || 0 };
      } catch (error) {
        console.error('Error fetching approvals stats:', error);
        return { pending: 0, approved: 0, rejected: 0 };
      }
    },
    enabled: !!dbUser?.id && hasPermission('view:approvals'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Format date in Arabic
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('ar-SA', options);
  };
  
  // Format time in Arabic
  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true
    };
    return date.toLocaleTimeString('ar-SA', options);
  };
  
  // Get weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'مشمس':
        return <Sun className="h-8 w-8 text-yellow-500" />;
      case 'غائم':
      case 'غائم جزئياً':
        return <Cloud className="h-8 w-8 text-gray-500" />;
      case 'ممطر':
        return <CloudRain className="h-8 w-8 text-blue-500" />;
      case 'ثلجي':
        return <CloudSnow className="h-8 w-8 text-blue-300" />;
      case 'عاصف':
        return <Wind className="h-8 w-8 text-gray-600" />;
      default:
        return <Sun className="h-8 w-8 text-yellow-500" />;
    }
  };
  
  // Chart data for letters
  const lettersChartData = {
    labels: ['مسودة', 'مكتملة'],
    datasets: [
      {
        label: 'الخطابات',
        data: [lettersStats.draft, lettersStats.completed],
        backgroundColor: [
          'rgba(255, 159, 64, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
        borderColor: [
          'rgb(255, 159, 64)',
          'rgb(75, 192, 192)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Chart data for tasks
  const tasksChartData = {
    labels: ['جديدة', 'قيد التنفيذ', 'مكتملة', 'متأخرة'],
    datasets: [
      {
        label: 'المهام',
        data: [tasksStats.new, tasksStats.inProgress, tasksStats.completed, tasksStats.overdue],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgb(54, 162, 235)',
          'rgb(255, 206, 86)',
          'rgb(75, 192, 192)',
          'rgb(255, 99, 132)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Chart data for approvals
  const approvalsChartData = {
    labels: ['معلقة', 'موافق عليها', 'مرفوضة'],
    datasets: [
      {
        label: 'الموافقات',
        data: [approvalsStats.pending, approvalsStats.approved, approvalsStats.rejected],
        backgroundColor: [
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgb(255, 206, 86)',
          'rgb(75, 192, 192)',
          'rgb(255, 99, 132)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Chart data for activity over time (mock data)
  const activityChartData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [
      {
        fill: true,
        label: 'الخطابات',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
      {
        fill: true,
        label: 'المهام',
        data: [5, 15, 10, 12, 8, 7],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4,
      },
    ],
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            family: 'Cairo'
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: 'Cairo'
          }
        }
      },
      x: {
        ticks: {
          font: {
            family: 'Cairo'
          }
        }
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">مرحباً، {dbUser?.full_name || 'المستخدم'}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {formatDate(currentTime)} | {dbUser?.branch?.name && `فرع ${dbUser.branch.name}`}
          </p>
        </div>
      </div>
      
      {/* Time and Weather Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              الوقت والتاريخ
            </h2>
          </div>
          
          <div className="flex flex-col items-center justify-center py-4">
            <div className="text-4xl font-bold mb-2 font-mono">
              {formatTime(currentTime)}
            </div>
            <div className="text-lg text-gray-600 dark:text-gray-400">
              {formatDate(currentTime)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">التاريخ الهجري</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">١٤ شوال ١٤٤٦</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">ساعات العمل</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">8:00 ص - 4:00 م</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sun className="h-5 w-5 text-primary" />
              حالة الطقس
            </h2>
            <button 
              onClick={() => {
                setWeatherLoading(true);
                setTimeout(() => setWeatherLoading(false), 1000);
              }}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="تحديث"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          
          {weatherLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
            </div>
          ) : weatherError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">تعذر تحميل بيانات الطقس</p>
              <button 
                onClick={() => {
                  setWeatherError(false);
                  setWeatherLoading(true);
                  setTimeout(() => setWeatherLoading(false), 1000);
                }}
                className="mt-2 px-3 py-1 bg-primary text-white rounded-md text-sm"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : weather ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-lg">{weather.location}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{formatDate(currentTime)}</p>
                </div>
                <div className="text-center">
                  {getWeatherIcon(weather.condition)}
                  <p className="text-sm mt-1">{weather.condition}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center mb-6">
                <div className="text-5xl font-bold">{weather.temperature}°</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex items-center">
                  <Droplets className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">الرطوبة</p>
                    <p className="font-medium">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex items-center">
                  <Wind className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">سرعة الرياح</p>
                    <p className="font-medium">{weather.windSpeed} كم/س</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t dark:border-gray-800">
                <h4 className="text-sm font-medium mb-2">توقعات الأيام القادمة</h4>
                <div className="grid grid-cols-3 gap-2">
                  {weather.forecast.map((day: any, index: number) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-center">
                      <p className="text-xs font-medium">{day.day}</p>
                      <div className="my-1">{getWeatherIcon(day.condition)}</div>
                      <p className="text-sm font-bold">{day.temp}°</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Letters Stats */}
        {hasPermission('view:letters') && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                إحصائيات الخطابات
              </h2>
              <button 
                onClick={() => navigate('/admin/letters')}
                className="text-xs text-primary hover:underline"
              >
                عرض الكل
              </button>
            </div>
            
            {lettersLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-primary">{lettersStats.total}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">إجمالي</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-500">{lettersStats.draft}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">مسودة</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-500">{lettersStats.completed}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">مكتملة</p>
                  </div>
                </div>
                
                <div className="h-40">
                  <Doughnut data={lettersChartData} options={chartOptions} />
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Tasks Stats */}
        {(hasPermission('view:tasks') || hasPermission('view:tasks:assigned') || hasPermission('view:tasks:own')) && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                إحصائيات المهام
              </h2>
              <button 
                onClick={() => navigate('/admin/tasks')}
                className="text-xs text-primary hover:underline"
              >
                عرض الكل
              </button>
            </div>
            
            {tasksLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-primary">{tasksStats.total}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">إجمالي</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-500">{tasksStats.new}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">جديدة</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-500">{tasksStats.inProgress}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">قيد التنفيذ</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-500">{tasksStats.completed}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">مكتملة</p>
                  </div>
                </div>
                
                <div className="h-40">
                  <Bar data={tasksChartData} options={chartOptions} />
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Approvals Stats */}
        {hasPermission('view:approvals') && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                إحصائيات الموافقات
              </h2>
              <button 
                onClick={() => navigate('/admin/approvals')}
                className="text-xs text-primary hover:underline"
              >
                عرض الكل
              </button>
            </div>
            
            {approvalsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-500">{approvalsStats.pending}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">معلقة</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-500">{approvalsStats.approved}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">موافق عليها</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-500">{approvalsStats.rejected}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">مرفوضة</p>
                  </div>
                </div>
                
                <div className="h-40">
                  <Doughnut data={approvalsChartData} options={chartOptions} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Activity Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            النشاط خلال الأشهر الماضية
          </h2>
        </div>
        
        <div className="h-80">
          <Line data={activityChartData} options={chartOptions} />
        </div>
      </div>
      
      {/* Quick Access and User Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Access */}
        <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">الوصول السريع</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {hasPermission('create:letters') && (
              <button
                onClick={() => navigate('/admin/letters/new')}
                className="flex flex-col items-center justify-center p-4 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <FileText className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">إنشاء خطاب جديد</span>
              </button>
            )}
            
            {hasPermission('create:tasks') && (
              <button
                onClick={() => navigate('/admin/tasks/new')}
                className="flex flex-col items-center justify-center p-4 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <CheckCircle className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">إنشاء مهمة جديدة</span>
              </button>
            )}
            
            {hasPermission('view:letters') && (
              <button
                onClick={() => navigate('/admin/letters')}
                className="flex flex-col items-center justify-center p-4 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <FileText className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">إدارة الخطابات</span>
              </button>
            )}
            
            {(hasPermission('view:tasks') || hasPermission('view:tasks:assigned') || hasPermission('view:tasks:own')) && (
              <button
                onClick={() => navigate('/admin/tasks')}
                className="flex flex-col items-center justify-center p-4 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <CheckCircle className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">إدارة المهام</span>
              </button>
            )}
            
            {hasPermission('view:approvals') && (
              <button
                onClick={() => navigate('/admin/approvals')}
                className="flex flex-col items-center justify-center p-4 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <ClipboardCheck className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">الموافقات</span>
              </button>
            )}
            
            <button
              onClick={() => navigate('/admin/settings')}
              className="flex flex-col items-center justify-center p-4 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span className="text-sm font-medium">الإعدادات</span>
            </button>
          </div>
        </div>
        
        {/* User Info */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">معلومات المستخدم</h2>
          
          <div className="flex flex-col items-center mb-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-bold">{dbUser?.full_name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{dbUser?.email}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                dbUser?.role === 'admin'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {dbUser?.role === 'admin' ? 'مدير' : 'مستخدم'}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            {dbUser?.branch && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center">
                  <Building className="h-5 w-5 text-primary mr-2" />
                  <span className="text-sm font-medium">الفرع</span>
                </div>
                <span className="text-sm">{dbUser.branch.name}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-primary mr-2" />
                <span className="text-sm font-medium">تاريخ التسجيل</span>
              </div>
              <span className="text-sm">{new Date(dbUser?.created_at || '').toLocaleDateString('ar-SA')}</span>
            </div>
            
            <button
              onClick={() => navigate('/admin/settings')}
              className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              تعديل الملف الشخصي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}