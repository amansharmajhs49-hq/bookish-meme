import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Trash2, Loader2, CheckCircle2, Circle, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Suggestion {
  id: string;
  client_id: string;
  client_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function SuggestionsViewer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['suggestions'],
    queryFn: async (): Promise<Suggestion[]> => {
      const { data, error } = await supabase
        .from('suggestions' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const markRead = useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      const { error } = await supabase
        .from('suggestions' as any)
        .update({ is_read })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suggestions'] }),
  });

  const deleteSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suggestions' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      toast({ title: 'Suggestion deleted' });
    },
  });

  const unreadCount = suggestions?.filter(s => !s.is_read).length || 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center py-6">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No suggestions yet</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">Members can submit suggestions from the portal</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-primary font-medium">
          <Mail className="h-3.5 w-3.5" />
          {unreadCount} new suggestion{unreadCount > 1 ? 's' : ''}
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {suggestions.map(s => (
          <div
            key={s.id}
            className={`p-3 rounded-xl border transition-colors ${
              s.is_read ? 'border-border bg-background' : 'border-primary/20 bg-primary/5'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => markRead.mutateAsync({ id: s.id, is_read: !s.is_read })}
                  className="shrink-0 mt-0.5"
                  title={s.is_read ? 'Mark as unread' : 'Mark as read'}
                >
                  {s.is_read ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-primary" />
                  )}
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{s.client_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(s.created_at), 'dd MMM yyyy, hh:mm a')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteSuggestion.mutateAsync(s.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed pl-5.5 whitespace-pre-wrap break-words">
              {s.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
