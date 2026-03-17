import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, differenceInDays, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Users, Calendar, IndianRupee, ShoppingBag, Activity, Target, Wallet, Clock } from 'lucide-react';
import { ClientWithMembership } from '@/hooks/useClients';
import { formatCurrency, cn } from '@/lib/utils';

interface DashboardChartsProps {
  clients: ClientWithMembership[];
}

// ── Custom Tooltip ──────────────────────────────────────
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
            {typeof p.value === 'number' && p.value >= 100 ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, subtitle, accent = 'primary' }: {
  icon: any;
  label: string;
  value: string | number;
  subtitle?: React.ReactNode;
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
    <div className={cn(
      'relative rounded-xl border bg-gradient-to-br p-3.5 overflow-hidden transition-all hover:scale-[1.02]',
      accentMap[accent]
    )}>
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

// ── Section Header ──────────────────────────────────────
function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-bold tracking-tight text-foreground">{title}</h3>
    </div>
  );
}

export function DashboardCharts({ clients }: DashboardChartsProps) {
  // ── Revenue + Dues by month (last 6 months) ────────────
  const revenueData = useMemo(() => {
    const months: { month: string; revenue: number; dues: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const label = format(date, 'MMM');

      let revenue = 0;
      let dues = 0;
      for (const c of clients) {
        for (const p of c.payments) {
          const pd = new Date(p.payment_date);
          if (isWithinInterval(pd, { start, end })) {
            revenue += Number(p.amount);
          }
        }
        for (const j of c.joins) {
          const jd = new Date(j.created_at);
          if (isWithinInterval(jd, { start, end })) {
            const fee = Number(j.custom_price ?? (j.plan?.price || 0));
            const paid = c.payments
              .filter(p => p.join_id === j.id)
              .reduce((s, p) => s + Number(p.amount), 0);
            dues += Math.max(0, fee - paid);
          }
        }
      }
      months.push({ month: label, revenue, dues });
    }
    return months;
  }, [clients]);

  // ── Summary KPIs ──────────────────────────────────────
  const kpis = useMemo(() => {
    const currentMonth = revenueData[revenueData.length - 1];
    const prevMonth = revenueData[revenueData.length - 2];
    const revChange = prevMonth?.revenue
      ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
      : 0;

    const activeClients = clients.filter(c => c.status !== 'Deleted');
    const totalRevenue = activeClients.reduce((s, c) => s + c.paidAmount, 0);
    const productRevenue = activeClients.reduce((s, c) => {
      const productPaid = c.payments
        .filter(p => p.payment_type === 'product')
        .reduce((ps, p) => ps + Number(p.amount), 0);
      return s + productPaid;
    }, 0);
    const avgRevenuePerClient = activeClients.length > 0 ? Math.round(totalRevenue / activeClients.length) : 0;

    return { revChange, totalRevenue, productRevenue, avgRevenuePerClient, currentMonthRev: currentMonth.revenue };
  }, [clients, revenueData]);

  // ── Membership growth ─────────────────────────────────
  const growthData = useMemo(() => {
    const months: { month: string; newMembers: number; renewals: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const label = format(date, 'MMM');

      let newMembers = 0;
      let renewals = 0;
      for (const c of clients) {
        const joinsInMonth = c.joins.filter(j =>
          isWithinInterval(new Date(j.created_at), { start, end })
        );
        if (joinsInMonth.length > 0) {
          const clientFirstJoin = [...c.joins].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0];
          for (const j of joinsInMonth) {
            if (j.id === clientFirstJoin?.id) newMembers++;
            else renewals++;
          }
        }
      }
      months.push({ month: label, newMembers, renewals });
    }
    return months;
  }, [clients]);

  // ── Expiry forecast ───────────────────────────────────
  const expiryForecast = useMemo(() => {
    const buckets = [
      { label: 'This Week', range: [0, 7], count: 0, accent: 'destructive' as const },
      { label: 'Week 2', range: [8, 14], count: 0, accent: 'warning' as const },
      { label: 'Week 3', range: [15, 21], count: 0, accent: 'primary' as const },
      { label: 'Week 4', range: [22, 30], count: 0, accent: 'muted' as const },
    ];
    const now = new Date();
    for (const c of clients) {
      if (!c.latestJoin || c.status === 'Deleted') continue;
      const daysLeft = differenceInDays(parseISO(c.latestJoin.expiry_date), now);
      for (const b of buckets) {
        if (daysLeft >= b.range[0] && daysLeft <= b.range[1]) {
          b.count++;
          break;
        }
      }
    }
    return buckets;
  }, [clients]);

  // ── Status distribution ───────────────────────────────
  const statusDistribution = useMemo(() => {
    const active = clients.filter(c => c.membershipStatus === 'ACTIVE' && c.status !== 'Deleted').length;
    const paymentDue = clients.filter(c => c.membershipStatus === 'PAYMENT_DUE' && c.status !== 'Deleted').length;
    const expired = clients.filter(c => c.membershipStatus === 'EXPIRED' && c.status !== 'Deleted').length;
    const inactive = clients.filter(c => (c.membershipStatus === 'INACTIVE' || c.membershipStatus === 'LEFT') && c.status !== 'Deleted').length;
    return [
      { name: 'Active', value: active, color: 'hsl(var(--success))' },
      { name: 'Due', value: paymentDue, color: 'hsl(var(--warning))' },
      { name: 'Expired', value: expired, color: 'hsl(var(--destructive))' },
      { name: 'Inactive', value: inactive, color: 'hsl(var(--muted-foreground))' },
    ].filter(d => d.value > 0);
  }, [clients]);

  // ── Plan popularity ───────────────────────────────────
  const planPopularity = useMemo(() => {
    const planMap = new Map<string, number>();
    for (const c of clients) {
      if (c.status === 'Deleted') continue;
      for (const j of c.joins) {
        const name = j.plan?.name || 'Custom';
        planMap.set(name, (planMap.get(name) || 0) + 1);
      }
    }
    return Array.from(planMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [clients]);

  // ── Payment method split ──────────────────────────────
  const paymentMethodData = useMemo(() => {
    let cash = 0;
    let online = 0;
    for (const c of clients) {
      for (const p of c.payments) {
        if (p.payment_method === 'cash') cash += Number(p.amount);
        else online += Number(p.amount);
      }
    }
    return [
      { name: 'Cash', value: cash, color: 'hsl(var(--primary))' },
      { name: 'Online', value: online, color: 'hsl(var(--accent))' },
    ].filter(d => d.value > 0);
  }, [clients]);

  const totalExpiring = expiryForecast.reduce((s, b) => s + b.count, 0);
  const totalStatusCount = statusDistribution.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-5">
      {/* ── KPI Summary Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon={IndianRupee}
          label="This Month"
          value={formatCurrency(kpis.currentMonthRev)}
          accent="success"
          subtitle={
            <div className="flex items-center gap-1">
              {kpis.revChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={cn('font-semibold', kpis.revChange >= 0 ? 'text-green-500' : 'text-destructive')}>
                {kpis.revChange >= 0 ? '+' : ''}{kpis.revChange.toFixed(0)}% vs last month
              </span>
            </div>
          }
        />
        <KpiCard
          icon={Users}
          label="Avg / Client"
          value={formatCurrency(kpis.avgRevenuePerClient)}
          accent="primary"
        />
        <KpiCard
          icon={ShoppingBag}
          label="Product Sales"
          value={formatCurrency(kpis.productRevenue)}
          accent="warning"
        />
        <KpiCard
          icon={Calendar}
          label="Expiring Soon"
          value={expiryForecast[0].count}
          accent="destructive"
          subtitle={<span className="text-muted-foreground">within 7 days</span>}
        />
      </div>

      {/* ── Revenue vs Dues ─────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <SectionHeader title="Revenue vs Dues" icon={Activity} />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} width={45} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--success))" fill="url(#revGrad)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: 'hsl(var(--card))' }} activeDot={{ r: 5, strokeWidth: 2 }} />
              <Area type="monotone" dataKey="dues" name="Outstanding" stroke="hsl(var(--destructive))" fill="url(#dueGrad)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Membership Growth + Status Distribution ────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <SectionHeader title="Member Growth" icon={TrendingUp} />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} barGap={4} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="newMembers" name="New" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="renewals" name="Renewals" fill="hsl(var(--primary) / 0.3)" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <SectionHeader title="Status Breakdown" icon={Target} />
          {statusDistribution.length > 0 ? (
            <>
              <div className="h-36 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statusDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {statusDistribution.map((d) => {
                  const pct = totalStatusCount > 0 ? Math.round((d.value / totalStatusCount) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-offset-1 ring-offset-card" style={{ backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}30` }} />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-muted-foreground">{d.name}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-foreground">{d.value}</span>
                          <span className="text-[9px] text-muted-foreground">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      {/* ── Expiry + Plans + Payment Method ───────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Expiry Forecast */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <SectionHeader title="Expiry Forecast" icon={Clock} />
          <div className="space-y-3 pt-1">
            {expiryForecast.map((w) => {
              const barColorMap = {
                destructive: 'bg-destructive',
                warning: 'bg-yellow-500',
                primary: 'bg-primary',
                muted: 'bg-muted-foreground',
              };
              const textColorMap = {
                destructive: 'text-destructive',
                warning: 'text-yellow-500',
                primary: 'text-primary',
                muted: 'text-muted-foreground',
              };
              return (
                <div key={w.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">{w.label}</span>
                    <span className={cn('text-sm font-bold tabular-nums', textColorMap[w.accent])}>{w.count}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted/80 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', barColorMap[w.accent])}
                      style={{ width: `${totalExpiring > 0 ? Math.max((w.count / totalExpiring) * 100, w.count > 0 ? 8 : 0) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan Popularity */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <SectionHeader title="Popular Plans" icon={Target} />
          {planPopularity.length > 0 ? (
            <div className="space-y-3 pt-1">
              {planPopularity.map((p, i) => {
                const max = planPopularity[0].count;
                return (
                  <div key={p.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-medium text-foreground truncate">{p.name}</span>
                      <span className="text-sm font-bold tabular-nums text-primary">{p.count}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${(p.count / max) * 100}%`, opacity: 1 - i * 0.12 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No plans yet</p>
          )}
        </div>

        {/* Payment Method Split */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <SectionHeader title="Payment Methods" icon={Wallet} />
          {paymentMethodData.length > 0 ? (
            <>
              <div className="h-32 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={50}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {paymentMethodData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-5">
                {paymentMethodData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}30` }} />
                    <div>
                      <span className="text-muted-foreground">{d.name}</span>
                      <p className="font-bold text-foreground text-sm">{formatCurrency(d.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No payments yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
