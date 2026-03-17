import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, ClientWithDetails, Join, Payment, Plan, MembershipStatus, ProductPurchase } from '@/lib/types';
import { getDaysLeft } from '@/lib/utils';
import { evaluateMembershipStatus } from '@/lib/membership';
import { createAuditLog } from '@/hooks/useAuditLog';

async function getSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from('client-photos')
    .createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

// Extended client type with membership evaluation
export interface ClientWithMembership extends ClientWithDetails {
  membershipStatus: MembershipStatus;
  membershipTooltip: string;
  canRenew: boolean;
  isPaymentBlocked: boolean;
  isInactive: boolean;
  productDues: number;
  totalDue: number;
  advanceBalance: number;
}

async function fetchClientData() {
  const [clientsRes, joinsRes, paymentsRes, purchasesRes] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: true }),
    supabase.from('joins').select('*, plan:plans(*)').order('created_at', { ascending: true }),
    supabase.from('payments').select('*').order('created_at', { ascending: false }),
    supabase.from('product_purchases').select('*, product:products(*)').order('created_at', { ascending: false }),
  ]);

  if (clientsRes.error) throw clientsRes.error;
  if (joinsRes.error) throw joinsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  // product_purchases might not exist yet for some setups
  clientsRes.data?.sort((a, b) => {
  const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  if (dateDiff !== 0) return dateDiff;
  return b.id - a.id;
});
  return {
    clients: clientsRes.data as any[],
    joins: joinsRes.data as any[],
    payments: paymentsRes.data as any[],
    purchases: purchasesRes.data as any[] || [],
  };
}

function buildClientWithMembership(
  client: any,
  clientJoins: Join[],
  clientPayments: Payment[],
  clientPurchases: ProductPurchase[],
  photoUrl: string | null
): ClientWithMembership {
  const latestJoin = clientJoins[0];

  const totalFees = clientJoins.reduce((sum, j) => {
    const price = j.custom_price ?? (j.plan?.price || 0);
    return sum + Number(price);
  }, 0);

  const paidAmount = clientPayments
    .filter(p => !p.payment_type || p.payment_type === 'membership' || p.payment_type === 'mixed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const dueAmount = Math.max(0, totalFees - paidAmount);

  // Product dues
  const productTotal = clientPurchases.reduce((sum, p) => sum + Number(p.total_price), 0);
  const productPayments = clientPayments
    .filter(p => p.payment_type === 'product')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const productDues = Math.max(0, productTotal - productPayments);

  const advanceBalance = Number(client.advance_balance || 0);
  const totalDue = Math.max(0, dueAmount + productDues - advanceBalance);

  let paymentStatus: 'Paid' | 'Partial' | 'Due' = 'Due';
  if (totalDue === 0 && totalFees > 0) {
    paymentStatus = 'Paid';
  } else if (paidAmount > 0 && totalDue > 0) {
    paymentStatus = 'Partial';
  }

  const isInactive = client.is_inactive === true;
  const isLeft = client.status === 'Left';

  // Evaluate membership status
  const evaluation = evaluateMembershipStatus({
    isInactive,
    isLeft,
    dueAmount,
    productDues,
    advanceBalance,
    expiryDate: latestJoin?.expiry_date || null,
  });

  return {
    ...client,
    photo_url: photoUrl || undefined,
    joins: clientJoins,
    payments: clientPayments,
    productPurchases: clientPurchases,
    latestJoin,
    totalFees,
    paidAmount,
    dueAmount,
    productDues,
    totalDue,
    advanceBalance,
    paymentStatus,
    daysLeft: evaluation.daysLeft,
    membershipStatus: evaluation.status,
    membershipTooltip: evaluation.tooltip,
    canRenew: evaluation.canRenew,
    isPaymentBlocked: evaluation.isPaymentBlocked,
    isInactive,
  } as ClientWithMembership;
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<ClientWithMembership[]> => {
      const { clients, joins, payments, purchases } = await fetchClientData();

      const clientsWithDetails: ClientWithMembership[] = await Promise.all(
        clients.map(async (client) => {
          const clientJoins = joins
            .filter((j: any) => j.client_id === client.id)
            .map((j: any) => ({ ...j, plan: j.plan as Plan | undefined })) as Join[];

          const clientPayments = payments.filter(
            (p: any) => p.client_id === client.id
          ) as Payment[];

          const clientPurchases = purchases
            .filter((p: any) => p.client_id === client.id)
            .map((p: any) => ({ ...p, product: p.product })) as ProductPurchase[];

          const photo_url = client.photo_path
            ? await getSignedUrl(client.photo_path)
            : null;

          return buildClientWithMembership(client, clientJoins, clientPayments, clientPurchases, photo_url);
        })
      );

      // Sort by latest join created_at desc so renewals/extensions bump to top,
      // but basic client edits don't change order
      clientsWithDetails.sort((a, b) => {
        const aDate = a.latestJoin?.created_at || a.created_at;
        const bDate = b.latestJoin?.created_at || b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      return clientsWithDetails;
    },
    staleTime: 30 * 1000,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async (): Promise<ClientWithMembership | null> => {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!client) return null;

      const [joinsRes, paymentsRes, purchasesRes] = await Promise.all([
    supabase.from('joins').select('*, plan:plans(*)').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('product_purchases').select('*, product:products(*)').eq('client_id', id).order('created_at', { ascending: false }),
      ]);

      const clientJoins = (joinsRes.data || []).map((j: any) => ({
        ...j, plan: j.plan as Plan | undefined,
      })) as Join[];

      const clientPayments = (paymentsRes.data || []) as Payment[];
      const clientPurchases = (purchasesRes.data || []).map((p: any) => ({
        ...p, product: p.product,
      })) as ProductPurchase[];

      const photo_url = (client as any).photo_path
        ? await getSignedUrl((client as any).photo_path)
        : null;

      return buildClientWithMembership(client, clientJoins, clientPayments, clientPurchases, photo_url);
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      phone: string;
      goal?: string;
      remarks?: string;
      photo_path?: string;
      plan_id: string;
      custom_price?: number;
      join_date: string;
      expiry_date: string;
      initial_payment?: number;
      payment_method?: 'cash' | 'online';
      adminId?: string;
    }) => {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: data.name,
          phone: data.phone,
          goal: data.goal,
          remarks: data.remarks,
          photo_path: data.photo_path,
          status: 'Active',
        })
        .select()
        .single();

      if (clientError) throw clientError;

      const { data: joinData, error: joinError } = await supabase.from('joins').insert({
        client_id: client.id,
        plan_id: data.plan_id,
        join_date: data.join_date,
        expiry_date: data.expiry_date,
        custom_price: data.custom_price,
      }).select().single();

      if (joinError) throw joinError;

      // Calculate the plan price for due tracking
      const planPrice = data.custom_price ?? 0;
      // We need to fetch plan price if custom_price not set
      let totalFee = planPrice;
      if (!data.custom_price) {
        const { data: planData } = await supabase.from('plans').select('price').eq('id', data.plan_id).single();
        totalFee = planData?.price || 0;
      }

      if (data.initial_payment && data.initial_payment > 0) {
        const dueBefore = totalFee;
        const dueAfter = Math.max(0, totalFee - data.initial_payment);
        await supabase.from('payments').insert({
          client_id: client.id,
          amount: data.initial_payment,
          payment_method: data.payment_method || 'cash',
          payment_date: data.join_date,
          payment_type: 'membership',
          join_id: joinData.id,
          due_before: dueBefore,
          due_after: dueAfter,
        });

        // Audit log for initial payment
        const payAction = dueAfter === 0 ? 'PAYMENT_APPLIED' : 'PARTIAL_PAYMENT';
        await createAuditLog({
          action: payAction,
          entityType: 'payment',
          entityId: client.id,
          clientId: client.id,
          adminId: data.adminId,
          newData: {
            amount: data.initial_payment,
            method: data.payment_method || 'cash',
            type: 'membership',
            dueBefore,
            dueAfter,
            plan: joinData.id,
          },
        }).catch(console.error);
      }

      // Audit log for client + membership creation
      await createAuditLog({
        action: 'CLIENT_CREATED',
        entityType: 'client',
        entityId: client.id,
        clientId: client.id,
        adminId: data.adminId,
        newData: {
          name: data.name,
          phone: data.phone,
          plan_id: data.plan_id,
          fee: totalFee,
          initialPayment: data.initial_payment || 0,
          due: Math.max(0, totalFee - (data.initial_payment || 0)),
          joinDate: data.join_date,
          expiryDate: data.expiry_date,
        },
      }).catch(console.error);

      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Client> & { id: string; is_inactive?: boolean }) => {
      const { error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (variables) => {
      // Optimistically update the client in the list to prevent reorder/flash
      await queryClient.cancelQueries({ queryKey: ['clients'] });
      const previous = queryClient.getQueryData<ClientWithMembership[]>(['clients']);
      if (previous) {
        queryClient.setQueryData<ClientWithMembership[]>(['clients'], (old) =>
          old?.map((c) => (c.id === variables.id ? { ...c, ...variables } : c)) ?? []
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['clients'], context.previous);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'Deleted' })
        .eq('id', id);

      if (error) throw error;

      await createAuditLog({
        action: 'CLIENT_DELETED',
        entityType: 'client',
        entityId: id,
        clientId: id,
      }).catch(console.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useRestoreClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'Active' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function usePermanentlyDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('payments').delete().eq('client_id', id);
      await supabase.from('product_purchases').delete().eq('client_id', id);
      await supabase.from('joins').delete().eq('client_id', id);
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useRejoinClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      client_id: string;
      plan_id: string;
      custom_price?: number;
      join_date: string;
      expiry_date: string;
      initial_payment?: number;
      payment_method?: 'cash' | 'online';
      adminId?: string;
    }) => {
      await supabase
        .from('clients')
        .update({ status: 'Active', is_inactive: false })
        .eq('id', data.client_id);

      const { data: joinData, error: joinError } = await supabase.from('joins').insert({
        client_id: data.client_id,
        plan_id: data.plan_id,
        join_date: data.join_date,
        expiry_date: data.expiry_date,
        custom_price: data.custom_price,
      }).select().single();

      if (joinError) throw joinError;

      let totalFee = data.custom_price ?? 0;
      if (!data.custom_price) {
        const { data: planData } = await supabase.from('plans').select('price').eq('id', data.plan_id).single();
        totalFee = planData?.price || 0;
      }

      if (data.initial_payment && data.initial_payment > 0) {
        const dueBefore = totalFee;
        const dueAfter = Math.max(0, totalFee - data.initial_payment);
        await supabase.from('payments').insert({
          client_id: data.client_id,
          amount: data.initial_payment,
          payment_method: data.payment_method || 'cash',
          payment_date: data.join_date,
          payment_type: 'membership',
          join_id: joinData.id,
          due_before: dueBefore,
          due_after: dueAfter,
        });

        // Audit log for initial payment
        const payAction = dueAfter === 0 ? 'PAYMENT_APPLIED' : 'PARTIAL_PAYMENT';
        await createAuditLog({
          action: payAction,
          entityType: 'payment',
          entityId: data.client_id,
          clientId: data.client_id,
          adminId: data.adminId,
          newData: {
            amount: data.initial_payment,
            method: data.payment_method || 'cash',
            type: 'membership',
            dueBefore,
            dueAfter,
          },
        }).catch(console.error);
      }

      await createAuditLog({
        action: 'MEMBERSHIP_RENEWED',
        entityType: 'membership',
        entityId: data.client_id,
        clientId: data.client_id,
        adminId: data.adminId,
        newData: {
          plan_id: data.plan_id,
          join_date: data.join_date,
          expiry_date: data.expiry_date,
          fee: totalFee,
          initialPayment: data.initial_payment || 0,
          due: Math.max(0, totalFee - (data.initial_payment || 0)),
        },
      }).catch(console.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// Toggle inactive status
export function useToggleInactive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isInactive }: { id: string; isInactive: boolean }) => {
      const { error } = await supabase
        .from('clients')
        .update({ is_inactive: isInactive })
        .eq('id', id);

      if (error) throw error;

      await createAuditLog({
        action: 'ADMIN_OVERRIDE',
        entityType: 'client',
        entityId: id,
        clientId: id,
        newData: { is_inactive: isInactive },
        reason: isInactive ? 'Admin disabled membership' : 'Admin reactivated membership',
      }).catch(console.error);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
    },
  });
}

// Update advance balance
export function useUpdateAdvanceBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase
        .from('clients')
        .update({ advance_balance: amount })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
    },
  });
}
