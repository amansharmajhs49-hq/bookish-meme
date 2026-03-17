import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Calendar } from 'lucide-react';
import { format, addDays, isAfter, isBefore, subDays } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  announcement_type: string;
  message_template: string;
  occasion_date?: string | null;
  created_at: string;
}

interface Props {
  announcements: Announcement[];
  clientName?: string;
}

export function PortalNotificationBell({ announcements, clientName }: Props) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem('portal_read_announcements');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  // Show announcements that are:
  // 1. Created within last 7 days, OR
  // 2. Have occasion_date within next 7 days
  const now = new Date();
  const items = announcements.filter(a => {
    if (a.occasion_date) {
      const d = new Date(a.occasion_date);
      return isAfter(d, subDays(now, 1)) && isBefore(d, addDays(now, 7));
    }
    const created = new Date(a.created_at);
    return isAfter(created, subDays(now, 7));
  });

  const unreadCount = items.filter(a => !readIds.has(a.id)).length;

  useEffect(() => {
    if (open && unreadCount > 0) {
      const newRead = new Set(readIds);
      items.forEach(a => newRead.add(a.id));
      setReadIds(newRead);
      sessionStorage.setItem('portal_read_announcements', JSON.stringify([...newRead]));
    }
  }, [open]);

  const replaceVars = (text: string) => {
    return text.replace(/{name}/g, clientName || 'Member');
  };

  if (items.length === 0) return null;

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-destructive border-2 border-background text-[10px] font-bold text-destructive-foreground flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ type: 'spring', stiffness: 500, repeat: 2, repeatDelay: 3 }}
          >
            {unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-20 right-4 z-50 w-[85vw] max-w-xs bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-xs font-semibold text-foreground">Notifications</span>
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {items.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                    className="border-b border-border last:border-0"
                  >
                    <button
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground leading-snug">{replaceVars(a.title)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {a.occasion_date && (
                          <span className="text-[10px] text-primary flex items-center gap-0.5 font-medium">
                            <Calendar className="w-2.5 h-2.5" />
                            {format(new Date(a.occasion_date), 'dd MMM')}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">
                          {format(new Date(a.created_at), 'dd MMM')}
                        </span>
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedId === a.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {replaceVars(a.message_template)}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
