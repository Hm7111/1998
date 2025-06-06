import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NotificationBadge } from '../../features/notifications/components'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-foreground transition-colors duration-300 flex flex-col">
      <div className="flex flex-1 h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 p-6 transition-colors duration-300 bg-gray-100 dark:bg-gray-900 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}