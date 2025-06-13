import { 
  FileText, Home, Settings, Users, History, Building, Shield, Key, ClipboardCheck, FileCheck, ListTodo 
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useAuth } from '../../lib/auth'
import { useQuery } from '@tanstack/react-query'
import { useWorkflow } from '../../hooks/useWorkflow'

export function Sidebar() {
  const location = useLocation()
  const { isAdmin, hasPermission, dbUser } = useAuth()
  const { getPendingApprovals } = useWorkflow()
  
  // Fetch pending approvals for notification count
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: getPendingApprovals,
    enabled: !!dbUser && hasPermission('view:approvals')
  })
  
  // Define the unreadNotifications variable based on pending approvals count
  const unreadCount = pendingApprovals?.length || 0

  // Define navigation items with permission checks
  const getNavigationItems = () => {
    const items = [
      { 
        name: 'الرئيسية', 
        href: '/admin', 
        icon: Home, 
        permissions: []  // الرئيسية متاحة للجميع
      },
    ];
    
    // إضافة قسم الخطابات فقط إذا كان المستخدم يملك أي من صلاحيات الخطابات (عرض أو إنشاء)
    if (hasPermission('view:letters') || hasPermission('create:letters')) {
      items.push({ 
        name: 'الخطابات', 
        href: '/admin/letters', 
        icon: FileText, 
        permissions: ['view:letters', 'create:letters'],
        exact: false
      });
    }
    
    // إضافة قسم الموافقات فقط إذا كان المستخدم يملك صلاحية
    if (hasPermission('view:approvals') || hasPermission('view:approvals:own')) {
      items.push({
        name: 'الموافقات',
        href: '/admin/approvals',
        icon: ClipboardCheck,
        permissions: ['view:approvals', 'view:approvals:own'],
        badge: unreadCount > 0 ? unreadCount : null
      });
    }
    
    // إضافة قسم المهام فقط إذا كان المستخدم يملك صلاحية
    if (hasPermission('view:tasks') || hasPermission('view:tasks:assigned') || hasPermission('view:tasks:own')) {
      items.push({
        name: 'المهام',
        href: '/admin/tasks',
        icon: ListTodo,
        permissions: ['view:tasks', 'view:tasks:assigned', 'view:tasks:own']
      });
    }
    
    if (isAdmin || hasPermission('view:users')) {
      items.push(
        { 
          name: 'المستخدمين', 
          href: '/admin/users', 
          icon: Users, 
          permissions: ['view:users']
        }
      );
    }
    
    if (isAdmin || hasPermission('view:branches')) {
      items.push(
        { 
          name: 'الفروع', 
          href: '/admin/branches', 
          icon: Building, 
          permissions: ['view:branches']
        }
      );
    }
    
    if (isAdmin || hasPermission('view:permissions')) {
      items.push(
        { 
          name: 'الصلاحيات', 
          href: '/admin/permissions', 
          icon: Shield, 
          permissions: ['view:permissions']
        }
      );
    }
    
    if (isAdmin || hasPermission('view:audit_logs')) {
      items.push(
        { 
          name: 'سجلات الأحداث', 
          href: '/admin/audit-logs', 
          icon: History, 
          permissions: ['view:audit_logs']
        }
      );
    }
    
    items.push({ 
      name: 'الإعدادات', 
      href: '/admin/settings', 
      icon: Settings, 
      permissions: []
    });
    
    return items;
  };

  const navigation = getNavigationItems();

  return (
    <aside className="w-64 bg-[#0f172a] h-[calc(100vh-0rem)] transition-colors duration-300">
      {/* Logo section in sidebar */}
      <div className="py-5 flex justify-center border-b border-gray-700/20">
        <Link to="/admin" className="flex flex-col items-center">
          <img 
            src="https://hbxalipjrbcrqljddxfp.supabase.co/storage/v1/object/public/templates//logo.png" 
            alt="الجمعية السعودية للإعاقة السمعية" 
            className="h-14 object-contain brightness-0 invert contrast-200 transition-all duration-300" 
          />
          <h1 className="mt-2 text-lg font-bold text-white">نظام إدارة الخطابات</h1>
        </Link>
      </div>
      
      <nav className="h-full pt-4 flex flex-col">
        <div className="space-y-1 px-2 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.href 
              : location.pathname === item.href || 
                (item.href !== '/admin' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-150',
                  isActive
                    ? 'bg-primary/20 text-white'
                    : 'text-gray-300 hover:bg-[#1e293b] hover:text-white'
                )}
              >
                <div className="flex items-center gap-x-3">
                  <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-gray-400")} />
                  {item.name}
                </div>
                
                {item.badge && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
        
        <div className="mt-auto px-3 pb-5 pt-3">
          {hasPermission('view:letters') && unreadCount > 0 && (
            <div className="bg-[#1e293b] rounded-md p-3 text-xs text-gray-400">
              <p className="flex items-center gap-2 mb-2 font-medium text-gray-300">
                <ClipboardCheck className="h-4 w-4 text-primary" /> 
                إحصائيات سريعة
              </p>
              <div className="space-y-1.5">
                {hasPermission('view:letters') && (
                  <div className="flex justify-between">
                    <span>الخطابات</span>
                    <span className="font-medium text-gray-300">237</span>
                  </div>
                )}
                {hasPermission('view:approvals') && (
                  <div className="flex justify-between">
                    <span>طلبات معلقة</span>
                    <span className="font-medium text-gray-300">{unreadCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-4 text-xs text-center text-gray-500">
            © {new Date().getFullYear()} الجمعية السعودية للإعاقة السمعية
          </div>
        </div>
      </nav>
    </aside>
  )
}