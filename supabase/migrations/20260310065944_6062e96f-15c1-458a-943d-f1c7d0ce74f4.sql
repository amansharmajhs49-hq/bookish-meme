
-- Table for pending signup approvals
CREATE TABLE public.pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all pending signups
CREATE POLICY "Super admins can manage pending signups"
  ON public.pending_signups
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Users can view their own signup status
CREATE POLICY "Users can view own signup"
  ON public.pending_signups
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow inserts from authenticated users (for self-registration)
CREATE POLICY "Users can insert own signup"
  ON public.pending_signups
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
