
-- Update the get_public_website_settings function to read from new website_settings table
CREATE OR REPLACE FUNCTION public.get_public_website_settings()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'gym_name', ws.gym_name,
      'tagline', ws.tagline,
      'description', ws.description,
      'address', ws.address,
      'phone', ws.contact_phone,
      'email', ws.contact_email,
      'whatsapp_number', ws.whatsapp_number,
      'instagram_url', ws.instagram_url,
      'facebook_url', ws.facebook_url,
      'timings_weekday', ws.timings_weekday,
      'timings_weekend', ws.timings_weekend,
      'gallery_enabled', ws.gallery_enabled,
      'primary_color', ws.primary_color,
      'logo_url', ws.logo_url,
      'hero_bg_url', ws.hero_bg_url,
      'upi_id', ws.upi_id,
      'upi_qr', ws.upi_qr,
      'payment_name', ws.payment_name
    ) FROM public.website_settings ws LIMIT 1),
    '{}'::jsonb
  );
$function$;
