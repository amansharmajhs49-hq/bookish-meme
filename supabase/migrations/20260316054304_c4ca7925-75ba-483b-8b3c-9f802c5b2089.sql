
-- Fix RLS: Allow moderators to manage hosting plans
DROP POLICY IF EXISTS "Moderators can manage hosting plans" ON public.hosting_plans_v2;
CREATE POLICY "Moderators can manage hosting plans"
ON public.hosting_plans_v2
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Fix RLS: Allow moderators to manage subscriptions
DROP POLICY IF EXISTS "Moderators can manage subscriptions" ON public.hosting_subscriptions;
CREATE POLICY "Moderators can manage subscriptions"
ON public.hosting_subscriptions
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to view all subscriptions
DROP POLICY IF EXISTS "Admins can view own subscription" ON public.hosting_subscriptions;
CREATE POLICY "Admins can view own subscription"
ON public.hosting_subscriptions
FOR SELECT
TO authenticated
USING (admin_id = auth.uid() OR is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Ensure website_settings has at least one row
INSERT INTO public.website_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

-- Create feature_locks table if not exists
CREATE TABLE IF NOT EXISTS public.feature_locks (
  feature_key TEXT PRIMARY KEY,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_message TEXT DEFAULT 'This feature is currently locked.',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.feature_locks ENABLE ROW LEVEL SECURITY;

-- RLS for feature_locks
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_locks' AND policyname = 'Anyone can view feature locks') THEN
    CREATE POLICY "Anyone can view feature locks" ON public.feature_locks FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_locks' AND policyname = 'Moderators can manage feature locks') THEN
    CREATE POLICY "Moderators can manage feature locks" ON public.feature_locks FOR ALL TO authenticated
      USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'moderator'::app_role))
      WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'moderator'::app_role));
  END IF;
END $$;
