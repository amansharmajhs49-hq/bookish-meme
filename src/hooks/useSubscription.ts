import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const subscriptionKeys = {
  subscription: ['hosting_subscription'] as const,
  plans: ['hosting_plans_v2'] as const,
  locks: ['feature_locks'] as const,
};

export interface HostingPlan {
  id: string;
  plan_name: string;
  price: number;
  billing_cycle: string;
  description: string;
  features: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GymSubscription {
  id: string;
  admin_id: string;
  plan_id: string | null;
  status: 'active' | 'expired' | 'locked';
  start_date: string;
  expiry_date: string;
  payment_link: string;
  payment_qr: string;
  created_at: string;
  // Joined plan
  hosting_plan?: HostingPlan;
}

export interface FeatureLock {
  feature_key: string;
  is_locked: boolean;
  locked_message: string;
}

export function useSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: subscriptionKeys.subscription,
    enabled: !!user,
    queryFn: async (): Promise<GymSubscription | null> => {
      // JOIN hosting_plans_v2 on plan_id
      const { data, error } = await supabase
        .from('hosting_subscriptions')
        .select('*, hosting_plan:hosting_plans_v2(*)')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }
      return data as any;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeatureLocks() {
  return useQuery({
    queryKey: subscriptionKeys.locks,
    queryFn: async (): Promise<Record<string, FeatureLock>> => {
      const { data, error } = await supabase
        .from('feature_locks' as any)
        .select('*');

      if (error) {
        console.error('Error fetching feature locks:', error);
        return {};
      }

      const locks: Record<string, FeatureLock> = {};
      (data as any[]).forEach((lock) => {
        locks[lock.feature_key] = lock;
      });
      return locks;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useIsFeatureLocked(featureKey: string) {
  const { data: locks } = useFeatureLocks();
  const { role } = useAuth();

  if (role === 'moderator' || role === 'user') return { isLocked: false, message: '' };

  const lock = locks?.[featureKey];
  return {
    isLocked: lock?.is_locked ?? false,
    message: lock?.locked_message ?? 'This feature is currently locked.'
  };
}

export function useHostingPlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans,
    queryFn: async (): Promise<HostingPlan[]> => {
      const { data, error } = await supabase
        .from('hosting_plans_v2')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as HostingPlan[];
    }
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status, expiry_date, payment_qr, payment_link }: {
      id: string;
      status?: GymSubscription['status'];
      expiry_date?: string;
      payment_qr?: string | null;
      payment_link?: string | null;
    }) => {
      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (expiry_date) updates.expiry_date = expiry_date;
      if (payment_qr !== undefined) updates.payment_qr = payment_qr;
      if (payment_link !== undefined) updates.payment_link = payment_link;
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('hosting_subscriptions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.subscription });
      toast({ title: 'Subscription Updated', description: 'Changes saved.' });
    },
  });
}

export function useCreateHostingPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (plan: Omit<HostingPlan, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('hosting_plans_v2').insert([plan] as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.plans });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.subscription });
      toast({ title: 'Plan Created' });
    },
  });
}

export function useUpdateHostingPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HostingPlan> & { id: string }) => {
      const { error } = await supabase.from('hosting_plans_v2').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.plans });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.subscription });
      toast({ title: 'Plan Updated' });
    },
  });
}

export function useDeleteHostingPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hosting_plans_v2').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.plans });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.subscription });
      toast({ title: 'Plan Deleted' });
    },
  });
}

export function useUpdateFeatureLock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ featureKey, isLocked, lockedMessage }: { featureKey: string, isLocked: boolean, lockedMessage?: string }) => {
      const { error } = await supabase
        .from('feature_locks' as any)
        .upsert({
          feature_key: featureKey,
          is_locked: isLocked,
          ...(lockedMessage && { locked_message: lockedMessage }),
          updated_at: new Date().toISOString()
        } as any, { onConflict: 'feature_key' });

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: subscriptionKeys.locks });
      toast({ title: 'Feature Lock Updated' });
    },
  });
}
