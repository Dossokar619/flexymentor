DROP POLICY IF EXISTS "Authenticated read settings" ON public.system_settings;

CREATE POLICY "Admins read settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));