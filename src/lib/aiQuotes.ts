
interface GenerateQuoteParams {
  clientName: string;
  progressPct: number;
  daysLeft: number;
  membershipStatus: string;
  netDue: number;
  isCustomPrice: boolean;
  paidAmount?: number;
}

// Static fallback quotes (used if API fails)
const getFallbackMessages = (params: GenerateQuoteParams): string[] => {
  const firstName = params.clientName.split(' ')[0];
  if (params.membershipStatus === 'EXPIRED') {
    return [
      `Every missed workout is a step away from the body you wanted, ${firstName}.`,
      `Others are training while you're on the sidelines, ${firstName}. The gap is growing.`,
      `The version of you that never quit is waiting to come back, ${firstName}.`,
    ];
  }
  if (params.isCustomPrice && params.paidAmount) {
    return [
      `Your ₹${params.paidAmount.toLocaleString('en-IN')} rate was a favor, ${firstName}. Repay it with perfect attendance.`,
      `Someone believed in you enough to give you a special deal, ${firstName}. Don't let that trust go to waste.`,
      `${firstName}, the ones who got discounts and still showed up every day — those are the legends.`,
      `Your special rate means someone invested in your potential, ${firstName}. Prove them right.`,
      `Champions don't skip days, ${firstName}. Not when someone gave them a chance.`,
      `Half the price, double the effort, ${firstName}. That's how you honor a favor.`,
    ];
  }
  if (params.daysLeft >= 1 && params.daysLeft <= 7) {
    return [
      `${params.daysLeft} days left, ${firstName}. The ones who renew early are the ones who never stop.`,
      `Consistency builds champions, ${firstName}. Don't let your progress fade now.`,
      `The hardest part is staying consistent, ${firstName}. You're so close — don't quit now.`,
    ];
  }
  return [
    `You are already ahead of most people who never start, ${firstName}.`,
    `The community is watching, ${firstName}. Keep setting the standard.`,
    `Elite results come from elite habits, ${firstName}. You're building them right now.`,
    `Every rep you do, ${firstName}, someone else skipped. That's why you'll win.`,
    `Your discipline is your competitive advantage, ${firstName}. Don't lose it.`,
    `The top 1% never wonder if they should train today, ${firstName}. They just do.`,
  ];
};

// Build the prompt for bulk quote generation
const buildBulkPrompt = (params: GenerateQuoteParams): string => {
  const firstName = params.clientName.split(' ')[0];
  let context = `Generate EXACTLY 6 different short psychological motivational quotes for a gym member named ${firstName}. `;

  // First 3 quotes: guilt/responsibility if custom price
  if (params.isCustomPrice && params.paidAmount) {
    context += `Quotes 1-3 MUST mention their SPECIAL DISCOUNTED RATE of ₹${params.paidAmount.toLocaleString('en-IN')} — `;
    context += `use indirect guilt and responsibility: they got a special favor, they owe it to the gym to never miss a day. `;
    context += `Quotes 4-6: competitive pride, FOMO, elite mindset (no mention of price). `;
  } else if (params.membershipStatus === 'EXPIRED') {
    context += `Tone: FOMO, opportunity loss, urgency to return. `;
  } else if (params.daysLeft >= 0 && params.daysLeft <= 7) {
    context += `${params.daysLeft} days left in their cycle. Tone: urgency, momentum loss if they stop. `;
  } else {
    context += `They are ${Math.round(params.progressPct)}% through their cycle. `;
    context += `Mix of: competitive FOMO (others are outworking them), pride in discipline, elite mindset. `;
  }

  context += `Rules: each quote MAX 15 words. No hashtags. Personal tone using "${firstName}". `;
  context += `Return ONLY the 6 quotes, one per line, no numbering, no extra text.`;
  return context;
};

// Cache key for the batch
const getBatchCacheKey = (params: GenerateQuoteParams) =>
  `ai_quotes_batch_${params.clientName}_${params.membershipStatus}_${Math.floor(params.daysLeft / 3)}_${params.isCustomPrice}`;

// Parse the API response into an array of quote strings
const parseQuotes = (raw: string, expected: number): string[] => {
  const lines = raw
    .split('\n')
    .map(l => l.replace(/^[-•*\d.]\s*/, '').replace(/[\"']/g, '').trim())
    .filter(l => l.length > 5 && l.length < 120);
  // Ensure we always have `expected` entries
  while (lines.length < expected) lines.push(lines[0] || '');
  return lines.slice(0, expected);
};

/**
 * Fetches a batch of AI quotes in a SINGLE API call.
 * Returns an array of strings ready to be cycled through.
 * Falls back to static messages if the API is unavailable.
 */
export async function fetchAiQuotesBatch(params: GenerateQuoteParams): Promise<string[]> {
  const cacheKey = getBatchCacheKey(params);
  const BATCH_SIZE = 6;

  // Check sessionStorage cache
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* ignore */ }
  }

  // Vite browser env — NOT process.env
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    || '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';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Aesthetic Gym',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [{ role: 'user', content: buildBulkPrompt(params) }],
        max_tokens: 200,
        temperature: 0.85,
      }),
    });

    if (!response.ok) throw new Error(`API ${response.status}`);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    const quotes = parseQuotes(raw, BATCH_SIZE);

    // Cache the batch
    sessionStorage.setItem(cacheKey, JSON.stringify(quotes));
    return quotes;
  } catch (err) {
    console.error('Failed to fetch AI quotes batch:', err);
    // Return static fallbacks but do NOT cache them — allows next mount to retry
    return getFallbackMessages(params);
  }
}
