import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Check, X, Crown, Clock, Sparkles } from 'lucide-react';
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan } from '@/hooks/usePlans';
import { useAuth } from '@/hooks/useAuth';
import { MobileNav } from '@/components/MobileNav';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Plan } from '@/lib/types';
import { PlansPageSkeleton } from '@/components/DashboardSkeleton';

export default function Plans() {
  const { user, loading: authLoading } = useAuth();
  const { data: plans, isLoading } = usePlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    duration_months: 1,
    price: '',
    description: '',
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const resetForm = () => {
    setFormData({ name: '', duration_months: 1, price: '', description: '' });
    setEditingPlan(null);
    setShowForm(false);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      duration_months: plan.duration_months,
      price: plan.price.toString(),
      description: plan.description || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({
          id: editingPlan.id,
          name: formData.name,
          duration_months: formData.duration_months,
          price: Number(formData.price),
          description: formData.description || null,
        });
        toast({ title: 'Plan updated successfully!' });
      } else {
        await createPlan.mutateAsync({
          name: formData.name,
          duration_months: formData.duration_months,
          price: Number(formData.price),
          description: formData.description || null,
          active: true,
        });
        toast({ title: 'Plan created successfully!' });
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

  const activePlans = plans?.filter((p) => p.active) || [];

  // Sort by price for visual hierarchy
  const sortedPlans = [...activePlans].sort((a, b) => Number(a.price) - Number(b.price));

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Membership Plans</h1>
            <p className="text-xs text-muted-foreground">{activePlans.length} active plans</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2 rounded-lg bg-primary text-primary-foreground"
        >
          {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* Add/Edit Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-card p-4 space-y-4 animate-fade-in">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {editingPlan ? 'Edit Plan' : 'New Plan'}
            </h2>

            <div>
              <label className="text-sm text-muted-foreground">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-dark w-full mt-1"
                placeholder="e.g., Monthly"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Duration (months) *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
                  className="input-dark w-full mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Price (₹) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="input-dark w-full mt-1"
                  placeholder="1000"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-dark w-full mt-1"
                placeholder="Optional description"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">
                <Check className="h-4 w-4 mr-2" />
                {editingPlan ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Plans Grid */}
        <div className="space-y-3">
          {sortedPlans.map((plan, index) => {
            const isPopular = index === Math.floor(sortedPlans.length / 2) && sortedPlans.length > 1;
            const perMonth = Number(plan.price) / plan.duration_months;

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border bg-card p-4 animate-fade-in transition-all ${
                  isPopular
                    ? 'border-primary shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]'
                    : 'border-border'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    <Crown className="h-3 w-3" /> POPULAR
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    {/* Plan Name */}
                    <h3 className="font-bold text-foreground text-base">{plan.name}</h3>

                    {/* Price */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-primary">
                        {formatCurrency(Number(plan.price))}
                      </span>
                    </div>

                    {/* Duration & Per Month */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {plan.duration_months} {plan.duration_months === 1 ? 'month' : 'months'}
                      </span>
                      {plan.duration_months > 1 && (
                        <span className="text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                          {formatCurrency(Math.round(perMonth))}/mo
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleEdit(plan)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(plan.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-4 w-4 text-destructive/70" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activePlans.length === 0 && !showForm && (
          <div className="text-center py-16 text-muted-foreground">
            <Crown className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No plans yet</p>
            <p className="text-sm mt-1">Create your first membership plan!</p>
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
