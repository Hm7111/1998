import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from './components/auth/AuthGuard'
import { Login } from './pages/auth/Login'
import { AdminLayout } from './components/layout/AdminLayout'
import { Dashboard } from './pages/admin/Dashboard'
import { Letters } from './pages/admin/Letters'
import { Users } from './pages/admin/Users'
import { Branches } from './pages/admin/Branches'
import { Settings } from './pages/admin/Settings'
import { VerifyLetter } from './pages/VerifyLetter'
import { AuditLogs } from './pages/admin/AuditLogs'
import { PermissionsManager } from './pages/admin/permissions'
// Importar páginas de cartas desde la ruta correcta
import { LetterEditor, ViewLetter, EditLetter } from './features/letters/pages'
import { AuthProvider } from './lib/auth'
import { Approvals } from './pages/admin/Approvals'
// Importar páginas del sistema de tareas
import { TasksList, TaskDetails, NewTask } from './features/tasks/pages'
import { PermissionRoute } from './components/auth/PermissionRoute'

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/admin" element={<AuthGuard><AdminLayout /></AuthGuard>}>
          <Route index element={<Dashboard />} />
          
          {/* Rutas protegidas por permisos */}
          <Route path="letters" element={
            <PermissionRoute permissions={['view:letters']}>
              <Letters />
            </PermissionRoute>
          } />
          <Route path="letters/new" element={
            <PermissionRoute permissions={['create:letters']}>
              <LetterEditor />
            </PermissionRoute>
          } />
          <Route path="letters/edit/:id" element={
            <PermissionRoute permissions={['edit:letters', 'edit:letters:own']}>
              <EditLetter />
            </PermissionRoute>
          } />
          <Route path="letters/view/:id" element={
            <PermissionRoute permissions={['view:letters']}>
              <ViewLetter />
            </PermissionRoute>
          } />
          
          <Route path="users" element={
            <PermissionRoute permissions={['view:users']}>
              <Users />
            </PermissionRoute>
          } />
          
          <Route path="branches" element={
            <PermissionRoute permissions={['view:branches']}>
              <Branches />
            </PermissionRoute>
          } />
          
          <Route path="permissions" element={
            <PermissionRoute permissions={['view:permissions']}>
              <PermissionsManager />
            </PermissionRoute>
          } />
          
          <Route path="settings" element={<Settings />} />
          
          <Route path="audit-logs" element={
            <PermissionRoute permissions={['view:audit_logs']}>
              <AuditLogs />
            </PermissionRoute>
          } />
          
          <Route path="approvals" element={
            <PermissionRoute permissions={['view:approvals', 'view:approvals:own']}>
              <Approvals />
            </PermissionRoute>
          } />
          
          {/* Rutas del sistema de tareas */}
          <Route path="tasks" element={
            <PermissionRoute permissions={['view:tasks', 'view:tasks:assigned', 'view:tasks:own']}>
              <TasksList />
            </PermissionRoute>
          } />
          <Route path="tasks/new" element={
            <PermissionRoute permissions={['create:tasks', 'create:tasks:own']}>
              <NewTask />
            </PermissionRoute>
          } />
          <Route path="tasks/:id" element={
            <PermissionRoute permissions={['view:tasks', 'view:tasks:assigned', 'view:tasks:own']}>
              <TaskDetails />
            </PermissionRoute>
          } />
        </Route>
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/verify/:code" element={<VerifyLetter />} />
      </Routes>
    </AuthProvider>
  )
}