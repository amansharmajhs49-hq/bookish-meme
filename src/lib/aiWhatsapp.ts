/**
 * AI-powered WhatsApp message generator
 * Uses OpenRouter to generate personalised messages instead of hardcoded templates.
 * Falls back to the original templates if the API fails.
 */

import { generateReminderMessage, ReminderType } from './whatsapp';

interface ClientContext {
  name: string;
  planName?: string;
  daysLeft?: number;
  expiryDate?: string | Date;
  dueAmount?: number;
  membershipLengthMonths?: number;
  renewalCount?: number;
  goal?: string;
  paymentMethod?: string;
  extendedDays?: number;
  newExpiryDate?: string | Date;
}

const PORTAL_LINK = `\n\n📱 *Check your portal:*\nhttps://aestheticgym.vercel.app/portal`;
const GYM_NAME = '*Aesthetic Gym*';

function buildPrompt(type: ReminderType, ctx: ClientContext): string {
  const firstName = ctx.name.split(' ')[0];
  const memberTenure = ctx.membershipLengthMonths
    ? ctx.membershipLengthMonths >= 12
      ? `${Math.floor(ctx.membershipLengthMonths / 12)} year${Math.floor(ctx.membershipLengthMonths / 12) > 1 ? 's' : ''}`
      : `${ctx.membershipLengthMonths} month${ctx.membershipLengthMonths > 1 ? 's' : ''}`
    : null;

  const renewals = ctx.renewalCount ?? 0;
  const goal = ctx.goal ? `Their fitness goal is: ${ctx.goal}.` : '';

  let instruction = '';

  switch (type) {
    case 'expiry_7_days':
      instruction = `Write a WhatsApp message to ${firstName} reminding them their gym membership expires in 7 days (${ctx.planName || 'gym membership'}).
${memberTenure ? `They have been a member for ${memberTenure}.` : ''}
${renewals > 0 ? `They have renewed ${renewals} time${renewals > 1 ? 's' : ''} before.` : 'This is their first cycle.'}
${goal}
Tone: friendly but urgent, personal. Make it feel like a real person wrote it. Reference their tenure if available.
End with a call to renew. Max 5 lines. No hashtags.`;
      break;

    case 'expiry_3_days':
      instruction = `Write a WhatsApp message to ${firstName} — their membership expires in just 3 days.
${memberTenure ? `They've been with us for ${memberTenure}.` : ''}
${goal}
Tone: urgent but warm. Create FOMO about losing their fitness momentum. Max 5 lines.`;
      break;

    case 'expiry_1_day':
      instruction = `Write an urgent WhatsApp message to ${firstName} — their membership expires TOMORROW.
${memberTenure ? `${memberTenure} member.` : ''}
Tone: very urgent, action required today. Short — max 4 lines.`;
      break;

    case 'expiry_today':
      instruction = `Write a WhatsApp message to ${firstName} — their membership expires TODAY. This is their final day.
Tone: last-chance urgency, don't let momentum die. Max 3 lines.`;
      break;

    case 'membership_expired':
      instruction = `Write a WhatsApp message to ${firstName} whose gym membership just expired.
${memberTenure ? `They were a member for ${memberTenure}.` : ''}
${renewals > 0 ? `They renewed ${renewals} time${renewals > 1 ? 's' : ''} before, so they know the value.` : ''}
${goal}
Tone: FOMO, they miss the gains. Warm invitation to come back. Max 5 lines.`;
      break;

    case 'payment_due':
      instruction = `Write a WhatsApp message to ${firstName} who has ₹${ctx.dueAmount?.toLocaleString('en-IN') || 0} outstanding dues at the gym.
${memberTenure ? `${memberTenure} member.` : ''}
Tone: polite, professional, not aggressive. Create mild urgency to clear dues. Max 4 lines.`;
      break;

    case 'payment_cleared':
      instruction = `Write a short celebratory WhatsApp message to ${firstName} — they just cleared all their dues at the gym.
${memberTenure ? `${memberTenure} member.` : ''}
Tone: positive, motivating, brief. Max 3 lines.`;
      break;

    case 'membership_renewed':
      instruction = `Write a warm welcome-back WhatsApp message to ${firstName} who just renewed their gym membership.
New plan: ${ctx.planName || 'gym membership'}.
${memberTenure ? `They've been a member for ${memberTenure} total.` : ''}
${goal}
Tone: celebratory, motivating, personal. Make them feel excited to train. Max 4 lines.`;
      break;

    case 'membership_extended':
      instruction = `Write a WhatsApp message to ${firstName} — their membership was just extended by ${ctx.extendedDays} days.
Tone: brief, positive, motivating. Max 3 lines.`;
      break;

    case 'client_left':
      instruction = `Write a genuine WhatsApp message to ${firstName} who has left the gym.
${ctx.dueAmount && ctx.dueAmount > 0 ? `They have ₹${ctx.dueAmount.toLocaleString('en-IN')} outstanding dues.` : ''}
Tone: sincere, not pushy — genuinely wish them well and leave the door open to return. Max 4 lines.`;
      break;

    default:
      return '';
  }

  return `${instruction}

Important rules:
- Start with "Hi ${firstName}" or "Hey ${firstName}"
- Sign off as "${GYM_NAME.replace(/\*/g, '')}"
- Use 1–2 relevant emojis (not excessive)
- Do NOT include hashtags
- Do NOT mention the portal link — it will be added automatically
- Write ONLY the message text, nothing else`;
}

function buildCacheKey(type: ReminderType, ctx: ClientContext): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `ai_wa_${type}_${ctx.name.replace(/\s/g, '_')}_${date}`;
}

async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    || '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';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Aesthetic Gym',
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
      temperature: 0.75,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Generate a personalised WhatsApp message using AI.
 * Falls back to the hardcoded template if AI fails.
 * Results are cached per (type, client, day) in localStorage.
 */
export async function generateAiWhatsAppMessage(
  type: ReminderType,
  ctx: ClientContext,
): Promise<{ message: string; isAi: boolean }> {
  const cacheKey = buildCacheKey(type, ctx);

  // Check cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return { message: cached, isAi: true };
  } catch {}

  const prompt = buildPrompt(type, ctx);
  if (!prompt) {
    return {
      message: generateReminderMessage(type, {
        clientName: ctx.name,
        planName: ctx.planName,
        expiryDate: ctx.expiryDate,
        dueAmount: ctx.dueAmount,
        daysLeft: ctx.daysLeft,
        extendedDays: ctx.extendedDays,
        newExpiryDate: ctx.newExpiryDate,
      }),
      isAi: false,
    };
  }

  try {
    const raw = await callOpenRouter(prompt);
    if (!raw || raw.length < 20) throw new Error('Empty response');

    // Append portal link
    const message = raw + PORTAL_LINK;

    // Cache for the day
    try { localStorage.setItem(cacheKey, message); } catch {}

    return { message, isAi: true };
  } catch (err) {
    console.warn('AI WhatsApp fallback:', err);
    // Fall back to static template
    return {
      message: generateReminderMessage(type, {
        clientName: ctx.name,
        planName: ctx.planName,
        expiryDate: ctx.expiryDate,
        dueAmount: ctx.dueAmount,
        daysLeft: ctx.daysLeft,
        extendedDays: ctx.extendedDays,
        newExpiryDate: ctx.newExpiryDate,
      }),
      isAi: false,
    };
  }
}

/**
 * Drop-in replacement for generateReminderMessage that uses AI.
 * Returns a Promise — callers must await it.
 */
export async function generateSmartReminderMessage(
  type: ReminderType,
  ctx: ClientContext,
): Promise<string> {
  const { message } = await generateAiWhatsAppMessage(type, ctx);
  return message;
}
