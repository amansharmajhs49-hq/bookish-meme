import { useState, useEffect } from 'react';
import { X, Trash2, Link as LinkIcon } from 'lucide-react';
import { useUpdatePayment, useDeletePayment } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { createAuditLog } from '@/hooks/useAuditLog';
import { useToast } from '@/hooks/use-toast';
import { Payment, Join, ProductPurchase } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  linkedJoin?: Join | null;
  linkedPurchase?: ProductPurchase | null;
}

export function EditPaymentModal({ isOpen, onClose, payment, linkedJoin, linkedPurchase }: EditPaymentModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const [formData, setFormData] = useState({
    amount: '',
    payment_date: '',
    payment_method: 'cash' as 'cash' | 'online',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (payment) {
      setFormData({
        amount: String(payment.amount),
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        notes: payment.notes || '',
      });
    }
  }, [payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.payment_date) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const oldData = {
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
      };
      const newData = {
        amount: Number(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        notes: formData.notes || null,
      };

      await updatePayment.mutateAsync({
        id: payment.id,
        ...newData,
      });

      await createAuditLog({
        action: 'PAYMENT_EDITED',
        entityType: 'payment',
        entityId: payment.id,
        clientId: payment.client_id,
        adminId: user?.id,
        oldData: oldData as any,
        newData: newData as any,
        reason: 'Payment edited',
        metadata: {
          relatedMembershipId: payment.join_id || undefined,
          relatedPurchaseId: payment.product_purchase_id || undefined,
        },
      }).catch(console.error);

      toast({ title: 'Payment updated successfully' });
      onClose();
    } catch (error) {
      toast({ title: 'Failed to update payment', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this payment? This will recalculate dues.')) return;
    
    setIsSubmitting(true);
    try {
      await deletePayment.mutateAsync(payment.id);

      await createAuditLog({
        action: 'PAYMENT_DELETED',
        entityType: 'payment',
        entityId: payment.id,
        clientId: payment.client_id,
        adminId: user?.id,
        oldData: { amount: payment.amount, date: payment.payment_date, type: payment.payment_type } as any,
        reason: 'Payment deleted manually',
        metadata: {
          relatedMembershipId: payment.join_id || undefined,
          relatedPurchaseId: payment.product_purchase_id || undefined,
        },
      }).catch(console.error);

      toast({ title: 'Payment deleted' });
      onClose();
    } catch (error) {
      toast({ title: 'Failed to delete payment', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Edit Payment</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Linked Entity Display */}
        {(linkedJoin || linkedPurchase) && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 mb-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <LinkIcon className="h-3 w-3" />
              Linked to
            </p>
            {linkedJoin && (
              <p className="text-sm">
                <span className="text-primary font-medium">Membership</span>
                {' '}{linkedJoin.plan?.name || 'Custom Plan'} • {formatDate(linkedJoin.join_date)} → {formatDate(linkedJoin.expiry_date)}
              </p>
            )}
            {linkedPurchase && (
              <p className="text-sm">
                <span className="text-primary font-medium">Product</span>
                {' '}{linkedPurchase.product?.name || 'Product'} × {linkedPurchase.quantity} = {formatCurrency(Number(linkedPurchase.total_price))}
              </p>
            )}
          </div>
        )}

        {!linkedJoin && !linkedPurchase && payment.payment_type !== 'advance' && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-4">
            <p className="text-xs text-destructive">⚠ This payment is not linked to a membership or product purchase.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Amount *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input-field mt-1"
              placeholder="Enter amount"
              min="1"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Payment Date *</label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="input-field mt-1"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as 'cash' | 'online' })}
              className="input-field mt-1"
            >
              <option value="cash">Cash</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field mt-1"
              rows={2}
              placeholder="Add notes..."
            />
          </div>

          {payment.payment_type && (
            <div className="text-xs text-muted-foreground">
              Type: <span className="text-primary">{payment.payment_type}</span>
              {payment.due_before != null && (
                <> • Due: {formatCurrency(Number(payment.due_before))} → {formatCurrency(Number(payment.due_after || 0))}</>
              )}
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
