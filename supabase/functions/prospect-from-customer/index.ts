import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenAIChatCompletion, extractMessageContent, resolveOpenAIModel } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const SCRAPE_TIMEOUT_MS = 12000;

function normalize(s: string): string {
  return (s || "")
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(ltda|s\/?a|sa|me|epp|eireli|cia|companhia)\b/g, "")
    .replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function contentMatchesCompany(markdown: string, companyName: string): { ok: boolean; excerpt: string } {
  if (!markdown || !companyName) return { ok: false, excerpt: "" };
  const md = markdown.toLowerCase();
  const fullNorm = normalize(companyName);
  if (fullNorm.length >= 6 && md.includes(fullNorm)) {
    const idx = md.indexOf(fullNorm);
    return { ok: true, excerpt: markdown.slice(Math.max(0, idx - 80), idx + 200) };
  }
  const tokens = fullNorm.split(" ").filter((t) => t.length >= 4);
  let hits = 0; let firstIdx = -1;
  for (const t of tokens) {
    const i = md.indexOf(t);
    if (i >= 0) { hits++; if (firstIdx < 0) firstIdx = i; }
  }
  const need = tokens.length >= 3 ? 2 : tokens.length;
  if (hits >= need && firstIdx >= 0) return { ok: true, excerpt: markdown.slice(Math.max(0, firstIdx - 80), firstIdx + 200) };
  return { ok: false, excerpt: "" };
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

async function fcSearch(apiKey: string, query: string, limit = 4) {
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
    const results = extractFirecrawlSearchResults(data);
    if (results.length === 0) console.info("prospect-from-customer firecrawl 0 results for:", query);
    return results;
  } catch { return []; }
}

async function fcScrape(apiKey: string, url: string): Promise<string | null> {
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
    const d = await res.json();
    return (d.markdown || d.data?.markdown || "").slice(0, 200_000) || null;
  } catch { clearTimeout(t); return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl não conectado. Conecte em Connectors para habilitar pesquisa verificada." }), {
        status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const model = resolveOpenAIModel("OPENAI_MODEL_PROSPECT_FROM_CUSTOMER", "gpt-4.1-mini");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { customer_ids = [] } = (await req.json()) as { customer_ids: string[] };
    if (!customer_ids.length) return new Response(JSON.stringify({ error: "customer_ids required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: customers } = await supabase.from("customers")
      .select("id,name,company,cnpj_cpf,city,state,segment,interest_models")
      .in("id", customer_ids);
    if (!customers?.length) return new Response(JSON.stringify({ error: "Nenhum cliente encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: parts } = await supabase.from("parts").select("material,description,machine_model").gt("stock", 0).limit(200);
    const partsCtx = (parts || []).slice(0, 60).map((p) => `${p.material} | ${p.description} | ${p.machine_model || ""}`).join("\n");

    const created: Array<{ customer_id: string; prospect_id: string; score: number; sources: number }> = [];
    const failed: Array<{ customer_id: string; error: string }> = [];

    for (const c of customers) {
      try {
        const companyName = (c.company || c.name).trim();
        const cityState = [c.city, c.state].filter(Boolean).join(" ");

        // Search public signals
        const queries = [
          `"${companyName}" ${cityState} frota máquinas`,
          `"${companyName}" obra OR licitação`,
          `"${companyName}" XCMG OR escavadeira OR carregadeira`,
        ];
        const hits = (await Promise.all(queries.map((q) => fcSearch(FIRECRAWL_API_KEY, q, 3)))).flat();
        const seen = new Set<string>();
        const dedup = hits.filter((h) => { if (seen.has(h.url)) return false; seen.add(h.url); return true; }).slice(0, 4);

        const scraped = await Promise.allSettled(dedup.map(async (h) => {
          const md = await fcScrape(FIRECRAWL_API_KEY, h.url);
          if (!md) return null;
          const m = contentMatchesCompany(md, companyName);
          return m.ok ? { url: h.url, markdown: md, excerpt: m.excerpt } : null;
        }));
        const verified = scraped.filter((s): s is PromiseFulfilledResult<{ url: string; markdown: string; excerpt: string } | null> => s.status === "fulfilled")
          .map((s) => s.value).filter((v): v is { url: string; markdown: string; excerpt: string } => v !== null);

        let summary = "Sem evidência pública recente sobre operações desta empresa.";
        let score = 30;
        let matched: string[] = [];
        let action = "";
        const sourceUrls = verified.map((v) => v.url);

        if (verified.length > 0) {
          const sourcesBlock = verified.map((v, i) => `### FONTE ${i + 1}: ${v.url}\n${v.markdown.slice(0, 12_000)}`).join("\n\n---\n\n");
          const prompt = `Cliente alvo: ${c.name} / ${companyName} (${c.city || "?"}/${c.state || "?"}).
Catálogo (amostra): ${partsCtx}

A partir SOMENTE das páginas reais abaixo, retorne JSON com:
- summary: 2-3 frases citando evidências do texto (sem inventar)
- score: 0-100 (probabilidade de comprar peças XCMG)
- matched_parts: array de até 5 códigos do catálogo acima que façam sentido
- recommended_action: 1 frase concreta

Não invente operações que não estejam no texto.
${sourcesBlock}`;

          const aiRes = await createOpenAIChatCompletion({
            model,
            messages: [
              { role: "system", content: "Responda apenas JSON válido. Use só o que está nas páginas fornecidas." },
              { role: "user", content: prompt },
            ],
          });
          if (aiRes.status === 429 || aiRes.status === 402) { failed.push({ customer_id: c.id, error: aiRes.status === 429 ? "Rate limit" : "Sem créditos" }); continue; }
          if (!aiRes.ok) { failed.push({ customer_id: c.id, error: `AI ${aiRes.status}` }); continue; }
          const aiJson = await aiRes.json();
          const txt = extractMessageContent(aiJson).trim().replace(/^```json\s*|\s*```$/g, "");
          let parsed: { summary?: string; score?: number; matched_parts?: string[]; recommended_action?: string } = {};
          try { parsed = JSON.parse(txt); } catch { parsed = { summary: txt.slice(0, 500) }; }
          summary = String(parsed.summary || summary).slice(0, 1000);
          score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 50)));
          matched = Array.isArray(parsed.matched_parts) ? parsed.matched_parts.slice(0, 10).map(String) : [];
          action = String(parsed.recommended_action || "").slice(0, 300);
        }

        const notes = [
          action ? `Ação recomendada: ${action}` : null,
          sourceUrls.length ? `Fontes verificadas: ${sourceUrls.join(" | ")}` : "Sem fontes públicas verificadas.",
        ].filter(Boolean).join("\n");

        const { data: existingP } = await supabase.from("prospects").select("id").eq("customer_id", c.id).maybeSingle();
        let pid: string;
        const payload = {
          name: c.name, company: c.company, cnpj_cpf: c.cnpj_cpf, city: c.city, state: c.state,
          segment: c.segment || "geral", source: "crm_empty",
          status: "novo", score, matched_parts: matched, ai_summary: summary, notes,
        };
        if (existingP) {
          await supabase.from("prospects").update(payload).eq("id", existingP.id);
          pid = existingP.id;
        } else {
          const { data: ins, error } = await supabase.from("prospects").insert({ ...payload, country: "BR", customer_id: c.id } as never).select("id").single();
          if (error) { failed.push({ customer_id: c.id, error: error.message }); continue; }
          pid = ins!.id;
        }

        await supabase.from("customers").update({ relationship_status: "em_prospeccao" }).eq("id", c.id);
        created.push({ customer_id: c.id, prospect_id: pid, score, sources: sourceUrls.length });
      } catch (e) {
        failed.push({ customer_id: c.id, error: e instanceof Error ? e.message : "unknown" });
      }
    }

    return new Response(JSON.stringify({ success: true, created, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("prospect-from-customer error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
