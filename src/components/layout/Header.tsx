import { useState, useEffect } from 'react'
import { HelpCircle, Keyboard, LogOut, Moon, Sun, Settings, Bell, User, Search, Menu, X, Building, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useThemeStore } from '../../store/theme'
import { supabase } from '../../lib/supabase'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../hooks/useToast'
import { useWorkflow } from '../../hooks/useWorkflow'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

export function Header() {
  const { theme, setTheme } = useThemeStore()
  const navigate = useNavigate()
  const { registerHotkey } = useHotkeys()
  const { dbUser, hasPermission } = useAuth()
  const { toast } = useToast()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  const [showNotifications, setShowNotifications] = useState(false)
  
  const { getPendingApprovals } = useWorkflow()
  
  // استعلام لجلب عدد طلبات الموافقة المعلقة
  const { data: pendingApprovals = [], isLoading } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: getPendingApprovals,
    enabled: !!dbUser && hasPermission('view:approvals'),
    refetchInterval: 60000, // تحديث كل دقيقة
  })
  
  // تحديث عدد الإشعارات غير المقروءة
  const unreadNotifications = pendingApprovals.length;
  
  // تسجيل اختصارات لوحة المفاتيح
  useEffect(() => {
    // تحقق من صلاحيات المستخدم قبل تسجيل الاختصارات المتعلقة بالخطابات
    const hasLetterPermissions = hasPermission('view:letters') || hasPermission('create:letters');

    // تسجيل اختصارات لوحة المفاتيح
    registerHotkey('ctrl+k', () => document.querySelector<HTMLButtonElement>('#keyboard-shortcuts')?.click())
    registerHotkey('ctrl+h', () => document.querySelector<HTMLButtonElement>('#help-guide')?.click())
    registerHotkey('ctrl+d', () => setTheme(theme === 'light' ? 'dark' : 'light'))
    
    // تسجيل اختصارات الخطابات فقط إذا كان المستخدم لديه الصلاحيات
    if (hasLetterPermissions) {
      registerHotkey('ctrl+/', () => navigate('/admin/letters/new'))
      registerHotkey('ctrl+.', () => navigate('/admin/letters'))
    }
    
    // تنظيف عند إزالة المكون
    return () => {
      // يتم التنظيف تلقائيًا عند إزالة المكون
    }
  }, [theme, hasPermission, navigate, registerHotkey, setTheme])

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      toast({
        title: 'تم تسجيل الخروج',
        description: 'تم تسجيل الخروج بنجاح',
        type: 'success'
      })
      
      navigate('/login')
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تسجيل الخروج',
        type: 'error'
      })
    }
  }

  return (
    <>
      {/* نافذة اختصارات لوحة المفاتيح */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50\" onClick={() => setShowShortcuts(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white dark:bg-gray-900 max-w-md w-full rounded-lg shadow-lg overflow-hidden\" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
              <h2 className="text-lg font-semibold">اختصارات لوحة المفاتيح</h2>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>اختصارات لوحة المفاتيح</span>
                  <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800">Ctrl+K</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>دليل المستخدم</span>
                  <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800">Ctrl+H</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>تبديل المظهر</span>
                  <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800">Ctrl+D</kbd>
                </div>
                {hasPermission('view:letters') && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>إنشاء خطاب جديد</span>
                      <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800">Ctrl+/</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>عرض الخطابات</span>
                      <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800">Ctrl+.</kbd>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* نافذة الإشعارات */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-4 z-50 w-80 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-lg overflow-hidden"
          >
            <div className="p-3 border-b dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                الإشعارات
                {unreadNotifications > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {unreadNotifications}
                  </span>
                )}
              </h3>
              <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {pendingApprovals.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-center py-8 px-4 text-gray-500 dark:text-gray-400"
                >
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>لا توجد إشعارات جديدة</p>
                </motion.div>
              ) : (
                <div className="divide-y dark:divide-gray-800">
                  {pendingApprovals.map((approval, index) => (
                    <motion.div 
                      key={approval.request_id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">طلب موافقة جديد</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            طلب موافقة على خطاب "{approval.letter_subject}" من {approval.requester_name}
                          </p>
                          <div className="mt-2 flex justify-between items-center">
                            <button
                              onClick={() => {
                                setShowNotifications(false);
                                navigate('/admin/approvals');
                              }}
                              className="text-primary text-sm hover:underline flex items-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              عرض التفاصيل
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {new Date(approval.requested_at).toLocaleString('ar-SA', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            
            {pendingApprovals.length > 0 && (
              <div className="p-3 border-t dark:border-gray-800 bg-gradient-to-r from-primary/5 to-transparent">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/admin/approvals');
                  }}
                  className="w-full p-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
                >
                  عرض جميع الإشعارات
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    
      <header className="bg-white shadow-sm dark:bg-gray-800 sticky top-0 z-30 transition-colors duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-x-4">
            {/* زر القائمة الجانبية للشاشات الصغيرة */}
            <button 
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* الترحيب بالمستخدم - إضافة جديدة */}
            <div className="hidden md:flex flex-col">
              <h2 className="font-bold text-lg">{getGreeting()}, {dbUser?.full_name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString('ar-SA', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          
          {/* شريط البحث في الوسط */}
          <div className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full w-1/3 max-w-md border border-transparent focus-within:border-primary/20 focus-within:bg-white dark:focus-within:bg-gray-700 transition-all duration-200">
            <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="بحث سريع..."
              className="bg-transparent w-full text-sm focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 dark:text-gray-400">
              /
            </kbd>
          </div>
          
          <div className="flex items-center gap-x-1.5">
            <motion.button
              id="keyboard-shortcuts"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group relative text-gray-500 dark:text-gray-400"
              title="اختصارات لوحة المفاتيح (Ctrl+K)"
              onClick={() => setShowShortcuts(true)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Keyboard className="h-5 w-5" />
              <div className="help-tooltip -bottom-24 left-1/2 -translate-x-1/2 w-48">
                <div className="space-y-2 text-xs">
                  <p className="flex items-center justify-between">
                    <span>اختصارات لوحة المفاتيح</span>
                    <kbd className="shortcut-key">Ctrl+K</kbd>
                  </p>
                </div>
              </div>
            </motion.button>

            <motion.button
              id="help-guide"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group relative text-gray-500 dark:text-gray-400"
              title="دليل المستخدم (Ctrl+H)"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <HelpCircle className="h-5 w-5" />
              <div className="help-tooltip -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
                عرض دليل المستخدم
              </div>
            </motion.button>
            
            {hasPermission('view:approvals') && (
              <motion.button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group relative text-gray-500 dark:text-gray-400"
                onClick={() => setShowNotifications(!showNotifications)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className="relative">
                  <Bell className="h-5 w-5" />
                  <AnimatePresence>
                    {unreadNotifications > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full"
                      >
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            )}

            <motion.button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group relative text-gray-500 dark:text-gray-400"
              title="تبديل المظهر (Ctrl+D)"
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div className="help-tooltip -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
                {theme === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع النهاري'}
              </div>
            </motion.button>

            {/* قائمة المستخدم */}
            <div className="relative">
              <motion.button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-sm ml-3 p-1.5 rounded-full overflow-hidden hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                title="حساب المستخدم"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:block font-medium truncate max-w-[100px]">
                  {dbUser?.full_name || 'المستخدم'}
                </span>
                {dbUser?.branch?.code && (
                  <span className="hidden sm:inline-block text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full ml-1">
                    {dbUser.branch.code}
                  </span>
                )}
              </motion.button>
              
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-lg overflow-hidden z-50"
                  >
                    <div className="p-4 border-b dark:border-gray-800 bg-gradient-to-r from-primary/5 to-transparent">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <p className="font-medium text-lg">{dbUser?.full_name || 'المستخدم'}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{dbUser?.email}</p>
                      </motion.div>
                      <motion.div 
                        className="flex items-center gap-2 mt-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <p className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 inline-block px-2 py-0.5 rounded-full">
                          {dbUser?.role === 'admin' ? 'مدير' : 'مستخدم'}
                        </p>
                        {dbUser?.branch && (
                          <p className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 inline-block px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {dbUser.branch.name} ({dbUser.branch.code})
                          </p>
                        )}
                      </motion.div>
                    </div>
                    
                    <div className="py-1">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Link
                          to="/admin/settings"
                          className="flex items-center gap-x-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="h-4 w-4 text-gray-500" />
                          <span>الإعدادات</span>
                        </Link>
                      </motion.div>
                      
                      <motion.button
                        onClick={handleLogout}
                        className="w-full text-right flex items-center gap-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>تسجيل الخروج</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
      
      {/* القائمة الجانبية للشاشات الصغيرة */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileMenu(false)}></div>
          
          <motion.div 
            className="absolute inset-y-0 right-0 w-64 bg-[#0f172a] shadow-lg"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            {/* محتوى القائمة الجانبية للجوال */}
            <div className="p-4 border-b border-gray-700/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-white">{dbUser?.full_name || 'المستخدم'}</div>
                <div className="text-xs text-gray-400">{dbUser?.role === 'admin' ? 'مدير' : 'مستخدم'}</div>
              </div>
            </div>
            
            <div className="p-2 text-gray-400">
              {/* موبايل: عرض نفس العناصر من القائمة الرئيسية */}
              {navigation.map(item => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-x-3 px-3 py-2 text-sm font-medium hover:bg-[#1e293b] hover:text-white"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
              
              <div className="border-t border-gray-700/20 my-2 pt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-x-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-900/20 w-full text-right"
                >
                  <LogOut className="h-5 w-5" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

// أيقونات إضافية
function Home(props: any) {
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
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  )
}

function FileText(props: any) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  )
}

function Plus(props: any) {
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
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
}

function Users(props: any) {
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  )
}

// Helper function for time-based greetings
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'مساء الخير';
  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'ظهيرة سعيدة';
  return 'مساء الخير';
}

// Placeholder navigation items
const navigation = [
  { name: 'الرئيسية', href: '/admin', icon: Home },
  { name: 'الخطابات', href: '/admin/letters', icon: FileText },
  { name: 'المستخدمين', href: '/admin/users', icon: Users }
];