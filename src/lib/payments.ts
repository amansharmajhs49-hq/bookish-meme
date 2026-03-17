/**
 * Payment Allocation Logic for Aesthetic Gym
 * 
 * Payment allocation order:
 * 1. Clear OLD dues (previous memberships)
 * 2. Apply to CURRENT membership
 * 3. Apply to PRODUCT dues
 * 4. Remaining → ADVANCE balance
 */

export interface PaymentAllocation {
  oldDuesCleared: number;
  membershipApplied: number;
  productDuesApplied: number;
  advanceAdded: number;
  totalApplied: number;
}

export interface DuesBreakdown {
  oldMembershipDues: number;
  currentMembershipDue: number;
  productDues: number;
  totalDues: number;
  advanceBalance: number;
  netDue: number;
}

/**
 * Allocate payment to different dues in priority order
 */
export function allocatePayment(
  paymentAmount: number,
  dues: DuesBreakdown
): PaymentAllocation {
  let remaining = paymentAmount;
  const allocation: PaymentAllocation = {
    oldDuesCleared: 0,
    membershipApplied: 0,
    productDuesApplied: 0,
    advanceAdded: 0,
    totalApplied: 0,
  };

  // Step 1: Clear old membership dues first
  if (remaining > 0 && dues.oldMembershipDues > 0) {
    const applied = Math.min(remaining, dues.oldMembershipDues);
    allocation.oldDuesCleared = applied;
    remaining -= applied;
  }

  // Step 2: Apply to current membership due
  if (remaining > 0 && dues.currentMembershipDue > 0) {
    const applied = Math.min(remaining, dues.currentMembershipDue);
    allocation.membershipApplied = applied;
    remaining -= applied;
  }

  // Step 3: Apply to product dues
  if (remaining > 0 && dues.productDues > 0) {
    const applied = Math.min(remaining, dues.productDues);
    allocation.productDuesApplied = applied;
    remaining -= applied;
  }

  // Step 4: Any remaining goes to advance balance
  if (remaining > 0) {
    allocation.advanceAdded = remaining;
  }

  allocation.totalApplied = paymentAmount;
  return allocation;
}

/**
 * Calculate dues breakdown for a client
 */
export function calculateDuesBreakdown(
  joins: Array<{ custom_price: number | null; plan?: { price: number } | null }>,
  payments: Array<{ amount: number; payment_type?: string }>,
  productPurchases: Array<{ total_price: number }>,
  advanceBalance: number
): DuesBreakdown {
  // Calculate total membership fees
  const totalMembershipFees = joins.reduce((sum, join) => {
    const price = join.custom_price ?? (join.plan?.price || 0);
    return sum + Number(price);
  }, 0);

  // Calculate membership payments (excluding product/advance)
  const membershipPayments = payments
    .filter(p => !p.payment_type || p.payment_type === 'membership' || p.payment_type === 'mixed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Calculate product purchases total
  const productPurchasesTotal = productPurchases.reduce(
    (sum, p) => sum + Number(p.total_price),
    0
  );

  // Calculate product payments
  const productPayments = payments
    .filter(p => p.payment_type === 'product')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Calculate membership dues
  const membershipDues = Math.max(0, totalMembershipFees - membershipPayments);
  
  // For simplicity, treat all membership dues as "current" - old dues tracking
  // would require more complex join-level tracking
  const currentMembershipDue = membershipDues;
  const oldMembershipDues = 0; // This could be enhanced with per-join tracking

  // Product dues
  const productDues = Math.max(0, productPurchasesTotal - productPayments);

  // Total and net
  const totalDues = membershipDues + productDues;
  const netDue = Math.max(0, totalDues - advanceBalance);

  return {
    oldMembershipDues,
    currentMembershipDue,
    productDues,
    totalDues,
    advanceBalance,
    netDue,
  };
}

/**
 * Validate payment can be processed
 */
export function validatePayment(amount: number): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Payment amount must be greater than 0' };
  }
  if (!Number.isFinite(amount)) {
    return { valid: false, error: 'Invalid payment amount' };
  }
  return { valid: true };
}
