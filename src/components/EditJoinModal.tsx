import { useState, useEffect } from 'react';
import { X, Trash2, Link as LinkIcon } from 'lucide-react';
import { usePlans } from '@/hooks/usePlans';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createAuditLog } from '@/hooks/useAuditLog';
import { Join, Payment } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';

interface EditJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  join: Join;
  clientId: string;
  linkedPayments?: Payment[];
}

export function EditJoinModal({ isOpen, onClose, join, clientId, linkedPayments = [] }: EditJoinModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: plans = [] } = usePlans();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    plan_id: '',
    join_date: '',
    expiry_date: '',
    custom_price: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (join) {
      setFormData({
        plan_id: join.plan_id || '',
        join_date: join.join_date,
        expiry_date: join.expiry_date,
        custom_price: join.custom_price ? String(join.custom_price) : '',
      });
    }
  }, [join]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.join_date || !formData.expiry_date) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        plan_id: formData.plan_id || null,
        join_date: formData.join_date,
        expiry_date: formData.expiry_date,
        custom_price: formData.custom_price ? Number(formData.custom_price) : null,
      };

      const { error } = await supabase
        .from('joins')
        .update(updateData)
        .eq('id', join.id);

      if (error) throw error;

      await createAuditLog({
        action: 'MEMBERSHIP_EDITED',
        entityType: 'membership',
        entityId: join.id,
        clientId,
        adminId: user?.id,
        oldData: {
          plan_id: join.plan_id,
          join_date: join.join_date,
          expiry_date: join.expiry_date,
          custom_price: join.custom_price,
        },
        newData: updateData as any,
      }).catch(console.error);

      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Subscription updated successfully' });
      onClose();
    } catch (error) {
      toast({ title: 'Failed to update subscription', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const paymentsCount = linkedPayments.length;
    const msg = paymentsCount > 0
      ? `This will also delete ${paymentsCount} linked payment(s). Continue?`
      : 'Are you sure you want to delete this subscription record?';
    if (!confirm(msg)) return;
    
    setIsSubmitting(true);
    try {
      // CASCADE: Delete linked payments first
      if (paymentsCount > 0) {
        for (const payment of linkedPayments) {
          await supabase.from('payments').delete().eq('id', payment.id);
          await createAuditLog({
            action: 'PAYMENT_DELETED_CASCADE',
            entityType: 'payment',
            entityId: payment.id,
            clientId,
            adminId: user?.id,
            oldData: { amount: payment.amount, date: payment.payment_date, join_id: join.id },
            reason: `Cascade deleted with membership ${join.id}`,
            metadata: { parentMembershipId: join.id },
          }).catch(console.error);
        }
      }

      const { error } = await supabase
        .from('joins')
        .delete()
        .eq('id', join.id);

      if (error) throw error;

      await createAuditLog({
        action: 'MEMBERSHIP_DELETED',
        entityType: 'membership',
        entityId: join.id,
        clientId,
        adminId: user?.id,
        oldData: { join_date: join.join_date, expiry_date: join.expiry_date, plan_id: join.plan_id },
        reason: 'Membership record deleted',
        metadata: { cascadedPayments: paymentsCount },
      }).catch(console.error);

      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: `Subscription deleted${paymentsCount > 0 ? ` (${paymentsCount} payments removed)` : ''}` });
      onClose();
    } catch (error) {
      toast({ title: 'Failed to delete subscription', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Edit Subscription</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Plan</label>
            <select
              value={formData.plan_id}
              onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
              className="input-field mt-1"
            >
              <option value="">Custom Plan</option>
              {plans.filter(p => p.active).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {plan.duration_months} month(s)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Join Date *</label>
            <input
              type="date"
              value={formData.join_date}
              onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
              className="input-field mt-1"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Expiry Date *</label>
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="input-field mt-1"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Custom Price (optional)</label>
            <input
              type="number"
              value={formData.custom_price}
              onChange={(e) => setFormData({ ...formData, custom_price: e.target.value })}
              className="input-field mt-1"
              placeholder="Override plan price"
            />
          </div>

          {/* Linked Payments Section */}
          {linkedPayments.length > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="h-3 w-3" />
                Linked Payments ({linkedPayments.length})
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {linkedPayments.map(p => (
                  <div key={p.id} className="flex justify-between text-xs">
                    <span>{formatCurrency(Number(p.amount))} • {formatDate(p.payment_date)}</span>
                    <span className="text-muted-foreground">{p.payment_method}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-destructive">
                Deleting this membership will also remove these payments.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="btn-ghost flex-1 text-destructive border border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
