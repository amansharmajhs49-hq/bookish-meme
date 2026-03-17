import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReminderType } from '@/lib/whatsapp';

interface WhatsAppReminder {
  id: string;
  client_id: string;
  reminder_type: string;
  sent_at: string;
  message: string | null;
  status: string;
  created_at: string;
}

/**
 * Hook to get reminders for a client
 */
export function useClientReminders(clientId: string) {
  return useQuery({
    queryKey: ['reminders', clientId],
    queryFn: async (): Promise<WhatsAppReminder[]> => {
      const { data, error } = await supabase
        .from('whatsapp_reminders')
        .select('*')
        .eq('client_id', clientId)
        .order('sent_at', { ascending: false });
      
      if (error) throw error;
      return data as WhatsAppReminder[];
    },
    enabled: !!clientId,
  });
}

/**
 * Hook to check if a reminder was already sent today
 */
export function useWasReminderSentToday(clientId: string, reminderType: ReminderType) {
  return useQuery({
    queryKey: ['reminder_sent_today', clientId, reminderType],
    queryFn: async (): Promise<boolean> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('whatsapp_reminders')
        .select('id')
        .eq('client_id', clientId)
        .eq('reminder_type', reminderType)
        .gte('sent_at', today.toISOString())
        .limit(1);
      
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!clientId && !!reminderType,
  });
}

/**
 * Hook to log a sent reminder
 */
export function useLogReminder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      clientId,
      reminderType,
      message,
    }: {
      clientId: string;
      reminderType: ReminderType;
      message: string;
    }) => {
      const { error } = await supabase
        .from('whatsapp_reminders')
        .insert({
          client_id: clientId,
          reminder_type: reminderType,
          message,
          status: 'sent',
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reminders', variables.clientId] });
      queryClient.invalidateQueries({ 
        queryKey: ['reminder_sent_today', variables.clientId, variables.reminderType] 
      });
    },
  });
}

/**
 * Hook to get payment due reminder count for a client (for the 3-time limit)
 */
export function usePaymentDueReminderCount(clientId: string) {
  return useQuery({
    queryKey: ['payment_due_reminder_count', clientId],
    queryFn: async (): Promise<number> => {
      // Count payment_due reminders in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count, error } = await supabase
        .from('whatsapp_reminders')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('reminder_type', 'payment_due')
        .gte('sent_at', thirtyDaysAgo.toISOString());
      
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!clientId,
  });
}

/**
 * Hook to check if we can send a payment due reminder (max 3, every 3 days)
 */
export function useCanSendPaymentDueReminder(clientId: string) {
  return useQuery({
    queryKey: ['can_send_payment_reminder', clientId],
    queryFn: async (): Promise<boolean> => {
      // Check if we've sent 3 or more in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: reminders, error: countError } = await supabase
        .from('whatsapp_reminders')
        .select('sent_at')
        .eq('client_id', clientId)
        .eq('reminder_type', 'payment_due')
        .gte('sent_at', thirtyDaysAgo.toISOString())
        .order('sent_at', { ascending: false });
      
      if (countError) throw countError;
      
      // Max 3 reminders
      if ((reminders?.length ?? 0) >= 3) return false;
      
      // Check if last reminder was at least 3 days ago
      if (reminders && reminders.length > 0) {
        const lastReminderDate = new Date(reminders[0].sent_at);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        if (lastReminderDate > threeDaysAgo) return false;
      }
      
      return true;
    },
    enabled: !!clientId,
  });
}
