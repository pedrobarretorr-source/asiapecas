import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenAIChatCompletion, extractToolArguments, resolveOpenAIModel } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const SCRAPE_TIMEOUT_MS = 15000;

async function firecrawlScrape(apiKey: string, url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), SCRAPE_TIMEOUT_MS);
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const md: string | undefined = data.markdown || data.data?.markdown;
    return md ? md.slice(0, 200_000) : null;
  } catch (_e) {
    clearTimeout(t);
    return null;
  }
}

const enrichTool = {
  type: "function",
  function: {
    name: "register_enrichment",
    description: "Extrai dados verificados a partir do markdown.",
    parameters: {
      type: "object",
      properties: {
        official_name: { type: ["string", "null"] },
        cnpj_formatted: { type: ["string", "null"] },
        cnae: { type: ["string", "null"] },
        company_size: { type: ["string", "null"] },
        segment: { type: "string", enum: ["mineração", "construção", "logística", "energia", "agronegócio", "geral"] },
        website: { type: ["string", "null"] },
        linkedin: { type: ["string", "null"] },
        instagram: { type: ["string", "null"] },
        alt_phone: { type: ["string", "null"] },
        full_address: { type: ["string", "null"] },
        decision_maker_role: { type: ["string", "null"] },
        commercial_notes: { type: ["string", "null"] },
        evidence: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              source_url: { type: "string" },
              source_excerpt: { type: "string" },
            },
            required: ["source_url", "source_excerpt"],
          },
        },
      },
      required: ["segment", "evidence"],
      additionalProperties: false,
    },
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const customer_id: string | undefined = body.customer_id;
    const url: string | undefined = body.url;
    if (!customer_id || !url) {
      return new Response(JSON.stringify({ error: "customer_id and url required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    try { new URL(url); } catch {
      return new Response(JSON.stringify({ error: "URL inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl não conectado." }), { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const model = resolveOpenAIModel("OPENAI_MODEL_ENRICH_CUSTOMER_FROM_URL", "gpt-4.1-mini");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: customer, error } = await supabase.from("customers").select("*").eq("id", customer_id).single();
    if (error || !customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const md = await firecrawlScrape(FIRECRAWL_API_KEY, url);
    if (!md) {
      return new Response(JSON.stringify({ error: "Não foi possível ler a URL informada." }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const companyName = (customer.company || customer.name).trim();
    const userPrompt = `Cliente: ${customer.name}
Empresa: ${companyName}
Cidade/UF: ${customer.city || "—"} / ${customer.state || "—"}

Página fornecida manualmente pelo gestor (presume-se relevante a esta empresa). Extraia APENAS dados literais. Use null se não houver evidência.

### FONTE: ${url}

${md.slice(0, 30_000)}`;

    const aiResp = await createOpenAIChatCompletion({
      model,
      messages: [
        { role: "system", content: "Você extrai dados de páginas reais. Nunca invente. Use null sem evidência." },
        { role: "user", content: userPrompt },
      ],
      tools: [enrichTool],
      tool_choice: { type: "function", function: { name: "register_enrichment" } },
    });

    if (!aiResp.ok) throw new Error(`AI provider ${aiResp.status}`);
    const aiData = await aiResp.json();
    const args = extractToolArguments<Record<string, unknown> & {
      evidence: Record<string, { source_url: string; source_excerpt: string }>;
    }>(aiData);
    if (!args) throw new Error("AI did not return structured data");

    // Force every evidence to use the manual URL
    const cleanEvidence: Record<string, { source_url: string; source_excerpt: string }> = {};
    for (const [field, ev] of Object.entries(args.evidence || {})) {
      if (ev?.source_excerpt) cleanEvidence[field] = { source_url: url, source_excerpt: ev.source_excerpt };
    }

    // Merge with previous enrichment_data (don't overwrite verified data)
    const prev = (customer.enrichment_data || {}) as Record<string, unknown> & {
      sources?: string[]; evidence?: Record<string, unknown>; weak_sources?: unknown[];
    };
    const mergedSources = Array.from(new Set([...(prev.sources || []), url]));
    const mergedEvidence = { ...(prev.evidence || {}), ...cleanEvidence };

    const filledCount = Object.keys(cleanEvidence).length;
    const confidence: "high" | "medium" | "low" =
      filledCount >= 4 ? "medium" : filledCount >= 1 ? "low" : (prev.confidence as "high" | "medium" | "low") || "low";

    const enrichmentData = {
      ...prev,
      ...args,
      evidence: mergedEvidence,
      sources: mergedSources,
      weak_sources: prev.weak_sources || [],
      confidence,
      _enriched_at: new Date().toISOString(),
      _manual_url: url,
    };

    const updates: Record<string, unknown> = {
      enrichment_status: "enriched",
      enriched_at: new Date().toISOString(),
      enrichment_data: enrichmentData,
    };
    if (!customer.company && args.official_name) updates.company = args.official_name as string;
    if (!customer.cnpj_cpf && args.cnpj_formatted) updates.cnpj_cpf = args.cnpj_formatted as string;
    if (!customer.phone && args.alt_phone) updates.phone = args.alt_phone as string;
    if (!customer.address && args.full_address) updates.address = args.full_address as string;

    await supabase.from("customers").update(updates).eq("id", customer_id);

    return new Response(JSON.stringify({ success: true, enrichment: enrichmentData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("enrich-customer-from-url error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
