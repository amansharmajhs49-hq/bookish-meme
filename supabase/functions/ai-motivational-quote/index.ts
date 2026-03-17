import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const { type, clientName, discount, planName, daysLeft, status } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "discount") {
      systemPrompt =
        "You are a motivational gym coach. Generate a SHORT (1-2 sentences max) psychologically motivating message for a gym member who received a discounted membership. The tone should subtly remind them of the special opportunity and encourage discipline. Do NOT mention exact amounts. Be warm but firm. No emojis.";
      userPrompt = `Member "${clientName}" got a discount of ₹${discount} on their "${planName}" membership. Write a short motivational nudge.`;
    } else {
      systemPrompt =
        "You are a motivational gym coach. Generate a SHORT (1 sentence, max 15 words) powerful fitness motivational quote. Make it feel personal, competitive, and psychologically engaging. Vary the style: sometimes stoic, sometimes aggressive, sometimes poetic. No emojis. No quotation marks.";
      userPrompt = `Generate a unique gym motivational quote for member "${clientName}". Their membership status: ${status || "active"}, days left: ${daysLeft ?? "unknown"}.`;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 100,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const quote = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({ quote, fallback: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-motivational-quote error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
