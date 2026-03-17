import { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, ArrowRight, ArrowLeft, Check, ShieldCheck, ChevronDown, CalendarDays } from 'lucide-react';
import { PaymentUpiQr } from '@/components/PaymentUpiQr';
import { usePlans } from '@/hooks/usePlans';
import { useCreateClient } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { calculateExpiryDate, formatDate, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_STEPS = 3;

export function AddClientModal({ isOpen, onClose }: AddClientModalProps) {
  const { data: plans, isLoading: isPlansLoading, refetch: refetchPlans } = usePlans();
  const createClient = useCreateClient();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
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
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPlanDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  const activePlans = plans?.filter((p) => p.active) || [];
  const selectedPlan = plans?.find((p) => p.id === formData.plan_id);
  const effectivePrice = formData.custom_price ? Number(formData.custom_price) : selectedPlan?.price;
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
    if (digits.length >= 4) return digits.slice(-4);
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.first_name || !formData.phone) {
        toast({ title: 'First Name and Phone are required', variant: 'destructive' });
        return false;
      }
      if (formData.phone.length < 10) {
        toast({ title: 'Please enter a valid phone number', variant: 'destructive' });
        return false;
      }
    }
    if (step === 3) {
      if (!formData.plan_id) {
        toast({ title: 'Please select a membership plan', variant: 'destructive' });
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateStep(3)) return;
    setIsSubmitting(true);

    try {
      let photo_path: string | undefined;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('client-photos').upload(fileName, photoFile);
        if (uploadError) throw uploadError;
        photo_path = fileName;
      }

      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      const result = await createClient.mutateAsync({
        name: fullName,
        first_name: formData.first_name,
        last_name: formData.last_name || '',
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

      let pin = generatePin(formData.phone);
      const { data: existingPins } = await supabase.from('clients').select('pin').eq('pin', pin).neq('id', result.id);
      if (existingPins && existingPins.length > 0) pin = String(Math.floor(1000 + Math.random() * 9000));

      const aliasValue = formData.alias_name.trim() || null;
      await supabase.from('clients').update({ pin, alias_name: aliasValue } as any).eq('id', result.id);

      toast({ title: 'Client added successfully!', description: `Portal PIN: ${pin}` });
      onClose();
      resetForm();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to add client', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      first_name: '', last_name: '', phone: '', goal: '', remarks: '', plan_id: '', custom_price: '',
      join_date: format(new Date(), 'yyyy-MM-dd'), initial_payment: '', payment_method: 'cash', alias_name: '',
    });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  if (!isOpen) return null;

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  const stepLabels = ['Client Details', 'Goals & Notes', 'Plan & Payment'];

  const inputClass =
    'w-full bg-background border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm overflow-hidden"
      onClick={onClose}
      data-swipe-ignore="true"
      style={{ touchAction: 'none' }}
      onTouchMove={(e) => e.preventDefault()}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="w-full max-w-md max-h-[92vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div className="w-full bg-muted/40 h-1.5 shrink-0">
          <motion.div
            className="h-full bg-primary rounded-r-full"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">New Client</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {currentStep} of {TOTAL_STEPS} — {stepLabels[currentStep - 1]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="px-5 py-3 overflow-y-auto flex-1 min-h-0">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {/* ─── Step 1: Details ─── */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Photo */}
                  <div className="flex justify-center">
                    <label className="group relative cursor-pointer">
                      <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                      <div className="h-[72px] w-[72px] rounded-full bg-muted/50 flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary/40 transition-colors">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                          <Camera className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                        <Upload className="h-3 w-3" />
                      </div>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">First Name *</label>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className={inputClass}
                          placeholder="Rahul"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Last Name</label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className={inputClass}
                          placeholder="Sharma"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone Number *</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={cn(inputClass, 'font-mono tracking-wide')}
                        placeholder="+91 00000 00000"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Alias Name <span className="text-muted-foreground/40">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.alias_name}
                        onChange={(e) => setFormData({ ...formData, alias_name: e.target.value })}
                        className={inputClass}
                        placeholder="e.g. Rahul Morning Batch"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── Step 2: Goals ─── */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Primary Goal</label>
                      <input
                        type="text"
                        value={formData.goal}
                        onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                        className={inputClass}
                        placeholder="e.g. Weight Loss, Muscle Building"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Health Notes / Remarks</label>
                      <textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        className={cn(inputClass, 'min-h-[110px] resize-none')}
                        placeholder="Any injuries, medical conditions, or notes..."
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── Step 3: Plan & Payment ─── */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Plan Dropdown */}
                  <div ref={dropdownRef} className="relative">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Membership Plan *</label>
                    <button
                      type="button"
                      onClick={() => setPlanDropdownOpen(!planDropdownOpen)}
                      className={cn(
                        inputClass,
                        'flex items-center justify-between text-left',
                        !formData.plan_id && 'text-muted-foreground/50'
                      )}
                    >
                      <span className="truncate">
                        {selectedPlan
                          ? `${selectedPlan.name} — ₹${selectedPlan.price} / ${selectedPlan.duration_months}mo`
                          : 'Select a plan'}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
                          planDropdownOpen && 'rotate-180'
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {planDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                        >
                          {isPlansLoading ? (
                            <div className="p-3 text-center text-xs text-muted-foreground">Loading plans...</div>
                          ) : activePlans.length === 0 ? (
                            <div className="p-3 text-center text-xs text-muted-foreground space-y-1">
                              <p>No active plans found</p>
                              <button type="button" onClick={() => refetchPlans()} className="text-primary font-medium hover:underline">
                                Retry
                              </button>
                            </div>
                          ) : (
                            activePlans.map((plan) => (
                              <button
                                key={plan.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, plan_id: plan.id });
                                  setPlanDropdownOpen(false);
                                }}
                                className={cn(
                                  'w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors border-b border-border/30 last:border-0',
                                  formData.plan_id === plan.id && 'bg-primary/5'
                                )}
                              >
                                <div>
                                  <p className={cn('text-sm font-medium', formData.plan_id === plan.id ? 'text-primary' : 'text-foreground')}>
                                    {plan.name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}
                                  </p>
                                </div>
                                <span className={cn('text-sm font-semibold', formData.plan_id === plan.id ? 'text-primary' : 'text-foreground')}>
                                  ₹{plan.price}
                                </span>
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Custom Price */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Custom Price <span className="text-muted-foreground/40">(override plan price)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                      <input
                        type="number"
                        value={formData.custom_price}
                        onChange={(e) => setFormData({ ...formData, custom_price: e.target.value })}
                        className={cn(inputClass, 'pl-7')}
                        placeholder={selectedPlan ? String(selectedPlan.price) : '0'}
                      />
                    </div>
                  </div>

                  {/* Join Date & Expiry Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Join Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.join_date}
                          onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                          className={cn(inputClass, 'text-xs pr-3')}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Expiry Date</label>
                      <div
                        className={cn(
                          'flex items-center gap-2 px-4 py-3 rounded-xl border text-xs',
                          expiryDate
                            ? 'bg-primary/5 border-primary/20 text-foreground'
                            : 'bg-muted/20 border-border text-muted-foreground/50'
                        )}
                      >
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium">{expiryDate ? formatDate(expiryDate) : 'Select plan first'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Effective Price Summary */}
                  {selectedPlan && (
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-xs text-muted-foreground">Effective Price</span>
                      <span className="text-sm font-semibold text-foreground">
                        ₹{effectivePrice ?? selectedPlan.price}
                        {formData.custom_price && Number(formData.custom_price) !== selectedPlan.price && (
                          <span className="text-xs text-muted-foreground line-through ml-1.5">₹{selectedPlan.price}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Initial Payment */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Initial Payment</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                        <input
                          type="number"
                          value={formData.initial_payment}
                          onChange={(e) => setFormData({ ...formData, initial_payment: e.target.value })}
                          className={cn(inputClass, 'pl-7')}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex bg-muted/30 border border-border rounded-xl p-1 gap-0.5 shrink-0">
                        {(['cash', 'online'] as const).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setFormData({ ...formData, payment_method: method })}
                            className={cn(
                              'px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all',
                              formData.payment_method === method
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* UPI QR */}
                  <AnimatePresence>
                    {formData.payment_method === 'online' && formData.initial_payment && Number(formData.initial_payment) > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white p-4 rounded-xl shadow-lg">
                          <PaymentUpiQr
                            amount={Number(formData.initial_payment)}
                            clientName={`${formData.first_name} ${formData.last_name}`.trim() || 'New Client'}
                            note={`Membership — ${selectedPlan?.name || ''}`}
                          />
                          <div className="mt-3 flex items-center justify-center gap-1.5 opacity-50">
                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                            <p className="text-[10px] text-zinc-500">Secure UPI Payment</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50 flex gap-2 shrink-0">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}

          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {isSubmitting ? 'Adding...' : <><Check className="h-3.5 w-3.5" /> Add Client</>}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
