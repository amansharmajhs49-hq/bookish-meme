import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ChevronRight, IndianRupee } from 'lucide-react';
import { ClientWithMembership } from '@/hooks/useClients';
import { ClientAvatar } from './ClientAvatar';
import { ClientLinkPill } from './ClientLinkPill';
import { AliasPill } from './AliasPill';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { MembershipStatus } from '@/lib/membership';

interface ClientCardProps {
  client: ClientWithMembership;
}

const statusConfig: Record<MembershipStatus, { label: string; bg: string; text: string; dot: string }> = {
  ACTIVE: { label: 'Active', bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  PAYMENT_DUE: { label: 'Due', bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
  EXPIRED: { label: 'Expired', bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  LEFT: { label: 'Left', bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
  INACTIVE: { label: 'Inactive', bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

export function ClientCard({ client }: ClientCardProps) {
  const navigate = useNavigate();
  const status = statusConfig[client.membershipStatus] || statusConfig.INACTIVE;

  const daysText = client.daysLeft > 0
    ? `${client.daysLeft}d`
    : client.daysLeft === 0 ? 'Today' : `${Math.abs(client.daysLeft)}d ago`;

  return (
    <button
      onClick={() => navigate(`/clients/${client.id}`)}
      className="group relative w-full text-left rounded-2xl border border-border bg-card p-0 transition-all duration-200 hover:border-primary/40 active:scale-[0.99] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]"
    >
      {/* Top section */}
      <div className="flex items-center gap-3 p-3.5 pb-2">
        {/* Avatar with status ring */}
        <div className="relative shrink-0">
          <ClientAvatar src={client.photo_url} name={client.name} size="md" className="ring-0" />
          <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card', status.dot)} />
        </div>

        {/* Name & Plan */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-[13px] text-foreground truncate">{client.name}</h3>
            <span className={cn('shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold', status.bg, status.text)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
              {status.label}
            </span>
            {(client as any).alias_name && <AliasPill alias={(client as any).alias_name} />}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {client.latestJoin?.plan?.name || (client.latestJoin?.custom_price != null ? 'Custom Plan' : 'No active plan')}
          </p>
          {/* Linked client names shown inline */}
          <ClientLinkPill clientId={client.id} showNames compact />
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 group-hover:text-primary/60 transition-colors" />
      </div>

      {/* Bottom stats bar */}
      <div className="flex items-center border-t border-border/60 bg-muted/40 dark:bg-muted/30">
        {/* Expiry */}
        <div className="flex-1 flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] text-muted-foreground border-r border-border/50">
          <Calendar className="h-3 w-3 opacity-50 shrink-0" />
          <span className="truncate">
            {client.latestJoin ? formatDate(client.latestJoin.expiry_date) : '—'}
          </span>
        </div>

        {/* Days left */}
        <div className={cn(
          'flex items-center gap-1 px-3 py-2.5 text-[11px] font-semibold border-r border-border/50',
          client.daysLeft <= 0 ? 'text-destructive' : client.daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground',
        )}>
          <Clock className="h-3 w-3 shrink-0" />
          {daysText}
        </div>

        {/* Due amount */}
        <div className="flex items-center gap-1 px-3 py-2.5 text-[11px]">
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
    </button>
  );
}
