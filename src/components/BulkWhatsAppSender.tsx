import { useState } from 'react';
import { format } from 'date-fns';
import { Copy, Check, ExternalLink, X, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClients } from '@/hooks/useClients';
import { getWhatsAppLink } from '@/lib/whatsapp';
import { useToast } from '@/hooks/use-toast';
import type { Announcement } from '@/hooks/useAnnouncements';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement | null;
}

export function BulkWhatsAppSender({ open, onOpenChange, announcement }: Props) {
  const { data: clients } = useClients();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [phonesCopied, setPhonesCopied] = useState(false);

  if (!announcement) return null;

  const activeClients = (clients || []).filter(c => c.status === 'Active' && c.phone);

  const buildMessage = (clientName: string) => {
    const dateStr = announcement.occasion_date
      ? format(new Date(announcement.occasion_date), 'dd MMM yyyy')
      : '';
    return announcement.message_template
      .replace(/{name}/g, clientName)
      .replace(/{date}/g, dateStr)
      .replace(/{occasion}/g, announcement.title)
      .replace(/{hours}/g, '')
      .replace(/{message}/g, announcement.title);
  };

  const genericMessage = buildMessage('Members');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(genericMessage);
    setCopied(true);
    toast({ title: 'Message copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPhones = async () => {
    const phones = activeClients.map(c => c.phone.replace(/\D/g, '')).join('\n');
    await navigator.clipboard.writeText(phones);
    setPhonesCopied(true);
    toast({ title: `${activeClients.length} phone numbers copied!` });
    setTimeout(() => setPhonesCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Send: {announcement.title}</DialogTitle>
        </DialogHeader>

        {/* Message Preview */}
        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
          {genericMessage}
        </div>

        {/* Copy Button */}
        <Button variant="outline" className="w-full" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? 'Copied!' : 'Copy Message for Broadcast'}
        </Button>

        {/* Copy Phone Numbers */}
        <Button variant="outline" className="w-full" onClick={handleCopyPhones}>
          {phonesCopied ? <Check className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
          {phonesCopied ? 'Copied!' : `Copy ${activeClients.length} Phone Numbers`}
        </Button>

        {/* Client List */}
        <div className="text-sm font-medium text-muted-foreground">
          Send individually to {activeClients.length} active clients:
        </div>
        <ScrollArea className="flex-1 max-h-60">
          <div className="space-y-1">
            {activeClients.map(client => {
              const msg = buildMessage(client.name);
              const link = getWhatsAppLink(client.phone, msg);
              return (
                <a
                  key={client.id}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.phone}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </a>
              );
            })}
            {activeClients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active clients found</p>
            )}
          </div>
        </ScrollArea>

        <Button variant="outline" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4 mr-2" /> Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
