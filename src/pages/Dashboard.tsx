import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  Plus,
  Grid,
  List,
  LogOut,
  Dumbbell,
  BarChart3,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Receipt,
  RefreshCw,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { useClients, ClientWithMembership } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useExpenses, EXPENSE_CATEGORIES } from '@/hooks/useExpenses';
import { StatCard, RevenueCard } from '@/components/StatCard';
import { ClientCard } from '@/components/ClientCard';
import { NotificationCenter } from '@/components/NotificationCenter';
import { ClientListItem } from '@/components/ClientListItem';
import { FilterTabs } from '@/components/FilterTabs';
import { AddClientModal } from '@/components/AddClientModal';
import { AddPaymentModal } from '@/components/AddPaymentModal';
import { RenewSubscriptionModal } from '@/components/RenewSubscriptionModal';
import { MobileNav } from '@/components/MobileNav';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { DashboardCharts } from '@/components/DashboardCharts';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FilterType, ViewMode } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { SortOption, sortItems, SORT_OPTIONS } from '@/lib/sorting';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { ArrowUpDown, Shield } from 'lucide-react';


export default function Dashboard() {
  const { data: clients, isLoading, refetch } = useClients();
  const { signOut, role } = useAuth();
  const { data: hostingSub } = useSubscription();
  const { data: appSettings } = useAppSettings();
  const { data: expenses } = useExpenses();
  const expenseEnabled = appSettings?.expense_tracker_enabled?.enabled ?? false;
  const navigate = useNavigate();

  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [showAddModal, setShowAddModal] = useState(false);
  const [quickPayClient, setQuickPayClient] = useState<ClientWithMembership | null>(null);
  const [quickRenewClient, setQuickRenewClient] = useState<ClientWithMembership | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showCharts, setShowCharts] = useState(() => {
    const saved = localStorage.getItem('dashboard-show-charts');
    return saved !== null ? saved === 'true' : false;
  });

  const toggleCharts = (value: boolean) => {
    setShowCharts(value);
    localStorage.setItem('dashboard-show-charts', String(value));
  };

  const stats = useMemo(() => {
    if (!clients) return null;

    const activeClients = clients.filter((c) => c.status !== 'Deleted');
    const active = activeClients.filter((c) => c.membershipStatus === 'ACTIVE');
    const expired = activeClients.filter((c) => c.membershipStatus === 'EXPIRED');
    const paymentDue = activeClients.filter((c) => c.membershipStatus === 'PAYMENT_DUE');
    const left = activeClients.filter((c) => c.status === 'Left' || c.membershipStatus === 'INACTIVE');
    const deleted = clients.filter((c) => c.status === 'Deleted');
    const paid = activeClients.filter((c) => c.paymentStatus === 'Paid');
    const due = activeClients.filter((c) => c.paymentStatus === 'Due');
    const partial = activeClients.filter((c) => c.paymentStatus === 'Partial');

    const totalRevenue = activeClients.reduce((sum, c) => {
      const allPaid = c.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
      return sum + allPaid;
    }, 0);
    const totalDues = activeClients.reduce((sum, c) => sum + c.totalDue, 0);

    const expiringSoon = activeClients.filter((c) => c.daysLeft >= 0 && c.daysLeft <= 7 && c.membershipStatus === 'ACTIVE');

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const thisMonthRevenue = activeClients.reduce((sum, c) => {
      return sum + c.payments
        .filter((p: any) => isWithinInterval(new Date(p.payment_date), { start: thisMonthStart, end: thisMonthEnd }))
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
    }, 0);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastMonthRevenue = activeClients.reduce((sum, c) => {
      return sum + c.payments
        .filter((p: any) => isWithinInterval(new Date(p.payment_date), { start: lastMonthStart, end: lastMonthEnd }))
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
    }, 0);
    const revenueChange = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

    // Sparklines: last 6 months per metric
    const sparklines: Record<string, number[]> = { total: [], active: [], due: [], paid: [], expired: [], expiringSoon: [] };
    for (let i = 5; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i));
      const mEnd = endOfMonth(subMonths(now, i));
      const snap = activeClients;
      sparklines.total.push(snap.filter(c => new Date(c.created_at) <= mEnd).length);
      sparklines.active.push(snap.filter(c => c.membershipStatus === 'ACTIVE' && new Date(c.created_at) <= mEnd).length);
      sparklines.due.push(snap.filter(c => c.paymentStatus === 'Due' && new Date(c.created_at) <= mEnd).length);
      sparklines.paid.push(snap.filter(c => c.paymentStatus === 'Paid' && new Date(c.created_at) <= mEnd).length);
      sparklines.expired.push(snap.filter(c => c.membershipStatus === 'EXPIRED' && new Date(c.created_at) <= mEnd).length);
      sparklines.expiringSoon.push(snap.filter(c => c.daysLeft >= 0 && c.daysLeft <= 7 && c.membershipStatus === 'ACTIVE').length);
    }

    return {
      total: activeClients.length,
      active: active.length,
      expired: expired.length,
      paymentDue: paymentDue.length,
      left: left.length,
      deleted: deleted.length,
      paid: paid.length,
      due: due.length,
      partial: partial.length,
      revenue: totalRevenue,
      pendingDues: totalDues,
      expiringSoon: expiringSoon.length,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueChange,
      sparklines,
    };
  }, [clients]);

  const filterCounts = useMemo<Record<FilterType, number>>(() => {
    if (!clients) {
      return { all: 0, paid: 0, due: 0, partial: 0, active: 0, expired: 0, left: 0, deleted: 0, inactive: 0, payment_due: 0, expiring_soon: 0 };
    }

    const activeClients = clients.filter((c) => c.status !== 'Deleted');

    return {
      all: activeClients.length,
      paid: activeClients.filter((c) => c.paymentStatus === 'Paid').length,
      due: activeClients.filter((c) => c.paymentStatus === 'Due').length,
      partial: activeClients.filter((c) => c.paymentStatus === 'Partial').length,
      active: activeClients.filter((c) => c.membershipStatus === 'ACTIVE').length,
      expired: activeClients.filter((c) => c.membershipStatus === 'EXPIRED').length,
      left: activeClients.filter((c) => c.membershipStatus === 'LEFT').length,
      deleted: clients.filter((c) => c.status === 'Deleted').length,
      inactive: activeClients.filter((c) => c.membershipStatus === 'INACTIVE').length,
      payment_due: activeClients.filter((c) => c.membershipStatus === 'PAYMENT_DUE').length,
      expiring_soon: activeClients.filter((c) => c.daysLeft >= 0 && c.daysLeft <= 7 && c.membershipStatus === 'ACTIVE').length,
    };
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!clients) return [];

    let result: ClientWithMembership[] = clients.filter((c) => c.status !== 'Deleted');

    // Apply filter
    switch (filter) {
      case 'paid':
        result = result.filter((c) => c.paymentStatus === 'Paid');
        break;
      case 'due':
        result = result.filter((c) => c.paymentStatus === 'Due');
        break;
      case 'partial':
        result = result.filter((c) => c.paymentStatus === 'Partial');
        break;
      case 'active':
        result = result.filter((c) => c.membershipStatus === 'ACTIVE');
        break;
      case 'expired':
        result = result.filter((c) => c.membershipStatus === 'EXPIRED');
        break;
      case 'left':
        result = result.filter((c) => c.membershipStatus === 'LEFT');
        break;
      case 'inactive':
        result = result.filter((c) => c.membershipStatus === 'INACTIVE');
        break;
      case 'payment_due':
        result = result.filter((c) => c.membershipStatus === 'PAYMENT_DUE');
        break;
      case 'expiring_soon':
        result = result.filter((c) => c.daysLeft >= 0 && c.daysLeft <= 7 && c.membershipStatus === 'ACTIVE');
        break;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          (c.alias_name && c.alias_name.toLowerCase().includes(query))
      );
    }

    return sortItems(
      result,
      sortBy,
      (c) => c.name,
      (c) => c.created_at,
      (c) => c.latestJoin?.expiry_date || ''
    );
  }, [clients, filter, searchQuery, sortBy]);

  const handleStatClick = (newFilter: FilterType) => {
    setFilter(newFilter);
    navigate('/clients', { state: { filter: newFilter } });
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">Aesthetic Gym</h1>
            <p className="text-xs text-muted-foreground truncate">
              {stats
                ? `${stats.active} active · ${stats.due > 0 ? `${stats.due} due` : 'all paid ✓'}${stats.expiringSoon > 0 ? ` · ${stats.expiringSoon} expiring` : ''}`
                : 'Dashboard'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {role !== 'moderator' && clients && <NotificationCenter clients={clients} />}
          {role === 'moderator' && (
            <button onClick={() => navigate('/moderator')} className="p-2 rounded-lg hover:bg-muted text-primary" title="Moderator Panel">
              <Shield className="h-5 w-5" />
            </button>
          )}
          <ThemeToggle />
          <button
            onClick={async () => { await signOut(); window.location.href = '/website'; }}
            className="p-2 rounded-lg hover:bg-muted"
            title="Sign out"
          >
            <LogOut className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="p-4 pt-2 space-y-4">
        {role !== 'moderator' && hostingSub && (() => {
          const daysLeft = differenceInDays(new Date(hostingSub.expiry_date), new Date());
          const isExpired = hostingSub.status === 'expired' || hostingSub.status === 'locked';
          const isExpiringSoon = hostingSub.status === 'active' && daysLeft <= 10;
          const isUrgent = isExpired || (hostingSub.status === 'active' && daysLeft <= 3);

          return (
            <>
              {isExpiringSoon && !isUrgent && (
                <div className="mb-4 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">
                      Hosting expires in {daysLeft} days
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const modal = document.getElementById('urgent-sub-modal');
                      if (modal) modal.style.display = 'flex';
                    }}
                    className="text-[10px] font-black text-orange-500 underline uppercase tracking-widest"
                  >
                    Renew
                  </button>
                </div>
              )}

              {(isUrgent || (isExpiringSoon && !isUrgent)) && (
                <div
                  id="urgent-sub-modal"
                  className={cn(
                    "fixed inset-0 z-[60] flex items-center justify-center p-6 bg-background/60 backdrop-blur-md",
                    !isUrgent && "hidden"
                  )}
                >
                  <div className="w-full max-w-sm relative">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-bounce">
                      Action Required
                    </div>
                    <SubscriptionCard subscription={hostingSub} />
                    {!isExpired && (
                      <button
                        onClick={(e) => {
                          const el = e.currentTarget.parentElement?.parentElement;
                          if (el) el.style.display = 'none';
                        }}
                        className="mt-4 w-full text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                      >
                        Continue to Dashboard
                      </button>
                    )}
                    {isExpired && (
                      <p className="mt-4 text-center text-[10px] font-bold text-destructive uppercase tracking-widest animate-pulse">
                        Access Restricted: Subscription Expired
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          );
        })()}
        {/* Today Priority Panel */}
        {clients && (() => {
          const activeClients = clients.filter(c => c.status !== 'Deleted');
          const expiringToday = activeClients.filter(c => c.daysLeft === 0 && c.membershipStatus === 'ACTIVE');
          const expiringSoon = activeClients.filter(c => c.daysLeft > 0 && c.daysLeft <= 3 && c.membershipStatus === 'ACTIVE');
          const bigDues = activeClients.filter(c => c.totalDue >= 1000);
          const now = new Date();
          const anniversaries = activeClients.filter(c => {
            if (!c.joins?.length) return false;
            const first = [...c.joins].sort((a, b) => new Date(a.join_date).getTime() - new Date(b.join_date).getTime())[0];
            if (!first?.join_date) return false;
            const d = new Date(first.join_date);
            return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() < now.getFullYear();
          });
          const total = expiringToday.length + expiringSoon.length + bigDues.length + anniversaries.length;
          if (total === 0) return null;
          const dismissed = localStorage.getItem(`today-panel-${now.toISOString().slice(0, 10)}`);
          if (dismissed) return null;
          return (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Today's priority
                </span>
                <button
                  onClick={() => { localStorage.setItem(`today-panel-${now.toISOString().slice(0, 10)}`, '1'); window.location.reload(); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {expiringToday.map(c => (
                  <button key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-[10px] font-semibold hover:bg-destructive/20 transition-colors">
                    🔴 {c.name.split(' ')[0]} — expires today
                  </button>
                ))}
                {expiringSoon.map(c => (
                  <button key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold hover:bg-amber-500/20 transition-colors">
                    ⚠️ {c.name.split(' ')[0]} — {c.daysLeft}d left
                  </button>
                ))}
                {bigDues.map(c => (
                  <button key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-semibold hover:bg-orange-500/20 transition-colors">
                    💰 {c.name.split(' ')[0]} — ₹{c.totalDue.toLocaleString('en-IN')} due
                  </button>
                ))}
                {anniversaries.map(c => (
                  <button key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors">
                    🎉 {c.name.split(' ')[0]} — membership anniversary!
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard title="Total" value={stats?.total || 0} icon={Users} onClick={() => handleStatClick('all')} index={0} sparkline={stats?.sparklines.total} />
          <StatCard title="Active" value={stats?.active || 0} icon={UserCheck} variant="success" onClick={() => handleStatClick('active')} index={1} sparkline={stats?.sparklines.active} />
          <StatCard title="Due" value={stats?.due || 0} icon={AlertCircle} variant="danger" onClick={() => handleStatClick('due')} index={2} sparkline={stats?.sparklines.due} />
          <StatCard title="Paid" value={stats?.paid || 0} icon={CheckCircle} variant="success" onClick={() => handleStatClick('paid')} index={3} sparkline={stats?.sparklines.paid} />
          <StatCard title="Expired" value={stats?.expired || 0} icon={Clock} variant="warning" onClick={() => handleStatClick('expired')} index={4} sparkline={stats?.sparklines.expired} />
          <StatCard title="Expiring" value={stats?.expiringSoon || 0} icon={AlertTriangle} variant="warning" onClick={() => handleStatClick('expiring_soon')} index={5} sparkline={stats?.sparklines.expiringSoon} />
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-2 gap-3">
          <RevenueCard
            title="Revenue"
            value={formatCurrency(stats?.revenue || 0)}
            icon={IndianRupee}
            variant="success"
            index={6}
            delta={stats?.revenueChange ?? null}
            deltaAmount={stats !== null ? (stats.thisMonthRevenue - (stats.lastMonthRevenue ?? 0)) : null}
          />
          <RevenueCard
            title="Pending"
            value={formatCurrency(stats?.pendingDues || 0)}
            icon={IndianRupee}
            variant="danger"
            index={7}
          />
        </div>

        {/* Analytics — mini summary + toggle */}
        <button
          onClick={() => toggleCharts(!showCharts)}
          className="w-full text-left rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors overflow-hidden"
        >
          {/* Header row */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-primary" />
              Analytics
            </span>
            {showCharts ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>

          {/* Mini summary strip — always visible */}
          <div className="grid grid-cols-3 divide-x divide-border/60 px-0">
            <div className="flex flex-col items-center py-2.5 px-2 gap-0.5">
              <span className="text-[11px] text-muted-foreground">This month</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {formatCurrency(stats?.thisMonthRevenue || 0)}
              </span>
              {stats?.revenueChange !== null && stats?.revenueChange !== undefined && (
                <span className={cn(
                  'text-[10px] font-semibold flex items-center gap-0.5',
                  stats.revenueChange >= 0 ? 'text-emerald-500' : 'text-destructive'
                )}>
                  {stats.revenueChange >= 0 ? <TrendingDown className="h-2.5 w-2.5 rotate-180" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(stats.revenueChange)}% vs last
                </span>
              )}
            </div>
            <div className="flex flex-col items-center py-2.5 px-2 gap-0.5">
              <span className="text-[11px] text-muted-foreground">Due renewals</span>
              <span className={cn('text-sm font-bold tabular-nums', (stats?.paymentDue || 0) > 0 ? 'text-amber-500' : 'text-foreground')}>
                {stats?.paymentDue || 0}
              </span>
              <span className="text-[10px] text-muted-foreground">members</span>
            </div>
            <div className="flex flex-col items-center py-2.5 px-2 gap-0.5">
              <span className="text-[11px] text-muted-foreground">Expiring</span>
              <span className={cn('text-sm font-bold tabular-nums', (stats?.expiringSoon || 0) > 0 ? 'text-amber-500' : 'text-foreground')}>
                {stats?.expiringSoon || 0}
              </span>
              <span className="text-[10px] text-muted-foreground">in 7 days</span>
            </div>
          </div>
        </button>

        {showCharts && (
          <div className="space-y-4">
            {/* Expense Widget inside Analytics */}
            {expenseEnabled && expenses && expenses.length > 0 && (() => {
              const now = new Date();
              const thisMonthStart = startOfMonth(now);
              const thisMonthEnd = endOfMonth(now);
              const lastMonthStart = startOfMonth(subMonths(now, 1));
              const lastMonthEnd = endOfMonth(subMonths(now, 1));

              const thisMonthExpense = expenses
                .filter(e => isWithinInterval(parseISO(e.expense_date), { start: thisMonthStart, end: thisMonthEnd }))
                .reduce((s, e) => s + Number(e.amount), 0);
              const lastMonthExpense = expenses
                .filter(e => isWithinInterval(parseISO(e.expense_date), { start: lastMonthStart, end: lastMonthEnd }))
                .reduce((s, e) => s + Number(e.amount), 0);
              const recurringTotal = expenses
                .filter(e => e.is_recurring && isWithinInterval(parseISO(e.expense_date), { start: thisMonthStart, end: thisMonthEnd }))
                .reduce((s, e) => s + Number(e.amount), 0);

              const changePct = lastMonthExpense > 0
                ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense * 100).toFixed(0)
                : null;

              const catMap: Record<string, number> = {};
              expenses
                .filter(e => isWithinInterval(parseISO(e.expense_date), { start: thisMonthStart, end: thisMonthEnd }))
                .forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount); });
              const topCats = Object.entries(catMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([cat, amt]) => ({
                  cat, amt,
                  icon: EXPENSE_CATEGORIES.find(c => c.value === cat)?.icon || '📦',
                  label: EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat,
                }));

              const thisMonthRevenue = clients?.reduce((sum, c) => {
                return sum + c.payments
                  .filter((p: any) => isWithinInterval(new Date(p.payment_date), { start: thisMonthStart, end: thisMonthEnd }))
                  .reduce((s: number, p: any) => s + Number(p.amount), 0);
              }, 0) || 0;
              const profit = thisMonthRevenue - thisMonthExpense;

              return (
                <div
                  onClick={() => navigate('/expenses')}
                  className="rounded-xl border border-destructive/20 bg-gradient-to-br from-destructive/5 to-card p-4 space-y-3 cursor-pointer hover:border-destructive/40 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-destructive/10">
                        <Receipt className="h-4 w-4 text-destructive" />
                      </div>
                      <span className="text-sm font-semibold">Expenses</span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 bg-muted rounded-full">This Month</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Spent</p>
                      <p className="text-base font-bold text-destructive">{formatCurrency(thisMonthExpense)}</p>
                      {changePct && (
                        <p className={`text-[10px] font-semibold ${Number(changePct) > 0 ? 'text-destructive' : 'text-green-500'}`}>
                          {Number(changePct) > 0 ? '↑' : '↓'} {Math.abs(Number(changePct))}%
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Recurring</p>
                      <p className="text-sm font-bold">{formatCurrency(recurringTotal)}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <RefreshCw className="h-2.5 w-2.5 text-primary" />
                        <span className="text-[10px] text-primary font-medium">Fixed</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Profit</p>
                      <p className={`text-sm font-bold ${profit >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Rev - Exp</p>
                    </div>
                  </div>

                  {topCats.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {topCats.map(({ cat, amt, icon, label }) => (
                        <div key={cat} className="flex-1 rounded-lg bg-muted/50 p-2 text-center">
                          <span className="text-sm">{icon}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                          <p className="text-[11px] font-bold">{formatCurrency(amt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {clients && <DashboardCharts clients={clients} onFilterClick={(f) => { setFilter(f as any); navigate('/clients', { state: { filter: f } }); }} />}
          </div>
        )}

        {/* Search, View Toggle & Filters */}
        <div className="relative overflow-hidden -mx-4 px-4 pb-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="flex rounded-lg bg-muted/60 p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'card' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              <div className="flex rounded-lg bg-muted/60 p-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold text-muted-foreground hover:text-primary transition-all duration-200">
                      <ArrowUpDown className="h-4 w-4" />
                      <span>Sort</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl min-w-[160px]">
                    {SORT_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.key}
                        onClick={() => setSortBy(opt.key)}
                        className={cn(
                          'text-xs py-2 cursor-pointer gap-2',
                          sortBy === opt.key && 'bg-accent font-semibold'
                        )}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <FilterTabs
            activeFilter={filter}
            onFilterChange={setFilter}
            counts={filterCounts}
          />
        </div>

        {/* Clients List */}
        {viewMode === 'card' ? (
          <div className="space-y-2.5">
            {filteredClients.map((client) => (
              <div key={client.id} className="relative">
                <ClientCard
                  client={client}
                  onAddPayment={setQuickPayClient}
                  onRenew={setQuickRenewClient}
                  searchQuery={searchQuery}
                />
                {/* Inline collect button when Due filter active */}
                {filter === 'due' && client.totalDue > 0 && (
                  <button
                    onClick={() => setQuickPayClient(client)}
                    className="absolute top-3 right-10 z-10 flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive text-destructive-foreground text-[10px] font-bold shadow-sm hover:bg-destructive/90 transition-colors"
                  >
                    <IndianRupee className="h-3 w-3" />
                    Collect
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-xs text-muted-foreground uppercase">
                  <th className="py-3 px-2">Client</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Plan</th>
                  <th className="py-3 px-2">Expiry</th>
                  <th className="py-3 px-2">Paid</th>
                  <th className="py-3 px-2">Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <ClientListItem key={client.id} client={client} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredClients.length === 0 && (() => {
          const emptyStates: Record<string, { icon: string; title: string; desc: string; positive?: boolean }> = {
            active:        { icon: '🎉', title: 'No active members', desc: 'Add your first client to get started.', positive: false },
            expired:       { icon: '✅', title: 'No expired memberships', desc: 'All members are current — great work!', positive: true },
            due:           { icon: '🎊', title: 'All payments collected!', desc: 'No outstanding dues right now.', positive: true },
            paid:          { icon: '💳', title: 'No fully paid members', desc: 'Collect payments to see them here.' },
            partial:       { icon: '📋', title: 'No partial payments', desc: 'Members are either fully paid or have dues.' },
            expiring_soon: { icon: '🟢', title: 'No one expiring this week', desc: "You're in the clear for the next 7 days.", positive: true },
            left:          { icon: '🏠', title: 'No members have left', desc: 'Great retention — keep it up!', positive: true },
            payment_due:   { icon: '✅', title: 'No pending memberships', desc: 'All due payments have been sorted.', positive: true },
            all:           { icon: '👥', title: 'No clients yet', desc: 'Add your first member to get started.' },
          };
          const state = emptyStates[filter] || emptyStates.all;
          return (
            <div className={cn('text-center py-12 rounded-2xl border', state.positive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/30 border-border')}>
              <div className="text-4xl mb-3">{state.icon}</div>
              <p className={cn('font-semibold text-sm', state.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>{state.title}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">{state.desc}</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mt-3 text-xs text-primary font-semibold hover:underline">
                  Clear search
                </button>
              )}
              {filter !== 'all' && !searchQuery && (
                <button onClick={() => setFilter('all')} className="mt-3 text-xs text-primary font-semibold hover:underline">
                  Show all members
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* FAB */}
      <motion.button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
        whileTap={{ scale: 0.9 }}
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      <MobileNav />
      <AddClientModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Quick Pay modal from swipe */}
      {quickPayClient && (
        <AddPaymentModal
          isOpen={true}
          onClose={() => setQuickPayClient(null)}
          clientId={quickPayClient.id}
          clientName={quickPayClient.name}
          membershipDues={quickPayClient.dueAmount}
          productDues={quickPayClient.productDues}
          latestJoinId={quickPayClient.latestJoin?.id}
        />
      )}

      {/* Quick Renew modal from swipe */}
      {quickRenewClient && (
        <RenewSubscriptionModal
          isOpen={true}
          onClose={() => setQuickRenewClient(null)}
          clientId={quickRenewClient.id}
          clientName={quickRenewClient.name}
          clientPhone={quickRenewClient.phone}
          currentJoin={quickRenewClient.latestJoin}
        />
      )}
    </div>
  );
}
