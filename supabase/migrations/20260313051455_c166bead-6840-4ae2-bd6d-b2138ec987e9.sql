
-- Add alias_name to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS alias_name text DEFAULT NULL;

-- Create client_links table for linking clients together
CREATE TABLE IF NOT EXISTS public.client_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id_1 uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_id_2 uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'friend',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid DEFAULT NULL,
  UNIQUE(client_id_1, client_id_2),
  CHECK (client_id_1 <> client_id_2)
);

-- Enable RLS
ALTER TABLE public.client_links ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admins) can manage client links
CREATE POLICY "Authenticated users can manage client links"
  ON public.client_links
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
