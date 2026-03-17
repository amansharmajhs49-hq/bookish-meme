import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useCreatePayment } from '@/hooks/usePayments';
import { PaymentUpiQr } from '@/components/PaymentUpiQr';
import { useUpdateAdvanceBalance } from '@/hooks/useClients';
import { createAuditLog } from '@/hooks/useAuditLog';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { generatePaymentMessage, getWhatsAppLink } from '@/lib/whatsapp';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clientPhone: string;
  dueAmount: number;
  membershipDues?: number;
  productDues?: number;
  advanceBalance?: number;
  latestJoinId?: string | null;
  planName?: string;
}

export function AddPaymentModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientPhone,
  dueAmount,
  membershipDues = 0,
  productDues = 0,
  advanceBalance = 0,
  latestJoinId,
  planName,
}: AddPaymentModalProps) {
  const createPayment = useCreatePayment();
  const updateAdvance = useUpdateAdvanceBalance();
  const { user } = useAuth();
  const { toast } = useToast();

  const hasBothDues = membershipDues > 0 && productDues > 0;

  const getDefaultNote = (type: string) => {
    if (type === 'membership') return `Membership payment${planName ? ` - ${planName}` : ''} by ${clientName}`;
    if (type === 'product') return `Product due payment by ${clientName}`;
    if (type === 'mixed') return `Membership + Product payment by ${clientName}`;
    return '';
  };

  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'cash' as 'cash' | 'online',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_type: (hasBothDues ? 'mixed' : productDues > 0 ? 'product' : 'membership') as 'membership' | 'product' | 'mixed',
    notes: '',
    customNote: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDue = Math.max(0, membershipDues + productDues - advanceBalance);
  const paymentAmount = Number(formData.amount) || 0;
  const overpayment = Math.max(0, paymentAmount - totalDue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || paymentAmount <= 0) {
      toast({ title: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    // Validate: payment must be linked to a membership (via latestJoinId) or there must be outstanding dues
    if (!latestJoinId && membershipDues <= 0 && productDues <= 0) {
      toast({ title: 'Payment must be linked to a membership or product purchase.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine effective payment type
      let paymentType = formData.payment_type;
      if (!hasBothDues) {
        if (productDues > 0 && membershipDues <= 0) paymentType = 'product';
        else paymentType = 'membership';
      }

      const noteToSave = formData.customNote ? formData.notes : getDefaultNote(paymentType);

      if (paymentType === 'mixed') {
        // Split mixed payment: allocate to membership first, then product
        const effectiveMembershipDue = Math.max(0, membershipDues - advanceBalance);
        const membershipPortion = Math.min(paymentAmount, effectiveMembershipDue);
        const remaining = paymentAmount - membershipPortion;
        const productPortion = Math.min(remaining, productDues);
        const leftover = remaining - productPortion;

        // Create membership payment if portion > 0
        if (membershipPortion > 0) {
          const mDueBefore = effectiveMembershipDue;
          const mDueAfter = Math.max(0, mDueBefore - membershipPortion);
          await createPayment.mutateAsync({
            client_id: clientId,
            amount: membershipPortion,
            payment_method: formData.payment_method,
            payment_date: formData.payment_date,
            notes: noteToSave ? `${noteToSave} (Membership portion)` : 'Membership portion of mixed payment',
            join_id: latestJoinId || null,
            payment_type: 'membership',
            due_before: mDueBefore,
            due_after: mDueAfter,
          });
        }

        // Create product payment if portion > 0
        if (productPortion > 0) {
          const pDueBefore = productDues;
          const pDueAfter = Math.max(0, pDueBefore - productPortion);
          await createPayment.mutateAsync({
            client_id: clientId,
            amount: productPortion,
            payment_method: formData.payment_method,
            payment_date: formData.payment_date,
            notes: noteToSave ? `${noteToSave} (Product portion)` : 'Product portion of mixed payment',
            join_id: null,
            payment_type: 'product',
            due_before: pDueBefore,
            due_after: pDueAfter,
          });
        }

        // Handle overpayment from mixed
        if (leftover > 0) {
          await updateAdvance.mutateAsync({
            id: clientId,
            amount: advanceBalance + leftover,
          });
          await createAuditLog({
            action: 'ADVANCE_ADDED',
            entityType: 'payment',
            entityId: clientId,
            clientId,
            adminId: user?.id,
            newData: { advanceAdded: leftover, newBalance: advanceBalance + leftover },
          }).catch(console.error);
        }

        // Audit log for the overall mixed payment
        await createAuditLog({
          action: membershipPortion + productPortion >= effectiveMembershipDue + productDues ? 'PAYMENT_APPLIED' : 'PARTIAL_PAYMENT',
          entityType: 'payment',
          entityId: clientId,
          clientId,
          adminId: user?.id,
          newData: {
            totalAmount: paymentAmount,
            membershipPortion,
            productPortion,
            advanceAdded: leftover,
            type: 'mixed',
          },
        }).catch(console.error);

      } else {
        // Single type payment (membership or product)
        let dueBefore = totalDue;
        if (paymentType === 'membership') {
          dueBefore = Math.max(0, membershipDues - advanceBalance);
        } else if (paymentType === 'product') {
          dueBefore = productDues;
        }
        const dueAfter = Math.max(0, dueBefore - paymentAmount);

        await createPayment.mutateAsync({
          client_id: clientId,
          amount: paymentAmount,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          notes: noteToSave || null,
          join_id: paymentType === 'membership' ? (latestJoinId || null) : null,
          payment_type: paymentType,
          due_before: dueBefore,
          due_after: dueAfter,
        });

        // If overpayment, add to advance balance
        if (overpayment > 0) {
          await updateAdvance.mutateAsync({
            id: clientId,
            amount: advanceBalance + overpayment,
          });

          await createAuditLog({
            action: 'ADVANCE_ADDED',
            entityType: 'payment',
            entityId: clientId,
            clientId,
            adminId: user?.id,
            newData: { advanceAdded: overpayment, newBalance: advanceBalance + overpayment },
          }).catch(console.error);
        }

        // Audit log
        const action = dueAfter === 0 ? 'PAYMENT_APPLIED' : 'PARTIAL_PAYMENT';
        await createAuditLog({
          action,
          entityType: 'payment',
          entityId: clientId,
          clientId,
          adminId: user?.id,
          newData: {
            amount: paymentAmount,
            method: formData.payment_method,
            type: paymentType,
            dueBefore,
            dueAfter,
          },
        }).catch(console.error);
      }

      toast({ title: 'Payment recorded successfully!' });

      onClose();
      setFormData({
        amount: '',
        payment_method: 'cash',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_type: hasBothDues ? 'mixed' : productDues > 0 ? 'product' : 'membership',
        notes: '',
        customNote: false,
      });
    } catch (error: any) {
      toast({ title: error.message || 'Failed to record payment', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">Add Payment</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Due breakdown */}
          {totalDue > 0 && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-destructive">
                  Total Due: {formatCurrency(totalDue)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {membershipDues > 0 && (
                  <div className={`rounded-md p-2 border transition-all ${
                    formData.payment_type === 'membership' || formData.payment_type === 'mixed'
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-muted/50 border-border'
                  }`}>
                    <p className="text-muted-foreground">Membership</p>
                    <p className="font-semibold text-foreground">{formatCurrency(membershipDues)}</p>
                  </div>
                )}
                {productDues > 0 && (
                  <div className={`rounded-md p-2 border transition-all ${
                    formData.payment_type === 'product' || formData.payment_type === 'mixed'
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-muted/50 border-border'
                  }`}>
                    <p className="text-muted-foreground">Products</p>
                    <p className="font-semibold text-foreground">{formatCurrency(productDues)}</p>
                  </div>
                )}
              </div>
              {advanceBalance > 0 && (
                <p className="text-xs text-green-500">Advance Balance: -{formatCurrency(advanceBalance)}</p>
              )}
            </div>
          )}

          {/* Payment Type selector — shown when both dues exist */}
          {hasBothDues && (
            <div>
              <label className="text-sm text-muted-foreground">Payment For</label>
              <div className="flex gap-2 mt-1">
                {(['membership', 'product', 'mixed'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, payment_type: type, customNote: false })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      formData.payment_type === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {type === 'mixed' ? 'Both' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              {/* Quick context for selected type */}
              <p className="text-xs text-muted-foreground mt-1.5">
                {formData.payment_type === 'membership' && `Paying towards membership due of ${formatCurrency(membershipDues)}`}
                {formData.payment_type === 'product' && `Paying towards product due of ${formatCurrency(productDues)}`}
                {formData.payment_type === 'mixed' && `Paying towards total due of ${formatCurrency(totalDue)}`}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground">Amount *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input-dark w-full mt-1"
              placeholder="Enter payment amount"
              required
            />
            {overpayment > 0 && (
              <p className="text-xs text-green-500 mt-1">
                +{formatCurrency(overpayment)} will be added to advance balance
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Payment Date</label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="input-dark w-full mt-1"
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

          {formData.payment_method === 'online' && paymentAmount > 0 && (
            <PaymentUpiQr
              amount={paymentAmount}
              clientName={clientName}
              note={formData.customNote ? formData.notes : getDefaultNote(formData.payment_type)}
            />
          )}

          {/* Auto-generated note with edit option */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Note / Remark</label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, customNote: !formData.customNote, notes: formData.customNote ? '' : getDefaultNote(formData.payment_type) })}
                className="text-xs text-primary hover:underline"
              >
                {formData.customNote ? 'Use auto note' : 'Edit'}
              </button>
            </div>
            {formData.customNote ? (
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-dark w-full mt-1"
                placeholder="Enter custom note"
              />
            ) : (
              <p className="text-sm mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground">
                {getDefaultNote(formData.payment_type)}
              </p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </button>
        </form>
      </div>
    </div>
  );
}
