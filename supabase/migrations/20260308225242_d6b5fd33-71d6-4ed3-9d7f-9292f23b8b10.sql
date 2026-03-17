
-- Create gallery-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-photos', 'gallery-photos', true) ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view gallery photos (public bucket)
CREATE POLICY "Anyone can view gallery photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery-photos');

-- Authenticated users can upload gallery photos
CREATE POLICY "Authenticated users can upload gallery photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery-photos');

-- Authenticated users can delete gallery photos
CREATE POLICY "Authenticated users can delete gallery photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery-photos');

-- Seed website_settings key in app_settings if not exists
INSERT INTO public.app_settings (key, value) VALUES (
  'website_settings',
  '{
    "gym_name": "Aesthetic Gym",
    "tagline": "Build Your Aesthetic Physique",
    "description": "Transform your body and mind at Aesthetic Gym. World-class equipment, expert trainers, and a community that pushes you to be your best — every single day.",
    "address": "Sundar Vihar Colony, Station Rd, near DIG Basti, Civil Lines, Jhansi, Uttar Pradesh 284001",
    "phone": "+91 98765 43210",
    "email": "aestheticgym01@gmail.com",
    "whatsapp_number": "919876543210",
    "timings_weekday": "Mon – Sat: 5:30 AM – 10:00 PM",
    "timings_weekend": "Sunday: 6:00 AM – 12:00 PM",
    "gallery_enabled": false
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
