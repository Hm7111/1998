import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
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
  RefreshCw,
  Bell,
  Search,
  ChevronDown,
  Command,
  Settings,
  LogOut,
  Coffee,
  Moon,
  Plus,
  Zap,
  Star,
  Bookmark
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
import { useHotkeys } from '../../hooks/useHotkeys';

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
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [activeWidget, setActiveWidget] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { registerHotkey } = useHotkeys();
  const commandInputRef = useRef<HTMLInputElement>(null);
  
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  };

  // Register keyboard shortcuts
  useEffect(() => {
    registerHotkey('ctrl+k', () => setShowCommandPalette(true));
    registerHotkey('escape', () => {
      setShowCommandPalette(false);
      setShowQuickActions(false);
    });

    // Register shortcut for creating new letter
    if (hasPermission('create:letters')) {
      registerHotkey('ctrl+n', () => navigate('/admin/letters/new'));
    }

    // Register shortcut for creating new task
    if (hasPermission('create:tasks')) {
      registerHotkey('ctrl+t', () => navigate('/admin/tasks/new'));
    }
  }, [registerHotkey, navigate, hasPermission]);

  // Focus the command input when opened
  useEffect(() => {
    if (showCommandPalette && commandInputRef.current) {
      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 50);
    }
  }, [showCommandPalette]);

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
  const { data: tasksStats = { total: 0, new: 0, inProgress: 0, completed: 0, overdue: 0, createdByMe: 0, assignedToMe: 0 }, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks-stats', dbUser?.id],
    queryFn: async () => {
      if (!dbUser?.id || !hasPermission('view:tasks') && !hasPermission('view:tasks:assigned') && !hasPermission('view:tasks:own')) {
        return { total: 0, new: 0, inProgress: 0, completed: 0, overdue: 0, createdByMe: 0, assignedToMe: 0 };
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
        
        // Get tasks created by the user
        const { count: createdByMeCount, error: createdByMeError } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', dbUser.id);
        if (createdByMeError) throw createdByMeError;
        
        // Get tasks assigned to the user
        const { count: assignedToMeCount, error: assignedToMeError } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', dbUser.id);
        if (assignedToMeError) throw assignedToMeError;
        
        return { 
          total: total || 0, 
          new: newCount || 0, 
          inProgress: inProgressCount || 0, 
          completed: completedCount || 0,
          overdue: overdueCount || 0,
          createdByMe: createdByMeCount || 0,
          assignedToMe: assignedToMeCount || 0
        };
      } catch (error) {
        console.error('Error fetching tasks stats:', error);
        return { 
          total: 0, 
          new: 0, 
          inProgress: 0, 
          completed: 0, 
          overdue: 0,
          createdByMe: 0,
          assignedToMe: 0
        };
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
  
  // Format time in Arabic with animated seconds
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return (
      <div className="font-mono flex items-center">
        <span>{hours}</span>
        <span className="mx-1 animate-pulse">:</span>
        <span>{minutes}</span>
        <span className="mx-1 animate-pulse">:</span>
        <motion.span
          key={seconds}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="text-primary"
        >
          {seconds}
        </motion.span>
      </div>
    );
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
          'rgba(255, 159, 64, 0.8)',
          'rgba(75, 192, 192, 0.8)',
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
    labels: ['جديدة', 'قيد التنفيذ', 'مكتملة', 'متأخرة', 'المسندة لي', 'التي أنشأتها'],
    datasets: [
      {
        label: 'المهام',
        data: [
          tasksStats.new, 
          tasksStats.inProgress, 
          tasksStats.completed, 
          tasksStats.overdue,
          tasksStats.assignedToMe,
          tasksStats.createdByMe
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)'
        ],
        borderColor: [
          'rgb(54, 162, 235)',
          'rgb(255, 206, 86)',
          'rgb(75, 192, 192)',
          'rgb(255, 99, 132)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)'
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
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)',
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

  // Available quick actions
  const quickActions = [
    { id: 'new-letter', label: 'إنشاء خطاب جديد', icon: FileText, permission: 'create:letters', path: '/admin/letters/new' },
    { id: 'new-task', label: 'إنشاء مهمة جديدة', icon: CheckCircle, permission: 'create:tasks', path: '/admin/tasks/new' },
    { id: 'view-letters', label: 'عرض الخطابات', icon: FileText, permission: 'view:letters', path: '/admin/letters' },
    { id: 'view-tasks', label: 'عرض المهام', icon: CheckCircle, permission: 'view:tasks', path: '/admin/tasks' },
    { id: 'view-approvals', label: 'عرض الموافقات', icon: ClipboardCheck, permission: 'view:approvals', path: '/admin/approvals' },
    { id: 'settings', label: 'الإعدادات', icon: Settings, permission: '', path: '/admin/settings' }
  ].filter(action => !action.permission || hasPermission(action.permission));
  
  // Filter quick actions based on command query
  const filteredActions = quickActions.filter(action => 
    action.label.includes(commandQuery.toLowerCase())
  );

  // Execute command
  const executeCommand = (path: string) => {
    setShowCommandPalette(false);
    setCommandQuery('');
    navigate(path);
  };
  
  return (
    <div className="space-y-6">
      {/* Command Palette */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCommandPalette(false)}
          >
            <motion.div 
              className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
            >
              <div className="p-4 border-b dark:border-gray-800 flex items-center">
                <Command className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  ref={commandInputRef}
                  type="text"
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  placeholder="البحث عن إجراء..."
                  className="flex-1 bg-transparent border-none outline-none"
                />
                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">ESC</kbd>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filteredActions.length > 0 ? (
                  <div className="py-2">
                    {filteredActions.map((action) => (
                      <div 
                        key={action.id}
                        className="px-4 py-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => executeCommand(action.path)}
                      >
                        <div className="mr-3 w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full text-primary">
                          <action.icon className="h-5 w-5" />
                        </div>
                        <div>{action.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <Search className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p>لا توجد نتائج مطابقة</p>
                  </div>
                )}
              </div>
              <div className="p-3 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500">
                <div className="flex justify-between">
                  <div>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">↑</kbd>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded mx-1">↓</kbd>
                    للتنقل
                  </div>
                  <div>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd>
                    لتنفيذ الإجراء
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Header with Dynamic Greeting */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-primary/10 to-transparent dark:from-primary/5 dark:to-transparent p-8 rounded-2xl border border-primary/10 dark:border-primary/5 shadow-sm relative overflow-hidden"
      >
        {/* Background decorative elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
          <div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-medium text-primary mb-1"
            >
              {getGreeting()}
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold flex items-center gap-3"
            >
              {dbUser?.full_name || 'المستخدم'}
              <div className="inline-flex items-center text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                <motion.span 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Command className="h-3.5 w-3.5 mr-1.5" />
                </motion.span>
                <span className="hidden sm:inline">اضغط</span> <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 text-primary rounded mx-1 text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 text-primary rounded text-xs">K</kbd>
              </div>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 dark:text-gray-400 flex items-center flex-wrap gap-2 mt-2"
            >
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-primary/80" /> {formatDate(currentTime)}
              </span>
              {dbUser?.branch?.name && (
                <span className="flex items-center gap-1">
                  <Building className="h-4 w-4 text-primary/80" /> فرع {dbUser.branch.name}
                </span>
              )}
            </motion.p>
          </div>
          
          {/* Quick Actions Button */}
          <div className="mt-4 md:mt-0 relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-primary text-white px-4 py-2.5 rounded-lg shadow-md flex items-center gap-2 font-medium"
              onClick={() => setShowQuickActions(!showQuickActions)}
            >
              <Zap className="h-4 w-4" />
              <span>إجراءات سريعة</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showQuickActions ? 'rotate-180' : ''}`} />
            </motion.button>
            
            {/* Quick Actions Dropdown */}
            <AnimatePresence>
              {showQuickActions && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-xl z-20 overflow-hidden"
                >
                  {quickActions.slice(0, 6).map(action => (
                    <div 
                      key={action.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => {
                        setShowQuickActions(false);
                        navigate(action.path);
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <action.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{action.label}</span>
                    </div>
                  ))}
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-center">
                    <button 
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        setShowQuickActions(false);
                        setShowCommandPalette(true);
                      }}
                    >
                      عرض جميع الإجراءات (Ctrl+K)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
      
      {/* Time and Weather Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Time Card */}
        <motion.div 
          className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 p-6 relative overflow-hidden"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ 
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            translateY: -5
          }}
          onMouseEnter={() => setActiveWidget('time')}
          onMouseLeave={() => setActiveWidget(null)}
        >
          {/* Background decorative elements */}
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/5 rounded-full blur-xl opacity-70" />
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-primary/5 rounded-full blur-xl opacity-70" />
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="relative">
                الوقت والتاريخ
                {activeWidget === 'time' && (
                  <motion.div 
                    layoutId="underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </span>
            </h2>
            <motion.div 
              animate={{ rotate: activeWidget === 'time' ? 360 : 0 }}
              transition={{ duration: 2, ease: "easeInOut", repeatDelay: 1 }}
            >
              <Clock className="h-5 w-5 text-primary" />
            </motion.div>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6">
            <motion.div 
              className="text-4xl font-bold mb-3 font-mono"
              key={currentTime.getSeconds()}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              {formatTime(currentTime)}
            </motion.div>
            <motion.div 
              className="text-lg text-gray-600 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {formatDate(currentTime)}
            </motion.div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <motion.div 
              className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center"
              whileHover={{ scale: 1.05 }}
            >
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">التاريخ الهجري</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">١٤ شوال ١٤٤٦</p>
            </motion.div>
            <motion.div 
              className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center"
              whileHover={{ scale: 1.05 }}
            >
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">ساعات العمل</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">8:00 ص - 4:00 م</p>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Weather Card */}
        <motion.div 
          className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 p-6 relative overflow-hidden"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ 
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            translateY: -5
          }}
          onMouseEnter={() => setActiveWidget('weather')}
          onMouseLeave={() => setActiveWidget(null)}
        >
          {/* Background decorative elements */}
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-blue-500/5 rounded-full blur-xl opacity-70" />
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-blue-500/5 rounded-full blur-xl opacity-70" />
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sun className="h-5 w-5 text-primary" />
              <span className="relative">
                حالة الطقس
                {activeWidget === 'weather' && (
                  <motion.div 
                    layoutId="underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </span>
            </h2>
            <motion.button 
              onClick={() => {
                setWeatherLoading(true);
                setTimeout(() => setWeatherLoading(false), 1000);
              }}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              title="تحديث"
            >
              <RefreshCw className="h-4 w-4" />
            </motion.button>
          </div>
          
          {weatherLoading ? (
            <div className="flex justify-center items-center py-12">
              <motion.div 
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { repeat: Infinity, duration: 1, ease: "linear" },
                  scale: { repeat: Infinity, duration: 1.5 }
                }}
              >
                <div className="h-12 w-12 border-4 border-t-primary border-r-primary/30 border-b-primary/70 border-l-primary/10 rounded-full" />
              </motion.div>
            </div>
          ) : weatherError ? (
            <div className="text-center py-8">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
              </motion.div>
              <p className="text-gray-600 dark:text-gray-400">تعذر تحميل بيانات الطقس</p>
              <motion.button 
                onClick={() => {
                  setWeatherError(false);
                  setWeatherLoading(true);
                  setTimeout(() => setWeatherLoading(false), 1000);
                }}
                className="mt-2 px-3 py-1 bg-primary text-white rounded-md text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                إعادة المحاولة
              </motion.button>
            </div>
          ) : weather ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="font-medium text-lg">{weather.location}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{formatDate(currentTime)}</p>
                </motion.div>
                <motion.div 
                  className="text-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  {getWeatherIcon(weather.condition)}
                  <p className="text-sm mt-1">{weather.condition}</p>
                </motion.div>
              </div>
              
              <motion.div 
                className="flex items-center justify-center mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">{weather.temperature}°</div>
              </motion.div>
              
              <div className="grid grid-cols-2 gap-4">
                <motion.div 
                  className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex items-center"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.03 }}
                >
                  <Droplets className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">الرطوبة</p>
                    <p className="font-medium">{weather.humidity}%</p>
                  </div>
                </motion.div>
                <motion.div 
                  className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex items-center"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.03 }}
                >
                  <Wind className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">سرعة الرياح</p>
                    <p className="font-medium">{weather.windSpeed} كم/س</p>
                  </div>
                </motion.div>
              </div>
              
              <motion.div 
                className="mt-4 pt-4 border-t dark:border-gray-800"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <h4 className="text-sm font-medium mb-2">توقعات الأيام القادمة</h4>
                <div className="grid grid-cols-3 gap-2">
                  {weather.forecast.map((day: any, index: number) => (
                    <motion.div 
                      key={index} 
                      className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      whileHover={{ y: -5 }}
                    >
                      <p className="text-xs font-medium">{day.day}</p>
                      <div className="my-1">{getWeatherIcon(day.condition)}</div>
                      <p className="text-sm font-bold">{day.temp}°</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : null}
        </motion.div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Letters Stats */}
        {hasPermission('view:letters') && (
          <motion.div 
            className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 p-6 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ 
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              translateY: -5
            }}
          >
            {/* Background decorative elements */}
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-70" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                إحصائيات الخطابات
              </h2>
              <motion.button 
                onClick={() => navigate('/admin/letters')}
                className="text-xs text-primary hover:underline"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                عرض الكل
              </motion.button>
            </div>
            
            {lettersLoading ? (
              <div className="flex justify-center items-center py-12">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <div className="h-8 w-8 border-4 border-t-primary border-primary/30 rounded-full" />
                </motion.div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <motion.div 
                    className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 p-3 rounded-lg text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
                  >
                    <div className="text-2xl font-bold text-primary">{lettersStats.total}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">إجمالي</p>
                  </motion.div>
                  <motion.div 
                    className="bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/20 p-3 rounded-lg text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.6 }}
                  >
                    <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">{lettersStats.draft}</div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">مسودة</p>
                  </motion.div>
                  <motion.div 
                    className="bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-900/20 p-3 rounded-lg text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.7 }}
                  >
                    <div className="text-2xl font-bold text-green-500 dark:text-green-400">{lettersStats.completed}</div>
                    <p className="text-xs text-green-600 dark:text-green-400">مكتملة</p>
                  </motion.div>
                </div>
                
                <div className="h-40">
                  <Doughnut data={lettersChartData} options={chartOptions} />
                </div>
              </>
            )}
          </motion.div>
        )}
        
        {/* Tasks Stats */}
        {(hasPermission('view:tasks') || hasPermission('view:tasks:assigned') || hasPermission('view:tasks:own')) && (
          <motion.div 
            className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 p-6 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            whileHover={{ 
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              translateY: -5
            }}
          >
            {/* Background decorative elements */}
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl opacity-70" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                إحصائيات المهام
              </h2>
              <motion.button 
                onClick={() => navigate('/admin/tasks')}
                className="text-xs text-primary hover:underline"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                عرض الكل
              </motion.button>
            </div>
            
            {tasksLoading ? (
              <div className="flex justify-center items-center py-12">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <div className="h-8 w-8 border-4 border-t-primary border-primary/30 rounded-full" />
                </motion.div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <motion.div 
                    className="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/20 p-3 rounded-lg text-center col-span-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
                  >
                    <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">{tasksStats.new}</div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">جديدة</p>
                  </motion.div>
                  <motion.div 
                    className="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/20 p-3 rounded-lg text-center col-span-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.55 }}
                  >
                    <div className="text-2xl font-bold text-purple-500 dark:text-purple-400">{tasksStats.createdByMe}</div>
                    <p className="text-xs text-purple-600 dark:text-purple-400">أنشأتها</p>
                  </motion.div>
                  <motion.div 
                    className="bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-900/20 p-3 rounded-lg text-center col-span-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.6 }}
                  >
                    <div className="text-2xl font-bold text-green-500 dark:text-green-400">{tasksStats.completed}</div>
                    <p className="text-xs text-green-600 dark:text-green-400">مكتملة</p>
                  </motion.div>
                </div>
                
                <div className="h-40">
                  <Bar data={tasksChartData} options={chartOptions} />
                </div>
              </>
            )}
          </motion.div>
        )}
        
        {/* Approvals Stats */}
        {hasPermission('view:approvals') && (
          <motion.div 
            className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 p-6 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ 
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              translateY: -5
            }}
          >
            {/* Background decorative elements */}
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl opacity-70" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                إحصائيات الموافقات
              </h2>
              <motion.button 
                onClick={() => navigate('/admin/approvals')}
                className="text-xs text-primary hover:underline"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                عرض الكل
              </motion.button>
            </div>
            
            {approvalsLoading ? (
              <div className="flex justify-center items-center py-12">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <div className="h-8 w-8 border-4 border-t-primary border-primary/30 rounded-full" />
                </motion.div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <motion.div 
                    className="bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-900/20 p-3 rounded-lg text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
                  >
                    <div className="text-2xl font-bold text-yellow-500 dark:text-yellow-400">{approvalsStats.pending}</div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">معلقة</p>
                  </motion.div>
                  <motion.div 
                    className="bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-900/20 p-3 rounded-lg text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.6 }}
                  >
                    <div className="text-2xl font-bold text-green-500 dark:text-green-400">{approvalsStats.approved}</div>
                    <p className="text-xs text-green-600 dark:text-green-400">موافق عليها</p>
                  </motion.div>
                  <motion.div 
                    className="bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-900/20 p-3 rounded-lg text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.7 }}
                  >
                    <div className="text-2xl font-bold text-red-500 dark:text-red-400">{approvalsStats.rejected}</div>
                    <p className="text-xs text-red-600 dark:text-red-400">مرفوضة</p>
                  </motion.div>
                </div>
                
                <div className="h-40">
                  <Doughnut data={approvalsChartData} options={chartOptions} />
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
      
      {/* Activity Chart */}
      <motion.div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 p-6 mb-6 relative overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        whileHover={{ 
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          translateY: -5
        }}
        onMouseEnter={() => setActiveWidget('activity')}
        onMouseLeave={() => setActiveWidget(null)}
      >
        {/* Background decorative elements */}
        <div className="absolute -bottom-16 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-70" />
        <div className="absolute -top-16 right-1/4 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-70" />
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="relative">
              النشاط خلال الأشهر الماضية
              {activeWidget === 'activity' && (
                <motion.div 
                  layoutId="underline"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </span>
          </h2>
        </div>
        
        <motion.div 
          className="h-80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Line data={activityChartData} options={chartOptions} />
        </motion.div>
      </motion.div>
      
      {/* Quick Access and User Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Access */}
        <motion.div 
          className="md:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 p-6 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          whileHover={{ 
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            translateY: -5
          }}
          onMouseEnter={() => setActiveWidget('quickAccess')}
          onMouseLeave={() => setActiveWidget(null)}
        >
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/5 rounded-full blur-xl opacity-70" />
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-primary/5 rounded-full blur-xl opacity-70" />
          
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 relative z-10">
            <Zap className="h-5 w-5 text-primary" />
            <span className="relative">
              الوصول السريع
              {activeWidget === 'quickAccess' && (
                <motion.div 
                  layoutId="underline"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </span>
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {hasPermission('create:letters') && (
              <motion.button
                onClick={() => navigate('/admin/letters/new')}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 rounded-lg transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FileText className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">إنشاء خطاب جديد</span>
              </motion.button>
            )}
            
            {hasPermission('create:tasks') && (
              <motion.button
                onClick={() => navigate('/admin/tasks/new')}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 rounded-lg transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.95 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <CheckCircle className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">إنشاء مهمة جديدة</span>
              </motion.button>
            )}
            
            {hasPermission('view:letters') && (
              <motion.button
                onClick={() => navigate('/admin/letters')}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 rounded-lg transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FileText className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">إدارة الخطابات</span>
              </motion.button>
            )}
            
            {(hasPermission('view:tasks') || hasPermission('view:tasks:assigned') || hasPermission('view:tasks:own')) && (
              <motion.button
                onClick={() => navigate('/admin/tasks')}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 rounded-lg transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <CheckCircle className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">إدارة المهام</span>
              </motion.button>
            )}
            
            {hasPermission('view:approvals') && (
              <motion.button
                onClick={() => navigate('/admin/approvals')}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 rounded-lg transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ClipboardCheck className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">الموافقات</span>
              </motion.button>
            )}
            
            <motion.button
              onClick={() => navigate('/admin/settings')}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 rounded-lg transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.15 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">الإعدادات</span>
            </motion.button>
          </div>
          
          {/* Saved Shortcuts */}
          <motion.div 
            className="mt-6 pt-4 border-t dark:border-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              الاختصارات المحفوظة
            </h3>
            <div className="flex flex-wrap gap-2">
              <motion.button 
                className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-sm rounded-full flex items-center gap-1.5"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/admin/letters')}
              >
                <Bookmark className="h-3.5 w-3.5 text-primary" />
                الخطابات الأخيرة
              </motion.button>
              
              <motion.button 
                className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-sm rounded-full flex items-center gap-1.5"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/admin/tasks')}
              >
                <Bookmark className="h-3.5 w-3.5 text-primary" />
                مهامي المتأخرة
              </motion.button>
              
              <motion.button 
                className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-sm rounded-full flex items-center gap-1.5"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/admin/settings')}
              >
                <Bookmark className="h-3.5 w-3.5 text-primary" />
                الإعدادات
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
        
        {/* User Info */}
        <motion.div 
          className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 p-6 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          whileHover={{ 
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            translateY: -5
          }}
          onMouseEnter={() => setActiveWidget('userInfo')}
          onMouseLeave={() => setActiveWidget(null)}
        >
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/5 rounded-full blur-xl opacity-70" />
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-primary/5 rounded-full blur-xl opacity-70" />
          
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 relative z-10">
            <User className="h-5 w-5 text-primary" />
            <span className="relative">
              معلومات المستخدم
              {activeWidget === 'userInfo' && (
                <motion.div 
                  layoutId="underline"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </span>
          </h2>
          
          <div className="flex flex-col items-center mb-4">
            <motion.div 
              className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <User className="h-10 w-10 text-primary" />
            </motion.div>
            <motion.h3 
              className="text-lg font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {dbUser?.full_name}
            </motion.h3>
            <motion.p 
              className="text-sm text-gray-600 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {dbUser?.email}
            </motion.p>
            <motion.div 
              className="mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                dbUser?.role === 'admin'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {dbUser?.role === 'admin' ? 'مدير' : 'مستخدم'}
              </span>
            </motion.div>
          </div>
          
          <div className="space-y-3">
            {dbUser?.branch && (
              <motion.div 
                className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900/80 rounded-lg"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ x: 5 }}
              >
                <div className="flex items-center">
                  <Building className="h-5 w-5 text-primary mr-2" />
                  <span className="text-sm font-medium">الفرع</span>
                </div>
                <span className="text-sm">{dbUser.branch.name}</span>
              </motion.div>
            )}
            
            <motion.div 
              className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900/80 rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ x: 5 }}
            >
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-primary mr-2" />
                <span className="text-sm font-medium">تاريخ التسجيل</span>
              </div>
              <span className="text-sm">{new Date(dbUser?.created_at || '').toLocaleDateString('ar-SA')}</span>
            </motion.div>
            
            {/* Activity Badge */}
            <motion.div 
              className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900/80 rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ x: 5 }}
            >
              <div className="flex items-center">
                <Coffee className="h-5 w-5 text-primary mr-2" />
                <span className="text-sm font-medium">حالة النشاط</span>
              </div>
              <span className="text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full text-xs">
                نشط الآن
              </span>
            </motion.div>
            
            <motion.button
              onClick={() => navigate('/admin/settings')}
              className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Settings className="h-4 w-4" />
              تعديل الملف الشخصي
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Keyboard Shortcuts Reference */}
      <motion.div 
        className="mt-6 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 overflow-hidden shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <div className="border-b dark:border-gray-800 p-4">
          <h3 className="font-medium">اختصارات لوحة المفاتيح</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">فتح لوحة الأوامر</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded font-mono">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded font-mono">K</kbd>
            </div>
          </div>
          
          {hasPermission('create:letters') && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">خطاب جديد</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded font-mono">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded font-mono">N</kbd>
              </div>
            </div>
          )}
          
          {hasPermission('create:tasks') && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">مهمة جديدة</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded font-mono">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded font-mono">T</kbd>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">تبديل الوضع المظلم</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded font-mono">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded font-mono">D</kbd>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}