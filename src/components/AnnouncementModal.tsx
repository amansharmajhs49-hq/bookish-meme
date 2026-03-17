import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Eye, Megaphone, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCreateAnnouncement } from '@/hooks/useAnnouncements';
import { useToast } from '@/hooks/use-toast';

const TEMPLATES = [
  {
    key: 'holiday',
    label: '🎉 Holiday Closure',
    title: 'Gym Closed — ',
    template: `Hi {name} 👋

━━━━━━━━━━━━━━━━━━
📢 *HOLIDAY NOTICE*
━━━━━━━━━━━━━━━━━━

*Aesthetic Gym* will remain *closed* on *{date}* for *{occasion}*.

🗓️ Regular hours resume the next working day.

We wish you a wonderful holiday! Enjoy your rest day — you've earned it! 🎊✨

Stay fit, stay healthy! 💪
*Aesthetic Gym* 🏋️`,
  },
  {
    key: 'special_hours',
    label: '⏰ Special Hours',
    title: 'Special Hours — ',
    template: `Hi {name} 👋

━━━━━━━━━━━━━━━━━━
⏰ *REVISED TIMING*
━━━━━━━━━━━━━━━━━━

Please note, *Aesthetic Gym* will operate on *special hours* on *{date}*:

🕐 *{hours}*

Plan your workout accordingly so you don't miss your gains! 💪🔥

See you at the gym! 🏋️
*Aesthetic Gym*`,
  },
  {
    key: 'event',
    label: '🏋️ Event / Offer',
    title: '',
    template: `Hi {name} 👋

━━━━━━━━━━━━━━━━━━
🎯 *SPECIAL ANNOUNCEMENT*
━━━━━━━━━━━━━━━━━━

{message}

Don't miss out — limited time only! ⏳🔥

For details, visit us or reply to this message.

Let's keep pushing! 💪
*Aesthetic Gym* 🏋️`,
  },
  {
    key: 'maintenance',
    label: '🔧 Maintenance',
    title: 'Maintenance Notice — ',
    template: `Hi {name} 👋

━━━━━━━━━━━━━━━━━━
🔧 *MAINTENANCE NOTICE*
━━━━━━━━━━━━━━━━━━

*Aesthetic Gym* will be undergoing maintenance on *{date}*.

The gym will remain *closed* during this time to ensure we provide you the best experience.

🗓️ We'll be back stronger — just like you! 💪

Thank you for your patience! 🙏
*Aesthetic Gym* 🏋️`,
  },
  {
    key: 'custom',
    label: '✏️ Custom',
    title: '',
    template: '',
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnnouncementModal({ open, onOpenChange }: Props) {
  const [selectedType, setSelectedType] = useState('holiday');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState<Date>();
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const createAnnouncement = useCreateAnnouncement();
  const { toast } = useToast();

  const handleAIGenerate = async () => {
    if (!title.trim()) {
      toast({ title: 'Enter a title/occasion first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-announcement', {
        body: {
          occasion: title.trim(),
          date: date ? format(date, 'dd MMM yyyy') : undefined,
          type: selectedType,
        },
      });
      if (error) throw error;
      if (data?.message) {
        setMessage(data.message);
        toast({ title: 'AI message generated! ✨' });
      }
    } catch {
      toast({ title: 'Failed to generate. Try again.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectType = (key: string) => {
    setSelectedType(key);
    const tpl = TEMPLATES.find(t => t.key === key);
    if (tpl) {
      setTitle(tpl.title);
      setMessage(tpl.template);
    }
  };

  const getPreview = () => {
    return message
      .replace(/{name}/g, 'John')
      .replace(/{date}/g, date ? format(date, 'dd MMM yyyy') : '[date]')
      .replace(/{occasion}/g, title.replace(/^.*—\s*/, '') || '[occasion]')
      .replace(/{hours}/g, '[hours]')
      .replace(/{message}/g, '[your message]');
  };

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: 'Please fill title and message', variant: 'destructive' });
      return;
    }
    try {
      await createAnnouncement.mutateAsync({
        title: title.trim(),
        message_template: message.trim(),
        announcement_type: selectedType,
        occasion_date: date ? format(date, 'yyyy-MM-dd') : null,
      });
      toast({ title: 'Announcement saved!' });
      onOpenChange(false);
      setTitle('');
      setMessage('');
      setDate(undefined);
      setSelectedType('holiday');
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            New Announcement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type Selector */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATES.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleSelectType(t.key)}
                  className={cn(
                    'p-2.5 rounded-lg border text-sm text-left transition-all',
                    selectedType === t.key
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Gym Closed — Christmas" />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message Template</Label>
              <button
                onClick={handleAIGenerate}
                disabled={generating}
                className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {generating ? 'Generating...' : 'AI Generate ✨'}
              </button>
            </div>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              placeholder="Use {name} for client name, {date} for occasion date..."
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Variables: {'{name}'}, {'{date}'}, {'{occasion}'}, {'{hours}'}, {'{message}'}
            </p>
          </div>

          {/* Preview Toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-sm text-primary"
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>

          {showPreview && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {getPreview()}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={createAnnouncement.isPending}>
              {createAnnouncement.isPending ? 'Saving...' : 'Save Announcement'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
