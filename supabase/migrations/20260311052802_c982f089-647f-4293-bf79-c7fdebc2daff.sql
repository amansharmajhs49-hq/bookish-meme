
-- Drop the restrictive SELECT policies on announcements
DROP POLICY IF EXISTS "Anyone can view announcements publicly" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users can view announcements" ON public.announcements;

-- Create a single PERMISSIVE SELECT policy that allows everyone to read announcements
CREATE POLICY "Anyone can view announcements"
  ON public.announcements
  FOR SELECT
  TO public
  USING (true);
