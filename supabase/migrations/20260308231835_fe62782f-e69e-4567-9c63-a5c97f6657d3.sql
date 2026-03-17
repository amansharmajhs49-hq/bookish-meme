
CREATE POLICY "Anyone can view announcements publicly"
ON public.announcements FOR SELECT
USING (true);
