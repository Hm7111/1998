import { FileText, Home, Settings, Users, History, Building, Shield, Key, ClipboardCheck, FileCheck, ListTodo } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useAuth } from '../../lib/auth'

export function Sidebar() {
  const location = useLocation()
  const { isAdmin, hasPermission } = useAuth()

  // Define navigation items with permission checks
  const getNavigationItems = () => {
    const items = [
      { 
        name: 'الرئيسية', 
        href: '/admin', 
        icon: Home, 
        permissions: ['view:dashboard']
      },
      { 
        name: 'الخطابات', 
        href: '/admin/letters', 
        icon: FileText, 
        permissions: ['view:letters']
      },
      {
        name: 'الموافقات',
        href: '/admin/approvals',
        icon: ClipboardCheck,
        permissions: ['view:approvals', 'view:approvals:own']
      },
      {
        name: 'المهام',
        href: '/admin/tasks',
        icon: ListTodo,
        permissions: ['view:tasks', 'view:tasks:assigned', 'view:tasks:own']
      }
    ];
    
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
      permissions: ['view:settings']
    });
    
    return items;
  };

  const navigation = getNavigationItems();

  return (
    <aside className="w-64 bg-[#0f172a] h-[calc(100vh-4rem)] transition-colors duration-300">
      <nav className="h-full py-4 flex flex-col">
        <div className="space-y-1 px-2 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
                          (item.href !== '/admin' && location.pathname.startsWith(item.href));
                          
            // Skip items that require permissions the user doesn't have
            if (item.permissions && item.permissions.length > 0 && !hasPermission(item.permissions[0]) && !item.permissions.some(p => hasPermission(p))) {
              return null;
            }
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-x-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-150',
                  isActive
                    ? 'bg-primary/20 text-white'
                    : 'text-gray-300 hover:bg-[#1e293b] hover:text-white'
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-gray-400")} />
                {item.name}
              </Link>
            )
          })}
        </div>
        
        <div className="mt-auto px-3 pb-3">
          <div className="bg-[#1e293b] rounded-md p-3 text-xs text-gray-400">
            <p className="flex items-center gap-2 mb-2 font-medium text-gray-300">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              إحصائيات سريعة
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>الخطابات</span>
                <span className="font-medium text-gray-300">237</span>
              </div>
              <div className="flex justify-between">
                <span>طلبات معلقة</span>
                <span className="font-medium text-gray-300">{unreadNotifications}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  )
}