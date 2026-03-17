import { useState, useEffect } from 'react';
import { Link2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface LinkedClient {
  id: string;
  name: string;
  hasDues: boolean;
}

interface ClientLinkPillProps {
  clientId: string;
  /** Show full names inline instead of just count */
  showNames?: boolean;
  /** Compact mode for card views */
  compact?: boolean;
}

export function ClientLinkPill({ clientId, showNames = false, compact = false }: ClientLinkPillProps) {
  const [linkedClients, setLinkedClients] = useState<LinkedClient[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: links } = await supabase
        .from('client_links')
        .select('client_id_1, client_id_2, link_type')
        .or(`client_id_1.eq.${clientId},client_id_2.eq.${clientId}`);

      if (!links?.length) return;

      const otherIds = links.map((l) =>
        l.client_id_1 === clientId ? l.client_id_2 : l.client_id_1
      );

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, advance_balance')
        .in('id', otherIds);

      if (!clients?.length) return;

      const [joinsRes, paymentsRes, purchasesRes] = await Promise.all([
        supabase.from('joins').select('client_id, custom_price, plan:plans(price)').in('client_id', otherIds),
        supabase.from('payments').select('client_id, amount, payment_type').in('client_id', otherIds),
        supabase.from('product_purchases').select('client_id, total_price').in('client_id', otherIds),
      ]);

      const result: LinkedClient[] = clients.map((c) => {
        const clientJoins = (joinsRes.data || []).filter((j: any) => j.client_id === c.id);
        const clientPayments = (paymentsRes.data || []).filter((p: any) => p.client_id === c.id);
        const clientPurchases = (purchasesRes.data || []).filter((p: any) => p.client_id === c.id);

        const totalFees = clientJoins.reduce((sum: number, j: any) => {
          return sum + Number(j.custom_price ?? (j.plan?.price || 0));
        }, 0);
        const membershipPaid = clientPayments
          .filter((p: any) => !p.payment_type || p.payment_type === 'membership' || p.payment_type === 'mixed')
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        const productTotal = clientPurchases.reduce((sum: number, p: any) => sum + Number(p.total_price), 0);
        const productPaid = clientPayments
          .filter((p: any) => p.payment_type === 'product')
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        const advance = Number(c.advance_balance || 0);
        const totalDue = Math.max(0, (totalFees - membershipPaid) + (productTotal - productPaid) - advance);

        return { id: c.id, name: c.name, hasDues: totalDue > 0 };
      });

      setLinkedClients(result);
    })();
  }, [clientId]);

  if (!linkedClients.length) return null;

  const hasDuesAny = linkedClients.some(c => c.hasDues);

  // Show names inline (for card view on dashboard/clients)
  if (showNames) {
    return (
      <div className={cn(
        'flex items-center gap-1.5 text-[10px]',
        compact ? 'mt-0' : 'mt-1'
      )}>
        <Link2 className="w-2.5 h-2.5 text-primary/50 shrink-0" />
        <span className="text-muted-foreground truncate">
          {linkedClients.map((lc, i) => (
            <span key={lc.id}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/clients/${lc.id}`);
                }}
                className={cn(
                  'hover:text-primary transition-colors font-medium',
                  lc.hasDues ? 'text-destructive/70' : 'text-muted-foreground'
                )}
              >
                {lc.name.split(' ')[0]}
              </button>
              {i < linkedClients.length - 1 && <span className="text-muted-foreground/40">, </span>}
            </span>
          ))}
        </span>
        {hasDuesAny && (
          <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
        )}
      </div>
    );
  }

  // Default pill with dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary/70 border border-primary/15 cursor-pointer transition-all duration-200 focus:outline-none">
          <Link2 className="w-2.5 h-2.5" />
          {linkedClients.length}
          {hasDuesAny && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={4} className="text-xs p-1.5 min-w-[180px]">
        <div className="font-semibold text-[11px] flex items-center gap-1.5 p-1.5 mb-1 text-muted-foreground border-b border-border">
          <Users className="w-3 h-3 text-primary" />
          Linked Members
        </div>
        {linkedClients.map((lc) => (
          <DropdownMenuItem
            key={lc.id}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/clients/${lc.id}`);
            }}
            className="flex items-center gap-2 w-full cursor-pointer py-1.5 px-2 rounded-sm"
          >
            <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
              {lc.name.charAt(0)}
            </span>
            <span className="text-foreground/80 font-medium truncate">{lc.name}</span>
            {lc.hasDues && (
              <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0 ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
