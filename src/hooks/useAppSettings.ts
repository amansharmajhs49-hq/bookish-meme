import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AppSetting {
  id: string;
  key: string;
  value: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const SETTINGS_CACHE_KEY = 'app_settings_cache_v1';

function readCachedSettings(): Record<string, any> | undefined {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeCachedSettings(data: Record<string, any>) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

/**
 * Hook to get app settings — loads instantly from localStorage, then syncs from DB.
 */
export function useAppSettings() {
  return useQuery({
    queryKey: ['app_settings'],
    initialData: readCachedSettings,
    queryFn: async (): Promise<Record<string, any>> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');
      
      if (error) {
        if (error.code === 'PGRST301') {
          return {
            signup_enabled: { enabled: false },
            gym_name: { name: 'Aesthetic Gym' },
          };
        }
        console.error('Error fetching app settings:', error);
        // Fall back to cache if network fails
        return readCachedSettings() ?? {};
      }
      
      const settings: Record<string, any> = {};
      (data as AppSetting[]).forEach((setting) => {
        settings[setting.key] = setting.value;
      });
      
      // Persist to localStorage for instant next load
      writeCachedSettings(settings);
      
      return settings;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to update an app setting (admin or super admin)
 */
export function useUpdateAppSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, any> }) => {
      const { data: updatedRows, error: updateError } = await supabase
        .from('app_settings')
        .update({ value })
        .eq('key', key)
        .select('id');

      if (updateError) throw updateError;

      if (!updatedRows || updatedRows.length === 0) {
        const { error: insertError } = await supabase
          .from('app_settings')
          .insert({ key, value });

        if (insertError) {
          const { error: updateAgainError } = await supabase
            .from('app_settings')
            .update({ value })
            .eq('key', key);
          if (updateAgainError) throw updateAgainError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_settings'] });
    },
  });
}

/**
 * Hook to check if signups are enabled
 */
export function useIsSignupEnabled() {
  const { data: settings } = useAppSettings();
  return settings?.signup_enabled?.enabled ?? false;
}
