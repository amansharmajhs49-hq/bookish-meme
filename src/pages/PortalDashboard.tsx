import { useState, useEffect, useMemo } from 'react';
import { SuggestionForm } from '@/components/SuggestionForm';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  LogOut, Calendar, IndianRupee, Activity,
  ShoppingBag, TrendingDown, TrendingUp, Minus, Scale, ChevronDown, ChevronUp,
  AlertTriangle, Clock, Flame, Heart, Megaphone, MessageSquarePlus, Phone, X, Download, Loader2,
  Sun, Moon, Monitor, Globe, Dumbbell, Zap, Crown, Users,
} from 'lucide-react';
import { BrandedLoader } from '@/components/BrandedLoader';
import { PortalNotificationBell } from '@/components/PortalNotificationBell';
import { PortalOnboarding } from '@/components/PortalOnboarding';
import { ConsistencyBadges } from '@/components/ConsistencyBadges';
import { format, parseISO, differenceInDays } from 'date-fns';
import { evaluateMembershipStatus, calculateNetDue } from '@/lib/membership';
import { MembershipStatusBadge } from '@/components/MembershipStatusBadge';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useTheme } from '@/hooks/useTheme';
import { generateReceipt } from '@/lib/receipt';
import { motion, AnimatePresence } from 'framer-motion';
import { AiQuoteCard } from '@/components/AiQuoteCard';
import { AiMotivationalCard } from '@/components/AiMotivationalCard';
import { PortalProgressSection } from '@/components/PortalProgressSection';

interface PortalData {
  client: any;
  joins: any[];
  payments: any[];
  purchases: any[];
  progress: any[];
}

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    membership: false, payments: true, products: false, progress: true,
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const { mode, setMode } = useTheme();

  const cycleTheme = () => {
    if (mode === 'system') setMode('light');
    else if (mode === 'light') setMode('dark');
    else setMode('system');
  };

  const clientId = sessionStorage.getItem('portal_client_id');
  const pin = sessionStorage.getItem('portal_pin');
  const rawClientName = sessionStorage.getItem('portal_name');
  const clientName = rawClientName ? rawClientName.trim().split(/\s+/)[0] : null;

  useEffect(() => {
    if (!clientId || !pin) {
      navigate('/portal');
      return;
    }
    fetchData();
    fetchAnnouncements();
  }, [clientId, pin]);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setAnnouncements(data || []);
    } catch { /* ignore */ }
  };

  const fetchData = async () => {
    try {
      const { data: result, error: err } = await supabase.rpc('get_client_portal_data', {
        p_client_id: clientId!,
        p_pin: pin!,
      });
      if (err) throw err;
      const parsed = result as any;
      if (!parsed.success) {
        sessionStorage.clear();
        navigate('/portal');
        return;
      }
      setData(parsed);
      const onboardingDone = parsed.client.onboarding_completed || sessionStorage.getItem('portal_onboarding_done') === '1';
      if (!onboardingDone) {
        setShowOnboarding(true);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const membership = useMemo(() => {
    if (!data) return null;
    const { client, joins, payments, purchases } = data;
    const latestJoin = joins[0];
    if (!latestJoin) return null;

    const totalFees = joins.reduce((sum: number, j: any) => sum + (j.custom_price ?? j.plan?.price ?? 0), 0);
    const membershipPayments = payments.filter((p: any) => p.payment_type === 'membership' || p.payment_type === 'mixed' || p.payment_type === 'advance');
    const paidAmount = membershipPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const membershipDues = Math.max(0, totalFees - paidAmount);

    const productTotal = purchases.reduce((sum: number, p: any) => sum + p.total_price, 0);
    const productPayments = payments.filter((p: any) => p.payment_type === 'product').reduce((sum: number, p: any) => sum + p.amount, 0);
    const productDues = Math.max(0, productTotal - productPayments);
    const advance = client.advance_balance || 0;
    const netDue = calculateNetDue(membershipDues, productDues, advance);

    const eval_ = evaluateMembershipStatus({
      isInactive: client.is_inactive || false,
      isLeft: client.status === 'Left',
      dueAmount: membershipDues,
      productDues,
      advanceBalance: advance,
      expiryDate: latestJoin.expiry_date,
    });

    // Calculate discount
    const planPrice = latestJoin?.plan?.price ?? 0;
    const customPrice = latestJoin?.custom_price;
    const discount = (customPrice != null && customPrice < planPrice) ? (planPrice - customPrice) : 0;

    return { ...eval_, latestJoin, membershipDues, productDues, netDue, totalFees, paidAmount, advance, discount };
  }, [data]);

  const progressInfo = useMemo(() => {
    if (!membership?.latestJoin) return null;
    const joinDate = parseISO(membership.latestJoin.join_date);
    const expiryDate = parseISO(membership.latestJoin.expiry_date);
    const totalDays = Math.max(1, differenceInDays(expiryDate, joinDate));
    const elapsed = differenceInDays(new Date(), joinDate);
    const pct = Math.max(0, Math.min(100, (elapsed / totalDays) * 100));
    return { joinDate, expiryDate, totalDays, elapsed, pct };
  }, [membership]);

  const bmi = useMemo(() => {
    if (!data?.progress?.length) return null;
    const latest = data.progress[0];
    if (!latest.weight || !latest.height) return null;
    const h = latest.height / 100;
    return (latest.weight / (h * h)).toFixed(1);
  }, [data]);

  const firstJoinDate = useMemo(() => {
    if (!data?.joins?.length) return null;
    const sorted = [...data.joins].sort((a, b) => new Date(a.join_date).getTime() - new Date(b.join_date).getTime());
    return sorted[0]?.join_date || null;
  }, [data]);

  const handleLogout = () => {
    sessionStorage.removeItem('portal_client_id');
    sessionStorage.removeItem('portal_pin');
    sessionStorage.removeItem('portal_name');
    navigate('/portal');
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return <BrandedLoader label="Loading your portal…" />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-destructive">{error || 'Failed to load data'}</p>
          <button onClick={() => navigate('/portal')} className="text-primary underline text-sm">Back to login</button>
        </div>
      </div>
    );
  }

  const { client, joins, payments, purchases, progress } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding */}
      <AnimatePresence>
        {showOnboarding && (
          <PortalOnboarding
            clientId={client.id}
            clientName={clientName || client.name.trim().split(/\s+/)[0]}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileTap={{ scale: 0.9, rotate: -10 }}
            className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Dumbbell className="w-5 h-5 text-primary" />
          </motion.div>
          <div>
            <h1 className="font-bold text-foreground text-sm leading-tight">{ws.gym_name || 'Aesthetic Gym'}</h1>
            <p className="text-[10px] text-muted-foreground">{clientName || client.name.trim().split(/\s+/)[0]}'s Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <HeaderIconButton onClick={() => navigate('/website')} title="Visit Website">
            <Globe className="w-4 h-4" />
          </HeaderIconButton>
          <HeaderIconButton onClick={cycleTheme} title="Toggle theme">
            {mode === 'system' ? <Monitor className="w-4 h-4" /> : mode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </HeaderIconButton>
          <HeaderIconButton onClick={handleLogout} title="Logout">
            <LogOut className="w-4 h-4" />
          </HeaderIconButton>
        </div>
      </motion.div>

      <div className="p-4 space-y-3 max-w-lg mx-auto pb-8">

        {/* ========== PREMIUM MEMBERSHIP CARD ========== */}
        {membership && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card"
          >
            {/* Subtle ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/[0.04] blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-primary/[0.03] blur-3xl" />
            </div>

            {/* Top header strip */}
            <div className="relative px-4 pt-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Membership</p>
                  <p className="text-sm font-bold text-foreground">{membership.latestJoin?.plan?.name || 'Custom Plan'}</p>
                </div>
              </div>
              <MembershipStatusBadge status={membership.status} />
            </div>

            {/* Progress section */}
            {progressInfo && (() => {
              const { joinDate, expiryDate, pct } = progressInfo;
              const isUrgent = membership.daysLeft <= 7 && membership.daysLeft >= 0;
              const isExpired = membership.daysLeft < 0;

              return (
                <div className="relative px-4 pb-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">
                      {format(joinDate, 'dd MMM')}
                    </span>
                    <motion.span
                      key={membership.daysLeft}
                      initial={{ scale: 1.1, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`font-bold ${
                        isExpired ? 'text-destructive' : isUrgent ? 'text-warning' : 'text-foreground'
                      }`}
                    >
                      {isExpired ? 'Expired' : `${membership.daysLeft} day${membership.daysLeft !== 1 ? 's' : ''} left`}
                    </motion.span>
                    <span className="text-muted-foreground font-medium">
                      {format(expiryDate, 'dd MMM')}
                    </span>
                  </div>

                  {/* Animated progress bar with glow */}
                  <div className="relative">
                    <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
                        className={`h-full rounded-full relative ${
                          isExpired ? 'bg-destructive' :
                          pct > 85 ? 'bg-destructive' :
                          pct > 70 ? 'bg-warning' :
                          'bg-primary'
                        }`}
                      >
                        {/* Shimmer on progress bar */}
                        <div className="absolute inset-0 overflow-hidden rounded-full">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Stats grid */}
            {membership.latestJoin && (
              <div className="relative px-4 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  <StatChip label="Expires" value={format(parseISO(membership.latestJoin.expiry_date), 'dd MMM yyyy')} icon={<Calendar className="w-3 h-3" />} />
                  {membership.netDue > 0 && (
                    <StatChip label="Due" value={`₹${membership.netDue.toLocaleString('en-IN')}`} icon={<IndianRupee className="w-3 h-3" />} variant="destructive" />
                  )}
                  {membership.advance > 0 && (
                    <StatChip label="Advance" value={`₹${membership.advance.toLocaleString('en-IN')}`} icon={<Zap className="w-3 h-3" />} variant="success" />
                  )}
                </div>
              </div>
            )}

            {/* Membership details */}
            {membership.latestJoin && (
              <div className="relative px-4 pb-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-semibold text-foreground">{membership.latestJoin?.plan?.name || 'Custom'}</span>
                </div>
              </div>
            )}


            {/* Due amount — always visible */}
            {membership.netDue > 0 && (
              <div className="relative mx-4 mb-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-destructive">₹{membership.netDue.toLocaleString('en-IN')} due</p>
                      <p className="text-[10px] text-destructive/70">Clear dues to maintain membership access</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Renewal CTA when expired or expiring soon */}
            {(membership.status === 'EXPIRED' || (membership.daysLeft >= 0 && membership.daysLeft <= 3)) && (
              <div className="relative mx-4 mb-3">
                <div className={`flex items-center justify-between p-3 rounded-xl border ${membership.status === 'EXPIRED' ? 'bg-destructive/8 border-destructive/20' : 'bg-amber-500/8 border-amber-500/20'}`}>
                  <div>
                    <p className={`text-xs font-bold ${membership.status === 'EXPIRED' ? 'text-destructive' : 'text-amber-500'}`}>
                      {membership.status === 'EXPIRED' ? 'Membership expired — renew now' : `Only ${membership.daysLeft} day${membership.daysLeft !== 1 ? 's' : ''} left!`}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Contact us to continue your training</p>
                  </div>
                  {ws.whatsapp_number && (
                    <a
                      href={`https://wa.me/${ws.whatsapp_number}?text=${encodeURIComponent(`Hi, I'd like to renew my membership at ${ws.gym_name || 'the gym'}!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-white text-xs font-bold ${membership.status === 'EXPIRED' ? 'bg-destructive hover:bg-destructive/90' : 'bg-amber-500 hover:bg-amber-600'} transition-colors`}
                    >
                      Renew →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Member since */}
            <div className="relative px-4 pb-3">
              {firstJoinDate && (
                <p className="text-[10px] text-muted-foreground/60 text-center font-medium tracking-wide uppercase">
                  Member since {format(parseISO(firstJoinDate), 'MMM yyyy')}
                </p>
              )}
            </div>

            {/* AI Motivational Card */}
            <div className="relative px-4 pb-4">
              <AiMotivationalCard
                clientName={clientName || client.name}
                progressPct={progressInfo?.pct ?? 0}
                daysLeft={membership.daysLeft}
                planName={membership.latestJoin?.plan?.name || 'Custom'}
                membershipStatus={membership.status}
                netDue={membership.netDue}
                joinDate={membership.latestJoin?.join_date}
                isCustomPrice={membership.discount > 0}
                paidAmount={membership.latestJoin?.custom_price ?? membership.latestJoin?.plan?.price}
              />
            </div>
          </motion.div>
        )}

        {/* Consistency Badges */}
        {firstJoinDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <ConsistencyBadges firstJoinDate={firstJoinDate} />
          </motion.div>
        )}


        {/* BMI Card */}
        {bmi && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            whileTap={{ scale: 0.98 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">BMI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{bmi}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  parseFloat(bmi) < 18.5 ? 'bg-warning/20 text-warning' :
                  parseFloat(bmi) < 25 ? 'bg-success/20 text-success' :
                  parseFloat(bmi) < 30 ? 'bg-warning/20 text-warning' :
                  'bg-destructive/20 text-destructive'
                }`}>
                  {parseFloat(bmi) < 18.5 ? 'Underweight' : parseFloat(bmi) < 25 ? 'Normal' : parseFloat(bmi) < 30 ? 'Overweight' : 'Obese'}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Payments Section */}
        <CollapsibleSection
          title="Payment History"
          icon={<IndianRupee className="w-4 h-4" />}
          count={payments.length}
          expanded={expandedSections.payments}
          onToggle={() => toggleSection('payments')}
          delay={0.25}
        >
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No payments yet</p>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 10).map((p: any) => (
                <PaymentRow 
                  key={p.id} 
                  payment={p} 
                  client={client} 
                  joins={joins} 
                  purchases={purchases}
                  allPayments={payments}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Product Purchases */}
        <CollapsibleSection
          title="Product Purchases"
          icon={<ShoppingBag className="w-4 h-4" />}
          count={purchases.length}
          expanded={expandedSections.products}
          onToggle={() => toggleSection('products')}
          delay={0.3}
        >
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No purchases yet</p>
          ) : (
            <div className="space-y-2">
              {purchases.slice(0, 10).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.product?.name || 'Product'}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(p.purchase_date), 'dd MMM yyyy')} · Qty: {p.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-foreground">₹{p.total_price.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Body Progress */}
        <PortalProgressSection
          progress={progress}
          expanded={expandedSections.progress}
          onToggle={() => toggleSection('progress')}
          clientId={client.id}
          onProgressRefresh={fetchData}
        />

        {/* Membership History */}
        <CollapsibleSection
          title="Membership History"
          icon={<Calendar className="w-4 h-4" />}
          count={joins.length}
          expanded={expandedSections.membership}
          onToggle={() => toggleSection('membership')}
          delay={0.4}
        >
          {joins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No memberships yet</p>
          ) : (
            <div className="space-y-2">
              {joins.map((j: any) => {
                const joinDate = parseISO(j.join_date);
                const expiryDate = parseISO(j.expiry_date);
                const months = Math.round(Math.abs(expiryDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                const durationLabel = months >= 12 ? `${Math.round(months/12)} year${months >= 24 ? 's' : ''}` : `${months} month${months !== 1 ? 's' : ''}`;
                return (
                  <div key={j.id} className="py-2.5 border-b border-border last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{j.plan?.name || 'Custom Plan'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(joinDate, 'd MMM yyyy')} – {format(expiryDate, 'd MMM yyyy')}
                        </p>
                        <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {durationLabel}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground shrink-0">₹{(j.custom_price ?? j.plan?.price ?? 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        {/* CTA Buttons */}
        <PortalCTAs clientId={client.id} clientName={client.name} />
      </div>

      {/* Floating Notification Bell */}
      <PortalNotificationBell announcements={announcements} clientName={clientName || client.name} />
    </div>
  );
}

/* ========== SUB-COMPONENTS ========== */

function HeaderIconButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
      title={title}
    >
      {children}
    </motion.button>
  );
}

function StatChip({ label, value, icon, variant }: {
  label: string; value: string; icon: React.ReactNode; variant?: 'destructive' | 'success';
}) {
  const colorMap = {
    destructive: 'bg-destructive/8 text-destructive border-destructive/10',
    success: 'bg-success/8 text-success border-success/10',
    default: 'bg-muted/50 text-foreground border-border/50',
  };
  const color = colorMap[variant || 'default'];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${color}`}>
      <span className="opacity-60">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] opacity-60 font-medium">{label}</p>
        <p className="text-xs font-bold truncate">{value}</p>
      </div>
    </div>
  );
}

function PaymentRow({ payment, client, joins, purchases, allPayments }: {
  payment: any; client: any; joins: any[]; purchases: any[]; allPayments: any[];
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const linkedJoin = payment.join_id ? joins.find((j: any) => j.id === payment.join_id) ?? null : null;
      const linkedPurchase = payment.product_purchase_id ? purchases.find((p: any) => p.id === payment.product_purchase_id) ?? null : null;
      const relatedPayments = payment.join_id ? allPayments.filter((p: any) => p.join_id === payment.join_id) : [];

      await generateReceipt({
        gymName: 'Aesthetic Gym',
        clientName: client.name,
        clientPhone: client.phone,
        payment,
        linkedJoin,
        linkedPurchase,
        relatedPayments,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="flex items-center justify-between py-2 border-b border-border last:border-0"
    >
      <div>
        <p className="text-sm font-medium text-foreground">₹{Number(payment.amount).toLocaleString('en-IN')}</p>
        <p className="text-xs text-muted-foreground">{format(parseISO(payment.payment_date), 'dd MMM yyyy')} · {payment.payment_method === 'cash' ? 'Cash' : 'Online'}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          payment.payment_type === 'advance' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
          payment.payment_type === 'product' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' :
          payment.payment_type === 'mixed' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
          'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
        }`}>
          {payment.payment_type === 'advance' ? 'Advance' :
           payment.payment_type === 'product' ? 'Supplement' :
           payment.payment_type === 'mixed' ? 'Combined' :
           'Membership'}
        </span>
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={handleDownload}
          disabled={downloading}
          className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground disabled:opacity-50"
          title="Download Receipt"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        </motion.button>
      </div>
    </motion.div>
  );
}

function CollapsibleSection({ title, icon, count, expanded, onToggle, children, delay = 0 }: {
  title: string; icon: React.ReactNode; count: number;
  expanded: boolean; onToggle: () => void; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileTap={{ scale: 0.995 }}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors active:bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium">{count}</span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MembershipNote({ status, daysLeft, netDue }: { status: string; daysLeft: number; netDue: number }) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const dueQuotes = useMemo(() => [
    `You have ₹${netDue.toLocaleString('en-IN')} pending. Clear your dues to keep training without interruption. 💰`,
    `₹${netDue.toLocaleString('en-IN')} outstanding — settle up today and stay on track! ⚡`,
    `Don't let ₹${netDue.toLocaleString('en-IN')} stand between you and your dream body. Pay up, show up! 💪`,
  ], [netDue]);

  const expiredQuotes = [
    'Your membership has expired. Renew now and keep the momentum going! 🏋️',
    'Expired membership = lost momentum. Renew today before your progress fades! ⏰',
    'You didn\'t come this far to only come this far. Renew and finish what you started! 💪',
  ];

  const urgentQuotes = useMemo(() => daysLeft === 0 ? [
    'TODAY IS YOUR LAST DAY! Renew now — don\'t let it slip! 🔥',
  ] : [
    `Only ${daysLeft} day${daysLeft > 1 ? 's' : ''} left! Renew before it's too late. 💪`,
  ], [daysLeft]);

  const warningQuotes = useMemo(() => [
    `${daysLeft} days until expiry. Plan your renewal now! 🎯`,
  ], [daysLeft]);

  const motivationalQuotes = [
    'The only bad workout is the one that didn\'t happen. Keep showing up! 💪',
    'You\'re not just building muscle — you\'re building discipline. 🏆',
  ];

  const quotes = netDue > 0 ? dueQuotes
    : status === 'EXPIRED' ? expiredQuotes
    : (daysLeft <= 3 && daysLeft >= 0) ? urgentQuotes
    : (daysLeft <= 7 && daysLeft > 3) ? warningQuotes
    : status === 'ACTIVE' ? motivationalQuotes
    : [];

  useEffect(() => {
    if (quotes.length <= 1) return;
    const interval = setInterval(() => {
      setQuoteIndex(prev => {
        let next;
        do { next = Math.floor(Math.random() * quotes.length); } while (next === prev);
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  useEffect(() => {
    if (quotes.length > 0) setQuoteIndex(Math.floor(Math.random() * quotes.length));
  }, [status, daysLeft > 0 ? 'active' : 'not', netDue > 0 ? 'due' : 'clear']);

  if (quotes.length === 0) return null;

  let icon: React.ReactNode;
  let bg: string;
  let text: string;

  if (netDue > 0) {
    icon = <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
    bg = 'bg-destructive/8 border-destructive/15';
    text = 'text-destructive';
  } else if (status === 'EXPIRED') {
    icon = <Clock className="w-3.5 h-3.5 shrink-0" />;
    bg = 'bg-destructive/8 border-destructive/15';
    text = 'text-destructive';
  } else if (daysLeft <= 3) {
    icon = <Flame className="w-3.5 h-3.5 shrink-0" />;
    bg = 'bg-destructive/8 border-destructive/15';
    text = 'text-destructive';
  } else if (daysLeft <= 7) {
    icon = <Clock className="w-3.5 h-3.5 shrink-0" />;
    bg = 'bg-warning/8 border-warning/15';
    text = 'text-warning';
  } else {
    icon = <Heart className="w-3.5 h-3.5 shrink-0" />;
    bg = 'bg-primary/5 border-primary/10';
    text = 'text-primary';
  }

  const message = quotes[quoteIndex % quotes.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex items-start gap-2 p-2.5 rounded-lg border ${bg}`}
    >
      <span className={`${text} mt-0.5`}>{icon}</span>
      <AnimatePresence mode="wait">
        <motion.p
          key={quoteIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`text-[11px] leading-relaxed ${text}`}
        >
          {message}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

function PortalCTAs({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showRefer, setShowRefer] = useState(false);
  const [referCopied, setReferCopied] = useState(false);
  const ws = useWebsiteSettings();

  const portalUrl = `${window.location.origin}/portal`;
  const gymName = ws.gym_name || 'Aesthetic Gym';
  const referMessage = `Hey! 👋 I've been training at *${gymName}* and it's been amazing 💪\n\nThey have a great membership portal where you can track your progress, payments and more.\n\n🏋️ Check it out: ${portalUrl}\n\nAsk them for your login PIN when you join!`;

  const handleCopyRefer = async () => {
    try {
      await navigator.clipboard.writeText(referMessage);
      setReferCopied(true);
      setTimeout(() => setReferCopied(false), 2500);
    } catch {}
  };

  const handleWhatsAppRefer = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(referMessage)}`, '_blank');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="grid grid-cols-3 gap-2"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSuggestion(true)}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors"
        >
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[10px] font-semibold text-foreground text-center">Feedback</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowRefer(true)}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] transition-colors"
        >
          <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-[10px] font-semibold text-foreground text-center">Refer Friend</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowContacts(true)}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors"
        >
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[10px] font-semibold text-foreground text-center">Contact</span>
        </motion.button>
      </motion.div>

      {/* Refer a Friend Modal */}
      <AnimatePresence>
        {showRefer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRefer(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Refer a Friend</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Share {gymName} with someone you know</p>
                </div>
                <button onClick={() => setShowRefer(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>

              {/* Message preview */}
              <div className="rounded-xl bg-muted/50 border border-border p-3">
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{referMessage}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleWhatsAppRefer}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors active:scale-[0.97]"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={handleCopyRefer}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card font-semibold text-sm hover:bg-muted transition-colors active:scale-[0.97]"
                >
                  {referCopied ? (
                    <><Zap className="h-4 w-4 text-emerald-500" /><span className="text-emerald-500">Copied!</span></>
                  ) : (
                    <><Crown className="h-4 w-4" />Copy Text</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestion Modal */}
      <AnimatePresence>
        {showSuggestion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSuggestion(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl p-5 space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Suggestion Box</h3>
                <button onClick={() => setShowSuggestion(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
              <SuggestionForm clientId={clientId} clientName={clientName} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts Modal */}
      <AnimatePresence>
        {showContacts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowContacts(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Contact Information</h3>
                <button onClick={() => setShowContacts(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3">
                {ws.phone && (
                  <a href={`tel:${ws.phone}`} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors active:scale-[0.98]">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Phone className="h-4 w-4 text-primary" /></div>
                    <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium text-foreground">{ws.phone}</p></div>
                  </a>
                )}
                {ws.whatsapp_number && (
                  <a href={`https://wa.me/${ws.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors active:scale-[0.98]">
                    <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0"><MessageSquarePlus className="h-4 w-4 text-success" /></div>
                    <div><p className="text-xs text-muted-foreground">WhatsApp</p><p className="text-sm font-medium text-foreground">+{ws.whatsapp_number}</p></div>
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="grid grid-cols-2 gap-3"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => setShowSuggestion(true)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xs font-semibold text-foreground">Suggestion Box</span>
          <span className="text-[10px] text-muted-foreground text-center leading-tight">Share your feedback</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => setShowContacts(true)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xs font-semibold text-foreground">Contact Us</span>
          <span className="text-[10px] text-muted-foreground text-center leading-tight">Get in touch</span>
        </motion.button>
      </motion.div>

      {/* Suggestion Modal */}
      <AnimatePresence>
        {showSuggestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSuggestion(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl p-5 space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Suggestion Box</h3>
                <button onClick={() => setShowSuggestion(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SuggestionForm clientId={clientId} clientName={clientName} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts Modal */}
      <AnimatePresence>
        {showContacts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowContacts(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Contact Information</h3>
                <button onClick={() => setShowContacts(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                {ws.phone && (
                  <a href={`tel:${ws.phone}`} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors active:scale-[0.98]">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium text-foreground">{ws.phone}</p>
                    </div>
                  </a>
                )}
                {ws.whatsapp_number && (
                  <a href={`https://wa.me/${ws.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors active:scale-[0.98]">
                    <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <MessageSquarePlus className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">WhatsApp</p>
                      <p className="text-sm font-medium text-foreground">+{ws.whatsapp_number}</p>
                    </div>
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
