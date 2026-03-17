import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { usePlans } from '@/hooks/usePlans';
import { useRejoinClient } from '@/hooks/useClients';
import { PaymentUpiQr } from '@/components/PaymentUpiQr';
import { calculateExpiryDate, formatDate } from '@/lib/utils';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Join } from '@/lib/types';

interface RejoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  lastJoin?: Join;
}

export function RejoinModal({ isOpen, onClose, clientId, clientName, lastJoin }: RejoinModalProps) {
  const { data: plans } = usePlans();
  const rejoinClient = useRejoinClient();
  const { toast } = useToast();

  // Calculate late renewal info
  const today = new Date();
  const expiryDateObj = lastJoin?.expiry_date ? parseISO(lastJoin.expiry_date) : null;
  const isExpired = expiryDateObj ? expiryDateObj < today : false;
  const gapDays = expiryDateObj && isExpired ? differenceInDays(today, expiryDateObj) : 0;
  const isWithinLateWindow = gapDays > 0 && gapDays <= 30;

  const [formData, setFormData] = useState({
    plan_id: '',
    custom_price: '',
    join_date: format(new Date(), 'yyyy-MM-dd'),
    initial_payment: '',
    payment_method: 'cash' as 'cash' | 'online',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const startDate = isWithinLateWindow && expiryDateObj
        ? format(expiryDateObj, 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');
      setFormData({
        plan_id: lastJoin?.plan_id || '',
        custom_price: '',
        join_date: startDate,
        initial_payment: '',
        payment_method: 'cash',
      });
    }
  }, [isOpen, lastJoin]);

  const selectedPlan = plans?.find((p) => p.id === formData.plan_id);
  const expiryDate = selectedPlan
    ? calculateExpiryDate(formData.join_date, selectedPlan.duration_months)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plan_id) {
      toast({ title: 'Please select a plan', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      await rejoinClient.mutateAsync({
        client_id: clientId,
        plan_id: formData.plan_id,
        custom_price: formData.custom_price ? Number(formData.custom_price) : undefined,
        join_date: formData.join_date,
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : formData.join_date,
        initial_payment: formData.initial_payment ? Number(formData.initial_payment) : undefined,
        payment_method: formData.payment_method,
      });

      toast({ title: `${clientName} has rejoined!` });
      onClose();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to rejoin client', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card animate-slide-in-right">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Rejoin - {clientName}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {isWithinLateWindow && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-500">Late Renewal — {gapDays} day{gapDays > 1 ? 's' : ''} overdue</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Membership expired on {expiryDateObj ? formatDate(expiryDateObj) : ''}. 
                  Start date set to expiry date so the gap period is covered. You can override below.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground">Plan *</label>
            <select
              value={formData.plan_id}
              onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
              className="input-dark w-full mt-1"
              required
            >
              <option value="">Select a plan</option>
              {plans?.filter((p) => p.active).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - ₹{plan.price} ({plan.duration_months}M)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Join Date</label>
            <input
              type="date"
              value={formData.join_date}
              onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
              className="input-dark w-full mt-1"
            />
          </div>

          {expiryDate && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Expiry Date</p>
              <p className="font-semibold text-foreground">{formatDate(expiryDate)}</p>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground">Custom Price (optional)</label>
            <input
              type="number"
              value={formData.custom_price}
              onChange={(e) => setFormData({ ...formData, custom_price: e.target.value })}
              className="input-dark w-full mt-1"
              placeholder={selectedPlan ? `Default: ₹${selectedPlan.price}` : 'Enter custom price'}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Initial Payment</label>
            <input
              type="number"
              value={formData.initial_payment}
              onChange={(e) => setFormData({ ...formData, initial_payment: e.target.value })}
              className="input-dark w-full mt-1"
              placeholder="Enter amount paid"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Payment Method</label>
            <div className="flex gap-2 mt-1">
              {(['cash', 'online'] as const).map((method) => (
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

          {formData.payment_method === 'online' && formData.initial_payment && Number(formData.initial_payment) > 0 && (
            <PaymentUpiQr
              amount={Number(formData.initial_payment)}
              clientName={clientName}
              note={`Rejoin - ${selectedPlan?.name || 'Membership'} by ${clientName}`}
            />
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Processing...' : 'Rejoin Client'}
          </button>
        </form>
      </div>
    </div>
  );
}
