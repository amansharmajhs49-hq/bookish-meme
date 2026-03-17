/**
 * WhatsApp Reminder System for Aesthetic Gym
 * 
 * Reminder Triggers:
 * - 7, 3, 1 days before expiry (ACTIVE + no dues)
 * - Expiry day
 * - Membership expired (status change)
 * - Payment due (every 3 days, max 3 times)
 * - Payment cleared
 * - Membership renewed
 * - Membership extended
 */

import { format } from 'date-fns';

export type ReminderType = 
  | 'expiry_7_days'
  | 'expiry_3_days'
  | 'expiry_1_day'
  | 'expiry_today'
  | 'membership_expired'
  | 'payment_due'
  | 'payment_cleared'
  | 'membership_renewed'
  | 'membership_extended'
  | 'payment_received'
  | 'receipt'
  | 'client_left';

interface PaymentMessageParams {
  clientName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  paymentType?: string;
  dueBefore?: number;
  dueAfter?: number;
  planName?: string;
  productName?: string;
  receiptId?: string;
}

const GYM_NAME = '*Aesthetic Gym*';

const PORTAL_LINK = `\n\n📱 *Check your portal anytime:*\nhttps://aestheticgym.vercel.app/portal`;

/**
 * Generate WhatsApp message for a payment transaction
 */
export function generatePaymentMessage(params: PaymentMessageParams): string {
  const { clientName, amount, paymentMethod, paymentDate, paymentType, dueBefore, dueAfter, planName, productName } = params;
  
  const formattedAmount = `₹${Number(amount).toLocaleString('en-IN')}`;
  const method = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
  
  let itemLine = '';
  if (planName) itemLine = `\nPlan: ${planName}`;
  if (productName) itemLine = `\nProduct: ${productName}`;
  if (paymentType === 'mixed') itemLine = '\nFor: Membership + Products';

  let dueLine = '';
  if (dueBefore != null && dueAfter != null) {
    if (Number(dueAfter) === 0) {
      dueLine = '\n\n✅ *All dues cleared!*';
    } else {
      dueLine = `\n\nRemaining balance: *₹${Number(dueAfter).toLocaleString('en-IN')}*`;
    }
  }

  return `Hi ${clientName} 🧾

Payment received at ${GYM_NAME}!

*Amount: ${formattedAmount}*
Method: ${method}
Date: ${paymentDate}${itemLine}${dueLine}

Thank you for your payment! 💪
${GYM_NAME}${PORTAL_LINK}`;
}

/**
 * Generate WhatsApp receipt message (text summary)
 */
export function generateReceiptMessage(params: PaymentMessageParams): string {
  const { clientName, amount, paymentMethod, paymentDate, paymentType, dueBefore, dueAfter, planName, productName, receiptId } = params;

  const formattedAmount = `₹${Number(amount).toLocaleString('en-IN')}`;
  const method = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);

  let itemLine = '';
  if (planName) itemLine = `Plan: ${planName}\n`;
  if (productName) itemLine = `Product: ${productName}\n`;
  if (paymentType === 'mixed') itemLine = 'For: Membership + Products\n';

  let dueSection = '';
  if (dueBefore != null) {
    dueSection = `\n📊 *Due Summary*\nDue Before: ₹${Number(dueBefore).toLocaleString('en-IN')}\nDue After: ₹${Number(dueAfter || 0).toLocaleString('en-IN')}`;
    if (Number(dueAfter) === 0) dueSection += '\n✅ *PAID IN FULL*';
  }

  return `━━━━━━━━━━━━━━━━━━
📋 *PAYMENT RECEIPT*
${GYM_NAME}
━━━━━━━━━━━━━━━━━━

Receipt: #${(receiptId || '').slice(0, 8).toUpperCase()}
Date: ${paymentDate}

👤 *Client*
${clientName}

💰 *Payment Details*
Amount: *${formattedAmount}*
Method: ${method}
${itemLine}${dueSection}

━━━━━━━━━━━━━━━━━━
Thank you for your payment! 🙏
${GYM_NAME}${PORTAL_LINK}`;
}

interface ReminderMessageParams {
  clientName: string;
  planName?: string;
  expiryDate?: string | Date;
  dueAmount?: number;
  daysLeft?: number;
  extendedDays?: number;
  newExpiryDate?: string | Date;
}

/**
 * Check if current time is within allowed reminder hours — always allowed now
 */
export function isWithinReminderHours(): boolean {
  return true;
}

/**
 * Generate WhatsApp message based on reminder type
 */
export function generateReminderMessage(
  type: ReminderType,
  params: ReminderMessageParams
): string {
  const { clientName, planName, expiryDate, dueAmount, daysLeft, extendedDays, newExpiryDate } = params;
  
  const formattedExpiry = expiryDate 
    ? format(typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate, 'dd MMM yyyy')
    : '';
  
  const formattedNewExpiry = newExpiryDate
    ? format(typeof newExpiryDate === 'string' ? new Date(newExpiryDate) : newExpiryDate, 'dd MMM yyyy')
    : '';

  switch (type) {
    case 'expiry_7_days':
      return `Hi ${clientName} 👋

This is a reminder from ${GYM_NAME}

🗓️ Your membership expires in *7 days* — ${formattedExpiry}
📋 Plan: ${planName || 'Gym Membership'}

Renew early to avoid any break in your training!

Stay consistent, stay strong 💪
${GYM_NAME}${PORTAL_LINK}`;

    case 'expiry_3_days':
      return `Hi ${clientName} ⏰

Your membership at ${GYM_NAME} expires in *3 days* — ${formattedExpiry}

📋 Plan: ${planName || 'Gym Membership'}

Renew now to keep your progress going. Don't let your hard work go to waste!

See you at the gym 🏋️
${GYM_NAME}${PORTAL_LINK}`;

    case 'expiry_1_day':
      return `Hi ${clientName} ⚠️

*Your membership expires TOMORROW!*
📅 Expiry: ${formattedExpiry}
📋 Plan: ${planName || 'Gym Membership'}

Please visit ${GYM_NAME} today to renew and continue training without interruption.

We're here to help! 💪
${GYM_NAME}${PORTAL_LINK}`;

    case 'expiry_today':
      return `Hi ${clientName} 🚨

*Your membership expires TODAY* — ${formattedExpiry}

📋 Plan: ${planName || 'Gym Membership'}

This is your last day! Renew now to stay on track with your fitness goals.

Don't miss a single day 🔥
${GYM_NAME}${PORTAL_LINK}`;

    case 'membership_expired':
      return `Hi ${clientName},

Your membership at ${GYM_NAME} has *expired* ❌

📋 Plan: ${planName || 'Gym Membership'}
📅 Expired on: ${formattedExpiry}

We miss seeing you at the gym! Renew your membership to get back on track.

💡 *Tip:* The longer you wait, the harder it is to restart. Come back today!

Contact us anytime to rejoin 💪
${GYM_NAME}${PORTAL_LINK}`;

    case 'payment_due':
      return `Hi ${clientName},

You have a pending balance at ${GYM_NAME} 💳

💰 *Outstanding Due: ₹${dueAmount?.toLocaleString('en-IN') || 0}*
${planName ? `📋 Plan: ${planName}\n` : ''}${formattedExpiry ? `📅 Expiry: ${formattedExpiry}\n` : ''}
Please clear your dues at your earliest convenience to keep your membership active.

You can pay via Cash or Online.

Thank you 🙏
${GYM_NAME}${PORTAL_LINK}`;

    case 'payment_cleared':
      return `Hi ${clientName} ✅

Great news! Your account at ${GYM_NAME} is now *fully paid* 🎉

💰 *No outstanding dues!*
${planName ? `📋 Plan: ${planName}\n` : ''}${formattedExpiry ? `📅 Valid until: ${formattedExpiry}\n` : ''}
Keep up the amazing work! 💪
${GYM_NAME}${PORTAL_LINK}`;

    case 'membership_renewed':
      return `Hi ${clientName} 🎉

Welcome back to ${GYM_NAME}!

Your membership has been *renewed* successfully ✅

📋 Plan: ${planName || 'Gym Membership'}
📅 Valid until: *${formattedNewExpiry}*

Let's make this your best fitness phase yet! 🏋️‍♂️🔥
${GYM_NAME}${PORTAL_LINK}`;

    case 'membership_extended':
      return `Hi ${clientName} ✨

Your membership at ${GYM_NAME} has been *extended*!

📅 Extended by: ${extendedDays} days
📅 New expiry: *${formattedNewExpiry}*

Enjoy the extra time and keep training hard! 💪
${GYM_NAME}${PORTAL_LINK}`;

    case 'client_left':
      return `Hi ${clientName},

We noticed you've left ${GYM_NAME} and we truly miss having you here 😔

Your health and fitness journey doesn't have to stop! We'd love to welcome you back anytime.
${dueAmount && dueAmount > 0 ? `\n💰 *Pending dues: ₹${dueAmount.toLocaleString('en-IN')}*\nPlease clear your outstanding balance at your convenience.\n` : ''}
🎯 Remember: Consistency is the key to results. Every day you're away is a day lost.

The gym doors are always open for you. Come back stronger! 💪

${GYM_NAME}${PORTAL_LINK}`;

    default:
      return '';
  }
}

/**
 * Generate WhatsApp link with encoded message
 */
export function getWhatsAppLink(phone: string, message: string): string {
  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Get reminder type based on days left until expiry
 */
export function getReminderTypeByDaysLeft(daysLeft: number): ReminderType | null {
  switch (daysLeft) {
    case 7:
      return 'expiry_7_days';
    case 3:
      return 'expiry_3_days';
    case 1:
      return 'expiry_1_day';
    case 0:
      return 'expiry_today';
    default:
      return null;
  }
}
