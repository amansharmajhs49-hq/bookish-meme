
-- Add recurring fields to expenses table
ALTER TABLE public.expenses 
  ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN recurring_interval TEXT DEFAULT NULL;
-- recurring_interval: 'monthly', 'quarterly', 'yearly', or null
