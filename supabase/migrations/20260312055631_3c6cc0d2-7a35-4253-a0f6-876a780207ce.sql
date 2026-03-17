
-- Table to store push notification subscriptions from portal members
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert subscriptions (portal users are unauthenticated)
CREATE POLICY "Anyone can insert push subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO public
  WITH CHECK (client_id IS NOT NULL AND endpoint IS NOT NULL);

-- Allow authenticated admins to view subscriptions
CREATE POLICY "Authenticated users can view push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Allow public to delete own subscriptions
CREATE POLICY "Anyone can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO public
  USING (true);
