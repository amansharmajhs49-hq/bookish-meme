
INSERT INTO public.app_settings (key, value)
VALUES ('signup_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = '{"enabled": true}'::jsonb, updated_at = now();
