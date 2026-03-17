import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  notes: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  created_at: string;
  updated_at: string;
}

export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent', icon: '🏠', color: 'hsl(var(--primary))' },
  { value: 'salary', label: 'Salary', icon: '👤', color: 'hsl(var(--info))' },
  { value: 'equipment', label: 'Equipment', icon: '🏋️', color: 'hsl(var(--accent))' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧', color: 'hsl(var(--warning))' },
  { value: 'utilities', label: 'Utilities', icon: '💡', color: 'hsl(var(--success))' },
  { value: 'marketing', label: 'Marketing', icon: '📢', color: 'hsl(var(--destructive))' },
  { value: 'supplements', label: 'Supplements', icon: '💊', color: 'hsl(var(--primary))' },
  { value: 'other', label: 'Other', icon: '📦', color: 'hsl(var(--muted-foreground))' },
] as const;

export const RECURRING_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('expenses').insert(expense);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Expense> & { id: string }) => {
      const { error } = await supabase.from('expenses').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
