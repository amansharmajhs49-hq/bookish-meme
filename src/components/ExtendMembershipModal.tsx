import { useState, useEffect } from 'react';
import { X, CalendarPlus, Loader2 } from 'lucide-react';
import { PaymentUpiQr } from '@/components/PaymentUpiQr';
import { usePlans } from '@/hooks/usePlans';
import { useLogExtension } from '@/hooks/useExtensionLogs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { calculateExpiryDate, formatDate, formatCurrency, cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Join } from '@/lib/types';
import { createAuditLog } from '@/hooks/useAuditLog';

interface ExtendMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  currentJoin: Join;
}

export function ExtendMembershipModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  currentJoin,
}: ExtendMembershipModalProps) {
  const { toast } = useToast();
  const { data: plans = [] } = usePlans();
  const queryClient = useQueryClient();
  const logExtension = useLogExtension();

  const [planId, setPlanId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPlanId('');
      setCustomPrice('');
      setPaymentAmount('');
      setPaymentMethod('cash');
    }
  }, [isOpen]);

  const selectedPlan = plans.find((p) => p.id === planId);
  const currentExpiryDate = currentJoin.expiry_date;

  // New expiry = current expiry + plan duration
  const newExpiryDate = selectedPlan
    ? calculateExpiryDate(currentExpiryDate, selectedPlan.duration_months)
    : null;

  const planPrice = customPrice ? Number(customPrice) : (selectedPlan?.price || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId || !selectedPlan) {
      toast({ title: 'Please select a plan', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newExpiry = format(newExpiryDate!, 'yyyy-MM-dd');
      const previousExpiry = currentJoin.expiry_date;

      // Update the current join's expiry date
      const { error: joinError } = await supabase
        .from('joins')
        .update({
          expiry_date: newExpiry,
          // Update custom_price to reflect combined cost if custom price provided
        })
        .eq('id', currentJoin.id);

      if (joinError) throw joinError;

      // Ensure client is active
      const { error: clientError } = await supabase
        .from('clients')
        .update({ status: 'Active', is_inactive: false })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Log extension
      await logExtension.mutateAsync({
        clientId,
        joinId: currentJoin.id,
        previousEndDate: previousExpiry,
        newEndDate: newExpiry,
        extendedDays: selectedPlan.duration_months * 30,
      });

      // Record payment if provided
      if (paymentAmount && Number(paymentAmount) > 0) {
        const dueBefore = planPrice;
        const dueAfter = Math.max(0, planPrice - Number(paymentAmount));

        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            client_id: clientId,
            join_id: currentJoin.id,
            amount: Number(paymentAmount),
            payment_method: paymentMethod,
            payment_date: format(new Date(), 'yyyy-MM-dd'),
            payment_type: 'membership',
            due_before: dueBefore,
            due_after: dueAfter,
            notes: `Extension: ${selectedPlan.name} (${selectedPlan.duration_months}M)`,
          });

        if (paymentError) throw paymentError;

        // Audit log for extension payment
        const payAction = dueAfter === 0 ? 'PAYMENT_APPLIED' : 'PARTIAL_PAYMENT';
        await createAuditLog({
          action: payAction,
          entityType: 'payment',
          entityId: currentJoin.id,
          clientId,
          newData: { amount: Number(paymentAmount), method: paymentMethod, fee: planPrice, dueBefore, dueAfter, reason: 'Extension payment' },
        }).catch(console.error);
      }

      // Audit log
      try {
        await createAuditLog({
          action: 'MEMBERSHIP_EDITED',
          entityType: 'join',
          entityId: currentJoin.id,
          clientId,
          oldData: { expiry_date: previousExpiry },
          newData: { expiry_date: newExpiry, extension_plan: selectedPlan.name },
          reason: `Extended by ${selectedPlan.duration_months} month(s) using ${selectedPlan.name}`,
        });
      } catch (e) {
        console.error('Audit log error:', e);
      }

      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: `Membership extended to ${formatDate(newExpiry)}` });
      onClose();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to extend', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const activePlans = plans.filter((p) => p.active);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card animate-slide-in-right">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Extend Membership
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Current info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-sm text-muted-foreground">Extending for</p>
            <p className="font-semibold">{clientName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Current expiry:</span>
              <span className="text-xs font-medium text-foreground">{formatDate(currentExpiryDate)}</span>
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="text-sm text-muted-foreground">Select Plan *</label>
            <div className="grid gap-2 mt-2">
              {activePlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setPlanId(plan.id);
                    setPaymentAmount(String(plan.price));
                  }}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-all',
                    planId === plan.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border bg-card hover:border-primary/40'
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}</p>
                    </div>
                    <p className="font-bold text-sm">{formatCurrency(plan.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* New Expiry Preview */}
          {newExpiryDate && (
            <div className="rounded-lg bg-primary/10 p-3 border border-primary/20 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Expiry</span>
                <span className="font-medium">{formatDate(currentExpiryDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">+ {selectedPlan?.duration_months} month{(selectedPlan?.duration_months || 0) > 1 ? 's' : ''}</span>
                <span className="text-xs text-muted-foreground">({selectedPlan?.name})</span>
              </div>
              <div className="border-t border-primary/20 pt-1 mt-1 flex justify-between">
                <span className="text-sm font-semibold text-primary">New Expiry</span>
                <span className="font-bold text-primary">{formatDate(newExpiryDate)}</span>
              </div>
            </div>
          )}

          {/* Custom Price */}
          <div>
            <label className="text-sm text-muted-foreground">Custom Price (optional)</label>
            <input
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="input-dark w-full mt-1"
              placeholder={selectedPlan ? `Default: ₹${selectedPlan.price}` : 'Select a plan first'}
            />
          </div>

          {/* Payment */}
          <div>
            <label className="text-sm text-muted-foreground">Payment Amount</label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="input-dark w-full mt-1"
              placeholder="Enter amount paid"
            />
          </div>

          {paymentAmount && Number(paymentAmount) > 0 && (
            <div>
              <label className="text-sm text-muted-foreground">Payment Method</label>
              <div className="flex gap-2 mt-1">
                {(['cash', 'online'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                      paymentMethod === method
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {paymentMethod === 'online' && paymentAmount && Number(paymentAmount) > 0 && (
            <PaymentUpiQr
              amount={Number(paymentAmount)}
              clientName={clientName}
              note={`Extension - ${selectedPlan?.name || 'Membership'} by ${clientName}`}
            />
          )}

          {/* Payment summary */}
          {selectedPlan && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan Fee</span>
                <span className="font-medium">{formatCurrency(planPrice)}</span>
              </div>
              {paymentAmount && Number(paymentAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paying Now</span>
                  <span className="font-medium text-green-500">{formatCurrency(Number(paymentAmount))}</span>
                </div>
              )}
              {planPrice - Number(paymentAmount || 0) > 0 && (
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="text-muted-foreground">Remaining Due</span>
                  <span className="font-medium text-destructive">
                    {formatCurrency(planPrice - Number(paymentAmount || 0))}
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !planId}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            {isSubmitting ? 'Extending...' : 'Extend Membership'}
          </button>
        </form>
      </div>
    </div>
  );
}
