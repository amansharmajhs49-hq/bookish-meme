import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, ChevronRight, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  announcement_type: string;
  message_template: string;
  occasion_date?: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  holiday: '🏖️ Holiday',
  maintenance: '🔧 Maintenance',
  event: '🎉 Event',
  special_hours: '⏰ Special Hours',
  custom: '📢 Notice',
};

export function PortalAnnouncementPanel({ announcements }: { announcements: Announcement[] }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!announcements.length) return null;

  return (
    <>
      {/* Side button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-3 rounded-l-xl shadow-lg"
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <Megaphone className="w-4 h-4" />
        <span className="text-[10px] font-bold writing-mode-vertical"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {announcements.length}
        </span>
      </motion.button>

      {/* Slide-in panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-[85vw] max-w-sm bg-card border-l border-border shadow-2xl flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Announcements</span>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {announcements.length}
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Announcement list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {announcements.map((a, i) => {
                  const isExpanded = expandedId === a.id;
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl border border-border bg-background overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : a.id)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-primary/70">
                            {TYPE_LABELS[a.announcement_type] || TYPE_LABELS.custom}
                          </p>
                          <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                          {a.occasion_date && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(a.occasion_date), 'dd MMM yyyy')}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-2">
                              {a.message_template}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
