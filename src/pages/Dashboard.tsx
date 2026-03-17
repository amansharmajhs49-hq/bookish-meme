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
} from 'lucide-react';
import { useClients, ClientWithMembership } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useExpenses, EXPENSE_CATEGORIES } from '@/hooks/useExpenses';
import { StatCard, RevenueCard } from '@/components/StatCard';
import { ClientCard } from '@/components/ClientCard';
import { ClientListItem } from '@/components/ClientListItem';
import { FilterTabs } from '@/components/FilterTabs';
import { AddClientModal } from '@/components/AddClientModal';
import { MobileNav } from '@/components/MobileNav';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { DashboardCharts } from '@/components/DashboardCharts';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FilterType, ViewMode } from '@/lib/types';
import { PullToRefresh } from '@/components/PullToRefresh';
import { formatCurrency, cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';


export default function Dashboard() {
  const { data: clients, isLoading, refetch } = useClients();
  const { signOut } = useAuth();
  const { data: appSettings } = useAppSettings();
  const { data: expenses } = useExpenses();
  const expenseEnabled = appSettings?.expense_tracker_enabled?.enabled ?? false;
  const navigate = useNavigate();

  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
          c.phone.includes(query)
      );
    }

    return result;
  }, [clients, filter, searchQuery]);

  const handleStatClick = (newFilter: FilterType) => {
    setFilter(newFilter);
    navigate('/clients', { state: { filter: newFilter } });
  };

  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Aesthetic Gym</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={async () => { await signOut(); window.location.href = '/website'; }} className="p-2 rounded-lg hover:bg-muted">
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            title="Total"
            value={stats?.total || 0}
            icon={Users}
            onClick={() => handleStatClick('all')}
            index={0}
          />
          <StatCard
            title="Active"
            value={stats?.active || 0}
            icon={UserCheck}
            variant="success"
            onClick={() => handleStatClick('active')}
            index={1}
          />
          <StatCard
            title="Due"
            value={stats?.due || 0}
            icon={AlertCircle}
            variant="danger"
            onClick={() => handleStatClick('due')}
            index={2}
          />
          <StatCard
            title="Paid"
            value={stats?.paid || 0}
            icon={CheckCircle}
            variant="success"
            onClick={() => handleStatClick('paid')}
            index={3}
          />
          <StatCard
            title="Expired"
            value={stats?.expired || 0}
            icon={Clock}
            variant="warning"
            onClick={() => handleStatClick('expired')}
            index={4}
          />
          <StatCard
            title="Left"
            value={stats?.left || 0}
            icon={UserX}
            onClick={() => handleStatClick('left')}
            index={5}
          />
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-2 gap-3">
          <RevenueCard
            title="Revenue"
            value={formatCurrency(stats?.revenue || 0)}
            icon={IndianRupee}
            variant="success"
            index={6}
          />
          <RevenueCard
            title="Pending"
            value={formatCurrency(stats?.pendingDues || 0)}
            icon={IndianRupee}
            variant="danger"
            index={7}
          />
        </div>

        {/* Analytics Toggle */}
        <button
          onClick={() => toggleCharts(!showCharts)}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" />
            Analytics
          </span>
          {showCharts ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
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

            {clients && <DashboardCharts clients={clients} />}
          </div>
        )}

        {/* Search & View Toggle */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark flex-1"
          />
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <FilterTabs
          activeFilter={filter}
          onFilterChange={setFilter}
          counts={filterCounts}
        />

        {/* Clients List */}
        {viewMode === 'card' ? (
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <ClientCard key={client.id} client={client} />
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

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No clients found</p>
          </div>
        )}
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
    </PullToRefresh>
  );
}
