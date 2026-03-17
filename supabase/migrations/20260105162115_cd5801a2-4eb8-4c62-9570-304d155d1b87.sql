-- Add CHECK constraints for input validation on clients table
ALTER TABLE public.clients
ADD CONSTRAINT clients_name_length CHECK (length(name) <= 100),
ADD CONSTRAINT clients_phone_format CHECK (phone ~ '^[0-9+\-\s()]+$' AND length(phone) <= 20),
ADD CONSTRAINT clients_goal_length CHECK (goal IS NULL OR length(goal) <= 500),
ADD CONSTRAINT clients_remarks_length CHECK (remarks IS NULL OR length(remarks) <= 1000),
ADD CONSTRAINT clients_status_enum CHECK (status IN ('Active', 'Expired', 'Left', 'Deleted'));

-- Add CHECK constraints for plans table
ALTER TABLE public.plans
ADD CONSTRAINT plans_name_length CHECK (length(name) <= 100),
ADD CONSTRAINT plans_price_positive CHECK (price > 0),
ADD CONSTRAINT plans_duration_positive CHECK (duration_months > 0),
ADD CONSTRAINT plans_description_length CHECK (description IS NULL OR length(description) <= 500);

-- Add CHECK constraints for payments table
ALTER TABLE public.payments
ADD CONSTRAINT payments_amount_positive CHECK (amount > 0),
ADD CONSTRAINT payments_method_enum CHECK (payment_method IN ('cash', 'online')),
ADD CONSTRAINT payments_notes_length CHECK (notes IS NULL OR length(notes) <= 500);

-- Add CHECK constraints for joins table
ALTER TABLE public.joins
ADD CONSTRAINT joins_custom_price_positive CHECK (custom_price IS NULL OR custom_price > 0);