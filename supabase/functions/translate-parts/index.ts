import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createOpenAIChatCompletion, extractMessageContent, resolveOpenAIModel } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { descriptions, targetLang } = await req.json();
    
    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      return new Response(JSON.stringify({ translations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetLang === "pt") {
      return new Response(JSON.stringify({ translations: descriptions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = resolveOpenAIModel("OPENAI_MODEL_TRANSLATE_PARTS", "gpt-4.1-mini");

    const langName = targetLang === "en" ? "English" : "Spanish";

    const prompt = `Translate these XCMG heavy machinery part descriptions from Portuguese to ${langName}. 
Keep technical terms, part numbers, and model numbers unchanged. Be concise and accurate.
Return ONLY a JSON array of translated strings in the same order, no extra text.

Descriptions:
${JSON.stringify(descriptions)}`;

    const response = await createOpenAIChatCompletion({
      model,
      messages: [
        { role: "system", content: "You are a technical translator for heavy machinery parts. Return ONLY a JSON array of translated strings. No markdown, no explanation." },
        { role: "user", content: prompt },
      ],
    });

    if (!response.ok) {
      console.error("Translation AI error:", response.status);
      return new Response(JSON.stringify({ translations: descriptions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = extractMessageContent(data);
    
    try {
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const translations = JSON.parse(jsonMatch[0]);
        if (Array.isArray(translations) && translations.length === descriptions.length) {
          return new Response(JSON.stringify({ translations }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch {
      console.error("Failed to parse translation response");
    }

    // Fallback: return originals
    return new Response(JSON.stringify({ translations: descriptions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
