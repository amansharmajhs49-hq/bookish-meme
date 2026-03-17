
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;
