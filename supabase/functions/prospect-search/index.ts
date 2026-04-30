import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenAIChatCompletion, extractToolArguments, resolveOpenAIModel } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

function isJunkUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("/search?") || u.includes("google.com/search") ||
    u.endsWith(".pdf") || u.includes("youtube.com") || u.includes("facebook.com/sharer")
  );
}

function extractFirecrawlSearchResults(
  data: unknown,
): Array<{ url: string; title?: string; description?: string }> {
  const d = data as Record<string, unknown> | null | undefined;
  const candidates: unknown[] = [
    (d as { data?: { web?: unknown } } | undefined)?.data?.web,
    (d as { web?: unknown } | undefined)?.web,
    (d as { data?: unknown } | undefined)?.data,
    (d as { web?: { results?: unknown } } | undefined)?.web?.results,
    (d as { data?: { web?: { results?: unknown } } } | undefined)?.data?.web?.results,
    (d as { results?: unknown } | undefined)?.results,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      return c.filter(
        (r): r is { url: string; title?: string; description?: string } =>
          !!r && typeof (r as { url?: unknown }).url === "string",
      );
    }
  }
  console.warn("firecrawl unknown shape", d ? Object.keys(d) : null);
  return [];
}

async function fcSearch(apiKey: string, query: string, limit = 6) {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, lang: "pt", country: "br" }),
    });
    if (res.status === 402) {
      console.error("firecrawl 402 — créditos esgotados", query);
      return [];
    }
    if (!res.ok) return [];
    const data = await res.json();
    const results = extractFirecrawlSearchResults(data).filter((r) => !isJunkUrl(r.url));
    if (results.length === 0) console.info("prospect-search firecrawl 0 results for:", query);
    return results;
  } catch { return []; }
}

async function fcScrape(apiKey: string, url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const d = await res.json();
    return (d.markdown || d.data?.markdown || "").slice(0, 60_000) || null;
  } catch { clearTimeout(t); return null; }
}

const classifyTool = {
  type: "function",
  function: {
    name: "classify_prospects",
    description: "Classifica empresas reais já scrapeadas como prospects. Use SOMENTE dados que aparecem nos textos fornecidos.",
    parameters: {
      type: "object",
      properties: {
        prospects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source_index: { type: "number", description: "Índice da FONTE de onde os dados vieram" },
              name: { type: "string", description: "Nome da empresa exatamente como aparece no texto" },
              company: { type: ["string", "null"] },
              phone: { type: ["string", "null"], description: "Apenas se aparecer literalmente no texto" },
              email: { type: ["string", "null"], description: "Apenas se aparecer literalmente no texto" },
              cnpj_cpf: { type: ["string", "null"], description: "Apenas se aparecer XX.XXX.XXX/XXXX-XX no texto" },
              city: { type: ["string", "null"] },
              state: { type: ["string", "null"] },
              segment: { type: "string", enum: ["mineração", "construção", "logística", "energia", "infraestrutura", "geral"] },
              score: { type: "number", description: "0-100" },
              matched_parts: { type: "array", items: { type: "string" } },
              ai_summary: { type: "string", description: "Por que é um prospect, citando trechos do texto" },
            },
            required: ["source_index", "name", "segment", "score", "matched_parts", "ai_summary"],
          },
        },
      },
      required: ["prospects"],
      additionalProperties: false,
    },
  },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { country, state, segment, count = 5 } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl não conectado. Conecte em Connectors para habilitar prospecção verificada." }), {
        status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const model = resolveOpenAIModel("OPENAI_MODEL_PROSPECT_SEARCH", "gpt-4.1-mini");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: topParts } = await supabase
      .from("parts")
      .select("material, description, machine_model, manufacturer, stock, estimated_price")
      .gt("stock", 0).order("stock", { ascending: false }).limit(40);
    const partsCtx = (topParts || []).map((p) => `${p.material} | ${p.description} | ${p.machine_model || ""}`).join("\n");

    const countryNames: Record<string, string> = { BR: "Brasil", VE: "Venezuela", GY: "Guiana" };
    const countryName = countryNames[country] || country;
    const segLabel = segment || "máquinas pesadas";
    const stateLabel = state ? ` ${state}` : "";

    // Build queries based on segment + region (target real listings/news)
    const queries = [
      `${segLabel}${stateLabel} ${countryName} site:.com.br`,
      `empresas ${segLabel}${stateLabel} contato`,
      `${segLabel} frota XCMG${stateLabel}`,
      `licitação ${segLabel}${stateLabel}`,
    ];

    const hits = (await Promise.all(queries.map((q) => fcSearch(FIRECRAWL_API_KEY, q, 5)))).flat();
    const seen = new Set<string>();
    const dedup = hits.filter((h) => { if (seen.has(h.url)) return false; seen.add(h.url); return true; }).slice(0, 12);

    console.info("prospect-search firecrawl_hits=", dedup.length);

    if (dedup.length === 0) {
      return new Response(JSON.stringify({ prospects: [], total: 0, note: "Nenhum resultado público encontrado para esses filtros." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scrape in parallel
    const scraped = await Promise.allSettled(dedup.map(async (h) => {
      const md = await fcScrape(FIRECRAWL_API_KEY, h.url);
      return md ? { url: h.url, title: h.title || "", markdown: md } : null;
    }));
    const sources = scraped
      .filter((s): s is PromiseFulfilledResult<{ url: string; title: string; markdown: string } | null> => s.status === "fulfilled")
      .map((s) => s.value).filter((v): v is { url: string; title: string; markdown: string } => v !== null);

    console.info("prospect-search verified_sources=", sources.length);

    if (sources.length === 0) {
      return new Response(JSON.stringify({ prospects: [], total: 0, note: "Resultados encontrados, mas nenhum pôde ser lido." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourcesBlock = sources.map((s, i) => `### FONTE ${i}: ${s.url}\nTítulo: ${s.title}\n\n${s.markdown.slice(0, 8_000)}`).join("\n\n---\n\n");

    const prompt = `Catálogo XCMG (amostra):
${partsCtx}

Localidade alvo: ${countryName}${stateLabel}. Segmento: ${segLabel}.

Abaixo estão páginas reais. Identifique até ${count} empresas potenciais que aparecem nessas páginas e classifique-as como prospects. NUNCA invente CNPJ, telefone ou email — só preencha esses campos se aparecerem literalmente no texto. Sempre informe source_index.

${sourcesBlock}`;

    const response = await createOpenAIChatCompletion({
      model,
      messages: [
        { role: "system", content: "Você classifica empresas a partir de páginas web reais. Nunca invente dados de contato. Use null quando o dado não aparecer no texto." },
        { role: "user", content: prompt },
      ],
      tools: [classifyTool],
      tool_choice: { type: "function", function: { name: "classify_prospects" } },
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI provider error");
    }

    const aiData = await response.json();
    const parsed = extractToolArguments<{ prospects: Array<Record<string, unknown>> }>(aiData);
    const prospects: Array<Record<string, unknown>> = parsed?.prospects || [];

    // Validate: each prospect must reference a real source and CNPJ must be regex-valid
    const cnpjRegex = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
    const toInsert = prospects
      .filter((p) => typeof p.source_index === "number" && sources[p.source_index as number])
      .map((p) => {
        const src = sources[p.source_index as number];
        const cnpj = (p.cnpj_cpf && cnpjRegex.test(String(p.cnpj_cpf))) ? String(p.cnpj_cpf) : null;
        const summary = String(p.ai_summary || "").slice(0, 1000);
        return {
          name: String(p.name || "").slice(0, 200),
          company: p.company ? String(p.company) : null,
          phone: p.phone ? String(p.phone) : null,
          email: p.email ? String(p.email) : null,
          cnpj_cpf: cnpj,
          country: country || "BR",
          state: p.state ? String(p.state) : null,
          city: p.city ? String(p.city) : null,
          segment: String(p.segment || segment || "geral"),
          source: "ia_verificada",
          status: "novo",
          score: Math.max(0, Math.min(100, Math.round(Number(p.score) || 50))),
          matched_parts: Array.isArray(p.matched_parts) ? p.matched_parts.slice(0, 10).map(String) : [],
          ai_summary: summary,
          notes: `[Fonte verificada: ${src.url}]`,
        };
      })
      .filter((p) => p.name);

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("prospects").insert(toInsert as never);
      if (insertError) console.error("Insert error:", insertError);
    }

    return new Response(JSON.stringify({ prospects: toInsert, total: toInsert.length, sources_checked: sources.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("prospect-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
