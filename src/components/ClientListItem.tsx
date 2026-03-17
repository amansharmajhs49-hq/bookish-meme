import { useNavigate } from 'react-router-dom';
import { ClientWithMembership } from '@/hooks/useClients';
import { ClientAvatar } from './ClientAvatar';
import { ClientLinkPill } from './ClientLinkPill';
import { AliasPill } from './AliasPill';
import { MembershipStatusBadge } from './MembershipStatusBadge';
import { formatCurrency, formatDateShort, cn, getPaymentStatusColor } from '@/lib/utils';

interface ClientListItemProps {
  client: ClientWithMembership;
}

export function ClientListItem({ client }: ClientListItemProps) {
  const navigate = useNavigate();

  return (
    <tr
      onClick={() => navigate(`/clients/${client.id}`)}
      className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors group"
    >
      <td className="py-3 px-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <ClientAvatar src={client.photo_url} name={client.name} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-medium text-xs text-foreground truncate max-w-[100px]">{client.name}</span>
              {(client as any).alias_name && <AliasPill alias={(client as any).alias_name} />}
            </div>
            {/* Show linked names inline */}
            <ClientLinkPill clientId={client.id} showNames compact />
            <span className="text-[10px] text-muted-foreground truncate block">{client.phone}</span>
          </div>
        </div>
      </td>
      <td className="py-3 px-2.5">
        <MembershipStatusBadge status={client.membershipStatus} className="text-[10px] px-1.5 py-0.5" showDot={false} />
      </td>
      <td className="py-3 px-2.5 text-xs text-muted-foreground truncate max-w-[70px]">
        {(client.latestJoin?.plan?.name || (client.latestJoin?.custom_price != null ? 'Custom Plan' : '—')).slice(0, 20)}
      </td>
      <td className="py-3 px-2.5 text-xs text-muted-foreground whitespace-nowrap">
        {client.latestJoin ? formatDateShort(client.latestJoin.expiry_date) : '—'}
      </td>
      <td className="py-3 px-2.5">
        <span className={cn('text-xs font-semibold tabular-nums', getPaymentStatusColor(client.paymentStatus))}>
          {formatCurrency(client.paidAmount)}
        </span>
      </td>
      <td className="py-3 px-2.5">
        <span className={cn('text-xs font-bold tabular-nums', client.totalDue > 0 ? 'text-destructive' : 'text-success')}>
          {formatCurrency(client.totalDue)}
        </span>
      </td>
    </tr>
  );
}
