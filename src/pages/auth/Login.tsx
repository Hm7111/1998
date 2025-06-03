import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LogIn, Eye, EyeOff, AlertCircle, Mail, Lock } from 'lucide-react'
import { FormField } from '../../components/ui/FormField'
import { useThemeStore } from '../../store/theme'

export function Login() {
  const navigate = useNavigate()
  const { theme, setTheme } = useThemeStore()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('rememberedEmail'))
  const [animateEmail, setAnimateEmail] = useState(false)
  const [animatePassword, setAnimatePassword] = useState(false)
  
  // تطبيق مؤثر الظهور التدريجي عند تحميل الصفحة
  useEffect(() => {
    document.body.classList.add('overflow-hidden')
    
    // تنظيف بعد الخروج من الصفحة
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [])

  // التحقق من المدخلات مع تطبيق تأثيرات حركية
  const validateInput = (field: string, value: string) => {
    if (field === 'email') {
      if (!value.includes('@')) {
        setAnimateEmail(true)
        setTimeout(() => setAnimateEmail(false), 500)
        return false
      }
    } else if (field === 'password') {
      if (value.length < 6) {
        setAnimatePassword(true)
        setTimeout(() => setAnimatePassword(false), 500)
        return false
      }
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // تحقق من صحة البيانات قبل الإرسال
    if (!validateInput('email', email) || !validateInput('password', password)) {
      return
    }
    
    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        } else if (error.message.includes('user')) {
          setError('حدث خطأ: الحساب غير نشط')
        } else {
          setError('حدث خطأ أثناء تسجيل الدخول: ' + error.message)
        }
        return
      }
      
      if (!data.user) {
        setError('لم يتم العثور على المستخدم')
        return
      }

      // التحقق من حالة المستخدم (نشط أم لا)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_active, role')
        .eq('id', data.user.id)
        .single()
        
      if (userError) {
        console.error('Error fetching user data:', userError)
        setError('حدث خطأ أثناء التحقق من حالة الحساب')
        // قم بتسجيل الخروج إذا حدث خطأ للتأكد من الأمان
        await supabase.auth.signOut()
        return
      }
      
      // السماح للمدير بالدخول دائماً، بغض النظر عن حالة التنشيط
      if (userData && !userData.is_active && userData.role !== 'admin') {
        setError('تم تعطيل حسابك. يرجى التواصل مع المسؤول.')
        // تسجيل الخروج إذا كان المستخدم غير نشط
        await supabase.auth.signOut()
        return
      }

      // حفظ البريد الإلكتروني إذا تم اختيار "تذكرني"
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      navigate('/admin')
    } catch (error) {
      console.error('Error:', error)
      setError('حدث خطأ غير متوقع')
    } finally {
      setIsLoading(false)
    }
  }

  // تبديل وضع الألوان (داكن/فاتح)
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 p-4 transition-colors duration-300 ease-in-out">
      {/* خلفية مع تأثيرات حركية */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[30%] -left-[10%] h-[500px] w-[500px] rounded-full bg-primary-100 dark:bg-primary-900/20 opacity-50 blur-3xl animate-pulse" 
          style={{ animationDuration: '15s' }} />
        <div className="absolute top-[60%] -right-[10%] h-[400px] w-[400px] rounded-full bg-primary-100 dark:bg-primary-900/20 opacity-30 blur-3xl animate-pulse" 
          style={{ animationDuration: '20s' }} />
        <div className="absolute -bottom-[20%] left-[30%] h-[300px] w-[300px] rounded-full bg-primary-50 dark:bg-primary-900/10 opacity-40 blur-3xl animate-pulse" 
          style={{ animationDuration: '25s' }} />
      </div>

      {/* زر تبديل السمة (داكن/فاتح) */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 left-4 rounded-full p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors z-20"
        aria-label={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'}
      >
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>

      <div className="relative w-full max-w-md animate-fadeIn overflow-hidden rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-90 z-10 transition-all duration-300"
        style={{
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          transform: 'translateY(0)',
          animation: 'fadeIn 0.6s ease-out forwards'
        }}>
        
        {/* عناصر زخرفية للبطاقة */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-80" />
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-2xl dark:bg-primary/5" />
        <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-primary/10 blur-2xl dark:bg-primary/5" />

        <div className="relative z-10">
          {/* الشعار والعنوان */}
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <img 
                src="https://hbxalipjrbcrqljddxfp.supabase.co/storage/v1/object/public/templates//logo.png" 
                alt="الجمعية السعودية للإعاقة السمعية"
                className="h-24 object-contain transition-all duration-300 dark:brightness-0 dark:contrast-200 dark:invert"
              />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
              مرحباً بك
            </h1>
            <p className="text-gray-600 dark:text-gray-400 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
              قم بتسجيل الدخول للوصول إلى نظام إدارة الخطابات
            </p>
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="mb-6 flex animate-shake items-center gap-x-2 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* نموذج تسجيل الدخول */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="animate-fadeIn" style={{ animationDelay: '0.5s' }}>
              <FormField
                label="البريد الإلكتروني"
                name="email"
                required
              >
                <div className={`relative ${animateEmail ? 'animate-shake' : ''}`}>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 text-gray-900 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    required
                    autoComplete="email"
                    placeholder="أدخل بريدك الإلكتروني"
                  />
                </div>
              </FormField>
            </div>

            <div className="animate-fadeIn" style={{ animationDelay: '0.6s' }}>
              <FormField
                label="كلمة المرور"
                name="password"
                required
              >
                <div className={`relative ${animatePassword ? 'animate-shake' : ''}`}>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 text-gray-900 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    required
                    autoComplete="current-password"
                    placeholder="أدخل كلمة المرور"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </FormField>
            </div>

            <div className="flex items-center justify-between animate-fadeIn" style={{ animationDelay: '0.7s' }}>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 transition-colors"
                />
                <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-700 dark:text-gray-300">
                  تذكرني
                </label>
              </div>

              <a 
                href="/forgot-password" 
                className="text-sm font-medium text-primary hover:text-primary/90 dark:text-primary-foreground dark:hover:text-primary-foreground/90 transition-colors"
              >
                نسيت كلمة المرور؟
              </a>
            </div>

            <div className="animate-fadeIn" style={{ animationDelay: '0.8s' }}>
              <button
                type="submit"
                className="relative flex w-full items-center justify-center gap-x-2 overflow-hidden rounded-lg bg-primary px-4 py-3 text-primary-foreground transition-all duration-300 hover:bg-primary/90 focus:ring-2 focus:ring-primary/20 transform hover:scale-[1.02] active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-white border-white/30" />
                    <span>جارٍ تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    <span>تسجيل الدخول</span>
                  </>
                )}
                <div className="absolute -right-10 top-0 h-full w-20 bg-white/10 transform skew-x-12 transition-transform duration-700 animate-shimmer" />
              </button>
            </div>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400 animate-fadeIn" style={{ animationDelay: '0.9s' }}>
              ليس لديك حساب؟{" "}
              <a 
                href="/register" 
                className="font-medium text-primary hover:text-primary/90 dark:text-primary-foreground dark:hover:text-primary-foreground/90 transition-colors hover:underline"
              >
                إنشاء حساب جديد
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
