import { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import { PaymentUpiQr } from '@/components/PaymentUpiQr';
import { usePlans } from '@/hooks/usePlans';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLogReminder } from '@/hooks/useReminders';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { calculateExpiryDate, formatDate } from '@/lib/utils';
import { generateReminderMessage, getWhatsAppLink } from '@/lib/whatsapp';
import { createAuditLog } from '@/hooks/useAuditLog';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Join } from '@/lib/types';

interface RenewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  currentJoin?: Join;
}

export function RenewSubscriptionModal({ 
  isOpen, 
  onClose, 
  clientId, 
  clientName,
  clientPhone,
  currentJoin 
}: RenewSubscriptionModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: plans = [] } = usePlans();
  const queryClient = useQueryClient();
  const logReminder = useLogReminder();

  const [formData, setFormData] = useState({
    plan_id: '',
    custom_price: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    initial_payment: '',
    payment_method: 'cash' as 'cash' | 'online',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  // Calculate late renewal info
  const today = new Date();
  const expiryDateObj = currentJoin?.expiry_date ? parseISO(currentJoin.expiry_date) : null;
  const isExpired = expiryDateObj ? expiryDateObj < today : false;
  const gapDays = expiryDateObj && isExpired ? differenceInDays(today, expiryDateObj) : 0;
  const isWithinLateWindow = gapDays > 0 && gapDays <= 30;
  const suggestedStartDate = isWithinLateWindow && expiryDateObj 
    ? format(expiryDateObj, 'yyyy-MM-dd') 
    : format(today, 'yyyy-MM-dd');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const startDate = isWithinLateWindow && expiryDateObj
        ? format(expiryDateObj, 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');
      setFormData({
        plan_id: currentJoin?.plan_id || '',
        custom_price: '',
        start_date: startDate,
        initial_payment: '',
        payment_method: 'cash',
      });
    }
  }, [isOpen, currentJoin]);

  const selectedPlan = plans.find((p) => p.id === formData.plan_id);
  const expiryDate = selectedPlan
    ? calculateExpiryDate(formData.start_date, selectedPlan.duration_months)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plan_id) {
      toast({ title: 'Please select a plan', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create new join record
      const { data: joinData, error: joinError } = await supabase
        .from('joins')
        .insert({
          client_id: clientId,
          plan_id: formData.plan_id,
          join_date: formData.start_date,
          expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : formData.start_date,
          custom_price: formData.custom_price ? Number(formData.custom_price) : null,
        })
        .select('id')
        .single();

      if (joinError) throw joinError;

      // Update client status to Active
      const { error: clientError } = await supabase
        .from('clients')
        .update({ status: 'Active', is_inactive: false })
        .eq('id', clientId);

      if (clientError) throw clientError;

      const fee = formData.custom_price ? Number(formData.custom_price) : (selectedPlan?.price || 0);
      const initialPay = formData.initial_payment ? Number(formData.initial_payment) : 0;

      // Add initial payment if provided
      if (initialPay > 0) {
        const dueBefore = fee;
        const dueAfter = Math.max(0, fee - initialPay);

        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            client_id: clientId,
            join_id: joinData.id,
            amount: initialPay,
            payment_method: formData.payment_method,
            payment_date: formData.start_date,
            payment_type: 'membership',
            due_before: dueBefore,
            due_after: dueAfter,
          });

        if (paymentError) throw paymentError;

        // Audit log for payment
        const payAction = dueAfter === 0 ? 'PAYMENT_APPLIED' : 'PARTIAL_PAYMENT';
        await createAuditLog({
          action: payAction,
          entityType: 'payment',
          entityId: joinData.id,
          clientId,
          adminId: user?.id,
          newData: { amount: initialPay, method: formData.payment_method, fee, dueBefore, dueAfter },
        }).catch(console.error);
      }

      // Audit log for renewal
      await createAuditLog({
        action: 'MEMBERSHIP_RENEWED',
        entityType: 'membership',
        entityId: joinData.id,
        clientId,
        adminId: user?.id,
        newData: {
          plan: selectedPlan?.name,
          fee,
          initialPayment: initialPay,
          due: Math.max(0, fee - initialPay),
          startDate: formData.start_date,
          expiryDate: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : formData.start_date,
        },
      }).catch(console.error);

      // Send WhatsApp notification if enabled
      if (sendWhatsApp && clientPhone) {
        const message = generateReminderMessage('membership_renewed', {
          clientName,
          planName: selectedPlan?.name,
          newExpiryDate: expiryDate || new Date(),
        });

        // Log the reminder
        try {
          await logReminder.mutateAsync({
            clientId,
            reminderType: 'membership_renewed',
            message,
          });
        } catch (error) {
          console.error('Failed to log reminder:', error);
        }

        window.open(getWhatsAppLink(clientPhone, message), '_blank');
      }

      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: `Subscription renewed for ${clientName}!` });
      onClose();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to renew subscription', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card animate-slide-in-right">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Renew Subscription
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 mb-4">
            <p className="text-sm text-muted-foreground">Renewing for</p>
            <p className="font-semibold">{clientName}</p>
          </div>

          {isWithinLateWindow && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 mb-2 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-500">Late Renewal — {gapDays} day{gapDays > 1 ? 's' : ''} overdue</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Membership expired on {currentJoin?.expiry_date ? formatDate(parseISO(currentJoin.expiry_date)) : ''}. 
                  Start date set to expiry date so the gap period is covered. You can override this below.
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
              {plans.filter((p) => p.active).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - ₹{plan.price} ({plan.duration_months}M)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Start Date</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="input-dark w-full mt-1"
            />
          </div>

          {expiryDate && (
            <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
              <p className="text-sm text-muted-foreground">New Expiry Date</p>
              <p className="font-semibold text-primary">{formatDate(expiryDate)}</p>
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
            <label className="text-sm text-muted-foreground">Initial Payment (optional)</label>
            <input
              type="number"
              value={formData.initial_payment}
              onChange={(e) => setFormData({ ...formData, initial_payment: e.target.value })}
              className="input-dark w-full mt-1"
              placeholder="Enter amount paid"
            />
          </div>

          {formData.initial_payment && Number(formData.initial_payment) > 0 && (
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
          )}

          {formData.payment_method === 'online' && formData.initial_payment && Number(formData.initial_payment) > 0 && (
            <PaymentUpiQr
              amount={Number(formData.initial_payment)}
              clientName={clientName}
              note={`Renewal - ${selectedPlan?.name || 'Membership'} by ${clientName}`}
            />
          )}

          {clientPhone && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-input text-primary focus:ring-primary"
              />
              <span className="text-sm">Send WhatsApp notification</span>
            </label>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Processing...' : 'Renew Subscription'}
          </button>
        </form>
      </div>
    </div>
  );
}
