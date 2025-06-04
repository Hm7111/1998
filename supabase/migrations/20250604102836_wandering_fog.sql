/*
# Actualización de políticas de tareas

1. Cambios
  - Corrección de políticas para el sistema de tareas
  - Optimización de permisos para las tareas creadas por el usuario

2. Seguridad
  - Mejora en la aplicación de los permisos de tareas
*/

-- Desactivar temporalmente las políticas existentes para tareas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'users_view_own_tasks') THEN
    ALTER POLICY users_view_own_tasks ON tasks RENAME TO users_view_own_tasks_disabled;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'admin_view_all_tasks') THEN
    ALTER POLICY admin_view_all_tasks ON tasks RENAME TO admin_view_all_tasks_disabled;
  END IF;
END
$$;

-- Crear nuevas políticas RLS para tareas
CREATE POLICY tasks_view_policy ON tasks
FOR SELECT
USING (
  -- Admin puede ver todas las tareas
  (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))
  OR
  -- Usuario puede ver las tareas que creó
  (auth.uid() = created_by)
  OR
  -- Usuario puede ver las tareas asignadas a él
  (auth.uid() = assigned_to)
);

-- Política para crear tareas
CREATE POLICY tasks_create_policy ON tasks
FOR INSERT
WITH CHECK (
  -- Admin puede crear cualquier tarea
  (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))
  OR
  -- Usuario puede crear tareas donde él es el creador
  (auth.uid() = created_by)
);

-- Política para actualizar tareas
CREATE POLICY tasks_update_policy ON tasks
FOR UPDATE
USING (
  -- Admin puede actualizar cualquier tarea
  (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))
  OR
  -- Usuario puede actualizar tareas que creó
  (auth.uid() = created_by)
  OR
  -- Usuario puede actualizar tareas asignadas a él
  (auth.uid() = assigned_to)
);

-- Política para eliminar tareas
CREATE POLICY tasks_delete_policy ON tasks
FOR DELETE
USING (
  -- Admin puede eliminar cualquier tarea
  (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))
  OR
  -- Usuario puede eliminar tareas que creó
  (auth.uid() = created_by)
);