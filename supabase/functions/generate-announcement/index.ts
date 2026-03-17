const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
let body;
try {
  body = await req.json();
} catch {
  body = {};
}

const { occasion, date, type } = body;
    console.log("Request received:", { occasion, date, type });
    console.log("Calling OpenRouter...");
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const typeDescriptions: Record<string, string> = {
      holiday: 'gym closure for a holiday/festival',
      special_hours: 'gym operating on special/revised hours',
      event: 'a gym event, offer, or special promotion',
      maintenance: 'gym closure for maintenance/renovation',
      custom: 'a general gym announcement',
    };

    const prompt = `You are writing a WhatsApp announcement message for "Aesthetic Gym" (a fitness gym).

Context:
- Announcement type: ${typeDescriptions[type] || 'general announcement'}
- Occasion/Topic: ${occasion || 'general'}
- Date: ${date || 'not specified'}

Write a professional, warm, and appealing WhatsApp message that:
1. Starts with "Hi {name} 👋" (keep {name} as a variable placeholder)
2. Uses WhatsApp bold formatting with *asterisks*
3. Includes a decorative separator line: ━━━━━━━━━━━━━━━━━━
4. Has a bold header with relevant emoji
5. If the occasion is a known holiday/festival (like Diwali, Christmas, Eid, Holi, Independence Day, Republic Day, etc.), include a culturally appropriate festive greeting and wish
6. Mentions specific details about the occasion if it's a well-known event
7. Ends with a motivational gym-related sign-off
8. Signs off as *Aesthetic Gym* 🏋️
9. Keep it concise (under 50 words)
10. Make it feel personal and celebratory when appropriate

Return ONLY the message text, no explanations.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://aestheticgym.vercel.app',
  'X-Title': 'generate-announcement'
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('AI Gateway error:', err);
      return new Response(
        JSON.stringify({ error: 'Failed to generate message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedMessage = data.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ message: generatedMessage.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
