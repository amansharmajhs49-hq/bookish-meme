import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ExtensionLog {
  id: string;
  client_id: string;
  join_id: string;
  previous_end_date: string;
  new_end_date: string;
  extended_days: number;
  admin_id: string | null;
  created_at: string;
}

/**
 * Hook to get extension logs for a client
 */
export function useClientExtensionLogs(clientId: string) {
  return useQuery({
    queryKey: ['extension_logs', clientId],
    queryFn: async (): Promise<ExtensionLog[]> => {
      const { data, error } = await supabase
        .from('extension_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ExtensionLog[];
    },
    enabled: !!clientId,
  });
}

/**
 * Hook to log an extension
 */
export function useLogExtension() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      clientId,
      joinId,
      previousEndDate,
      newEndDate,
      extendedDays,
    }: {
      clientId: string;
      joinId: string;
      previousEndDate: string;
      newEndDate: string;
      extendedDays: number;
    }) => {
      const { error } = await supabase
        .from('extension_logs')
        .insert({
          client_id: clientId,
          join_id: joinId,
          previous_end_date: previousEndDate,
          new_end_date: newEndDate,
          extended_days: extendedDays,
          admin_id: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['extension_logs', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
