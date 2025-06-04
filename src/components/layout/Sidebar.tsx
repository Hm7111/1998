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
    <aside className="w-64 border-l border-gray-700/20 bg-[#0f172a] h-[calc(100vh-4rem)] transition-colors duration-300">
      <nav className="space-y-1">
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
                'flex items-center gap-x-3 px-4 py-3 text-sm font-medium',
                isActive
                  ? 'bg-primary/10 text-white border-r-4 border-primary'
                  : 'text-gray-400 hover:bg-[#1e293b] hover:text-white'
              )}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}