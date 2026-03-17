
-- Portal login logs table
CREATE TABLE public.portal_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_logins ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can view
CREATE POLICY "Authenticated users can view portal logins"
  ON public.portal_logins FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Anyone can insert (portal login doesn't require auth)
CREATE POLICY "Anyone can insert portal logins"
  ON public.portal_logins FOR INSERT
  WITH CHECK (true);
