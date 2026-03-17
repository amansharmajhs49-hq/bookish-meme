
CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (portal users aren't authenticated)
CREATE POLICY "Anyone can insert suggestions"
ON public.suggestions FOR INSERT
WITH CHECK (true);

-- Only authenticated admins can view
CREATE POLICY "Authenticated users can view suggestions"
ON public.suggestions FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only authenticated admins can update (mark as read)
CREATE POLICY "Authenticated users can update suggestions"
ON public.suggestions FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Only authenticated admins can delete
CREATE POLICY "Authenticated users can delete suggestions"
ON public.suggestions FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);
