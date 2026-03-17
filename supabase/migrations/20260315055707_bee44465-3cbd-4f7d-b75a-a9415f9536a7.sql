
-- 1. Add first_name and last_name to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_name text;

-- Backfill: split existing name into first_name / last_name
UPDATE public.clients
SET first_name = CASE 
  WHEN position(' ' in name) > 0 THEN left(name, position(' ' in name) - 1)
  ELSE name
END,
last_name = CASE 
  WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
  ELSE ''
END
WHERE first_name IS NULL;

-- 2. Create website_settings table
CREATE TABLE IF NOT EXISTS public.website_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_name text DEFAULT 'Aesthetic Gym',
  contact_phone text DEFAULT '',
  contact_email text DEFAULT '',
  address text DEFAULT '',
  upi_id text DEFAULT '',
  upi_qr text DEFAULT '',
  payment_name text DEFAULT '',
  tagline text DEFAULT '',
  description text DEFAULT '',
  whatsapp_number text DEFAULT '',
  instagram_url text DEFAULT '',
  facebook_url text DEFAULT '',
  timings_weekday text DEFAULT '',
  timings_weekend text DEFAULT '',
  gallery_enabled boolean DEFAULT false,
  primary_color text DEFAULT '#9C9C9C',
  logo_url text DEFAULT '',
  hero_bg_url text DEFAULT '',
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read website settings (public website)
CREATE POLICY "Anyone can view website settings" ON public.website_settings
  FOR SELECT TO public USING (true);

-- Only admins/super_admins can modify
CREATE POLICY "Admins can manage website settings" ON public.website_settings
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Insert a default row
INSERT INTO public.website_settings (id) VALUES (gen_random_uuid());

-- 3. Create hosting_plans table (new proper table)
CREATE TABLE IF NOT EXISTS public.hosting_plans_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  description text DEFAULT '',
  features jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.hosting_plans_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hosting plans" ON public.hosting_plans_v2
  FOR SELECT TO public USING (true);

CREATE POLICY "Moderators can manage hosting plans" ON public.hosting_plans_v2
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- 4. Create hosting_subscriptions table
CREATE TABLE IF NOT EXISTS public.hosting_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  plan_id uuid REFERENCES public.hosting_plans_v2(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  start_date timestamp with time zone DEFAULT now(),
  expiry_date timestamp with time zone NOT NULL,
  payment_link text DEFAULT '',
  payment_qr text DEFAULT '',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.hosting_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own subscription" ON public.hosting_subscriptions
  FOR SELECT TO authenticated
  USING (admin_id = auth.uid() OR is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can manage subscriptions" ON public.hosting_subscriptions
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can update own subscription" ON public.hosting_subscriptions
  FOR UPDATE TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());
