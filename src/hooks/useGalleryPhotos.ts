import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'gallery-photos';

export interface GalleryPhoto {
  name: string;
  url: string;
  created_at: string;
}

export function useGalleryPhotos() {
  return useQuery({
    queryKey: ['gallery-photos'],
    queryFn: async (): Promise<GalleryPhoto[]> => {
      const { data, error } = await supabase.storage.from(BUCKET).list('', {
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) { console.error(error); return []; }
      return (data || [])
        .filter(f => !f.name.startsWith('.'))
        .map(f => ({
          name: f.name,
          url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
          created_at: f.created_at || '',
        }));
    },
    staleTime: 60_000,
  });
}

export function useUploadGalleryPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop();
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(name, file, { upsert: false });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gallery-photos'] }),
  });
}

export function useDeleteGalleryPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.storage.from(BUCKET).remove([name]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gallery-photos'] }),
  });
}
