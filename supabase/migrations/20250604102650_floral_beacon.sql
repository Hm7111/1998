/*
# Actualización del sistema de permisos

1. Nuevas Tablas
  - No se requieren nuevas tablas
  
2. Actualizaciones
  - Se agregan nuevos permisos relacionados con los tres subsistemas
  - Se mejoran las políticas RLS para aplicar permisos más específicos
  
3. Seguridad
  - Se mantienen y mejoran las políticas RLS existentes
*/

-- Agregar nuevos permisos específicos para cada subsistema
INSERT INTO permissions (name, code, description)
VALUES
  -- Permisos de tareas
  ('Ver todas las tareas', 'view:tasks:all', 'Permite ver todas las tareas en el sistema'),
  ('Ver tareas asignadas', 'view:tasks:assigned', 'Permite ver las tareas asignadas al usuario'),
  ('Ver tareas propias', 'view:tasks:own', 'Permite ver las tareas creadas por el usuario'),
  ('Crear cualquier tarea', 'create:tasks', 'Permite crear tareas para cualquier usuario'),
  ('Crear tareas propias', 'create:tasks:own', 'Permite crear tareas solo para sí mismo'),
  ('Editar cualquier tarea', 'edit:tasks', 'Permite editar cualquier tarea'),
  ('Editar tareas propias', 'edit:tasks:own', 'Permite editar solo las tareas creadas por el usuario'),
  ('Completar tareas asignadas', 'complete:tasks:own', 'Permite completar tareas asignadas al usuario'),
  ('Eliminar tareas', 'delete:tasks', 'Permite eliminar cualquier tarea'),
  ('Asignar tareas', 'assign:tasks', 'Permite asignar tareas a otros usuarios'),
  
  -- Permisos de aprobaciones
  ('Ver todas las aprobaciones', 'view:approvals', 'Permite ver todas las solicitudes de aprobación'),
  ('Ver aprobaciones propias', 'view:approvals:own', 'Permite ver solo las solicitudes de aprobación propias'),
  ('Aprobar documentos', 'approve:letters', 'Permite aprobar documentos'),
  ('Rechazar documentos', 'reject:letters', 'Permite rechazar documentos'),
  ('Solicitar aprobación', 'request:approval', 'Permite solicitar la aprobación de documentos')
ON CONFLICT (code) DO NOTHING;

-- Actualizar políticas RLS para las tareas
DO $$
BEGIN
  -- Verificar si existe la política y crearla si no existe
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'users_view_based_on_permissions') THEN
    CREATE POLICY users_view_based_on_permissions ON tasks
    FOR SELECT
    USING (
      -- Administradores ven todo
      (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
      OR
      -- Usuarios con permiso para ver todas las tareas
      (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.permissions::jsonb ? 'view:tasks:all'
      ))
      OR
      -- Usuarios ven tareas que crearon (permiso view:tasks:own)
      (tasks.created_by = auth.uid())
      OR
      -- Usuarios ven tareas asignadas a ellos (permiso view:tasks:assigned)
      (tasks.assigned_to = auth.uid())
    );
  END IF;
  
  -- Política para crear tareas basada en permisos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'users_create_based_on_permissions') THEN
    CREATE POLICY users_create_based_on_permissions ON tasks
    FOR INSERT
    WITH CHECK (
      -- Administradores pueden crear cualquier tarea
      (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
      OR
      -- Usuarios con permiso para crear cualquier tarea
      (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.permissions::jsonb ? 'create:tasks'
      ))
      OR
      -- Usuarios creando tareas para sí mismos (permiso create:tasks:own)
      (auth.uid() = created_by AND 
       (assigned_to IS NULL OR assigned_to = auth.uid()))
    );
  END IF;
  
  -- Política para actualizar tareas basada en permisos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'users_update_based_on_permissions') THEN
    CREATE POLICY users_update_based_on_permissions ON tasks
    FOR UPDATE
    USING (
      -- Administradores pueden actualizar cualquier tarea
      (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
      OR
      -- Usuarios con permiso para editar cualquier tarea
      (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.permissions::jsonb ? 'edit:tasks'
      ))
      OR
      -- Usuarios actualizando tareas que crearon (permiso edit:tasks:own)
      (tasks.created_by = auth.uid() AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND (users.permissions::jsonb ? 'edit:tasks:own')
      ))
      OR
      -- Usuarios actualizando tareas asignadas a ellos (limitado a estado)
      (tasks.assigned_to = auth.uid() AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND (users.permissions::jsonb ? 'complete:tasks:own')
      ))
    );
  END IF;
  
  -- Política para eliminar tareas basada en permisos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'users_delete_based_on_permissions') THEN
    CREATE POLICY users_delete_based_on_permissions ON tasks
    FOR DELETE
    USING (
      -- Administradores pueden eliminar cualquier tarea
      (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
      OR
      -- Usuarios con permiso para eliminar tareas
      (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.permissions::jsonb ? 'delete:tasks'
      ))
      OR
      -- Usuarios eliminando tareas que crearon
      (tasks.created_by = auth.uid())
    );
  END IF;
END
$$;

-- Actualizar políticas RLS para las cartas
DO $$
BEGIN
  -- Política para ver cartas basada en permisos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'letters' AND policyname = 'users_view_based_on_permissions') THEN
    CREATE POLICY users_view_based_on_permissions ON letters
    FOR SELECT
    USING (
      -- Administradores ven todas las cartas
      (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
      OR
      -- Usuarios con permiso para ver todas las cartas
      (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.permissions::jsonb ? 'view:letters'
      ))
      OR
      -- Usuarios ven cartas que crearon
      (letters.user_id = auth.uid())
    );
  END IF;
END
$$;

-- Actualizar políticas RLS para las aprobaciones
DO $$
BEGIN
  -- Política para ver solicitudes de aprobación basada en permisos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_requests' AND policyname = 'users_view_based_on_permissions') THEN
    CREATE POLICY users_view_based_on_permissions ON approval_requests
    FOR SELECT
    USING (
      -- Administradores ven todas las solicitudes
      (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
      OR
      -- Usuarios con permiso para ver todas las solicitudes
      (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.permissions::jsonb ? 'view:approvals'
      ))
      OR
      -- Usuarios asignados como aprobadores
      (approval_requests.assigned_to = auth.uid())
      OR
      -- Usuarios ven solicitudes que crearon (permiso view:approvals:own)
      (approval_requests.requested_by = auth.uid() AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND (users.permissions::jsonb ? 'view:approvals:own')
      ))
    );
  END IF;
END
$$;