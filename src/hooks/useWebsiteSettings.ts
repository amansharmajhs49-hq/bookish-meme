import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from './useAppSettings';

export interface WebsiteSettings {
  gym_name: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  whatsapp_number: string;
  instagram_url: string;
  facebook_url: string;
  timings_weekday: string;
  timings_weekend: string;
  gallery_enabled: boolean;
  primary_color: string;
  logo_url: string;
  hero_bg_url: string;
}

const DEFAULTS: WebsiteSettings = {
  gym_name: 'Aesthetic Gym',
  tagline: 'Build Your Aesthetic Physique',
  description:
    'Transform your body and mind at Aesthetic Gym. World-class equipment, expert trainers, and a community that pushes you to be your best — every single day.',
  address: 'Sundar Vihar Colony, Station Rd, near DIG Basti, Civil Lines, Jhansi, Uttar Pradesh 284001',
  phone: '+91 98765 43210',
  email: 'aestheticgym01@gmail.com',
  whatsapp_number: '919876543210',
  instagram_url: '',
  facebook_url: '',
  timings_weekday: 'Mon – Sat: 5:30 AM – 10:00 PM',
  timings_weekend: 'Sunday: 6:00 AM – 12:00 PM',
  gallery_enabled: false,
  primary_color: '#9C9C9C',
  logo_url: '',
  hero_bg_url: '',
};

const WS_CACHE_KEY = 'website_settings_cache_v1';

function safeReadCachedWebsiteSettings(): Partial<WebsiteSettings> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Partial<WebsiteSettings>;
  } catch {
    return null;
  }
}

function safeWriteCachedWebsiteSettings(value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WS_CACHE_KEY, JSON.stringify(value));
  } catch {
    // ignore quota / privacy mode
  }
}

export function useWebsiteSettings(): WebsiteSettings {
  const { data: appSettings } = useAppSettings();
  const wsLocal = appSettings?.website_settings as Partial<WebsiteSettings> | undefined;

  const wsCached = useMemo(() => safeReadCachedWebsiteSettings(), []);

  // Public website cannot read the settings table directly (restricted), so we fetch via a public RPC.
  const { data: wsPublic } = useQuery({
    queryKey: ['public_website_settings'],
    enabled: !wsLocal,
    initialData: wsCached ?? undefined,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_website_settings');
      if (error || !data) return wsCached ?? null;
      safeWriteCachedWebsiteSettings(data);
      return data as any;
    },
    staleTime: 5 * 60 * 1000,
  });

  const ws = (wsLocal ?? (wsPublic as any) ?? {}) as Partial<WebsiteSettings>;

  return {
    gym_name: ws?.gym_name ?? DEFAULTS.gym_name,
    tagline: ws?.tagline ?? DEFAULTS.tagline,
    description: ws?.description ?? DEFAULTS.description,
    address: ws?.address ?? DEFAULTS.address,
    phone: ws?.phone ?? DEFAULTS.phone,
    email: ws?.email ?? DEFAULTS.email,
    whatsapp_number: ws?.whatsapp_number ?? DEFAULTS.whatsapp_number,
    instagram_url: ws?.instagram_url ?? DEFAULTS.instagram_url,
    facebook_url: ws?.facebook_url ?? DEFAULTS.facebook_url,
    timings_weekday: ws?.timings_weekday ?? DEFAULTS.timings_weekday,
    timings_weekend: ws?.timings_weekend ?? DEFAULTS.timings_weekend,
    gallery_enabled: ws?.gallery_enabled ?? DEFAULTS.gallery_enabled,
    primary_color: ws?.primary_color ?? DEFAULTS.primary_color,
    logo_url: ws?.logo_url ?? DEFAULTS.logo_url,
    hero_bg_url: ws?.hero_bg_url ?? DEFAULTS.hero_bg_url,
  };
}
