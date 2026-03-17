export interface Plan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  photo_path: string | null;
  status: 'Active' | 'Expired' | 'Left' | 'Deleted';
  goal: string | null;
  remarks: string | null;
  alias_name: string | null;
  created_at: string;
  updated_at: string;
  photo_url?: string;
  is_inactive?: boolean;
  advance_balance?: number;
}

export interface Join {
  id: string;
  client_id: string;
  plan_id: string | null;
  join_date: string;
  expiry_date: string;
  custom_price: number | null;
  created_at: string;
  plan?: Plan;
}

export interface Payment {
  id: string;
  client_id: string;
  join_id: string | null;
  amount: number;
  payment_method: 'cash' | 'online';
  payment_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment_type?: 'membership' | 'product' | 'mixed' | 'advance';
  product_purchase_id?: string | null;
  due_before?: number;
  due_after?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  active: boolean;
  tags: string[];
  category: string | null;
  created_at: string;
  updated_at: string;
}

export type AuditAction = 
  | 'MEMBERSHIP_CREATED'
  | 'MEMBERSHIP_RENEWED'
  | 'MEMBERSHIP_EDITED'
  | 'MEMBERSHIP_DELETED'
  | 'REJOIN_BLOCKED'
  | 'PAYMENT_APPLIED'
  | 'PAYMENT_EDITED'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_DELETED_CASCADE'
  | 'PARTIAL_PAYMENT'
  | 'ADVANCE_ADDED'
  | 'DUE_CLEARED'
  | 'PRODUCT_PURCHASE'
  | 'PRODUCT_PAYMENT'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_EDITED'
  | 'PRODUCT_PURCHASE_DELETED'
  | 'PRODUCT_PAYMENT_DELETED_CASCADE'
  | 'ADMIN_OVERRIDE'
  | 'STATUS_CHANGED'
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'CLIENT_DELETED';

export interface ProductPurchase {
  id: string;
  client_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  client_id: string | null;
  admin_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// AuditAction type is defined above with Product interface

// Strict membership statuses
export type MembershipStatus = 'ACTIVE' | 'PAYMENT_DUE' | 'EXPIRED' | 'LEFT' | 'INACTIVE';

export interface ClientWithDetails extends Client {
  joins: Join[];
  payments: Payment[];
  productPurchases?: ProductPurchase[];
  latestJoin?: Join;
  totalFees: number;
  paidAmount: number;
  dueAmount: number;
  productDues: number;
  totalDue: number; // membership dues + product dues - advance
  paymentStatus: 'Paid' | 'Partial' | 'Due';
  daysLeft: number;
  membershipStatus: MembershipStatus;
}

export type FilterType = 'all' | 'paid' | 'due' | 'partial' | 'active' | 'expired' | 'left' | 'deleted' | 'payment_due' | 'inactive' | 'expiring_soon';

export type ViewMode = 'card' | 'list';
