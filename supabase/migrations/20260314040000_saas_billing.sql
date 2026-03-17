-- Add 'moderator' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

-- Hosting Plans Table
CREATE TABLE IF NOT EXISTS public.hosting_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    duration_days INTEGER NOT NULL,
    features JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gym Subscriptions Table
CREATE TABLE IF NOT EXISTS public.gym_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.hosting_plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending', 'soft_lock')),
    expiry_date TIMESTAMPTZ NOT NULL,
    razorpay_qr_url TEXT,
    razorpay_payment_link TEXT,
    last_payment_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature Locks Table
CREATE TABLE IF NOT EXISTS public.feature_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT UNIQUE NOT NULL, -- e.g. 'expense_tracker', 'ai_quotes'
    is_locked BOOLEAN DEFAULT false,
    locked_message TEXT DEFAULT 'This feature is currently locked. Please contact support.',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hosting_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_locks ENABLE ROW LEVEL SECURITY;

-- Policies for hosting_plans
-- Everyone can read, only moderator can manage
CREATE POLICY "Public read for hosting_plans" ON public.hosting_plans FOR SELECT USING (true);
CREATE POLICY "Moderator manage hosting_plans" ON public.hosting_plans 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'moderator'));

-- Policies for gym_subscriptions
-- Admins and Moderators can read, only moderator can manage
CREATE POLICY "Admins/Moderators read subscriptions" ON public.gym_subscriptions FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('moderator', 'super_admin', 'admin')));
CREATE POLICY "Moderator manage subscriptions" ON public.gym_subscriptions 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'moderator'));

-- Policies for feature_locks
-- Everyone can read, only moderator can manage
CREATE POLICY "Public read feature_locks" ON public.feature_locks FOR SELECT USING (true);
CREATE POLICY "Moderator manage feature_locks" ON public.feature_locks 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'moderator'));

-- Insert some default feature locks
INSERT INTO public.feature_locks (feature_key, is_locked) VALUES 
('expense_tracker', false),
('ai_quotes', false),
('advanced_analytics', false)
ON CONFLICT (feature_key) DO NOTHING;

-- Insert a default hosting plan
INSERT INTO public.hosting_plans (name, price, duration_days, features) VALUES 
('Premium Monthly', 499, 30, '{"expense_tracking": true, "ai_quotes": true, "advanced_analytics": true}')
ON CONFLICT DO NOTHING;

-- Initial subscription for the gym (assuming one gym instance)
-- In a multi-tenant app this would be more complex, but here we assume a single instance
INSERT INTO public.gym_subscriptions (expiry_date, status) VALUES 
(now() + interval '30 days', 'active')
ON CONFLICT DO NOTHING;
