import { useState } from 'react';
import { X, ShoppingBag, Tag } from 'lucide-react';
import { useProducts, useCreateProductPurchase } from '@/hooks/useProducts';
import { useCreatePayment } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { createAuditLog } from '@/hooks/useAuditLog';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PaymentUpiQr } from '@/components/PaymentUpiQr';

interface AddProductPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  advanceBalance?: number;
}

export function AddProductPurchaseModal({ isOpen, onClose, clientId, clientName, advanceBalance = 0 }: AddProductPurchaseModalProps) {
  const { data: products } = useProducts();
  const createPurchase = useCreateProductPurchase();
  const createPayment = useCreatePayment();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '1',
    notes: '',
    amountPaid: '',
    useAdvance: false,
    payment_method: 'cash' as 'cash' | 'online',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeProducts = products?.filter((p) => p.active) || [];
  const selectedProduct = activeProducts.find((p) => p.id === formData.product_id);
  const totalPrice = selectedProduct ? Number(selectedProduct.price) * Number(formData.quantity || 0) : 0;
  const advanceToUse = formData.useAdvance ? Math.min(advanceBalance, totalPrice) : 0;
  const amountPaid = Number(formData.amountPaid || 0) + advanceToUse;
  const remainingDue = Math.max(0, totalPrice - amountPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || !selectedProduct) {
      toast({ title: 'Please select a product', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create purchase record
      const purchase = await createPurchase.mutateAsync({
        clientId,
        productId: formData.product_id,
        quantity: Number(formData.quantity) || 1,
        unitPrice: Number(selectedProduct.price),
        notes: formData.notes || undefined,
        adminId: user?.id,
      });

      // Create payment if any amount was paid
      const cashPaid = Number(formData.amountPaid || 0);
      if (cashPaid > 0 || advanceToUse > 0) {
        const totalPaid = cashPaid + advanceToUse;
        await createPayment.mutateAsync({
          client_id: clientId,
          amount: totalPaid,
          payment_method: formData.payment_method,
          payment_date: new Date().toISOString().split('T')[0],
          payment_type: 'product',
          product_purchase_id: purchase.id,
          due_before: totalPrice,
          due_after: remainingDue,
          notes: formData.notes || null,
          join_id: null,
        });

        await createAuditLog({
          action: 'PRODUCT_PAYMENT',
          entityType: 'payment',
          entityId: purchase.id,
          clientId,
          adminId: user?.id,
          newData: {
            productId: formData.product_id,
            productName: selectedProduct.name,
            totalPrice,
            amountPaid: totalPaid,
            remainingDue,
            advanceUsed: advanceToUse,
          },
        });
      }

      toast({ title: `${selectedProduct.name} sold to ${clientName}` });
      onClose();
      setFormData({ product_id: '', quantity: '1', notes: '', amountPaid: '', useAdvance: false, payment_method: 'cash' });
    } catch (error: any) {
      toast({ title: error.message || 'Failed to record purchase', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card shadow-2xl border-t sm:border border-border animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Sell Product
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Selling to</p>
            <p className="font-semibold">{clientName}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Product *</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="input-dark w-full mt-1"
              required
            >
              <option value="">Select a product</option>
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {formatCurrency(Number(product.price))}
                </option>
              ))}
            </select>
          </div>

          {/* Selected product tags */}
          {selectedProduct?.tags && selectedProduct.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedProduct.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground">Quantity</label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="input-dark w-full mt-1"
            />
          </div>

          {/* Price breakdown */}
          {totalPrice > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Price</span>
                <span className="font-bold text-foreground">{formatCurrency(totalPrice)}</span>
              </div>

              {/* Payment section */}
              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-sm font-medium text-foreground">Payment</p>

                {advanceBalance > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useAdvance}
                      onChange={(e) => setFormData({ ...formData, useAdvance: e.target.checked })}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-muted-foreground">
                      Use advance balance ({formatCurrency(advanceBalance)})
                    </span>
                  </label>
                )}

                {advanceToUse > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Advance applied</span>
                    <span className="text-green-400">-{formatCurrency(advanceToUse)}</span>
                  </div>
                )}

                <div>
                  <label className="text-sm text-muted-foreground">Amount Paying Now (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={totalPrice - advanceToUse}
                    value={formData.amountPaid}
                    onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                    className="input-dark w-full mt-1"
                    placeholder={`Max: ${formatCurrency(totalPrice - advanceToUse)}`}
                  />
                </div>

                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground">Remaining Due</span>
                  <span className={remainingDue > 0 ? 'font-semibold text-destructive' : 'font-semibold text-green-400'}>
                    {remainingDue > 0 ? formatCurrency(remainingDue) : 'Fully Paid'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment method */}
          {totalPrice > 0 && (
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

          {/* UPI QR for online payment */}
          {formData.payment_method === 'online' && Number(formData.amountPaid) > 0 && (
            <PaymentUpiQr
              amount={Number(formData.amountPaid)}
              clientName={clientName}
              note={`${selectedProduct?.name || 'Product'} purchase by ${clientName}`}
            />
          )}

          <div>
            <label className="text-sm text-muted-foreground">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-dark w-full mt-1"
              placeholder="Optional notes"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Processing...' : 'Record Purchase'}
          </button>
        </form>
      </div>
    </div>
  );
}
