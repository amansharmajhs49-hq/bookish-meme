import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'moderator' | 'super_admin' | 'admin' | 'user';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

/**
 * Hook to check if current user is super admin or moderator
 */
export function useIsSuperAdmin() {
  const { user, role } = useAuth();
  
  return useQuery({
    queryKey: ['is_super_admin', user?.id, role],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;
      if (role === 'moderator') return true;
      
      const { data, error } = await supabase
        .rpc('is_super_admin', { _user_id: user.id });
      
      if (error) {
        console.error('Error checking super admin status:', error);
        return false;
      }
      
      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to check if current user has admin, super_admin, or moderator role
 */
export function useIsAdmin() {
  const { user, role } = useAuth();
  
  return useQuery({
    queryKey: ['is_admin', user?.id, role],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;
      if (role === 'moderator' || role === 'super_admin' || role === 'admin') return true;
      
      const { data, error } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['moderator', 'super_admin', 'admin'] as any);
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get current user's roles
 */
export function useUserRoles() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user_roles', user?.id],
    queryFn: async (): Promise<UserRole[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await (supabase
        .from('user_roles' as any)
        .select('*')
        .eq('user_id', user.id) as any);
      
      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }
      
      return data as UserRole[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook to assign a role to a user (super admin only)
 */
export function useAssignRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles' as any)
        .insert({ user_id: userId, role: role as any } as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
    },
  });
}

/**
 * Hook to remove a role from a user (super admin only)
 */
export function useRemoveRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles' as any)
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
    },
  });
}
