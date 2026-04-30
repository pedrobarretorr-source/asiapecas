import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenAIChatCompletion, extractToolArguments, resolveOpenAIModel } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const SCRAPE_TIMEOUT_MS = 12000;

// Sites that almost always carry verifiable company data — prioritized in scrape queue
const PRIORITY_HOSTS = [
  "cnpj.biz",
  "cnpja.com",
  "casadosdados.com.br",
  "consultaempresa",
  "receita.fazenda",
  "linkedin.com/company",
  "linkedin.com/in",
  "jusbrasil.com.br",
  "econodata.com.br",
  "empresaaqui.com.br",
  "guiamais.com.br",
  "telelistas.net",
  "gov.br",
];

// ---------- helpers ----------
function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(ltda|s\/?a|sa|me|epp|eireli|cia|companhia|comercial|industria|industrial)\b/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(name: string): string[] {
  const norm = normalize(name);
  return norm.split(" ").filter((t) => t.length >= 4);
}

function nameSlug(name: string): string {
  return normalize(name).replace(/\s+/g, "");
}

type MatchResult = {
  level: "strong" | "medium" | "weak" | "none";
  excerpt: string;
};

function contentMatchesCompany(markdown: string, companyName: string, cnpj?: string | null): MatchResult {
  if (!markdown || !companyName) return { level: "none", excerpt: "" };
  const md = markdown.toLowerCase();
  const tokens = nameTokens(companyName);
  const fullNorm = normalize(companyName);

  // STRONG: full literal name
  if (fullNorm.length >= 6 && md.includes(fullNorm)) {
    const idx = md.indexOf(fullNorm);
    return { level: "strong", excerpt: markdown.slice(Math.max(0, idx - 80), idx + 200) };
  }

  // STRONG: literal CNPJ present
  if (cnpj) {
    const c = cnpj.replace(/\D/g, "");
    if (c.length === 14 && md.replace(/\D/g, "").includes(c)) {
      const idx = Math.max(0, md.search(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/));
      return { level: "strong", excerpt: markdown.slice(Math.max(0, idx - 80), idx + 200) };
    }
  }

  // Token-based scoring
  let hits = 0;
  let firstIdx = -1;
  for (const t of tokens) {
    const i = md.indexOf(t);
    if (i >= 0) {
      hits++;
      if (firstIdx < 0) firstIdx = i;
    }
  }

  // MEDIUM: ≥2 distinct tokens
  if (hits >= 2 && firstIdx >= 0) {
    return { level: "medium", excerpt: markdown.slice(Math.max(0, firstIdx - 80), firstIdx + 200) };
  }
  // WEAK: 1 token (only acceptable if name is short)
  if (hits >= 1 && firstIdx >= 0 && tokens.length <= 2) {
    return { level: "weak", excerpt: markdown.slice(Math.max(0, firstIdx - 80), firstIdx + 200) };
  }
  return { level: "none", excerpt: "" };
}

function isJunkUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("/search?") ||
    u.includes("google.com/search") ||
    u.endsWith(".pdf") ||
    u.includes("youtube.com") ||
    u.includes("facebook.com/sharer")
  );
}

function priorityScore(url: string): number {
  const u = url.toLowerCase();
  for (let i = 0; i < PRIORITY_HOSTS.length; i++) {
    if (u.includes(PRIORITY_HOSTS[i])) return PRIORITY_HOSTS.length - i;
  }
  return 0;
}

// Tolerant normalizer for Firecrawl v2 search responses (shape varies between releases)
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

// Custom error so callers can detect 402 (no credits) and surface a clear message
class FirecrawlNoCreditsError extends Error {
  constructor() {
    super("Firecrawl 402 — sem créditos");
    this.name = "FirecrawlNoCreditsError";
  }
}

async function firecrawlSearch(
  apiKey: string,
  query: string,
  country: string,
  lang: string,
  limit = 5,
): Promise<Array<{ url: string; title?: string; description?: string }>> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, lang, country }),
    });
    if (res.status === 402) {
      console.error("firecrawl 402 — créditos esgotados", query);
      throw new FirecrawlNoCreditsError();
    }
    if (!res.ok) {
      console.warn("firecrawl search failed", res.status, query);
      return [];
    }
    const data = await res.json();
    const results = extractFirecrawlSearchResults(data).filter((r) => !isJunkUrl(r.url));
    if (results.length === 0) {
      console.info("firecrawl search returned 0 results for query:", query);
    }
    return results;
  } catch (e) {
    if (e instanceof FirecrawlNoCreditsError) throw e;
    console.warn("firecrawl search error", e);
    return [];
  }
}

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
    if (!md) return null;
    return md.slice(0, 200_000);
  } catch (_e) {
    clearTimeout(t);
    return null;
  }
}

const enrichTool = {
  type: "function",
  function: {
    name: "register_enrichment",
    description: "Extrai dados verificados sobre uma empresa a partir do markdown fornecido. Use null sempre que o dado não estiver explicitamente no texto.",
    parameters: {
      type: "object",
      properties: {
        official_name: { type: ["string", "null"] },
        cnpj_formatted: { type: ["string", "null"], description: "Apenas se o CNPJ aparecer literalmente no texto, formato XX.XXX.XXX/XXXX-XX" },
        cnae: { type: ["string", "null"] },
        company_size: { type: ["string", "null"], enum: ["ME", "EPP", "Medio", "Grande", null] },
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
          description: "Para cada campo preenchido (≠ null), informe { source_url, source_excerpt }. Trecho deve aparecer literalmente em uma das fontes.",
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

  let customer_id: string | null = null;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    customer_id = body.customer_id;
    if (!customer_id) return new Response(JSON.stringify({ error: "customer_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl não está conectado. Conecte em Connectors para habilitar a pesquisa web verificada." }), {
        status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const model = resolveOpenAIModel("OPENAI_MODEL_ENRICH_CUSTOMER", "gpt-4.1-mini");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: customer, error } = await supabase.from("customers").select("*").eq("id", customer_id).single();
    if (error || !customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const realCompanyName = (customer.company || customer.name).trim();
    const searchOverride = typeof body.search_override === "string" ? body.search_override.trim() : "";
    const queryNameSource = searchOverride || realCompanyName;
    const cityState = [customer.city, customer.state].filter(Boolean).join(" ");
    const customerCountry = (customer.country || "BR").toLowerCase();
    const countryCode = customerCountry === "br" ? "br" : customerCountry === "ve" ? "ve" : customerCountry === "gy" ? "gy" : "br";
    const langCode = countryCode === "ve" ? "es" : countryCode === "gy" ? "en" : "pt";

    // ----- Smart query builder -----
    function stripAccents(s: string) {
      return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    function buildCoreName(name: string): string {
      let n = name;
      n = n.replace(/\([^)]*\)/g, " ");                                // remove parentheticals
      n = n.replace(/\b(s\/?a|s\.?a\.?|ltda|eireli|epp|me|cia|companhia)\b\.?/gi, " ");
      n = n.replace(/[.,;:/\\"'`]/g, " ");                              // remove punctuation
      n = stripAccents(n);
      n = n.replace(/\s+/g, " ").trim();
      return n;
    }
    function buildSmartQueries(opts: {
      name: string;
      cnpj?: string | null;
      city?: string | null;
      state?: string | null;
      segmentHint?: string | null;
      country: string;
    }): { round1: string[]; round2: string[] } {
      const core = buildCoreName(opts.name);
      const tokens = core.split(" ").filter(Boolean);
      const short = tokens.slice(0, 3).join(" ") || core;
      const segHint = opts.segmentHint && opts.segmentHint !== "geral" ? opts.segmentHint : "";
      const cityClean = opts.city ? stripAccents(opts.city) : "";
      const countryName = opts.country === "br" ? "Brasil" : opts.country === "ve" ? "Venezuela" : opts.country === "gy" ? "Guyana" : "";

      // Round 1 — strict / literal (CNPJ + full quoted)
      const round1: string[] = [];
      if (opts.cnpj && opts.cnpj.replace(/\D/g, "").length >= 11) {
        round1.push(`"${opts.cnpj}"`);
        round1.push(`"${opts.cnpj}" cnpj`);
      }
      round1.push(`"${opts.name}" ${[opts.city, opts.state].filter(Boolean).join(" ")}`.trim());
      round1.push(`"${opts.name}" site:linkedin.com/company`);
      if (opts.country === "br") round1.push(`"${opts.name}" site:gov.br`);

      // Round 2 — fuzzy (no quotes, sanitized short name)
      const round2: string[] = [];
      if (cityClean) round2.push(`${short} ${cityClean}`);
      round2.push(`${short} site oficial`);
      round2.push(`${short} linkedin`);
      round2.push(`${short} cnpj`);
      if (tokens.length <= 2 && segHint) round2.push(`${short} ${segHint} ${countryName}`.trim());
      else if (countryName) round2.push(`${core} ${countryName}`);
      round2.push(`site:linkedin.com/company ${short}`);

      // dedupe within rounds
      const dedupe = (arr: string[]) => Array.from(new Set(arr.map((q) => q.trim()).filter(Boolean)));
      return { round1: dedupe(round1), round2: dedupe(round2) };
    }

    const { round1, round2 } = buildSmartQueries({
      name: queryNameSource,
      cnpj: customer.cnpj_cpf,
      city: customer.city,
      state: customer.state,
      segmentHint: customer.segment,
      country: countryCode,
    });

    const telemetry: Record<string, unknown> = {
      searched_queries: 0,
      urls_returned: 0,
      urls_unique: 0,
      urls_scraped_ok: 0,
      urls_matched_strong: 0,
      urls_matched_medium: 0,
      urls_matched_weak: 0,
      country: countryCode,
      rounds_executed: 0,
      round1_yielded: 0,
      round2_yielded: 0,
      queries_round1: round1,
      queries_round2: [] as string[],
      search_override: searchOverride || null,
      core_name_used: buildCoreName(queryNameSource),
    };

    async function runRound(qs: string[]): Promise<Array<{ url: string; title?: string; description?: string }>> {
      const batches = await Promise.all(qs.map((q) => firecrawlSearch(FIRECRAWL_API_KEY!, q, countryCode, langCode, 4)));
      return batches.flat();
    }

    // Round 1
    let searchResults = await runRound(round1);
    telemetry.searched_queries = round1.length;
    telemetry.rounds_executed = 1;
    telemetry.round1_yielded = searchResults.length;

    // Round 2 — automatic fallback when round 1 returns nothing
    if (searchResults.length === 0 && round2.length > 0) {
      const r2 = await runRound(round2);
      telemetry.queries_round2 = round2;
      telemetry.searched_queries = (telemetry.searched_queries as number) + round2.length;
      telemetry.rounds_executed = 2;
      telemetry.round2_yielded = r2.length;
      searchResults = r2;
    }

    // dedupe by URL, then sort by priority host
    const seen = new Set<string>();
    let candidates = searchResults.filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
    candidates.sort((a, b) => priorityScore(b.url) - priorityScore(a.url));
    candidates = candidates.slice(0, 12);

    telemetry.urls_returned = searchResults.length;
    telemetry.urls_unique = candidates.length;

    // Keep `companyName` as the REAL name for content matching (so verification stays strict)
    const companyName = realCompanyName;

    console.info("enrich-customer firecrawl_hits=", candidates.length, "for", companyName, "country=", countryCode);

    // SERP-only weak fallback evidence (titles/descriptions that mention the company)
    const serpWeak = candidates
      .map((c) => {
        const blob = `${c.title || ""} ${c.description || ""}`;
        const m = contentMatchesCompany(blob, companyName, customer.cnpj_cpf);
        return m.level !== "none" ? { url: c.url, title: c.title || "", description: c.description || "", level: m.level } : null;
      })
      .filter((x): x is { url: string; title: string; description: string; level: MatchResult["level"] } => x !== null)
      .slice(0, 6);

    if (candidates.length === 0) {
      const allQueries = [...round1, ...round2];
      const sample = allQueries.slice(0, 3).map((q) => `"${q}"`).join(", ");
      const note = `Nenhum resultado público para ${sample}${allQueries.length > 3 ? ` (+${allQueries.length - 3} variações)` : ""}. Tente o botão "Buscar com outro nome" acima ou cole uma URL conhecida (site/LinkedIn) abaixo.`;
      await supabase.from("customers").update({
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
        enrichment_data: {
          confidence: "low",
          sources: [],
          weak_sources: [],
          evidence: {},
          telemetry,
          _note: note,
        },
      }).eq("id", customer_id);
      return new Response(JSON.stringify({ success: true, enrichment: { confidence: "low", sources: [], telemetry }, note: "no_public_results" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. SCRAPE top candidates (priority-sorted) and verify
    const top = candidates.slice(0, 6);
    const scraped = await Promise.allSettled(top.map(async (c) => {
      const md = await firecrawlScrape(FIRECRAWL_API_KEY, c.url);
      if (!md) return null;
      const m = contentMatchesCompany(md, companyName, customer.cnpj_cpf);
      return { url: c.url, markdown: md, match: m };
    }));

    const ok = scraped
      .filter((s): s is PromiseFulfilledResult<{ url: string; markdown: string; match: MatchResult } | null> => s.status === "fulfilled")
      .map((s) => s.value)
      .filter((v): v is { url: string; markdown: string; match: MatchResult } => v !== null);

    telemetry.urls_scraped_ok = ok.length;
    const verified = ok.filter((v) => v.match.level === "strong" || v.match.level === "medium");
    telemetry.urls_matched_strong = ok.filter((v) => v.match.level === "strong").length;
    telemetry.urls_matched_medium = ok.filter((v) => v.match.level === "medium").length;
    telemetry.urls_matched_weak = ok.filter((v) => v.match.level === "weak").length;

    console.info("enrich-customer telemetry", JSON.stringify(telemetry));

    if (verified.length === 0) {
      // Has only weak/none — surface SERP weak evidence as "indícios" instead of bare failure
      await supabase.from("customers").update({
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
        enrichment_data: {
          confidence: "low",
          sources: [],
          weak_sources: serpWeak,
          evidence: {},
          telemetry,
          _note: serpWeak.length
            ? "Encontramos páginas que possivelmente mencionam a empresa, mas o nome não foi confirmado de forma inequívoca. Reveja os indícios abaixo ou adicione uma URL manual."
            : "Resultados encontrados, mas nenhum continha o nome da empresa de forma verificável. Adicione uma URL manual (site/LinkedIn).",
        },
      }).eq("id", customer_id);
      return new Response(JSON.stringify({ success: true, enrichment: { confidence: "low", sources: [], weak_sources: serpWeak, telemetry }, note: "no_verified_sources" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Send verified markdown to AI for extraction with evidence
    const sourcesBlock = verified.map((v, i) => `### FONTE ${i + 1}: ${v.url}\n\n${v.markdown.slice(0, 18_000)}`).join("\n\n---\n\n");

    const userPrompt = `Cliente: ${customer.name}
Empresa: ${companyName}
Cidade/UF: ${customer.city || "—"} / ${customer.state || "—"}

Abaixo estão páginas reais já verificadas que mencionam esta empresa. Extraia APENAS dados que aparecem literalmente no texto. Para cada campo preenchido, registre em \`evidence\` o source_url e o trecho exato.

Regras críticas:
- CNPJ: só preencha se aparecer no texto no formato XX.XXX.XXX/XXXX-XX
- Telefone, endereço, redes sociais: só se realmente aparecem
- Nunca chute. Quando não houver evidência, use null.

${sourcesBlock}`;

    const aiResp = await createOpenAIChatCompletion({
      model,
      messages: [
        { role: "system", content: "Você extrai dados de empresas a partir de páginas web reais. Nunca invente dados. Use null para qualquer campo sem evidência literal no texto fornecido." },
        { role: "user", content: userPrompt },
      ],
      tools: [enrichTool],
      tool_choice: { type: "function", function: { name: "register_enrichment" } },
    });

    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI provider error", aiResp.status, t);
      throw new Error("AI provider error");
    }

    const aiData = await aiResp.json();
    const args = extractToolArguments<Record<string, unknown> & { evidence: Record<string, { source_url: string; source_excerpt: string }> }>(aiData);
    if (!args) throw new Error("AI did not return structured data");

    const cnpjRegex = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
    if (args.cnpj_formatted && !cnpjRegex.test(args.cnpj_formatted as string)) {
      args.cnpj_formatted = null;
      delete args.evidence?.cnpj_formatted;
    }

    const verifiedUrls = new Set(verified.map((v) => v.url));
    const cleanEvidence: Record<string, { source_url: string; source_excerpt: string }> = {};
    for (const [field, ev] of Object.entries(args.evidence || {})) {
      if (ev && verifiedUrls.has(ev.source_url)) cleanEvidence[field] = ev;
      else if (ev) (args as Record<string, unknown>)[field] = null;
    }

    const filledCount = Object.keys(cleanEvidence).length;
    const strongCount = verified.filter((v) => v.match.level === "strong").length;
    const confidence: "high" | "medium" | "low" = strongCount >= 2 && filledCount >= 4 ? "high" : verified.length >= 1 && filledCount >= 2 ? "medium" : "low";

    const enrichmentData = {
      ...args,
      evidence: cleanEvidence,
      sources: verified.map((v) => v.url),
      weak_sources: serpWeak,
      confidence,
      telemetry,
      _enriched_at: new Date().toISOString(),
    };

    const updates: Record<string, unknown> = {
      enrichment_status: "enriched",
      enriched_at: new Date().toISOString(),
      enrichment_data: enrichmentData,
    };
    if (!customer.company && args.official_name) updates.company = args.official_name;
    if (!customer.cnpj_cpf && args.cnpj_formatted) updates.cnpj_cpf = args.cnpj_formatted;
    if (!customer.phone && args.alt_phone) updates.phone = args.alt_phone;
    if (!customer.address && args.full_address) updates.address = args.full_address;
    if ((!customer.segment || customer.segment === "geral") && args.segment) updates.segment = args.segment;

    await supabase.from("customers").update(updates).eq("id", customer_id);

    return new Response(JSON.stringify({ success: true, enrichment: enrichmentData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("enrich-customer error", err);
    const isNoCredits = err instanceof FirecrawlNoCreditsError;
    const msg = isNoCredits
      ? "Créditos do Firecrawl esgotados. Recarregue em Connectors → Firecrawl para voltar a enriquecer clientes."
      : err instanceof Error ? err.message : "unknown";
    try {
      if (customer_id) {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supabase.from("customers").update({ enrichment_status: "failed" }).eq("id", customer_id);
      }
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ error: msg }), {
      status: isNoCredits ? 402 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
