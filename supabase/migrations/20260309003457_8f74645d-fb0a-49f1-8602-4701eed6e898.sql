-- Public RPC for website settings (allows public website to read accent color, contact info, etc.)
CREATE OR REPLACE FUNCTION public.get_public_website_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value FROM public.app_settings WHERE key = 'website_settings' LIMIT 1),
    '{}'::jsonb
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_public_website_settings() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_website_settings() TO authenticated;