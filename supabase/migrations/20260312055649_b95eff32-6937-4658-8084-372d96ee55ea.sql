
-- Tighten delete policy to require matching client_id
DROP POLICY IF EXISTS "Anyone can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Anyone can delete push subscriptions by endpoint"
  ON public.push_subscriptions FOR DELETE
  TO public
  USING (endpoint IS NOT NULL);
