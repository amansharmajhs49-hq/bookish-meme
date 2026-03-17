import { useState } from 'react';
import { X, Camera, Upload } from 'lucide-react';
import { PaymentUpiQr } from '@/components/PaymentUpiQr';
import { usePlans } from '@/hooks/usePlans';
import { useCreateClient } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { calculateExpiryDate, formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddClientModal({ isOpen, onClose }: AddClientModalProps) {
  const { data: plans } = usePlans();
  const createClient = useCreateClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    goal: '',
    remarks: '',
    plan_id: '',
    custom_price: '',
    join_date: format(new Date(), 'yyyy-MM-dd'),
    initial_payment: '',
    payment_method: 'cash' as 'cash' | 'online',
    alias_name: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan = plans?.find((p) => p.id === formData.plan_id);
  const expiryDate = selectedPlan
    ? calculateExpiryDate(formData.join_date, selectedPlan.duration_months)
    : null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generatePin = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 4) {
      return digits.slice(-4);
    }
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.plan_id) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      let photo_path: string | undefined;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('client-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;
        photo_path = fileName;
      }

      const result = await createClient.mutateAsync({
        name: formData.name,
        phone: formData.phone,
        goal: formData.goal || undefined,
        remarks: formData.remarks || undefined,
        photo_path,
        plan_id: formData.plan_id,
        custom_price: formData.custom_price ? Number(formData.custom_price) : undefined,
        join_date: formData.join_date,
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : formData.join_date,
        initial_payment: formData.initial_payment ? Number(formData.initial_payment) : undefined,
        payment_method: formData.payment_method,
      });

      // Auto-generate PIN
      let pin = generatePin(formData.phone);
      
      // Check for duplicate PINs
      const { data: existingPins } = await supabase
        .from('clients')
        .select('pin')
        .eq('pin', pin)
        .neq('id', result.id);

      if (existingPins && existingPins.length > 0) {
        pin = String(Math.floor(1000 + Math.random() * 9000));
      }

      // Update PIN and alias
      const aliasValue = formData.alias_name.trim() || null;
      await supabase.from('clients').update({ pin, alias_name: aliasValue } as any).eq('id', result.id);

      toast({
        title: 'Client added successfully!',
        description: `Portal PIN: ${pin}`,
      });
      onClose();
      setFormData({
        name: '',
        phone: '',
        goal: '',
        remarks: '',
        plan_id: '',
        custom_price: '',
        join_date: format(new Date(), 'yyyy-MM-dd'),
        initial_payment: '',
        payment_method: 'cash',
        alias_name: '',
      });
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error: any) {
      toast({ title: error.message || 'Failed to add client', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card animate-slide-in-right">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Add New Client</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Photo Upload */}
          <div className="flex justify-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <div className="relative h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5">
                  <Upload className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
            </label>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm text-muted-foreground">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark w-full mt-1"
              placeholder="Enter client name"
              required
            />
          </div>

          {/* Alias Name - right after name for visibility */}
          <div>
            <label className="text-sm text-muted-foreground">
              Alias Name <span className="text-[10px] text-muted-foreground/60">(admin only, optional)</span>
            </label>
            <input
              type="text"
              value={formData.alias_name}
              onChange={(e) => setFormData({ ...formData, alias_name: e.target.value })}
              className="input-dark w-full mt-1"
              placeholder="e.g. Rahul Morning Batch"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm text-muted-foreground">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-dark w-full mt-1"
              placeholder="Enter phone number"
              required
            />
          </div>

          {/* Plan */}
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

          {/* Join Date */}
          <div>
            <label className="text-sm text-muted-foreground">Join Date</label>
            <input
              type="date"
              value={formData.join_date}
              onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
              className="input-dark w-full mt-1"
            />
          </div>

          {/* Expiry Display */}
          {expiryDate && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Expiry Date</p>
              <p className="font-semibold text-foreground">{formatDate(expiryDate)}</p>
            </div>
          )}

          {/* Custom Price */}
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

          {/* Initial Payment */}
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

          {/* Payment Method */}
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
              clientName={formData.name || 'New Client'}
              note={`New Membership${selectedPlan ? ` - ${selectedPlan.name}` : ''} by ${formData.name || 'Client'}${formData.remarks?.trim() ? ` | ${formData.remarks.trim()}` : ''}`}
            />
          )}

          {/* Goal */}
          <div>
            <label className="text-sm text-muted-foreground">Goal</label>
            <input
              type="text"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="input-dark w-full mt-1"
              placeholder="e.g., Weight loss, Muscle gain"
            />
          </div>


          {/* Remarks */}
          <div>
            <label className="text-sm text-muted-foreground">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="input-dark w-full mt-1 resize-none"
              rows={2}
              placeholder="Any notes about the client"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting ? 'Adding...' : 'Add Client'}
          </button>
        </form>
      </div>
    </div>
  );
}
