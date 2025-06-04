/*
  # Añadir permisos de tareas

  1. Nuevas Tablas
    - No se crean nuevas tablas
    
  2. Seguridad
    - Añadir permisos para tareas en la tabla de permisos
    
  3. Cambios
    - Añadir registros de permisos para tareas
*/

-- Añadir permisos para el sistema de tareas
INSERT INTO permissions (name, code, description)
VALUES 
  ('Ver tareas', 'view:tasks', 'Permiso para ver tareas'),
  ('Crear tareas', 'create:tasks', 'Permiso para crear nuevas tareas'),
  ('Editar tareas', 'edit:tasks', 'Permiso para editar cualquier tarea'),
  ('Editar tareas propias', 'edit:tasks:own', 'Permiso para editar solo las tareas creadas por el usuario'),
  ('Eliminar tareas', 'delete:tasks', 'Permiso para eliminar cualquier tarea'),
  ('Eliminar tareas propias', 'delete:tasks:own', 'Permiso para eliminar solo las tareas creadas por el usuario'),
  ('Asignar tareas', 'assign:tasks', 'Permiso para asignar tareas a otros usuarios'),
  ('Completar tareas', 'complete:tasks', 'Permiso para marcar cualquier tarea como completada'),
  ('Completar tareas asignadas', 'complete:tasks:assigned', 'Permiso para completar tareas asignadas al usuario'),
  ('Ver todas las tareas', 'view:tasks:all', 'Permiso para ver todas las tareas en el sistema');

-- Modificar la política RLS para permitir a los usuarios ver las tareas que han creado, independientemente de la sucursal
DROP POLICY IF EXISTS users_view_own_tasks ON tasks;
CREATE POLICY users_view_own_tasks ON tasks
  FOR SELECT
  TO authenticated
  USING ((created_by = auth.uid()) OR (assigned_to = auth.uid()));

-- Actualizar la política para crear tareas
DROP POLICY IF EXISTS users_create_tasks_own ON tasks;
CREATE POLICY users_create_tasks_own ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());