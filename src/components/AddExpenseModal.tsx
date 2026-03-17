import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Check, Edit3, IndianRupee, CalendarDays, Tag, FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useCreateExpense, useUpdateExpense, EXPENSE_CATEGORIES, RECURRING_OPTIONS, type Expense } from '@/hooks/useExpenses';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editExpense?: Expense | null;
}

export function AddExpenseModal({ isOpen, onClose, editExpense }: AddExpenseModalProps) {
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const { toast } = useToast();
  const isEditing = !!editExpense;
  const amountRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'other',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    is_recurring: false,
    recurring_interval: 'monthly' as string,
  });

  useEffect(() => {
    if (isOpen) {
      if (editExpense) {
        setFormData({
          title: editExpense.title,
          amount: editExpense.amount.toString(),
          category: editExpense.category,
          expense_date: editExpense.expense_date,
          notes: editExpense.notes || '',
          is_recurring: editExpense.is_recurring,
          recurring_interval: editExpense.recurring_interval || 'monthly',
        });
      } else {
        setFormData({
          title: '',
          amount: '',
          category: 'other',
          expense_date: format(new Date(), 'yyyy-MM-dd'),
          notes: '',
          is_recurring: false,
          recurring_interval: 'monthly',
        });
      }
      setTimeout(() => amountRef.current?.focus(), 150);
    }
  }, [editExpense, isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.title.trim() || !formData.amount) {
      toast({ title: 'Please fill title and amount', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        amount: Number(formData.amount),
        category: formData.category,
        expense_date: formData.expense_date,
        notes: formData.notes.trim() || null,
        is_recurring: formData.is_recurring,
        recurring_interval: formData.is_recurring ? formData.recurring_interval : null,
      };
      if (isEditing && editExpense) {
        await updateExpense.mutateAsync({ id: editExpense.id, ...payload });
        toast({ title: 'Expense updated!' });
      } else {
        await createExpense.mutateAsync(payload);
        toast({ title: 'Expense added!' });
      }
      onClose();
    } catch (error: any) {
      toast({ title: error.message || 'Failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const set = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));
  const selectedCat = EXPENSE_CATEGORIES.find(c => c.value === formData.category);
  const isValid = formData.title.trim() && formData.amount;

  // Detect what changed in edit mode
  const changes: string[] = [];
  if (isEditing && editExpense) {
    if (formData.title.trim() !== editExpense.title) changes.push('title');
    if (Number(formData.amount) !== editExpense.amount) changes.push('amount');
    if (formData.category !== editExpense.category) changes.push('category');
    if (formData.expense_date !== editExpense.expense_date) changes.push('date');
    if ((formData.notes.trim() || '') !== (editExpense.notes || '')) changes.push('notes');
    if (formData.is_recurring !== editExpense.is_recurring) changes.push('type');
    if (formData.recurring_interval !== (editExpense.recurring_interval || 'monthly')) changes.push('interval');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-card animate-slide-in-right overscroll-contain">
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/50">
          <div className="flex items-center justify-between px-5 py-3">
            <button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors active:scale-95">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              {isEditing && <Edit3 className="h-3.5 w-3.5 text-primary" />}
              <h2 className="text-base font-bold">{isEditing ? 'Edit Expense' : 'New Expense'}</h2>
            </div>
            <button
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !isValid}
              className={cn(
                'px-4 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95',
                isValid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isSubmitting ? '...' : isEditing ? 'Save' : 'Add'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-4 pb-12 space-y-5">
          {/* Edit change indicator */}
          {isEditing && editExpense && (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Edit3 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-widest">Editing Expense</p>
                  <p className="text-sm font-bold truncate">{editExpense.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5 bg-card/80 rounded-lg px-2.5 py-1.5">
                  <IndianRupee className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold">₹{Number(editExpense.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-card/80 rounded-lg px-2.5 py-1.5">
                  <CalendarDays className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{format(new Date(editExpense.expense_date), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-card/80 rounded-lg px-2.5 py-1.5">
                  <span>{EXPENSE_CATEGORIES.find(c => c.value === editExpense.category)?.icon || '📦'}</span>
                  <span className="font-medium">{EXPENSE_CATEGORIES.find(c => c.value === editExpense.category)?.label || editExpense.category}</span>
                </div>
              </div>
              {changes.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-primary/60 font-medium">Changed:</span>
                  {changes.map(c => (
                    <span key={c} className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md capitalize">{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Amount Hero */}
          <div className="rounded-2xl border-2 border-destructive/15 bg-destructive/5 py-6 px-4 text-center">
            <p className="text-[10px] font-semibold text-destructive/60 uppercase tracking-widest mb-2">Amount</p>
            <div className="flex items-center justify-center gap-0.5">
              <span className="text-3xl font-extrabold text-destructive">₹</span>
              <input
                ref={amountRef}
                type="number"
                inputMode="decimal"
                value={formData.amount}
                onChange={(e) => set('amount', e.target.value)}
                className="bg-transparent text-center text-4xl font-extrabold text-destructive w-44 outline-none placeholder:text-destructive/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
                required
              />
            </div>
            {isEditing && editExpense && Number(formData.amount) !== editExpense.amount && Number(formData.amount) > 0 && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground animate-fade-in">
                <span>₹{Number(editExpense.amount).toLocaleString('en-IN')}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-bold text-destructive">₹{Number(formData.amount).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => set('title', e.target.value)}
              className="input-dark w-full text-base"
              placeholder="e.g., Monthly Rent, Trainer Salary"
              required
            />
          </div>

          {/* Category Horizontal Scroll */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {EXPENSE_CATEGORIES.map((cat) => {
                const active = formData.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => set('category', cat.value)}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all active:scale-95',
                      active
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-transparent bg-muted/50'
                    )}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className={cn('text-xs font-medium whitespace-nowrap', active ? 'text-primary' : 'text-muted-foreground')}>{cat.label}</span>
                    {active && <Check className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + Recurring */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" /> Date
              </label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => set('expense_date', e.target.value)}
                className="input-dark w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
              <button
                type="button"
                onClick={() => set('is_recurring', !formData.is_recurring)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 transition-all active:scale-[0.98]',
                  formData.is_recurring
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className={cn('h-4 w-4 transition-transform', formData.is_recurring ? 'text-primary animate-spin-slow' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', formData.is_recurring ? 'text-primary' : 'text-muted-foreground')}>
                    {formData.is_recurring ? 'Recurring' : 'One-time'}
                  </span>
                </div>
                <div className={cn(
                  'w-8 h-5 rounded-full transition-colors flex items-center px-0.5',
                  formData.is_recurring ? 'bg-primary justify-end' : 'bg-muted justify-start'
                )}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-all" />
                </div>
              </button>
            </div>
          </div>

          {/* Recurring Interval */}
          {formData.is_recurring && (
            <div className="flex gap-2 animate-fade-in">
              {RECURRING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('recurring_interval', opt.value)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95',
                    formData.recurring_interval === opt.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Notes <span className="font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="input-dark w-full resize-none"
              rows={2}
              placeholder="Add details about this expense..."
            />
          </div>
        </form>
      </div>
    </div>
  );
}
