import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ChevronRight, IndianRupee, MessageCircle, CreditCard, RefreshCw } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { ClientWithMembership } from '@/hooks/useClients';
import { ClientAvatar } from './ClientAvatar';
import { ClientLinkPill } from './ClientLinkPill';
import { AliasPill } from './AliasPill';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { MembershipStatus } from '@/lib/membership';
import { getWhatsAppLink, generateReminderMessage } from '@/lib/whatsapp';

interface ClientCardProps {
  client: ClientWithMembership;
  onAddPayment?: (client: ClientWithMembership) => void;
  onRenew?: (client: ClientWithMembership) => void;
  searchQuery?: string;
}

const statusConfig: Record<MembershipStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  ACTIVE: { label: 'Active', bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500', border: '' },
  PAYMENT_DUE: { label: 'Due', bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500', border: 'border-l-[3px] border-l-amber-500' },
  EXPIRED: { label: 'Expired', bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500', border: 'border-l-[3px] border-l-destructive' },
  LEFT: { label: 'Left', bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400', border: 'border-l-[3px] border-l-orange-400' },
  INACTIVE: { label: 'Inactive', bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground', border: 'border-l-[3px] border-l-muted-foreground' },
};

const SWIPE_THRESHOLD = 60;
const MAX_DRAG = 140;

export function ClientCard({ client, onAddPayment, onRenew, searchQuery }: ClientCardProps) {
  const navigate = useNavigate();
  const x = useMotionValue(0);
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null);
  const status = statusConfig[client.membershipStatus] || statusConfig.INACTIVE;

  // Detect alias match
  const aliasMatched = searchQuery && searchQuery.trim().length > 0
    && (client as any).alias_name
    && (client as any).alias_name.toLowerCase().includes(searchQuery.toLowerCase())
    && !client.name.toLowerCase().includes(searchQuery.toLowerCase())
    && !client.phone.includes(searchQuery);

  const totalPlanDays = client.latestJoin
    ? Math.max(1, Math.round((new Date(client.latestJoin.expiry_date).getTime() - new Date(client.latestJoin.join_date).getTime()) / 86400000))
    : null;

  const daysText = client.daysLeft > 0
    ? totalPlanDays ? `${client.daysLeft}d / ${totalPlanDays}d` : `${client.daysLeft}d`
    : client.daysLeft === 0 ? 'Expires today'
    : `${Math.abs(client.daysLeft)}d ago`;

  const rightActionsOpacity = useTransform(x, [-MAX_DRAG, -SWIPE_THRESHOLD, 0], [1, 0.6, 0]);
  const leftActionsOpacity = useTransform(x, [0, SWIPE_THRESHOLD, MAX_DRAG], [0, 0.6, 1]);

  const snapBack = () => {
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
    setSwiped(null);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    if (offset < -SWIPE_THRESHOLD) {
      animate(x, -MAX_DRAG, { type: 'spring', stiffness: 400, damping: 35 });
      setSwiped('left');
    } else if (offset > SWIPE_THRESHOLD && (client.membershipStatus === 'EXPIRED' || client.membershipStatus === 'PAYMENT_DUE')) {
      animate(x, MAX_DRAG, { type: 'spring', stiffness: 400, damping: 35 });
      setSwiped('right');
    } else {
      snapBack();
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = generateReminderMessage('expiry_reminder', {
      clientName: client.name,
      daysLeft: client.daysLeft,
      expiryDate: client.latestJoin?.expiry_date ? new Date(client.latestJoin.expiry_date) : new Date(),
    });
    window.open(getWhatsAppLink(client.phone, message), '_blank');
    snapBack();
  };

  const handlePayment = (e: React.MouseEvent) => {
    e.stopPropagation();
    snapBack();
    onAddPayment?.(client);
  };

  const handleRenew = (e: React.MouseEvent) => {
    e.stopPropagation();
    snapBack();
    onRenew?.(client);
  };

  const handleCardClick = () => {
    if (swiped) { snapBack(); return; }
    navigate(`/clients/${client.id}`);
  };

  const canRenewSwipe = client.membershipStatus === 'EXPIRED' || client.membershipStatus === 'PAYMENT_DUE';

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Left bg: Renew */}
      {canRenewSwipe && (
        <motion.div
          style={{ opacity: leftActionsOpacity }}
          className="absolute inset-y-0 left-0 flex items-center pl-5 w-36 bg-emerald-500/15 rounded-2xl pointer-events-none"
        >
          <div className="flex flex-col items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <RefreshCw className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Renew</span>
          </div>
        </motion.div>
      )}

      {/* Right bg: Pay + WhatsApp */}
      <motion.div
        style={{ opacity: rightActionsOpacity }}
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-3 gap-2 w-44 rounded-2xl pointer-events-none"
      >
        <div className="flex flex-col items-center gap-1 text-primary bg-primary/10 rounded-xl px-3 py-2">
          <CreditCard className="h-4 w-4" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Pay</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-emerald-500 bg-emerald-500/10 rounded-xl px-3 py-2">
          <MessageCircle className="h-4 w-4" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Chat</span>
        </div>
      </motion.div>

      {/* Tappable action zones when swiped */}
      {swiped === 'left' && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-3 gap-2 w-44 z-10">
          <button onClick={handlePayment} className="flex flex-col items-center gap-1 text-primary bg-primary/10 rounded-xl px-3 py-2 h-full max-h-14">
            <CreditCard className="h-4 w-4" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Pay</span>
          </button>
          <button onClick={handleWhatsApp} className="flex flex-col items-center gap-1 text-emerald-500 bg-emerald-500/10 rounded-xl px-3 py-2 h-full max-h-14">
            <MessageCircle className="h-4 w-4" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Chat</span>
          </button>
        </div>
      )}
      {swiped === 'right' && canRenewSwipe && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-5 w-36 z-10">
          <button onClick={handleRenew} className="flex flex-col items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 rounded-xl px-3 py-2 h-full max-h-14">
            <RefreshCw className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Renew</span>
          </button>
        </div>
      )}

      {/* Main draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -MAX_DRAG, right: canRenewSwipe ? MAX_DRAG : 0 }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onClick={handleCardClick}
      className={cn(
        "group relative w-full text-left rounded-2xl border border-border bg-card transition-colors hover:border-primary/40 overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] cursor-pointer select-none",
        status.border
      )}
      >
        {/* Top section */}
        <div className="flex items-center gap-3 p-3.5 pb-2">
          <div className="relative shrink-0">
            <ClientAvatar src={client.photo_url} name={client.name} size="md" className="ring-0" />
            <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card', status.dot)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-[13px] text-foreground truncate">{client.name}</h3>
              <span className={cn('shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold', status.bg, status.text)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                {status.label}
              </span>
              {(client as any).alias_name && <AliasPill alias={(client as any).alias_name} />}
              {aliasMatched && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-[9px] font-bold">
                  alias match
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-medium">
              {client.latestJoin?.plan?.name || (client.latestJoin?.custom_price != null ? 'Custom Plan' : 'No active plan')}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{client.phone}</p>
            <ClientLinkPill clientId={client.id} showNames compact />
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 group-hover:text-primary/60 transition-colors" />
        </div>

        {/* Bottom stats */}
        <div className="border-t border-border/60 bg-muted/40 dark:bg-muted/30">
          <div className="flex items-center">
            <div className="flex-1 flex items-center gap-1.5 px-3.5 py-2 text-[11px] text-muted-foreground border-r border-border/50">
              <Calendar className="h-3 w-3 opacity-50 shrink-0" />
              <span className="truncate">
                {client.latestJoin ? formatDate(client.latestJoin.expiry_date) : '—'}
              </span>
            </div>

            <div className={cn(
              'flex items-center gap-1 px-3 py-2 text-[11px] font-semibold border-r border-border/50',
              client.daysLeft <= 0 ? 'text-destructive' : client.daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground',
            )}>
              <Clock className="h-3 w-3 shrink-0" />
              {daysText}
            </div>

            <div className="flex items-center gap-1 px-3 py-2 text-[11px]">
              {client.totalDue > 0 ? (
                <span className="font-bold text-destructive flex items-center gap-0.5">
                  <IndianRupee className="h-3 w-3" />
                  {client.totalDue.toLocaleString('en-IN')}
                </span>
              ) : (
                <span className="font-semibold text-emerald-500">Paid ✓</span>
              )}
            </div>
          </div>

          {/* Progress bar — only for ACTIVE memberships */}
          {client.latestJoin && client.membershipStatus === 'ACTIVE' && totalPlanDays && (() => {
            const pct = Math.min(100, Math.max(0, Math.round(((totalPlanDays - client.daysLeft) / totalPlanDays) * 100)));
            const barColor = client.daysLeft <= 7 ? 'bg-amber-500' : client.daysLeft <= 14 ? 'bg-yellow-400' : 'bg-emerald-500';
            return (
              <div className="px-3.5 pb-2.5 pt-0.5">
                <div className="h-1 w-full rounded-full bg-border/60 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()}
          {/* Expired pill for non-active */}
          {client.membershipStatus === 'EXPIRED' && client.daysLeft < 0 && (
            <div className="px-3.5 pb-2.5 pt-0.5">
              <span className="text-[9px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                Expired {Math.abs(client.daysLeft)} days ago — needs renewal
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
