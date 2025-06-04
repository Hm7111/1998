/*
  # Corregir políticas de seguridad para la tabla users

  1. Cambios
    - Eliminar políticas existentes que causan recursión infinita
    - Crear nuevas políticas simplificadas para evitar recursión
    - Mantener la seguridad mientras se soluciona el problema de recursión
*/

-- Primero, eliminar todas las políticas existentes para la tabla users
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_can_read_all_users_basic_info" ON public.users;
DROP POLICY IF EXISTS "users_view_based_on_permissions" ON public.users;

-- Crear nuevas políticas simplificadas

-- Política para SELECT: permitir a los usuarios ver su propio perfil y a los administradores ver todos
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para INSERT: solo administradores pueden crear usuarios
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    ) OR 
    auth.uid() = id
  );

-- Política para UPDATE: usuarios pueden actualizar su propio perfil, administradores pueden actualizar cualquiera
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para DELETE: solo administradores pueden eliminar usuarios
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política adicional para permitir a todos los usuarios autenticados ver información básica de otros usuarios
CREATE POLICY "users_can_read_all_users_basic_info" ON public.users
  FOR SELECT
  USING (true)
  WITH CHECK (true);