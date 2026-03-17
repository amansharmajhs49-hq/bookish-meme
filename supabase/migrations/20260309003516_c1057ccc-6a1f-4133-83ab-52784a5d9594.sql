-- Tighten overly-permissive INSERT policies flagged by linter

-- portal_logins: replace WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert portal logins" ON public.portal_logins;
CREATE POLICY "Public can insert portal logins"
ON public.portal_logins
FOR INSERT
TO anon, authenticated
WITH CHECK (
  client_id IS NOT NULL
  AND client_phone IS NOT NULL AND length(client_phone) > 0
  AND client_name IS NOT NULL AND length(client_name) > 0
);

-- suggestions: replace WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert suggestions" ON public.suggestions;
CREATE POLICY "Public can insert suggestions"
ON public.suggestions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  client_id IS NOT NULL
  AND client_name IS NOT NULL AND length(client_name) > 0
  AND message IS NOT NULL AND length(message) > 0
);