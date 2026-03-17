import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Edit, Receipt, TrendingDown, TrendingUp, RefreshCw,
  Calendar, BarChart3, PieChart as PieChartIcon, Activity, Target, Wallet, Clock, Download
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses, useDeleteExpense, EXPENSE_CATEGORIES, type Expense } from '@/hooks/useExpenses';
import { useClients } from '@/hooks/useClients';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { MobileNav } from '@/components/MobileNav';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Custom Tooltip (same as Dashboard) ──────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-xl">
      <p className="text-[11px] font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
          <div className="h-2 w-2 rounded-full ring-2 ring-offset-1 ring-offset-card" style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}40` }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">
            {typeof p.value === 'number' && p.value >= 100 ? `₹${p.value.toLocaleString('en-IN')}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, subtitle, accent = 'primary' }: {
  icon: any; label: string; value: string | number; subtitle?: React.ReactNode;
  accent?: 'primary' | 'success' | 'destructive' | 'warning';
}) {
  const accentMap = {
    primary: 'from-primary/15 to-primary/5 border-primary/20',
    success: 'from-green-500/15 to-green-500/5 border-green-500/20',
    destructive: 'from-destructive/15 to-destructive/5 border-destructive/20',
    warning: 'from-yellow-500/15 to-yellow-500/5 border-yellow-500/20',
  };
  const iconMap = {
    primary: 'text-primary bg-primary/10',
    success: 'text-green-500 bg-green-500/10',
    destructive: 'text-destructive bg-destructive/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
  };
  return (
    <div className={cn('relative rounded-xl border bg-gradient-to-br p-3.5 overflow-hidden transition-all hover:scale-[1.02]', accentMap[accent])}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
          <p className="text-xl font-extrabold tracking-tight">{value}</p>
          {subtitle && <div className="text-[10px]">{subtitle}</div>}
        </div>
        <div className={cn('rounded-lg p-2 shrink-0', iconMap[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-bold tracking-tight text-foreground">{title}</h3>
    </div>
  );
}

const CHART_COLORS = [
  'hsl(var(--destructive))',
  'hsl(var(--primary))',
  'hsl(210, 70%, 55%)',
  'hsl(45, 80%, 55%)',
  'hsl(140, 60%, 45%)',
  'hsl(280, 60%, 55%)',
  'hsl(20, 80%, 55%)',
  'hsl(0, 0%, 55%)',
];

type ViewTab = 'list' | 'analytics';

export default function Expenses() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: expenses, isLoading } = useExpenses();
  const { data: clients } = useClients();
  const deleteExpense = useDeleteExpense();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewTab, setViewTab] = useState<ViewTab>('list');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  const analytics = useMemo(() => {
    if (!expenses?.length) return { monthly: [], categoryPie: [], thisMonth: 0, lastMonth: 0, recurringTotal: 0, monthlyWithRevenue: [] };

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    let thisMonth = 0;
    let lastMonth = 0;
    let recurringTotal = 0;

    expenses.forEach(e => {
      const d = parseISO(e.expense_date);
      const amt = Number(e.amount);
      if (isWithinInterval(d, { start: thisMonthStart, end: thisMonthEnd })) thisMonth += amt;
      if (isWithinInterval(d, { start: lastMonthStart, end: lastMonthEnd })) lastMonth += amt;
      if (e.is_recurring) recurringTotal += amt;
    });

    // Monthly data (6 months) with revenue comparison
    const monthly: { month: string; expenses: number; revenue: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const exp = expenses
        .filter(e => isWithinInterval(parseISO(e.expense_date), { start: mStart, end: mEnd }))
        .reduce((s, e) => s + Number(e.amount), 0);

      let rev = 0;
      if (clients) {
        for (const c of clients) {
          for (const p of c.payments) {
            if (isWithinInterval(new Date(p.payment_date), { start: mStart, end: mEnd })) {
              rev += Number(p.amount);
            }
          }
        }
      }

      monthly.push({ month: format(m, 'MMM'), expenses: exp, revenue: rev, profit: rev - exp });
    }

    // Category pie
    const catMap: Record<string, number> = {};
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount); });
    const categoryPie = Object.entries(catMap)
      .map(([cat, value]) => ({
        name: EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat,
        value,
        icon: EXPENSE_CATEGORIES.find(c => c.value === cat)?.icon || '📦',
      }))
      .sort((a, b) => b.value - a.value);

    // Recurring vs one-time
    const recurringCount = expenses.filter(e => e.is_recurring).length;
    const oneTimeCount = expenses.filter(e => !e.is_recurring).length;

    return { monthly, categoryPie, thisMonth, lastMonth, recurringTotal, recurringCount, oneTimeCount };
  }, [expenses, clients]);

  if (loading || !user) return null;

  const filtered = filterCategory === 'all'
    ? expenses || []
    : (expenses || []).filter(e => e.category === filterCategory);

  const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

  const categoryTotals = (expenses || []).reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const changePercent = analytics.lastMonth > 0
    ? ((analytics.thisMonth - analytics.lastMonth) / analytics.lastMonth * 100).toFixed(0)
    : null;

  const currentProfit = analytics.monthly.length > 0 ? analytics.monthly[analytics.monthly.length - 1].profit : 0;

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Expenses</h1>
            <p className="text-xs text-muted-foreground">{expenses?.length || 0} records</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!expenses?.length) return;
              const { exportExpenses } = await import('@/lib/export');
              await exportExpenses(expenses);
              toast({ title: 'Exported', description: `${expenses.length} expenses exported to Excel` });
            }}
            className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={() => { setEditExpense(null); setModalOpen(true); }}
            className="p-2.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-5 pb-32">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={TrendingDown}
            label="This Month"
            value={formatCurrency(analytics.thisMonth)}
            accent="destructive"
            subtitle={changePercent ? (
              <div className="flex items-center gap-1">
                {Number(changePercent) > 0 ? <TrendingUp className="h-3 w-3 text-destructive" /> : <TrendingDown className="h-3 w-3 text-green-500" />}
                <span className={cn('font-semibold', Number(changePercent) > 0 ? 'text-destructive' : 'text-green-500')}>
                  {Number(changePercent) > 0 ? '+' : ''}{changePercent}% vs last
                </span>
              </div>
            ) : undefined}
          />
          <KpiCard
            icon={Wallet}
            label="Profit"
            value={`${currentProfit >= 0 ? '+' : ''}${formatCurrency(currentProfit)}`}
            accent={currentProfit >= 0 ? 'success' : 'destructive'}
            subtitle={<span className="text-muted-foreground">Revenue - Expenses</span>}
          />
          <KpiCard
            icon={RefreshCw}
            label="Recurring"
            value={formatCurrency(analytics.recurringTotal)}
            accent="primary"
            subtitle={<span className="text-muted-foreground">{analytics.recurringCount || 0} fixed expenses</span>}
          />
          <KpiCard
            icon={Calendar}
            label="Last Month"
            value={formatCurrency(analytics.lastMonth)}
            accent="warning"
          />
        </div>

        {/* View Tabs */}
        <div className="flex bg-muted rounded-xl p-1">
          {([
            { key: 'list' as ViewTab, label: 'Expenses', icon: Receipt },
            { key: 'analytics' as ViewTab, label: 'Analytics', icon: BarChart3 },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                viewTab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {viewTab === 'analytics' ? (
          <div className="space-y-5">
            {/* Revenue vs Expenses Area Chart */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <SectionHeader title="Revenue vs Expenses" icon={Activity} />
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthly} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="revGradExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} width={45} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--success))" fill="url(#revGradExp)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: 'hsl(var(--card))' }} activeDot={{ r: 5, strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--destructive))" fill="url(#expGrad)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: 'hsl(var(--card))' }} activeDot={{ r: 5, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profit Trend Bar Chart */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <SectionHeader title="Monthly Profit / Loss" icon={Target} />
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  currentProfit >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
                )}>
                  {currentProfit >= 0 ? '↑ Profit' : '↓ Loss'}
                </span>
              </div>

              {/* Month-by-month summary strip */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                {analytics.monthly.map((m) => (
                  <div key={m.month} className={cn(
                    'flex-1 min-w-[52px] rounded-lg p-2 text-center border transition-colors',
                    m.profit >= 0
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-destructive/20 bg-destructive/5'
                  )}>
                    <p className="text-[10px] text-muted-foreground font-medium">{m.month}</p>
                    <p className={cn(
                      'text-[11px] font-bold tabular-nums mt-0.5',
                      m.profit >= 0 ? 'text-green-500' : 'text-destructive'
                    )}>
                      {m.profit >= 0 ? '+' : ''}{m.profit >= 1000 || m.profit <= -1000 ? `₹${(m.profit / 1000).toFixed(1)}k` : `₹${m.profit}`}
                    </p>
                  </div>
                ))}
              </div>

              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthly} barSize={32} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => {
                        const abs = Math.abs(v);
                        if (abs >= 100000) return `${v < 0 ? '-' : ''}₹${(abs / 100000).toFixed(1)}L`;
                        if (abs >= 1000) return `${v < 0 ? '-' : ''}₹${(abs / 1000).toFixed(0)}k`;
                        return `₹${v}`;
                      }}
                      width={50}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const entry = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm px-3.5 py-3 shadow-xl space-y-1.5">
                            <p className="text-xs font-bold text-foreground">{label}</p>
                            <div className="flex items-center gap-2 text-[11px]">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <span className="text-muted-foreground">Revenue:</span>
                              <span className="font-bold">₹{entry.revenue.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <div className="h-2 w-2 rounded-full bg-destructive" />
                              <span className="text-muted-foreground">Expenses:</span>
                              <span className="font-bold">₹{entry.expenses.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="border-t border-border pt-1.5 flex items-center gap-2 text-[11px]">
                              <div className={cn('h-2 w-2 rounded-full', entry.profit >= 0 ? 'bg-green-500' : 'bg-destructive')} />
                              <span className="text-muted-foreground">Profit:</span>
                              <span className={cn('font-bold', entry.profit >= 0 ? 'text-green-500' : 'text-destructive')}>
                                {entry.profit >= 0 ? '+' : ''}₹{entry.profit.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="profit" name="Profit" radius={[8, 8, 2, 2]}>
                      {analytics.monthly.map((entry, i) => (
                        <Cell key={i} fill={entry.profit >= 0 ? 'url(#profitGrad)' : 'url(#lossGrad)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Pie + Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <SectionHeader title="By Category" icon={PieChartIcon} />
                {analytics.categoryPie.length > 0 ? (
                  <>
                    <div className="h-40 flex items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.categoryPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={58}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {analytics.categoryPie.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5">
                      {analytics.categoryPie.map((item, i) => {
                        const pct = totalExpenses > 0 ? Math.round((item.value / totalExpenses) * 100) : 0;
                        return (
                          <div key={item.name} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-offset-1 ring-offset-card" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length], boxShadow: `0 0 8px ${CHART_COLORS[i % CHART_COLORS.length]}30` }} />
                            <span className="text-[11px] flex-1 truncate">{item.icon} {item.name}</span>
                            <span className="text-[10px] text-muted-foreground">{pct}%</span>
                            <span className="text-[11px] font-bold shrink-0">{formatCurrency(item.value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                )}
              </div>

              {/* Recurring vs One-time + Expiry Bars */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <SectionHeader title="Expense Type" icon={RefreshCw} />
                  <div className="space-y-3">
                    {[
                      { label: 'Recurring', count: analytics.recurringCount || 0, accent: 'primary' as const, color: 'bg-primary' },
                      { label: 'One-time', count: analytics.oneTimeCount || 0, accent: 'warning' as const, color: 'bg-yellow-500' },
                    ].map(item => {
                      const total = (analytics.recurringCount || 0) + (analytics.oneTimeCount || 0);
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
                            <span className="text-sm font-bold tabular-nums">{item.count}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted/80 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all duration-500', item.color)}
                              style={{ width: `${total > 0 ? Math.max((item.count / total) * 100, item.count > 0 ? 8 : 0) : 0}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All Time Total */}
                <div className="rounded-xl border border-destructive/20 bg-gradient-to-br from-destructive/10 to-destructive/5 p-4 text-center space-y-1">
                  <TrendingDown className="h-5 w-5 text-destructive mx-auto" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">All-Time Total</p>
                  <p className="text-2xl font-extrabold text-destructive">{formatCurrency(totalExpenses)}</p>
                  <p className="text-[11px] text-muted-foreground">{expenses?.length || 0} expenses tracked</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setFilterCategory('all')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterCategory === 'all' ? 'bg-destructive text-destructive-foreground shadow-sm' : 'bg-muted text-muted-foreground'
                }`}
              >All</button>
              {EXPENSE_CATEGORIES.map((cat) => {
                const count = (expenses || []).filter(e => e.category === cat.value).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setFilterCategory(cat.value)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      filterCategory === cat.value ? 'bg-destructive text-destructive-foreground shadow-sm' : 'bg-muted text-muted-foreground'
                    }`}
                  >{cat.icon} {cat.label}</button>
                );
              })}
            </div>

            {/* Category Grid */}
            {filterCategory === 'all' && Object.keys(categoryTotals).length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATEGORIES.filter(c => categoryTotals[c.value]).map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setFilterCategory(cat.value)}
                    className="rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">{cat.label}</span>
                    </div>
                    <p className="text-sm font-bold mt-0.5">{formatCurrency(categoryTotals[cat.value])}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Expense List */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No expenses yet</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Tap + to add one</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((expense, i) => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                  return (
                    <div
                      key={expense.id}
                      className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className="p-3.5 flex items-start gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted shrink-0 text-lg">
                          {cat?.icon || '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">{expense.title}</p>
                            {expense.is_recurring && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                <RefreshCw className="h-2.5 w-2.5" />
                                {expense.recurring_interval}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded-md">{cat?.label || expense.category}</span>
                            <span className="text-[11px] text-muted-foreground">{format(new Date(expense.expense_date), 'dd MMM yyyy')}</span>
                          </div>
                          {expense.notes && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{expense.notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-destructive">-{formatCurrency(Number(expense.amount))}</p>
                          <div className="flex items-center gap-0.5 mt-1 justify-end">
                            <button onClick={() => { setEditExpense(expense); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => setDeleteTarget(expense)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>This expense record will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteExpense.mutateAsync(deleteTarget.id);
                toast({ title: 'Expense deleted' });
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddExpenseModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditExpense(null); }} editExpense={editExpense} />
      <MobileNav />
    </div>
  );
}
