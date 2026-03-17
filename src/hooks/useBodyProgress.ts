import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BodyProgressEntry {
  id: string;
  client_id: string;
  recorded_at: string;
  weight: number | null;
  height: number | null;
  body_fat: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  biceps: number | null;
  thighs: number | null;
  notes: string | null;
  photo_paths: string[];
  created_at: string;
  updated_at: string;
}

export function useBodyProgress(clientId: string) {
  return useQuery({
    queryKey: ['body-progress', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_progress')
        .select('*')
        .eq('client_id', clientId)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      return (data || []) as BodyProgressEntry[];
    },
    enabled: !!clientId,
  });
}

export function useAddBodyProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      client_id: string;
      recorded_at: string;
      weight?: number | null;
      height?: number | null;
      body_fat?: number | null;
      chest?: number | null;
      waist?: number | null;
      hips?: number | null;
      biceps?: number | null;
      thighs?: number | null;
      notes?: string;
      photo_paths?: string[];
    }) => {
      const { data, error } = await supabase
        .from('body_progress')
        .insert(entry as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['body-progress', variables.client_id] });
    },
  });
}

export function useDeleteBodyProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('body_progress')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['body-progress', variables.clientId] });
    },
  });
}

export async function getProgressPhotoUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from('progress-photos')
    .createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

export async function uploadProgressPhoto(clientId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${clientId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('progress-photos')
    .upload(path, file);
  if (error) throw error;
  return path;
}
