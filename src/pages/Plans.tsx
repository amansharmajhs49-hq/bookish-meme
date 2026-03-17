import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Check, X, Crown, Clock, Sparkles, GripVertical } from 'lucide-react';
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan } from '@/hooks/usePlans';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { MobileNav } from '@/components/MobileNav';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Plan } from '@/lib/types';
import { PlansPageSkeleton } from '@/components/DashboardSkeleton';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';

function PlanCard({
  plan, index, isPopular, memberCount, onEdit, onDelete,
}: {
  plan: Plan; index: number; isPopular: boolean; memberCount: number;
  onEdit: (p: Plan) => void; onDelete: (id: string) => void;
}) {
  const controls = useDragControls();
  const perMonth = Number(plan.price) / plan.duration_months;

  return (
    <Reorder.Item
      value={plan}
      dragListener={false}
      dragControls={controls}
      className={cn(
        'relative rounded-xl border bg-card p-4 select-none touch-none',
        isPopular ? 'border-primary shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]' : 'border-border'
      )}
    >
      {isPopular && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full">
          <Crown className="h-3 w-3" /> POPULAR
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div
          className="mt-1 cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          onPointerDown={(e) => controls.start(e)}
        >
          <GripVertical className="h-5 w-5" />
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <h3 className="font-bold text-foreground text-base truncate">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-primary">{formatCurrency(Number(plan.price))}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {plan.duration_months === 1 ? '1 month' : plan.duration_months === 12 ? '1 year' : `${plan.duration_months} months`}
                </span>
                {plan.duration_months > 1 && (
                  <span className="text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                    {formatCurrency(Math.round(perMonth))}/mo
                  </span>
                )}
                {memberCount > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {memberCount} active
                  </span>
                )}
              </div>
              {plan.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => onEdit(plan)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Edit className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => onDelete(plan.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="h-4 w-4 text-destructive/70" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}

export default function Plans() {
  const { user, loading: authLoading } = useAuth();
  const { data: plans, isLoading } = usePlans();
  const { data: clients } = useClients();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [orderedPlans, setOrderedPlans] = useState<Plan[]>([]);
  const [formData, setFormData] = useState({ name: '', duration_months: 1, price: '', description: '' });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Initialise order from localStorage or default to price sort
  useEffect(() => {
    if (!plans) return;
    const active = plans.filter(p => p.active);
    const savedOrder = localStorage.getItem('plans-order');
    if (savedOrder) {
      try {
        const ids: string[] = JSON.parse(savedOrder);
        const mapped = ids.map(id => active.find(p => p.id === id)).filter(Boolean) as Plan[];
        const unseen = active.filter(p => !ids.includes(p.id));
        setOrderedPlans([...mapped, ...unseen]);
        return;
      } catch {}
    }
    setOrderedPlans([...active].sort((a, b) => Number(a.price) - Number(b.price)));
  }, [plans]);

  const handleReorder = (newOrder: Plan[]) => {
    setOrderedPlans(newOrder);
    localStorage.setItem('plans-order', JSON.stringify(newOrder.map(p => p.id)));
  };

  // Member count per plan
  const memberCountByPlan = clients
    ? orderedPlans.reduce<Record<string, number>>((acc, plan) => {
        acc[plan.id] = clients.filter(c =>
          c.status !== 'Deleted' &&
          c.membershipStatus === 'ACTIVE' &&
          c.latestJoin?.plan_id === plan.id
        ).length;
        return acc;
      }, {})
    : {};

  // Popular = plan with most active members, fallback to middle by price
  const popularPlanId = (() => {
    const counts = Object.entries(memberCountByPlan);
    if (counts.length === 0) return orderedPlans[Math.floor(orderedPlans.length / 2)]?.id;
    const max = Math.max(...counts.map(([, c]) => c));
    if (max === 0) return orderedPlans[Math.floor(orderedPlans.length / 2)]?.id;
    return counts.find(([, c]) => c === max)?.[0];
  })();

  const resetForm = () => {
    setFormData({ name: '', duration_months: 1, price: '', description: '' });
    setEditingPlan(null);
    setShowForm(false);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({ name: plan.name, duration_months: plan.duration_months, price: plan.price.toString(), description: plan.description || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) { toast({ title: 'Please fill required fields', variant: 'destructive' }); return; }
    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({ id: editingPlan.id, name: formData.name, duration_months: formData.duration_months, price: Number(formData.price), description: formData.description || null });
        toast({ title: 'Plan updated!' });
      } else {
        await createPlan.mutateAsync({ name: formData.name, duration_months: formData.duration_months, price: Number(formData.price), description: formData.description || null, active: true });
        toast({ title: 'Plan created!' });
      }
      resetForm();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to save plan', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    await deletePlan.mutateAsync(id);
    toast({ title: 'Plan deactivated' });
  };

  if (authLoading || isLoading) return <PlansPageSkeleton />;
  if (!user) return null;

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Membership Plans</h1>
            <p className="text-xs text-muted-foreground">{orderedPlans.length} active · drag to reorder</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="p-2 rounded-lg bg-primary text-primary-foreground">
          {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
      </header>

      <div className="p-4 space-y-4">
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={handleSubmit}
              className="rounded-xl border border-primary/30 bg-card p-4 space-y-4"
            >
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {editingPlan ? 'Edit Plan' : 'New Plan'}
              </h2>
              <div>
                <label className="text-sm text-muted-foreground">Name *</label>
                <input autoFocus type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-dark w-full mt-1" placeholder="e.g., Monthly" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Duration (months) *</label>
                  <input type="number" min="1" value={formData.duration_months} onChange={e => setFormData({ ...formData, duration_months: Number(e.target.value) })} className="input-dark w-full mt-1" required />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Price (₹) *</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="input-dark w-full mt-1" placeholder="1000" required />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Description</label>
                <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-dark w-full mt-1" placeholder="Optional description" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1"><Check className="h-4 w-4 mr-2" />{editingPlan ? 'Update' : 'Create'}</button>
                <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {orderedPlans.length > 0 ? (
          <Reorder.Group axis="y" values={orderedPlans} onReorder={handleReorder} className="space-y-3">
            {orderedPlans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={index}
                isPopular={plan.id === popularPlanId && orderedPlans.length > 1}
                memberCount={memberCountByPlan[plan.id] ?? 0}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </Reorder.Group>
        ) : (
          !showForm && (
            <div className="text-center py-16 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No plans yet</p>
              <p className="text-sm mt-1">Create your first membership plan!</p>
            </div>
          )
        )}
      </div>

      <MobileNav />
    </div>
  );
}
