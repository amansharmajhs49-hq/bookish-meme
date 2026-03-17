import { useState, useRef, useEffect } from 'react';
import { Bell, X, Clock, AlertCircle, ChevronRight, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClientWithMembership } from '@/hooks/useClients';
import { cn, formatDate } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';

interface NotificationCenterProps {
  clients: ClientWithMembership[];
}

interface Notification {
  id: string;
  type: 'expiring_today' | 'expiring_soon' | 'expired' | 'payment_due';
  clientId: string;
  clientName: string;
  message: string;
  daysLeft: number;
  read: boolean;
}

function buildNotifications(clients: ClientWithMembership[]): Notification[] {
  const notes: Notification[] = [];
  for (const c of clients) {
    if (c.status === 'Deleted') continue;

    if (c.membershipStatus === 'ACTIVE' && c.daysLeft === 0) {
      notes.push({
        id: `exp-today-${c.id}`,
        type: 'expiring_today',
        clientId: c.id,
        clientName: c.name,
        message: 'Membership expires today',
        daysLeft: 0,
        read: false,
      });
    } else if (c.membershipStatus === 'ACTIVE' && c.daysLeft > 0 && c.daysLeft <= 7) {
      notes.push({
        id: `exp-soon-${c.id}`,
        type: 'expiring_soon',
        clientId: c.id,
        clientName: c.name,
        message: `Expires in ${c.daysLeft} day${c.daysLeft > 1 ? 's' : ''}`,
        daysLeft: c.daysLeft,
        read: false,
      });
    } else if (c.membershipStatus === 'EXPIRED') {
      notes.push({
        id: `expired-${c.id}`,
        type: 'expired',
        clientId: c.id,
        clientName: c.name,
        message: `Expired ${Math.abs(c.daysLeft)} day${Math.abs(c.daysLeft) !== 1 ? 's' : ''} ago`,
        daysLeft: c.daysLeft,
        read: false,
      });
    } else if (c.membershipStatus === 'PAYMENT_DUE') {
      notes.push({
        id: `due-${c.id}`,
        type: 'payment_due',
        clientId: c.id,
        clientName: c.name,
        message: `₹${c.totalDue.toLocaleString('en-IN')} payment pending`,
        daysLeft: c.daysLeft,
        read: false,
      });
    }
  }
  // Sort: today → expiring soon (asc) → expired → due
  const order = { expiring_today: 0, expiring_soon: 1, expired: 2, payment_due: 3 };
  return notes.sort((a, b) => {
    if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
    return a.daysLeft - b.daysLeft;
  });
}

const typeConfig = {
  expiring_today: { icon: Clock, color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
  expiring_soon: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  expired: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
  payment_due: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
};

const STORAGE_KEY = 'notif-read-ids-v1';

function getReadIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveReadIds(ids: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); }
  catch {}
}

export function NotificationCenter({ clients }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const allNotes = buildNotifications(clients);
  const unread = allNotes.filter(n => !readIds.has(n.id));
  const badge = unread.length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = () => {
    const next = new Set([...readIds, ...allNotes.map(n => n.id)]);
    setReadIds(next);
    saveReadIds(next);
  };

  const handleClick = (n: Notification) => {
    const next = new Set([...readIds, n.id]);
    setReadIds(next);
    saveReadIds(next);
    setOpen(false);
    navigate(`/clients/${n.clientId}`);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center tabular-nums"
          >
            {badge > 99 ? '99+' : badge}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="absolute right-0 top-10 z-50 w-80 max-h-[70vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Notifications</span>
                {badge > 0 && (
                  <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                    {badge} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {badge > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-muted-foreground hover:text-primary px-2 py-1 rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    <CheckCheck className="h-3 w-3" />
                    All read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {allNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Bell className="h-8 w-8 opacity-20" />
                  <p className="text-sm">All clear — no alerts</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {allNotes.map(n => {
                    const cfg = typeConfig[n.type];
                    const Icon = cfg.icon;
                    const isRead = readIds.has(n.id);
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group',
                          isRead && 'opacity-60'
                        )}
                      >
                        {/* Unread dot */}
                        <div className="relative shrink-0 mt-0.5">
                          <div className={cn('rounded-lg p-1.5', cfg.bg)}>
                            <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                          </div>
                          {!isRead && (
                            <span className={cn('absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-card', cfg.dot)} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-foreground truncate">{n.clientName}</p>
                          <p className={cn('text-[11px] mt-0.5', isRead ? 'text-muted-foreground' : cfg.color)}>
                            {n.message}
                          </p>
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-primary/60 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {allNotes.length > 0 && (
              <div className="border-t border-border px-4 py-2.5 shrink-0">
                <button
                  onClick={() => { setOpen(false); navigate('/clients?filter=expiring_soon'); }}
                  className="text-[11px] text-primary font-semibold hover:underline"
                >
                  View all expiring members →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
