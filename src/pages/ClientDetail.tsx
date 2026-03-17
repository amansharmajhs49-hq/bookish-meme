import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Phone,
  Target,
  MessageSquare,
  Calendar,
  Clock,
  IndianRupee,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  UserMinus,
  Pencil,
  RefreshCw,
  AlertTriangle,
  Ban,
  ShoppingBag,
  History,
  CreditCard,
  FileDown,
  Send,
  Share2,
  Link2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useClient, useUpdateClient, useDeleteClient, useToggleInactive } from '@/hooks/useClients';
import { ClientLinkPill } from '@/components/ClientLinkPill';
import { AliasPill } from '@/components/AliasPill';
import { LinkClientModal } from '@/components/LinkClientModal';
import { useAuth } from '@/hooks/useAuth';
import { useLogReminder } from '@/hooks/useReminders';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useClientAuditLogs, getActionDescription, createAuditLog } from '@/hooks/useAuditLog';
import { ClientAvatar } from '@/components/ClientAvatar';
import { ProfilePhotoViewer } from '@/components/ProfilePhotoViewer';
import { MembershipStatusBadge } from '@/components/MembershipStatusBadge';
import { DuesWarningBanner } from '@/components/DuesWarningBanner';
import { AddPaymentModal } from '@/components/AddPaymentModal';
import { AddProductPurchaseModal } from '@/components/AddProductPurchaseModal';
import { ClearProductDueModal } from '@/components/ClearProductDueModal';
import { RejoinModal } from '@/components/RejoinModal';
import { EditClientModal } from '@/components/EditClientModal';
import { EditPaymentModal } from '@/components/EditPaymentModal';
import { EditJoinModal } from '@/components/EditJoinModal';
import { RenewSubscriptionModal } from '@/components/RenewSubscriptionModal';
import { MobileNav } from '@/components/MobileNav';
import { ClientDetailSkeleton } from '@/components/DashboardSkeleton';
import { BodyProgressSection } from '@/components/BodyProgressSection';
import { MemberCardDownload } from '@/components/MemberCardDownload';
import {
  formatCurrency,
  formatDate,
  cn,
  getPaymentStatusColor,
} from '@/lib/utils';

import { generateReminderMessage, getWhatsAppLink, isWithinReminderHours, generatePaymentMessage, generateReceiptMessage } from '@/lib/whatsapp';
import { generateSmartReminderMessage } from '@/lib/aiWhatsapp';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Payment, Join, ProductPurchase } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Sort helper: newest created_at first
function sortByCreatedDesc<T extends { created_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const { data: client, isLoading } = useClient(id!);
  const { data: auditLogs } = useClientAuditLogs(id!);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const toggleInactive = useToggleInactive();
  const logReminder = useLogReminder();
  const { data: appSettings } = useAppSettings();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProductPurchaseModal, setShowProductPurchaseModal] = useState(false);
  const [showRejoinModal, setShowRejoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingJoin, setEditingJoin] = useState<Join | null>(null);
  const [clearingPurchase, setClearingPurchase] = useState<ProductPurchase | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | 'left' | 'delete' | 'inactive'>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Sort all lists newest first
  const sortedPayments = useMemo(() => client ? sortByCreatedDesc(client.payments) : [], [client]);
  const sortedJoins = useMemo(() => client ? sortByCreatedDesc(client.joins) : [], [client]);
  const sortedPurchases = useMemo(() => client?.productPurchases ? sortByCreatedDesc(client.productPurchases) : [], [client]);
  const sortedAuditLogs = useMemo(() => auditLogs ? sortByCreatedDesc(auditLogs) : [], [auditLogs]);

  // Calculate per-join dues by allocating ALL membership payments across joins (oldest first)
  const joinDuesMap = useMemo(() => {
    if (!client) return new Map<string, { paid: number; due: number; payments: Payment[] }>();
    
    // Get all joins sorted oldest first for allocation
    const joinsOldestFirst = [...client.joins].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Separate linked and unlinked membership payments
    const allMembershipPayments = client.payments.filter(
      p => !p.payment_type || p.payment_type === 'membership' || p.payment_type === 'mixed'
    );
    
    const linkedPayments = new Map<string, Payment[]>();
    const unlinkedPayments: Payment[] = [];
    
    for (const p of allMembershipPayments) {
      if (p.join_id) {
        const existing = linkedPayments.get(p.join_id) || [];
        existing.push(p);
        linkedPayments.set(p.join_id, existing);
      } else {
        unlinkedPayments.push(p);
      }
    }
    
    // First pass: assign linked payments to their joins
    const result = new Map<string, { paid: number; due: number; payments: Payment[] }>();
    for (const join of joinsOldestFirst) {
      const joinPrice = Number(join.custom_price ?? (join.plan?.price || 0));
      const directPayments = linkedPayments.get(join.id) || [];
      const directPaid = directPayments.reduce((s, p) => s + Number(p.amount), 0);
      result.set(join.id, { paid: directPaid, due: Math.max(0, joinPrice - directPaid), payments: directPayments });
    }
    
    // Second pass: allocate unlinked payments to oldest dues first
    let remainingUnlinked = unlinkedPayments.reduce((s, p) => s + Number(p.amount), 0);
    for (const join of joinsOldestFirst) {
      if (remainingUnlinked <= 0) break;
      const entry = result.get(join.id)!;
      if (entry.due > 0) {
        const applied = Math.min(remainingUnlinked, entry.due);
        entry.paid += applied;
        entry.due = Math.max(0, entry.due - applied);
        remainingUnlinked -= applied;
      }
    }
    
    return result;
  }, [client]);

  const handleMarkAsLeft = async () => {
    if (!client || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await updateClient.mutateAsync({ id: client.id, status: 'Left' });

      // Audit log
      await createAuditLog({
        action: 'STATUS_CHANGED',
        entityType: 'client',
        entityId: client.id,
        clientId: client.id,
        adminId: user?.id,
        oldData: { status: client.status },
        newData: { status: 'Left' },
        reason: 'Client left the gym',
      }).catch(console.error);

      // Auto-send WhatsApp message
      const message = generateReminderMessage('client_left', {
        clientName: client.name,
        dueAmount: client.totalDue,
      });
      
      try {
        await logReminder.mutateAsync({
          clientId: client.id,
          reminderType: 'client_left',
          message,
        });
      } catch (e) {
        console.error('Failed to log reminder:', e);
      }

      window.open(getWhatsAppLink(client.phone, message), '_blank');
      toast({ title: `${client.name} marked as left` });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleInactive = async () => {
    if (!client || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await toggleInactive.mutateAsync({ 
        id: client.id, 
        isInactive: !client.isInactive 
      });
      toast({ 
        title: client.isInactive 
          ? 'Membership reactivated' 
          : 'Membership disabled by admin' 
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!client || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await deleteClient.mutateAsync(client.id);
      toast({ title: 'Client moved to bin' });
      navigate('/clients');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleWhatsAppReminder = async () => {
    if (!client) return;

    let reminderType: import('@/lib/whatsapp').ReminderType;
    if (client.status === 'Left' || client.membershipStatus === 'LEFT' || client.membershipStatus === 'INACTIVE') {
      reminderType = 'client_left';
    } else if (client.totalDue > 0) {
      reminderType = 'payment_due';
    } else if (client.membershipStatus === 'EXPIRED') {
      reminderType = 'membership_expired';
    } else if (client.daysLeft === 0) {
      reminderType = 'expiry_today';
    } else if (client.daysLeft === 1) {
      reminderType = 'expiry_1_day';
    } else if (client.daysLeft <= 3) {
      reminderType = 'expiry_3_days';
    } else {
      reminderType = 'expiry_7_days';
    }

    // Calculate membership tenure
    const firstJoin = [...client.joins].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    const membershipLengthMonths = firstJoin
      ? Math.round((new Date().getTime() - new Date(firstJoin.join_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : undefined;

    const message = await generateSmartReminderMessage(reminderType, {
      name: client.name,
      planName: client.latestJoin?.plan?.name,
      expiryDate: client.latestJoin?.expiry_date,
      dueAmount: client.totalDue,
      daysLeft: client.daysLeft,
      membershipLengthMonths,
      renewalCount: Math.max(0, client.joins.length - 1),
      goal: client.goal || undefined,
    });

    try {
      await logReminder.mutateAsync({ clientId: client.id, reminderType, message });
    } catch (e) { console.error('Failed to log reminder:', e); }

    window.open(getWhatsAppLink(client.phone, message), '_blank');
  };

  if (authLoading || isLoading) {
    return <ClientDetailSkeleton />;
  }

  if (!user) return null;

  if (!client) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-muted-foreground">Client not found</div>
      </div>
    );
  }

  const progressPercent = client.latestJoin
    ? (() => {
        const totalDays = Math.max(1, Math.round(
          (new Date(client.latestJoin.expiry_date).getTime() - new Date(client.latestJoin.join_date).getTime()) / 86400000
        ));
        const elapsed = totalDays - client.daysLeft;
        return Math.max(0, Math.min(100, Math.round((elapsed / totalDays) * 100)));
      })()
    : 0;

  return (
    <div className="page-container">
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-1.5">
          {/* Context-aware quick actions */}
          {client.totalDue > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors"
            >
              <IndianRupee className="h-3.5 w-3.5" />
              Collect
            </button>
          )}
          {client.canRenew && (
            <button
              onClick={() => setShowRenewModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Renew
            </button>
          )}
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 rounded-lg hover:bg-muted"
          >
            <Edit className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Profile Header */}
        <div className="text-center space-y-3">
          <ProfilePhotoViewer
            src={client.photo_url}
            name={client.name}
            onRemovePhoto={client.photo_url ? async () => {
              try {
                if (client.photo_path) {
                  await supabase.storage.from('client-photos').remove([client.photo_path]);
                }
                await updateClient.mutateAsync({ id: client.id, photo_path: null });
                toast({ title: 'Photo removed' });
              } catch {
                toast({ title: 'Failed to remove photo', variant: 'destructive' });
              }
            } : undefined}
          />
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{client.name}</h1>
              {(client as any).alias_name && <AliasPill alias={(client as any).alias_name} />}
              <ClientLinkPill clientId={client.id} />
              <button
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/30 active:scale-95 transition-all shadow-sm"
              >
                <Link2 className="w-3 h-3" />
                Link
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <MembershipStatusBadge 
                status={client.membershipStatus} 
                tooltip={client.membershipTooltip}
              />
              <span className={cn('text-sm font-medium', getPaymentStatusColor(client.paymentStatus))}>
                {client.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Dues Warning */}
        <DuesWarningBanner
          dueAmount={client.dueAmount}
          productDues={client.productDues}
          advanceBalance={client.advanceBalance}
          showBreakdown
        />

        {/* Contact Info — action-first design */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${client.phone}`}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors active:scale-[0.97]"
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
            <a
              href={`https://wa.me/${client.phone.replace(/\D/g, '').replace(/^(?!91)/, '91')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-sm hover:bg-emerald-500/20 transition-colors active:scale-[0.97]"
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </a>
          </div>

          {/* Secondary info */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-muted-foreground font-mono select-all">{client.phone}</span>
            <button
              onClick={() => { navigator.clipboard?.writeText(client.phone); toast({ title: 'Phone copied' }); }}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Copy"
            >
              <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>

          {/* Goal + Remarks + Advance as chips */}
          <div className="flex flex-wrap gap-2">
            {client.goal && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                <Target className="h-3 w-3 text-primary" />
                {client.goal}
              </span>
            )}
            {client.advanceBalance > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <IndianRupee className="h-3 w-3" />
                ₹{client.advanceBalance.toLocaleString('en-IN')} advance
              </span>
            )}
          </div>
          {client.remarks && (
            <p className="text-xs text-muted-foreground italic border-t border-border/60 pt-2 leading-relaxed">"{client.remarks}"</p>
          )}
        </div>

        {/* Current Subscription */}
        {client.latestJoin && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Current Subscription
              </h2>
              <div className="flex gap-2">
                {client.membershipStatus === 'ACTIVE' && client.latestJoin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowExtendModal(true)}
                        className="flex items-center gap-1.5 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Extend
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Extend current membership with a plan</TooltipContent>
                  </Tooltip>
                )}
                {client.canRenew && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowRenewModal(true)}
                        className="flex items-center gap-1.5 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Renew
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Start a new subscription period</TooltipContent>
                  </Tooltip>
                )}
                {!client.canRenew && client.isPaymentBlocked && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg cursor-not-allowed opacity-50">
                        <Ban className="h-3.5 w-3.5" />
                        Blocked
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Clear dues to enable actions</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Plan</p>
                <p className="font-semibold text-foreground">{client.latestJoin.plan?.name || 'Custom'}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Joined</p>
                <p className="font-semibold text-foreground">{formatDate(client.latestJoin.join_date)}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Expires</p>
                <p className="font-semibold text-foreground">{formatDate(client.latestJoin.expiry_date)}</p>
              </div>
              <div className={cn('rounded-xl p-3', client.daysLeft <= 0 ? 'bg-destructive/10' : client.daysLeft <= 7 ? 'bg-amber-500/10' : 'bg-emerald-500/10')}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Days Left</p>
                <div className="space-y-1.5">
                  <p className={cn('font-bold text-sm', client.daysLeft <= 0 ? 'text-destructive' : client.daysLeft <= 7 ? 'text-amber-500' : 'text-emerald-500')}>
                    {client.daysLeft > 0 ? (() => {
                      const total = Math.max(1, Math.round((new Date(client.latestJoin.expiry_date).getTime() - new Date(client.latestJoin.join_date).getTime()) / 86400000));
                      return `${client.daysLeft} / ${total} days`;
                    })() : 'Expired'}
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', client.daysLeft <= 0 ? 'bg-destructive' : client.daysLeft <= 7 ? 'bg-amber-500' : client.daysLeft <= 14 ? 'bg-yellow-400' : 'bg-emerald-500')}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Member Since */}
            <p className="text-[10px] text-muted-foreground/60 text-center font-medium tracking-wide uppercase">
              Member since {format(parseISO(client.created_at), 'MMM yyyy')}
            </p>
          </div>
        )}

        {/* Payment Summary */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" />
              Payment Summary
            </h2>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1 text-sm text-primary"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Total</p>
              <p className="font-bold text-sm">{formatCurrency(client.totalFees)}</p>
            </div>
            <div className={cn('rounded-xl p-3', client.paidAmount >= client.totalFees && client.totalFees > 0 ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10')}>
              <p className={cn('text-[10px] uppercase tracking-wide mb-1', client.paidAmount >= client.totalFees && client.totalFees > 0 ? 'text-emerald-100' : 'text-emerald-500')}>Paid</p>
              <p className={cn('font-bold text-sm', client.paidAmount >= client.totalFees && client.totalFees > 0 ? 'text-white' : 'text-emerald-500')}>{formatCurrency(client.paidAmount)}</p>
            </div>
            <div className={cn('rounded-xl p-3', client.totalDue > 0 ? 'bg-destructive text-white' : 'bg-muted/50')}>
              <p className={cn('text-[10px] uppercase tracking-wide mb-1', client.totalDue > 0 ? 'text-red-100' : 'text-muted-foreground')}>Due</p>
              <p className={cn('font-bold text-sm', client.totalDue > 0 ? 'text-white' : 'text-muted-foreground')}>{formatCurrency(client.totalDue)}</p>
            </div>
          </div>

          {/* Payment History - grouped by membership period */}
          {sortedPayments.length > 0 && (
            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-sm font-semibold text-foreground sticky top-0 bg-card py-1 z-10">Payment History</p>
              {sortedJoins.map((join) => {
                const joinPayments = sortedPayments.filter(p =>
                  p.join_id === join.id ||
                  (!p.join_id && (!p.payment_type || p.payment_type === 'membership' || p.payment_type === 'mixed') &&
                    new Date(p.payment_date) >= new Date(join.join_date) &&
                    new Date(p.payment_date) <= new Date(join.expiry_date))
                );
                const productPayments = sortedPayments.filter(p => p.payment_type === 'product' && !p.join_id);
                const allForJoin = join.id === sortedJoins[sortedJoins.length - 1]?.id
                  ? [...joinPayments, ...productPayments.filter(pp => !sortedJoins.some(j => j.id !== join.id && sortedPayments.filter(p => p.join_id === j.id).includes(pp)))]
                  : joinPayments;
                const uniquePayments = [...new Map(allForJoin.map(p => [p.id, p])).values()];
                if (uniquePayments.length === 0) return null;
                const joinPrice = Number(join.custom_price ?? (join.plan?.price || 0));
                const paid = uniquePayments.reduce((s, p) => s + Number(p.amount), 0);
                return (
                  <div key={join.id} className="space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-[11px] font-bold text-foreground">{join.plan?.name || 'Custom Plan'}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(join.join_date)} → {formatDate(join.expiry_date)}</p>
                      </div>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', paid >= joinPrice ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive')}>
                        {paid >= joinPrice ? 'Paid ✓' : `Due ${formatCurrency(joinPrice - paid)}`}
                      </span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {uniquePayments.map((payment) => {
                        const linkedJoin = payment.join_id ? client.joins.find(j => j.id === payment.join_id) : null;
                        const linkedPurchase = payment.product_purchase_id
                          ? client.productPurchases?.find(p => p.id === payment.product_purchase_id) || null : null;
                        const joinFee = linkedJoin ? Number(linkedJoin.custom_price ?? (linkedJoin.plan?.price || 0)) : null;
                        const dueBeforeRaw = payment.due_before != null ? Number(payment.due_before) : null;
                        const dueAfterRaw = payment.due_after != null ? Number(payment.due_after) : null;
                        const isMembershipPayment = !payment.payment_type || payment.payment_type === 'membership' || payment.payment_type === 'mixed';
                        const shouldDeriveDue = isMembershipPayment && joinFee != null && (dueBeforeRaw == null || dueAfterRaw == null || (dueBeforeRaw === 0 && dueAfterRaw === 0 && Number(payment.amount) < joinFee));
                        const resolvedDueBefore = shouldDeriveDue ? joinFee : dueBeforeRaw;
                        const resolvedDueAfter = shouldDeriveDue ? Math.max(0, joinFee - Number(payment.amount)) : dueAfterRaw;
                        return (
                          <div key={payment.id} onClick={() => setEditingPayment(payment)} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{formatCurrency(Number(payment.amount))}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(payment.payment_date)} • {payment.payment_method}
                                {payment.payment_type && payment.payment_type !== 'membership' && <span className="ml-1 text-primary">• {payment.payment_type}</span>}
                              </p>
                              {linkedPurchase && <p className="text-[10px] text-primary mt-0.5">→ {linkedPurchase.product?.name || 'Product'}</p>}
                              {resolvedDueBefore != null && resolvedDueAfter != null && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">Due: {formatCurrency(resolvedDueBefore)} → {formatCurrency(resolvedDueAfter)}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); import('@/lib/receipt').then(({ generateReceipt }) => { generateReceipt({ gymName: appSettings?.gym_contact?.name || 'Aesthetic Gym', gymPhone: appSettings?.gym_contact?.phone || undefined, clientName: client.name, clientPhone: client.phone, payment: { ...payment, join_id: payment.join_id || linkedJoin?.id || null, due_before: resolvedDueBefore ?? payment.due_before, due_after: resolvedDueAfter ?? payment.due_after }, linkedJoin, linkedPurchase, upiId: appSettings?.upi_details?.upi_id || undefined, upiName: appSettings?.upi_details?.name || undefined, relatedPayments: client.payments.filter(p => p.join_id === (payment.join_id || linkedJoin?.id)), }); }); }} className="p-1 rounded hover:bg-primary/10 transition-colors" title="Download Receipt">
                                <FileDown className="h-3.5 w-3.5 text-primary" />
                              </button>
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {/* Ungrouped product payments */}
              {sortedPayments.filter(p => p.payment_type === 'product' && !p.join_id && !sortedJoins.some(j => new Date(p.payment_date) >= new Date(j.join_date) && new Date(p.payment_date) <= new Date(j.expiry_date))).map(payment => (
                <div key={payment.id} onClick={() => setEditingPayment(payment)} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{formatCurrency(Number(payment.amount))}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(payment.payment_date)} • {payment.payment_method} • <span className="text-primary">product</span></p>
                  </div>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Membership History - sorted newest first */}
        {sortedJoins.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Membership History
            </h2>

            <div className="space-y-0 max-h-60 overflow-y-auto">
              {sortedJoins.map((join, index) => {
                const isExpired = new Date(join.expiry_date) < new Date();
                const isCurrent = client.latestJoin?.id === join.id;
                const joinData = joinDuesMap.get(join.id);
                const paidForJoin = joinData?.paid ?? 0;
                const joinDue = joinData?.due ?? 0;
                const joinPayments = client.payments.filter(p => p.join_id === join.id);
                const joinPrice = Number(join.custom_price ?? (join.plan?.price || 0));
                return (
                  <div 
                    key={join.id} 
                    onClick={() => setEditingJoin(join)}
                    className="timeline-item cursor-pointer hover:bg-muted/30 -mx-2 px-2 py-2 rounded-lg transition-colors"
                  >
                    <div className={cn(
                      'timeline-dot',
                      isCurrent && !isExpired ? 'bg-green-500' : isExpired ? 'bg-destructive' : 'bg-muted-foreground'
                    )} />
                    <div className="flex-1 flex items-center justify-between min-w-0 gap-2">
                      <div className="space-y-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {join.plan?.name || 'Custom Plan'}
                          {isCurrent && <span className="text-xs text-primary ml-2">(Current)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(join.join_date)} → {formatDate(join.expiry_date)}
                        </p>
                        {join.custom_price && (
                          <p className="text-xs text-primary">
                            Custom: {formatCurrency(Number(join.custom_price))}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Fee: {formatCurrency(joinPrice)} • Paid {formatCurrency(paidForJoin)}
                          {joinDue > 0 
                            ? <span className="text-destructive ml-1">• Due {formatCurrency(joinDue)}</span>
                            : joinPrice > 0 && <span className="text-green-500 ml-1">• Paid in Full</span>
                          }
                        </p>
                      </div>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Product Purchases - sorted newest first */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Product Purchases
            </h2>
            <button
              onClick={() => setShowProductPurchaseModal(true)}
              className="flex items-center gap-1 text-sm text-primary"
            >
              <Plus className="h-4 w-4" />
              Sell
            </button>
          </div>

          {sortedPurchases.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sortedPurchases.map((purchase) => {
                // Include both directly linked payments AND unlinked product payments
                const linkedPayments = sortedPayments.filter(
                  p => p.product_purchase_id === purchase.id
                );
                const unlinkedProductPayments = sortedPayments.filter(
                  p => p.payment_type === 'product' && !p.product_purchase_id
                );
                const paidLinked = linkedPayments.reduce((s, p) => s + Number(p.amount), 0);
                const paidUnlinked = unlinkedProductPayments.reduce((s, p) => s + Number(p.amount), 0);
                
                // For per-purchase due: use global product dues if only one purchase,
                // otherwise distribute unlinked payments proportionally
                const totalProductPurchases = sortedPurchases.reduce((s, pp) => s + Number(pp.total_price), 0);
                const totalLinkedPayments = sortedPayments
                  .filter(p => p.payment_type === 'product' && p.product_purchase_id)
                  .reduce((s, p) => s + Number(p.amount), 0);
                const purchaseRemainingBeforeUnlinked = Math.max(0, Number(purchase.total_price) - paidLinked);
                const totalRemainingBeforeUnlinked = Math.max(0, totalProductPurchases - totalLinkedPayments);
                
                // Distribute unlinked payments proportionally based on remaining dues
                const unlinkedShare = totalRemainingBeforeUnlinked > 0
                  ? Math.min(purchaseRemainingBeforeUnlinked, paidUnlinked * (purchaseRemainingBeforeUnlinked / totalRemainingBeforeUnlinked))
                  : 0;
                
                const paidForPurchase = paidLinked + unlinkedShare;
                const dueForPurchase = Math.max(0, Number(purchase.total_price) - paidForPurchase);

                return (
                  <div key={purchase.id} className="py-3 border-b border-border last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium text-sm">{purchase.product?.name || 'Product'}</p>
                        {purchase.product?.tags && purchase.product.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {purchase.product.tags.map((tag: string) => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Qty: {purchase.quantity} × {formatCurrency(Number(purchase.unit_price))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(purchase.purchase_date)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="font-medium text-sm">{formatCurrency(Number(purchase.total_price))}</p>
                        {dueForPurchase > 0 ? (
                          <>
                            <p className="text-xs text-destructive">Due: {formatCurrency(dueForPurchase)}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); setClearingPurchase(purchase); }}
                              className="text-[10px] text-primary hover:underline flex items-center gap-0.5 ml-auto"
                            >
                              <CreditCard className="h-3 w-3" /> Pay
                            </button>
                          </>
                        ) : (
                          <p className="text-xs text-green-400">Paid</p>
                        )}
                      </div>
                    </div>
                    {/* Linked payments */}
                    {linkedPayments.length > 0 && (
                      <div className="mt-2 pl-3 border-l-2 border-primary/20 space-y-1">
                        {linkedPayments.map(p => (
                          <p key={p.id} className="text-xs text-muted-foreground">
                            {formatCurrency(Number(p.amount))} paid on {formatDate(p.payment_date)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No purchases yet</p>
          )}

          {client.productDues > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Product Dues</span>
              <span className="text-sm font-semibold text-destructive">{formatCurrency(client.productDues)}</span>
            </div>
          )}
        </div>

        {/* Body Progress Tracking */}
        <BodyProgressSection clientId={client.id} />

        {/* Audit Log (Collapsible) - sorted newest first */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <button
            onClick={() => setShowAuditLog(!showAuditLog)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Activity Log
            </h2>
            <span className="text-xs text-muted-foreground">
              {showAuditLog ? 'Hide' : 'Show'}
            </span>
          </button>

          {showAuditLog && sortedAuditLogs.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pt-2 border-t border-border">
              {sortedAuditLogs.map((log) => (
                <div key={log.id} className="py-2 border-b border-border last:border-0">
                  <p className="text-sm font-medium">{getActionDescription(log.action)}</p>
                  {log.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">{log.reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(log.created_at)} • {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {showAuditLog && sortedAuditLogs.length === 0 && (
            <p className="text-sm text-muted-foreground pt-2 border-t border-border">
              No activity recorded yet.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {(client.totalDue > 0 || client.daysLeft <= 7) && (
            <button
              onClick={handleWhatsAppReminder}
              disabled={isActionLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Send WhatsApp Reminder
            </button>
          )}

          <button
            onClick={async () => {
              const { data } = await supabase.from('clients').select('pin').eq('id', client.id).single();
              const pin = (data as any)?.pin;
              if (!pin) {
                toast({ title: 'No PIN set', description: 'Edit this client to set a portal PIN first.', variant: 'destructive' });
                return;
              }
              const portalUrl = `${window.location.origin}/portal`;
              const message = `Hey ${client.name}! 👋\n\nYou can now view your membership details, payments & body progress online:\n\n🔗 *Portal:* ${portalUrl}\n📱 *Phone:* ${client.phone}\n🔑 *PIN:* ${pin}\n\n_Copy the link above and open it in your browser_\n\nStay strong 💪\n— *Aesthetic Gym*`;
              window.open(getWhatsAppLink(client.phone, message), '_blank');
            }}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share Portal Link
          </button>

          {/* Member Card Download */}
          <MemberCardDownload
            client={{ id: client.id, name: client.name, phone: client.phone, photo_url: client.photo_url }}
            latestJoin={client.latestJoin}
            membershipStatus={client.membershipStatus}
          />

          {(client.membershipStatus === 'EXPIRED' || client.membershipStatus === 'LEFT') && client.totalDue === 0 && (
            <button
              onClick={() => setShowRejoinModal(true)}
              disabled={isActionLoading}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Rejoin
            </button>
          )}

          {/* More actions — collapsed by default */}
          <div className="border-t border-border pt-3 space-y-2">
            <button
              onClick={() => setShowMoreActions(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">More actions</span>
              {showMoreActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showMoreActions && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                {client.status !== 'Left' && client.membershipStatus !== 'LEFT' && (
                  <button
                    onClick={() => setConfirmAction('left')}
                    disabled={isActionLoading}
                    className="btn-ghost w-full flex items-center justify-center gap-2 text-orange-400"
                  >
                    <UserMinus className="h-4 w-4" />
                    Mark as Left
                  </button>
                )}
                <button
                  onClick={() => setConfirmAction('inactive')}
                  disabled={isActionLoading}
                  className={cn('btn-ghost w-full flex items-center justify-center gap-2', client.isInactive ? 'text-green-400' : 'text-orange-400')}
                >
                  <Ban className="h-4 w-4" />
                  {client.isInactive ? 'Reactivate Membership' : 'Disable (Admin)'}
                </button>
                <button
                  onClick={() => setConfirmAction('delete')}
                  disabled={isActionLoading}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Move to Bin
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirmation bottom sheet ── */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="w-full max-w-md bg-card rounded-t-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-muted mx-auto" />

            {confirmAction === 'left' && (
              <>
                <div className="space-y-1">
                  <h3 className="font-bold text-base">Mark as Left?</h3>
                  <p className="text-sm text-muted-foreground">
                    {client.name} will be marked as having left the gym.
                    {client.totalDue > 0 && <span className="text-destructive font-medium"> They still have {formatCurrency(client.totalDue)} in pending dues.</span>}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={async () => { setConfirmAction(null); await handleMarkAsLeft(); }}
                    disabled={isActionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors"
                  >
                    Mark as Left
                  </button>
                </div>
              </>
            )}

            {confirmAction === 'delete' && (
              <>
                <div className="space-y-1">
                  <h3 className="font-bold text-base">Move to Bin?</h3>
                  <p className="text-sm text-muted-foreground">
                    {client.name} will be moved to the bin. You can restore them from Settings → Bin.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={async () => { setConfirmAction(null); await handleDelete(); }}
                    disabled={isActionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm hover:bg-destructive/90 transition-colors"
                  >
                    Move to Bin
                  </button>
                </div>
              </>
            )}

            {confirmAction === 'inactive' && (
              <>
                <div className="space-y-1">
                  <h3 className="font-bold text-base">
                    {client.isInactive ? 'Reactivate membership?' : 'Disable membership?'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {client.isInactive
                      ? `This will reactivate ${client.name}'s membership access.`
                      : `This will block ${client.name} from accessing their membership. You can re-enable it anytime.`}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={async () => { setConfirmAction(null); await handleToggleInactive(); }}
                    disabled={isActionLoading}
                    className={cn('flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors', client.isInactive ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-orange-500 text-white hover:bg-orange-600')}
                  >
                    {client.isInactive ? 'Reactivate' : 'Disable'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <MobileNav />

      <AddPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        clientId={client.id}
        clientName={client.name}
        clientPhone={client.phone}
        dueAmount={client.totalDue}
        membershipDues={client.dueAmount}
        productDues={client.productDues}
        advanceBalance={client.advanceBalance}
        latestJoinId={client.latestJoin?.id}
        planName={client.latestJoin?.plan?.name}
      />

      <AddProductPurchaseModal
        isOpen={showProductPurchaseModal}
        onClose={() => setShowProductPurchaseModal(false)}
        clientId={client.id}
        clientName={client.name}
        advanceBalance={client.advanceBalance}
      />

      {clearingPurchase && (
        <ClearProductDueModal
          isOpen={!!clearingPurchase}
          onClose={() => setClearingPurchase(null)}
          clientId={client.id}
          clientName={client.name}
          purchase={clearingPurchase}
          linkedPayments={[
            ...sortedPayments.filter(p => p.product_purchase_id === clearingPurchase.id),
            ...sortedPayments.filter(p => p.payment_type === 'product' && !p.product_purchase_id),
          ]}
        />
      )}

      <RejoinModal
        isOpen={showRejoinModal}
        onClose={() => setShowRejoinModal(false)}
        clientId={client.id}
        clientName={client.name}
        lastJoin={client.latestJoin}
      />

      <EditClientModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        client={client}
      />

      {editingPayment && (
        <EditPaymentModal
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          payment={editingPayment}
          linkedJoin={editingPayment.join_id ? client.joins.find(j => j.id === editingPayment.join_id) : null}
          linkedPurchase={editingPayment.product_purchase_id ? client.productPurchases?.find(p => p.id === editingPayment.product_purchase_id) : null}
        />
      )}

      {editingJoin && (
        <EditJoinModal
          isOpen={!!editingJoin}
          onClose={() => setEditingJoin(null)}
          join={editingJoin}
          clientId={client.id}
          linkedPayments={client.payments.filter(p => p.join_id === editingJoin.id)}
        />
      )}

      <RenewSubscriptionModal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        clientId={client.id}
        clientName={client.name}
        clientPhone={client.phone}
        currentJoin={client.latestJoin}
      />

      {client.latestJoin && (
        <ExtendMembershipModal
          isOpen={showExtendModal}
          onClose={() => setShowExtendModal(false)}
          clientId={client.id}
          clientName={client.name}
          currentJoin={client.latestJoin}
        />
      )}

      <LinkClientModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        clientId={client.id}
        clientName={client.name}
      />
    </div>
  );
}
