import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductPurchase } from '@/lib/types';
import { createAuditLog } from './useAuditLog';

// Fetch all products
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Product[];
    },
  });
}

// Create product
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      price: number;
      stock?: number;
      tags?: string[];
      category?: string;
    }) => {
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          name: data.name,
          description: data.description || null,
          price: data.price,
          stock: data.stock || 0,
          active: true,
          tags: data.tags || [],
          category: data.category || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Update product
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Product> & { id: string }) => {
      const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Delete product (soft delete by setting active = false)
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Fetch product purchases for a client
export function useClientProductPurchases(clientId: string) {
  return useQuery({
    queryKey: ['product-purchases', clientId],
    queryFn: async (): Promise<ProductPurchase[]> => {
      const { data, error } = await supabase
        .from('product_purchases')
        .select('*, product:products(*)')
        .eq('client_id', clientId)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        product: p.product as Product | undefined,
      })) as ProductPurchase[];
    },
    enabled: !!clientId,
  });
}

// Create product purchase
export function useCreateProductPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
      adminId?: string;
    }) => {
      const totalPrice = data.quantity * data.unitPrice;
      
      const { data: purchase, error } = await supabase
        .from('product_purchases')
        .insert({
          client_id: data.clientId,
          product_id: data.productId,
          quantity: data.quantity,
          unit_price: data.unitPrice,
          total_price: totalPrice,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await createAuditLog({
        action: 'PRODUCT_PURCHASE',
        entityType: 'product_purchase',
        entityId: purchase.id,
        clientId: data.clientId,
        adminId: data.adminId,
        newData: {
          productId: data.productId,
          quantity: data.quantity,
          totalPrice,
        },
      });

      // Update product stock manually
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', data.productId)
        .single();
      
      if (product) {
        await supabase
          .from('products')
          .update({ stock: Math.max(0, product.stock - data.quantity) })
          .eq('id', data.productId);
      }

      return purchase;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-purchases', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Delete product purchase with cascade
export function useDeleteProductPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId, adminId }: { id: string; clientId: string; adminId?: string }) => {
      // CASCADE: Find and delete linked payments first
      const { data: linkedPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('product_purchase_id', id);

      if (linkedPayments && linkedPayments.length > 0) {
        for (const payment of linkedPayments) {
          await supabase.from('payments').delete().eq('id', payment.id);
          await createAuditLog({
            action: 'PRODUCT_PAYMENT_DELETED_CASCADE',
            entityType: 'payment',
            entityId: payment.id,
            clientId,
            adminId,
            oldData: { amount: payment.amount, date: payment.payment_date },
            reason: `Cascade deleted with product purchase ${id}`,
            metadata: { parentPurchaseId: id },
          }).catch(console.error);
        }
      }

      const { error } = await supabase
        .from('product_purchases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await createAuditLog({
        action: 'PRODUCT_PURCHASE_DELETED',
        entityType: 'product_purchase',
        entityId: id,
        clientId,
        adminId,
        reason: 'Product purchase deleted',
        metadata: { cascadedPayments: linkedPayments?.length || 0 },
      }).catch(console.error);

      return { clientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['product-purchases', result.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', result.clientId] });
    },
  });
}

// Calculate product dues for a client
export function calculateProductDues(
  purchases: ProductPurchase[],
  productPayments: number
): number {
  const totalPurchases = purchases.reduce(
    (sum, p) => sum + Number(p.total_price),
    0
  );
  return Math.max(0, totalPurchases - productPayments);
}
