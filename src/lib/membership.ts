/**
 * Membership Status Logic for Aesthetic Gym
 * 
 * Status Priority (evaluated in this exact order):
 * 1. INACTIVE (admin disabled)
 * 2. LEFT (client voluntarily left)
 * 3. PAYMENT_DUE (has pending balance - overrides expiry)
 * 4. EXPIRED (past expiry date)
 * 5. ACTIVE (valid membership)
 */

import { differenceInDays, parseISO, endOfDay, isAfter } from 'date-fns';

export type MembershipStatus = 'ACTIVE' | 'PAYMENT_DUE' | 'EXPIRED' | 'LEFT' | 'INACTIVE';

export interface MembershipEvaluation {
  status: MembershipStatus;
  daysLeft: number;
  isPaymentBlocked: boolean;
  canRenew: boolean;
  tooltip: string;
}

export interface EvaluationInput {
  isInactive: boolean;
  isLeft: boolean;
  dueAmount: number;
  productDues: number;
  advanceBalance: number;
  expiryDate: string | Date | null;
}

/**
 * Calculate net due considering advance balance
 */
export function calculateNetDue(membershipDues: number, productDues: number, advanceBalance: number): number {
  const totalDues = membershipDues + productDues;
  return Math.max(0, totalDues - advanceBalance);
}

/**
 * Evaluates membership status based on strict priority rules
 */
export function evaluateMembershipStatus(input: EvaluationInput): MembershipEvaluation {
  const { isInactive, isLeft, dueAmount, productDues, advanceBalance, expiryDate } = input;
  
  let status: MembershipStatus = 'ACTIVE';
  let tooltip = '';
  let daysLeft = 0;
  
  // Calculate days left if we have an expiry date
  if (expiryDate) {
    const expiry = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
    const endOfExpiryDay = endOfDay(expiry);
    const now = new Date();
    
    // Calculate days difference - membership valid until 23:59 of end date
    daysLeft = differenceInDays(endOfExpiryDay, now);
    if (isAfter(now, endOfExpiryDay)) {
      daysLeft = Math.min(daysLeft, -1); // Ensure negative if past
    }
  }

  // Calculate net due amount
  const netDue = calculateNetDue(dueAmount, productDues, advanceBalance);

  // Priority 1: INACTIVE (admin override)
  if (isInactive) {
    status = 'INACTIVE';
    tooltip = 'This membership has been disabled by an administrator.';
    return {
      status,
      daysLeft,
      isPaymentBlocked: true,
      canRenew: false,
      tooltip,
    };
  }

  // Priority 2: LEFT (client voluntarily left)
  if (isLeft) {
    status = 'LEFT';
    tooltip = netDue > 0 
      ? `Client has left with outstanding dues of ₹${netDue.toLocaleString('en-IN')}. Dues must be cleared before rejoin.`
      : 'Client has voluntarily left the gym.';
    return {
      status,
      daysLeft,
      isPaymentBlocked: netDue > 0,
      canRenew: netDue === 0, // Can rejoin only if no dues
      tooltip,
    };
  }

  // Priority 3: PAYMENT_DUE (overrides expiry)
  if (netDue > 0) {
    status = 'PAYMENT_DUE';
    tooltip = `Payment of ₹${netDue.toLocaleString('en-IN')} is pending. Clear dues to enable membership renewal.`;
    return {
      status,
      daysLeft,
      isPaymentBlocked: true,
      canRenew: false,
      tooltip,
    };
  }

  // Priority 4: EXPIRED (past expiry date at 23:59)
  if (daysLeft < 0) {
    status = 'EXPIRED';
    tooltip = 'Membership has expired. Renew to continue training.';
    return {
      status,
      daysLeft,
      isPaymentBlocked: false,
      canRenew: true, // Expired + no dues = can renew
      tooltip,
    };
  }

  // Priority 5: ACTIVE
  status = 'ACTIVE';
  tooltip = `Membership is active with ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`;
  return {
    status,
    daysLeft,
    isPaymentBlocked: false,
    canRenew: false, // Can't renew if active - user requested removing extend
    tooltip,
  };
}

/**
 * Get status color for visual indicators
 */
export function getStatusColorClass(status: MembershipStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-400 bg-green-500/20';
    case 'PAYMENT_DUE':
      return 'text-yellow-400 bg-yellow-500/20';
    case 'EXPIRED':
      return 'text-red-400 bg-red-500/20';
    case 'LEFT':
      return 'text-orange-400 bg-orange-500/20';
    case 'INACTIVE':
      return 'text-muted-foreground bg-muted';
  }
}

/**
 * Get status dot color for timeline/badge indicators
 */
export function getStatusDotColor(status: MembershipStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-500';
    case 'PAYMENT_DUE':
      return 'bg-yellow-500';
    case 'EXPIRED':
      return 'bg-red-500';
    case 'LEFT':
      return 'bg-orange-500';
    case 'INACTIVE':
      return 'bg-muted-foreground';
  }
}

/**
 * Check if client can create new membership
 * Block if: has active membership, or has unpaid dues
 */
export function canCreateMembership(
  currentStatus: MembershipStatus,
  netDue: number
): { allowed: boolean; reason?: string } {
  if (currentStatus === 'ACTIVE') {
    return {
      allowed: false,
      reason: 'Client already has an active membership. Cannot create duplicate.',
    };
  }
  
  if (currentStatus === 'PAYMENT_DUE' || netDue > 0) {
    return {
      allowed: false,
      reason: `Outstanding dues of ₹${netDue.toLocaleString('en-IN')} must be cleared before creating a new membership.`,
    };
  }
  
  return { allowed: true };
}
