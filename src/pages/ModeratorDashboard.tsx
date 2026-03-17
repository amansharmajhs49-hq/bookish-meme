import { useState, useEffect } from 'react';
import {
  Shield, Lock, Unlock, CreditCard, Calendar,
  Layout, PlusCircle, Pencil, Trash2, Save, X
} from 'lucide-react';
import {
  useSubscription, useFeatureLocks, useUpdateFeatureLock,
  useHostingPlans, useUpdateSubscription,
  useCreateHostingPlan, useUpdateHostingPlan, useDeleteHostingPlan,
  HostingPlan
} from '@/hooks/useSubscription';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MobileNav } from '@/components/MobileNav';

export default function ModeratorDashboard() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: locks, isLoading: locksLoading } = useFeatureLocks();
  const { data: plans } = useHostingPlans();

  const updateLock = useUpdateFeatureLock();
  const updateSub = useUpdateSubscription();
  const createPlan = useCreateHostingPlan();
  const updatePlan = useUpdateHostingPlan();
  const deletePlan = useDeleteHostingPlan();

  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Partial<HostingPlan> | null>(null);
  const [subForm, setSubForm] = useState({
    expiry_date: '',
    payment_qr: '',
    payment_link: ''
  });

  useEffect(() => {
    if (subscription) {
      setSubForm({
        expiry_date: subscription.expiry_date ? format(new Date(subscription.expiry_date), 'yyyy-MM-dd') : '',
        payment_qr: subscription.payment_qr || '',
        payment_link: subscription.payment_link || ''
      });
    }
  }, [subscription]);

  const handleToggleLock = async (featureKey: string, currentLocked: boolean) => {
    setIsUpdating(featureKey);
    try {
      await updateLock.mutateAsync({ featureKey, isLocked: !currentLocked });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSetStatus = async (status: 'active' | 'expired' | 'locked') => {
    if (!subscription?.id) return;
    setIsUpdating('status');
    try {
      await updateSub.mutateAsync({ id: subscription.id, status });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateSubDetails = async () => {
    if (!subscription?.id) return;
    setIsUpdating('sub-details');
    try {
      await updateSub.mutateAsync({
        id: subscription.id,
        expiry_date: subForm.expiry_date || undefined,
        payment_qr: subForm.payment_qr,
        payment_link: subForm.payment_link
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setIsUpdating('plan-save');
    try {
      if (editingPlan.id) {
        await updatePlan.mutateAsync(editingPlan as HostingPlan & { id: string });
      } else {
        await createPlan.mutateAsync({
          plan_name: editingPlan.plan_name || '',
          price: editingPlan.price || 0,
          billing_cycle: editingPlan.billing_cycle || 'monthly',
          description: editingPlan.description || '',
          features: editingPlan.features || {},
          is_active: editingPlan.is_active ?? true,
        });
      }
      setEditingPlan(null);
    } finally {
      setIsUpdating(null);
    }
  };

  const inputClass = 'w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all';

  if (subLoading || locksLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading Moderator Tools...</div>;

  return (
    <div className="page-container min-h-screen pb-24">
      <header className="page-header sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Moderator Panel</h1>
            <p className="text-[11px] font-bold text-primary uppercase tracking-widest">Global Control</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Subscription Management */}
        <div className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <CreditCard className="h-4 w-4 text-primary" />
            Subscription Management
          </h2>

          {subscription ? (
            <div className="space-y-4">
              {/* Status + Plan Info */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                    subscription.status === 'active' ? 'bg-green-500/10 text-green-500' :
                    subscription.status === 'expired' ? 'bg-destructive/10 text-destructive' :
                    'bg-orange-500/10 text-orange-500'
                  )}>
                    {subscription.status}
                  </span>
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {subscription.expiry_date ? format(new Date(subscription.expiry_date), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>

                {subscription.hosting_plan && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-bold text-primary">{subscription.hosting_plan.plan_name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatCurrency(subscription.hosting_plan.price)} / {subscription.hosting_plan.billing_cycle}</p>
                  </div>
                )}
              </div>

              {/* Status Controls */}
              <div className="grid grid-cols-3 gap-2">
                {(['active', 'expired', 'locked'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSetStatus(s)}
                    disabled={isUpdating === 'status'}
                    className={cn(
                      'py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border',
                      subscription.status === s
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-background border-border hover:bg-muted/40'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Subscription Details */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Expiry Date</label>
                  <input type="date" value={subForm.expiry_date} onChange={e => setSubForm({...subForm, expiry_date: e.target.value})} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Payment QR URL</label>
                  <input type="text" value={subForm.payment_qr} placeholder="https://..." onChange={e => setSubForm({...subForm, payment_qr: e.target.value})} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Payment Link</label>
                  <input type="text" value={subForm.payment_link} placeholder="https://..." onChange={e => setSubForm({...subForm, payment_link: e.target.value})} className={inputClass} />
                </div>
                <button
                  disabled={isUpdating === 'sub-details'}
                  onClick={handleUpdateSubDetails}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  {isUpdating === 'sub-details' ? 'Updating...' : 'Save Details'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No subscription found.</p>
          )}
        </div>

        {/* Feature Access Control */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Lock className="h-4 w-4 text-primary" />
            Feature Access Control
          </h2>

          <div className="space-y-2">
            {['expense_tracker', 'ai_quotes', 'client_linking', 'alias_system', 'advanced_analytics'].map((key) => {
              const lock = locks?.[key];
              const isLocked = lock?.is_locked ?? false;

              return (
                <div key={key} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', isLocked ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-500')}>
                      {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold capitalize">{key.replace(/_/g, ' ')}</h3>
                      <p className="text-[10px] text-muted-foreground">{isLocked ? 'Blocked' : 'Active'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleLock(key, isLocked)}
                    disabled={isUpdating === key}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border',
                      isLocked ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                    )}
                  >
                    {isLocked ? 'Enable' : 'Lock'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hosting Plans */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Layout className="h-4 w-4 text-primary" />
              Hosting Plans
            </h2>
            <button
              onClick={() => setEditingPlan({ plan_name: '', price: 0, billing_cycle: 'monthly', description: '', features: {}, is_active: true })}
              className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {plans?.map((plan) => (
              <div key={plan.id} className="p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm">{plan.plan_name}</h3>
                    <p className="text-[11px] text-muted-foreground">{plan.billing_cycle} • {plan.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(plan.price)}</p>
                    <div className="flex justify-end gap-1.5 mt-1.5">
                      <button onClick={() => setEditingPlan(plan)} className="p-1.5 rounded-lg bg-background border border-border hover:text-primary"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => deletePlan.mutate(plan.id)} className="p-1.5 rounded-lg bg-background border border-border hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!plans || plans.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-3">No plans yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Plan Editor Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold">{editingPlan.id ? 'Edit Plan' : 'New Plan'}</h3>
              <button onClick={() => setEditingPlan(null)} className="p-2 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Plan Name</label>
                <input value={editingPlan.plan_name || ''} onChange={e => setEditingPlan({...editingPlan, plan_name: e.target.value})} className={inputClass} placeholder="e.g. Premium Monthly" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Price (₹)</label>
                  <input type="number" value={editingPlan.price || 0} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Billing Cycle</label>
                  <select value={editingPlan.billing_cycle || 'monthly'} onChange={e => setEditingPlan({...editingPlan, billing_cycle: e.target.value})} className={inputClass}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Description</label>
                <textarea value={editingPlan.description || ''} onChange={e => setEditingPlan({...editingPlan, description: e.target.value})} className={cn(inputClass, 'min-h-[80px] resize-none')} placeholder="Plan features..." />
              </div>
            </div>

            <button
              onClick={handleSavePlan}
              disabled={isUpdating === 'plan-save'}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <Save className="h-4 w-4" />
              {isUpdating === 'plan-save' ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
}
