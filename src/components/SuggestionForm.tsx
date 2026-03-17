import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquarePlus, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SuggestionFormProps {
  clientId: string;
  clientName: string;
}

export function SuggestionForm({ clientId, clientName }: SuggestionFormProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      toast({ title: 'Please enter your suggestion', variant: 'destructive' });
      return;
    }
    if (trimmed.length > 1000) {
      toast({ title: 'Suggestion is too long (max 1000 characters)', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('suggestions' as any).insert({
        client_id: clientId,
        client_name: clientName,
        message: trimmed,
      });
      if (error) throw error;
      setMessage('');
      setSent(true);
      toast({ title: 'Suggestion submitted! Thank you 🙏' });
      setTimeout(() => setSent(false), 4000);
    } catch (err: any) {
      toast({ title: 'Failed to submit', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Suggestion Box</h3>
          <p className="text-[11px] text-muted-foreground">Help us improve — share your feedback!</p>
        </div>
      </div>

      {sent ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 text-primary animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="text-xs font-medium">Thank you! Your suggestion has been submitted.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Any suggestions, feedback, or ideas to improve the gym? We'd love to hear..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none min-h-[80px]"
            maxLength={1000}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{message.length}/1000</span>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {sending ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
