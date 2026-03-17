import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AuditLog, AuditAction } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

// Fetch audit logs for a client
export function useClientAuditLogs(clientId: string) {
  return useQuery({
    queryKey: ['audit-logs', 'client', clientId],
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as unknown as AuditLog[];
    },
    enabled: !!clientId,
  });
}

// Fetch all audit logs (with pagination)
export function useAuditLogs(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['audit-logs', 'all', limit, offset],
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data || []) as unknown as AuditLog[];
    },
  });
}

// Create audit log entry
export function useCreateAuditLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      action: AuditAction;
      entityType: string;
      entityId: string;
      clientId?: string;
      oldData?: Record<string, unknown>;
      newData?: Record<string, unknown>;
      reason?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from('audit_logs').insert({
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        client_id: data.clientId || null,
        admin_id: user?.id || null,
        old_data: data.oldData as any || null,
        new_data: data.newData as any || null,
        reason: data.reason || null,
        metadata: (data.metadata || {}) as any,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      if (variables.clientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['audit-logs', 'client', variables.clientId] 
        });
      }
    },
  });
}

// Helper function to create audit log (can be called directly)
export async function createAuditLog(data: {
  action: AuditAction;
  entityType: string;
  entityId: string;
  clientId?: string;
  adminId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from('audit_logs').insert({
    action: data.action,
    entity_type: data.entityType,
    entity_id: data.entityId,
    client_id: data.clientId || null,
    admin_id: data.adminId || null,
    old_data: data.oldData as any || null,
    new_data: data.newData as any || null,
    reason: data.reason || null,
    metadata: (data.metadata || {}) as any,
  });

  if (error) {
    console.error('Failed to create audit log:', error);
    throw error;
  }
}

// Get human-readable action description
export function getActionDescription(action: AuditAction): string {
  const descriptions: Record<AuditAction, string> = {
    MEMBERSHIP_CREATED: 'Membership created',
    MEMBERSHIP_RENEWED: 'Membership renewed',
    MEMBERSHIP_EDITED: 'Membership edited',
    MEMBERSHIP_DELETED: 'Membership deleted',
    REJOIN_BLOCKED: 'Rejoin blocked due to unpaid dues',
    PAYMENT_APPLIED: 'Payment applied',
    PAYMENT_EDITED: 'Payment edited',
    PAYMENT_DELETED: 'Payment deleted',
    PAYMENT_DELETED_CASCADE: 'Payment auto-deleted (parent removed)',
    PARTIAL_PAYMENT: 'Partial payment received',
    ADVANCE_ADDED: 'Advance payment added',
    DUE_CLEARED: 'Dues cleared',
    PRODUCT_PURCHASE: 'Product purchased',
    PRODUCT_PAYMENT: 'Product payment received',
    PRODUCT_CREATED: 'Product created',
    PRODUCT_EDITED: 'Product edited',
    PRODUCT_PURCHASE_DELETED: 'Product purchase deleted',
    PRODUCT_PAYMENT_DELETED_CASCADE: 'Product payment auto-deleted',
    ADMIN_OVERRIDE: 'Admin override applied',
    STATUS_CHANGED: 'Status changed',
    CLIENT_CREATED: 'Client created',
    CLIENT_UPDATED: 'Client updated',
    CLIENT_DELETED: 'Client deleted',
  };
  return descriptions[action] || action;
}
