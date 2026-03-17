
-- Create a public bucket for website assets (logo, hero background)
INSERT INTO storage.buckets (id, name, public)
VALUES ('website-assets', 'website-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view website assets
CREATE POLICY "Website assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'website-assets');

-- Allow authenticated admins to upload website assets
CREATE POLICY "Admins can upload website assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'website-assets');

-- Allow authenticated admins to update website assets
CREATE POLICY "Admins can update website assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'website-assets');

-- Allow authenticated admins to delete website assets
CREATE POLICY "Admins can delete website assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'website-assets');
