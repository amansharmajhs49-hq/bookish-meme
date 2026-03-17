-- Fix: the "Anyone can view announcements" policy is RESTRICTIVE, making it block access.
-- Drop it and recreate as PERMISSIVE so unauthenticated portal users can read announcements.
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;

CREATE POLICY "Anyone can view announcements"
ON public.announcements
FOR SELECT
TO public
USING (true);