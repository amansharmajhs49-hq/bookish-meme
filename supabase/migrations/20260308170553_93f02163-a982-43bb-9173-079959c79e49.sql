
CREATE OR REPLACE FUNCTION public.is_signup_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value->>'enabled')::boolean FROM public.app_settings WHERE key = 'signup_enabled'),
    false
  )
$$;
