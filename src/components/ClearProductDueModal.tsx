import { useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { useCreatePayment } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { createAuditLog } from '@/hooks/useAuditLog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ProductPurchase, Payment } from '@/lib/types';
import { PaymentUpiQr } from '@/components/PaymentUpiQr';

interface ClearProductDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  purchase: ProductPurchase;
  linkedPayments: Payment[];
}

export function ClearProductDueModal({ isOpen, onClose, clientId, clientName, purchase, linkedPayments }: ClearProductDueModalProps) {
  const createPayment = useCreatePayment();
  const { user } = useAuth();
  const { toast } = useToast();

  const totalPaid = linkedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const remainingDue = Math.max(0, Number(purchase.total_price) - totalPaid);

  const [formData, setFormData] = useState({
    amount: String(remainingDue),
    payment_method: 'cash' as 'cash' | 'online',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payAmount = Number(formData.amount) || 0;
  const newDue = Math.max(0, remainingDue - payAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    if (payAmount > remainingDue) {
      toast({ title: `Amount exceeds remaining due of ${formatCurrency(remainingDue)}`, variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await createPayment.mutateAsync({
        client_id: clientId,
        amount: payAmount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        payment_type: 'product',
        product_purchase_id: purchase.id,
        join_id: null,
        due_before: remainingDue,
        due_after: newDue,
        notes: formData.notes || null,
      });

      const action = newDue === 0 ? 'DUE_CLEARED' : 'PRODUCT_PAYMENT';
      await createAuditLog({
        action,
        entityType: 'payment',
        entityId: purchase.id,
        clientId,
        adminId: user?.id,
        newData: {
          productPurchaseId: purchase.id,
          productName: purchase.product?.name,
          amount: payAmount,
          dueBefore: remainingDue,
          dueAfter: newDue,
        },
        reason: newDue === 0 ? 'Product due fully cleared' : 'Partial product payment',
      }).catch(console.error);

      toast({ title: newDue === 0 ? 'Product due cleared!' : 'Payment recorded' });
      onClose();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to record payment', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card shadow-2xl border-t sm:border border-border animate-slide-in-right" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Clear Product Due
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Purchase info */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2">
            <p className="font-medium">{purchase.product?.name || 'Product'}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Total:</span>{' '}
                <span className="font-medium">{formatCurrency(Number(purchase.total_price))}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Paid:</span>{' '}
                <span className="font-medium text-green-400">{formatCurrency(totalPaid)}</span>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Remaining Due:</span>{' '}
              <span className="font-semibold text-destructive">{formatCurrency(remainingDue)}</span>
            </div>
          </div>

          {/* Payment history for this purchase */}
          {linkedPayments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Previous Payments</p>
              <div className="pl-3 border-l-2 border-primary/20 space-y-1">
                {linkedPayments.map(p => (
                  <p key={p.id} className="text-xs text-muted-foreground">
                    {formatCurrency(Number(p.amount))} • {formatDate(p.payment_date)}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground">Amount to Pay *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              className="input-field w-full mt-1"
              min="1"
              max={remainingDue}
              required
            />
            {payAmount > 0 && payAmount < remainingDue && (
              <p className="text-xs text-muted-foreground mt-1">
                Remaining after: {formatCurrency(newDue)}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Payment Method</label>
            <div className="flex gap-2 mt-1">
              {(['cash', 'online'] as const).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_method: method })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.payment_method === method
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Payment Date</label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
              className="input-field w-full mt-1"
            />
          </div>

          {/* UPI QR for online payment */}
          {formData.payment_method === 'online' && payAmount > 0 && (
            <PaymentUpiQr
              amount={payAmount}
              clientName={clientName}
              note={`${purchase.product?.name || 'Product'} due payment by ${clientName}`}
            />
          )}

          <div>
            <label className="text-sm text-muted-foreground">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input-field w-full mt-1"
              placeholder="Optional notes"
            />
          </div>

          <button type="submit" disabled={isSubmitting || payAmount <= 0} className="btn-primary w-full">
            {isSubmitting ? 'Processing...' : payAmount >= remainingDue ? 'Clear Due' : 'Record Payment'}
          </button>
        </form>
      </div>
    </div>
  );
}
