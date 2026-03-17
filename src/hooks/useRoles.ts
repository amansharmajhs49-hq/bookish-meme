import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'super_admin' | 'admin' | 'user';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

/**
 * Hook to check if current user is super admin
 */
export function useIsSuperAdmin() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['is_super_admin', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;
      
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
 * Hook to check if current user has admin or super_admin role
 */
export function useIsAdmin() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['is_admin', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['super_admin', 'admin']);
      
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
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
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
        .from('user_roles')
        .insert({ user_id: userId, role });
      
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
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
    },
  });
}
