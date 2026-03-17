-- Add LEFT to client status if not exists and add products, audit_logs tables

-- Add membership_status enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_status') THEN
    CREATE TYPE public.client_status AS ENUM ('Active', 'Expired', 'Left', 'Deleted');
  END IF;
END $$;

-- Products table for supplements/nutrition
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product purchases table
CREATE TABLE IF NOT EXISTS public.product_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs table (immutable)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  admin_id UUID,
  old_data JSONB,
  new_data JSONB,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add advance_balance to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS advance_balance NUMERIC NOT NULL DEFAULT 0;

-- Add payment_type and reference columns to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'membership';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS product_purchase_id UUID REFERENCES public.product_purchases(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS due_before NUMERIC DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS due_after NUMERIC DEFAULT 0;

-- Update triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_purchases_updated_at ON public.product_purchases;
CREATE TRIGGER update_product_purchases_updated_at
  BEFORE UPDATE ON public.product_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
CREATE POLICY "Authenticated users can manage products" ON public.products
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS for product_purchases
ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage product purchases" ON public.product_purchases;
CREATE POLICY "Authenticated users can manage product purchases" ON public.product_purchases
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS for audit_logs (read-only for authenticated, insert only)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_purchases_client_id ON public.product_purchases(client_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_product_id ON public.product_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id ON public.audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);