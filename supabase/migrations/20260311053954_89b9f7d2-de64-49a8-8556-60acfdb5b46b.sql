-- Allow admin role (not just super_admin) to manage app_settings
DROP POLICY IF EXISTS "Super admins can manage settings" ON public.app_settings;

CREATE POLICY "Admins can manage settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (
  is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin')
);