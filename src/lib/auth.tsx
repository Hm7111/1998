import { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import type { User as AuthUser } from '@supabase/supabase-js'
import type { User as DbUser, Permission } from '../types/database'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Default permissions for each role
export const DEFAULT_PERMISSIONS = {
  admin: [
    // Sistema de cartas
    'view:letters',
    'create:letters',
    'edit:letters',
    'delete:letters',
    'export:letters',
    
    // Sistema de plantillas
    'view:templates',
    'create:templates',
    'edit:templates',
    'delete:templates',
    
    // Sistema de usuarios
    'view:users',
    'create:users',
    'edit:users',
    'delete:users',
    
    // Sistema de sucursales
    'view:branches',
    'create:branches',
    'edit:branches',
    'delete:branches',
    
    // Configuración del sistema
    'view:settings',
    'edit:settings',
    
    // Registros de auditoría
    'view:audit_logs',
    
    // Sistema de aprobaciones
    'view:approvals',
    'approve:letters',
    'reject:letters',
    'request:approval',
    
    // Sistema de tareas
    'view:tasks',
    'create:tasks',
    'edit:tasks',
    'delete:tasks',
    'assign:tasks',
    'complete:tasks',
    'view:tasks:all'
  ],
  user: [
    // Sistema de cartas
    'view:letters',
    'create:letters',
    'edit:letters:own',
    'delete:letters:own',
    'export:letters',
    
    // Sistema de plantillas
    'view:templates',
    
    // Sistema de aprobaciones
    'request:approval',
    'view:approvals:own',
    
    // Sistema de tareas
    'view:tasks',
    'create:tasks:own',
    'edit:tasks:own',
    'complete:tasks:own',
    'view:tasks:assigned'
  ]
}

// Type for auth context
interface AuthContextType {
  user: AuthUser | null;
  dbUser: DbUser | null;
  loading: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  logout: () => Promise<void>;
  reloadPermissions: () => Promise<void>;
}

// Create auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  isAdmin: false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  logout: async () => {},
  reloadPermissions: async () => {},
});

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Load user data from Supabase
  const { data: dbUser, isLoading: isDbUserLoading, refetch: refetchUser } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      try {
        // Query by id instead of email since we have a foreign key constraint with auth.users
        // Use RPC function to get user with complete branch details
        const { data, error } = await supabase
          .rpc('get_user_with_branch_details', { user_id: user.id })
          .single()
        
        if (error) {
          console.error('Error fetching user data:', error);
          throw error;
        }
        
       console.log('Loaded user data:', data);
       
        // Importante: verificar si el usuario está activo
        if (data && !data.is_active && data.role !== 'admin') {
          // Si el usuario no está activo, cerrar sesión y redirigir a la página de inicio de sesión
          await supabase.auth.signOut()
          setUser(null)
          navigate('/login', { 
            state: { 
              message: 'Tu cuenta ha sido desactivada. Por favor, contacta al administrador.' 
            } 
          })
          return null
        }
        
        return data
      } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 1, // 1 minuto - reducir tiempo de refresco para actualizar más frecuentemente
    cacheTime: 1000 * 60 * 30, // 30 minutos
    retry: 3
  })

  // Function to reload user permissions (useful after role changes)
  const reloadPermissions = useCallback(async () => {
    if (user?.id) {
      await refetchUser();
    }
  }, [user?.id, refetchUser]);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        queryClient.clear()
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!dbUser) return false;
    
    // Admins have all permissions
    if (dbUser.role === 'admin') return true;
    
    // For regular users, check default permissions based on role and any custom permissions
    const defaultUserPermissions = DEFAULT_PERMISSIONS[dbUser.role as keyof typeof DEFAULT_PERMISSIONS] || [];
    
    // Get custom permission codes from the database
    const userCustomPermissions: string[] = [];
    
    // If user has custom permissions assigned
    if (dbUser.permissions && Array.isArray(dbUser.permissions)) {
      // Get permissions by ID from database
      for (const permId of dbUser.permissions) {
        // Here we would ideally fetch the actual permission code by ID
        // For now, we'll just use the ID as is (this would need improvement)
        userCustomPermissions.push(permId);
      }
    }
    
    // Combine default and custom permissions
    const allUserPermissions = [...defaultUserPermissions, ...userCustomPermissions];
    
    // Handle ownership-specific permissions (e.g., "edit:letters:own")
    if (permission.endsWith(':own')) {
      const basePermission = permission.replace(':own', '');
      return allUserPermissions.includes(basePermission) || allUserPermissions.includes(permission);
    }
    
    return allUserPermissions.includes(permission);
  }, [dbUser]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!permissions.length) return true; // If no permissions required, return true
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login', {
        state: {
          message: 'Se ha cerrado la sesión exitosamente'
        }
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      dbUser, 
      loading: loading || isDbUserLoading, 
      isAdmin: dbUser?.role === 'admin',
      hasPermission,
      hasAnyPermission,
      logout,
      reloadPermissions
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook for using auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}