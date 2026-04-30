import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createOpenAIChatCompletion, extractToolArguments, resolveOpenAIModel } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const PARALLEL_REGEX =
  /\b(paralel|similar|compat[ií]vel|alternativ|gen[eé]ric|recondicionad|remanufaturad|aftermarket|n[aã]o\s+original)\b/i;
const GENERIC_PATH_REGEX =
  /^\/?$|^\/(produtos?|categorias?|catalogo|catalog|busca|buscar|search|ofertas|loja|marca|marcas|lista|departamento|departamentos|home|index)(\/|$)|[?&](q|search|busca|query)=/i;

const BodySchema = z.object({
  material: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  manufacturer: z.string().max(255).nullable().optional(),
  machine_model: z.string().max(255).nullable().optional(),
  genuine_only: z.boolean().optional().default(true),
});

interface ResultItem {
  distributor_name: string;
  price_brl: number;
  delivery_days?: number;
  availability?: string;
  source_url?: string;
  source_url_type?: "page" | "search";
  url_verified?: boolean;
  is_genuine?: boolean;
  matched_part_number?: string;
  match_confidence?: "exact" | "normalized" | "uncertain";
  notes?: string;
}

interface VerifyResult {
  ok: boolean;
  evidence: string | null;
  reason?: string;
}

function normalizePartNumber(s: string): string {
  return (s || "").toLowerCase().replace(/[\s\-._]/g, "");
}

function isValidHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isGenericUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    const pathAndQuery = url.pathname + url.search;
    if (GENERIC_PATH_REGEX.test(pathAndQuery)) return true;
    if (/mercadolivre\.com|mercadolibre\./i.test(url.hostname)) {
      const isProduct = /\/MLB-?\d|\/p\/MLB/i.test(url.pathname);
      if (!isProduct) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&shy;/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCharCode(parseInt(n, 10));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      try {
        return String.fromCharCode(parseInt(n, 16));
      } catch {
        return "";
      }
    });
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function extractMetaSnippets(html: string): string {
  const parts: string[] = [];
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) parts.push(titleMatch[1]);

  const metaMatches = html.matchAll(
    /<meta[^>]+(?:name|property)=["'](?:description|og:title|og:description|twitter:title|twitter:description|keywords)["'][^>]*content=["']([^"']+)["']/gi,
  );
  for (const match of metaMatches) parts.push(match[1]);

  const h1Matches = html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  for (const match of h1Matches) parts.push(stripTags(match[1]));

  return parts.join(" \n ");
}

function findEvidenceSnippet(text: string, needle: string): string | null {
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return null;
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + needle.length + 50);
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 120);
}

const verifyCache = new Map<string, { result: VerifyResult; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

async function verifyUrlContainsPartNumber(
  url: string,
  material: string,
  alternateMatch?: string,
  timeoutMs = 6000,
): Promise<VerifyResult> {
  const cacheKey = `${url}|${material}|${alternateMatch || ""}`;
  const cached = verifyCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.result;

  const targets = Array.from(new Set([material, alternateMatch].filter(Boolean) as string[]));
  const targetsNorm = targets.map(normalizePartNumber);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    if (isGenericUrl(url)) {
      const result = { ok: false, evidence: null, reason: "generic_url" };
      verifyCache.set(cacheKey, { result, ts: Date.now() });
      return result;
    }

    let head: Response | null = null;
    try {
      head = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AsiaPecasBot/1.0)" },
      });
    } catch {
      head = null;
    }

    if (head && head.status >= 400 && head.status !== 405 && head.status !== 403) {
      const result = { ok: false, evidence: null, reason: `http_${head.status}` };
      verifyCache.set(cacheKey, { result, ts: Date.now() });
      return result;
    }

    const resp = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AsiaPecasBot/1.0)",
        Range: "bytes=0-204800",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (resp.status >= 400) {
      const result = { ok: false, evidence: null, reason: `http_${resp.status}` };
      verifyCache.set(cacheKey, { result, ts: Date.now() });
      return result;
    }

    const html = decodeHtmlEntities(await resp.text());
    const meta = extractMetaSnippets(html);
    const text = stripTags(html);
    const combinedNorm = normalizePartNumber(meta + " " + text);

    for (const target of targets) {
      const metaEvidence = findEvidenceSnippet(meta, target);
      if (metaEvidence) {
        const result = { ok: true, evidence: metaEvidence };
        verifyCache.set(cacheKey, { result, ts: Date.now() });
        return result;
      }
    }

    for (const target of targets) {
      const bodyEvidence = findEvidenceSnippet(text, target);
      if (bodyEvidence) {
        const result = { ok: true, evidence: bodyEvidence };
        verifyCache.set(cacheKey, { result, ts: Date.now() });
        return result;
      }
    }

    for (const targetNorm of targetsNorm) {
      if (targetNorm && combinedNorm.includes(targetNorm)) {
        const idx = combinedNorm.indexOf(targetNorm);
        const evidence = combinedNorm.slice(Math.max(0, idx - 40), Math.min(combinedNorm.length, idx + targetNorm.length + 40));
        const result = { ok: true, evidence: `[normalizado] ${evidence}`.slice(0, 120) };
        verifyCache.set(cacheKey, { result, ts: Date.now() });
        return result;
      }
    }

    const result = { ok: false, evidence: null, reason: "no_match" };
    verifyCache.set(cacheKey, { result, ts: Date.now() });
    return result;
  } catch {
    return { ok: false, evidence: null, reason: "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}

function buildSearchUrl(distributor: string, material: string, genuineOnly: boolean): string {
  const name = distributor.toLowerCase();
  const suffix = genuineOnly ? ' "original XCMG"' : "";
  const q = encodeURIComponent(`"${material}"${suffix}`);
  if (name.includes("mercado livre") || name.includes("mercadolivre")) {
    const term = genuineOnly ? `${material} original XCMG` : material;
    return `https://lista.mercadolivre.com.br/${encodeURIComponent(term)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${distributor} "${material}"${suffix}`)}`;
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
  return [];
}

async function firecrawlSearch(apiKey: string, query: string, limit = 5) {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, lang: "pt", country: "br" }),
    });
    if (!res.ok) return [];
    return extractFirecrawlSearchResults(await res.json());
  } catch {
    return [];
  }
}

async function firecrawlScrape(apiKey: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.markdown || data.data?.markdown || "").slice(0, 40_000) || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }), {
        status: 412,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = resolveOpenAIModel("OPENAI_MODEL_AUTO_MARKET_RESEARCH", "gpt-4.1-mini");
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = parsed.data;
    const genuineOnly = body.genuine_only !== false;
    const targetNorm = normalizePartNumber(body.material);

    const searchQueries = [
      `"${body.material}" "XCMG" ${genuineOnly ? '"original"' : ""}`.trim(),
      `"${body.material}" ${body.machine_model || ""} ${genuineOnly ? '"original XCMG"' : '"XCMG"'}`.trim(),
      `"${body.material}" site:mercadolivre.com.br ${genuineOnly ? '"original XCMG"' : '"XCMG"'}`.trim(),
      `"${body.material}" ${body.description.slice(0, 80)} ${genuineOnly ? '"original"' : ""}`.trim(),
    ];

    const searchHits = (await Promise.all(searchQueries.map((query) => firecrawlSearch(firecrawlApiKey, query, 5)))).flat();
    const seen = new Set<string>();
    const candidates = searchHits
      .filter((item) => isValidHttpUrl(item.url))
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .slice(0, 12);

    const verifiedSourcesRaw = await Promise.all(candidates.map(async (candidate) => {
      const verification = await verifyUrlContainsPartNumber(candidate.url, body.material);
      if (!verification.ok) return null;

      const markdown = await firecrawlScrape(firecrawlApiKey, candidate.url);
      if (!markdown) return null;

      return {
        url: candidate.url,
        title: candidate.title || "",
        evidence: verification.evidence || "",
        markdown,
      };
    }));

    const verifiedSources = verifiedSourcesRaw.filter((item): item is NonNullable<typeof item> => item !== null).slice(0, 6);
    if (verifiedSources.length === 0) {
      return new Response(JSON.stringify({
        search_summary: `Nenhuma pagina verificavel com o codigo exato "${body.material}" foi encontrada nas buscas publicas.`,
        results: [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Voce e um pesquisador de precos de pecas genuinas XCMG no mercado brasileiro.

Regras:
- Use SOMENTE as fontes fornecidas.
- Aceite somente resultados em que o codigo exato da peca aparece literalmente na pagina ou em variacao trivial de formatacao.
- Use source_url APENAS quando ela for uma das fontes fornecidas.
- Nao invente precos, prazos, estoque nem distribuidores.
- ${genuineOnly ? "Ignore pecas paralelas, similares, compativeis, recondicionadas, remanufaturadas e aftermarket." : "Inclua originais e paralelas, marcando is_genuine corretamente."}
- Maximo de 5 resultados.`;

    const userPrompt = `Peca alvo:
- Codigo exato: ${body.material}
- Descricao: ${body.description}
${body.manufacturer ? `- Fabricante: ${body.manufacturer}` : ""}
${body.machine_model ? `- Modelo da maquina: ${body.machine_model}` : ""}

FONTES VERIFICADAS:
${verifiedSources.map((source, index) => `### FONTE ${index + 1}: ${source.url}
Titulo: ${source.title}
Evidencia do codigo: ${source.evidence}

${source.markdown.slice(0, 12000)}`).join("\n\n---\n\n")}

Retorne resultados somente quando o anuncio mostrar o codigo exato pesquisado.`;

    const aiResp = await createOpenAIChatCompletion({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_market_research",
            description: "Reporta precos de concorrentes com match exato do codigo de peca e URL verificavel.",
            parameters: {
              type: "object",
              properties: {
                search_summary: { type: "string" },
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      distributor_name: { type: "string" },
                      price_brl: { type: "number" },
                      delivery_days: { type: "number" },
                      availability: { type: "string", enum: ["em estoque", "sob encomenda", "indisponivel"] },
                      source_url: { type: "string" },
                      is_genuine: { type: "boolean" },
                      matched_part_number: { type: "string" },
                      match_confidence: { type: "string", enum: ["exact", "normalized", "uncertain"] },
                      notes: { type: "string" },
                    },
                    required: ["distributor_name", "price_brl", "is_genuine", "matched_part_number", "match_confidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["search_summary", "results"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_market_research" } },
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisicoes atingido. Tente novamente em alguns instantes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "Creditos de IA esgotados." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI provider error:", aiResp.status, text);
      return new Response(JSON.stringify({ error: `AI provider error: ${aiResp.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const parsedAi = extractToolArguments<{ search_summary: string; results: ResultItem[] }>(aiData);
    if (!parsedAi) {
      return new Response(JSON.stringify({ search_summary: "IA nao retornou resultados estruturados.", results: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawResults = parsedAi.results || [];
    let droppedParallel = 0;
    const afterParallel = rawResults.filter((result) => {
      const haystack = `${result.distributor_name || ""} ${result.notes || ""}`;
      if (genuineOnly && (PARALLEL_REGEX.test(haystack) || result.is_genuine === false)) {
        droppedParallel++;
        return false;
      }
      return true;
    });

    let droppedMismatch = 0;
    const afterMatch = afterParallel
      .map((result) => {
        const matched = (result.matched_part_number || "").trim();
        if (!matched || result.match_confidence === "uncertain") {
          droppedMismatch++;
          return null;
        }
        const matchedNorm = normalizePartNumber(matched);
        if (matched === body.material) return { ...result, match_confidence: "exact" as const };
        if (matchedNorm === targetNorm) return { ...result, match_confidence: "normalized" as const };
        droppedMismatch++;
        return null;
      })
      .filter((result): result is ResultItem => result !== null);

    const verifiedUrlSet = new Set(verifiedSources.map((source) => source.url));
    const validations = await Promise.allSettled(
      afterMatch.map(async (result) => {
        const candidate = result.source_url?.trim();
        let finalUrl: string | undefined;
        let urlType: "page" | "search" = "search";
        let verified = false;
        let evidence: string | null = null;

        if (candidate && verifiedUrlSet.has(candidate) && isValidHttpUrl(candidate)) {
          const validation = await verifyUrlContainsPartNumber(candidate, body.material, result.matched_part_number);
          if (validation.ok) {
            finalUrl = candidate;
            urlType = "page";
            verified = true;
            evidence = validation.evidence;
          }
        }

        if (!finalUrl) {
          finalUrl = buildSearchUrl(result.distributor_name, body.material, genuineOnly);
          urlType = "search";
        }

        let notes = result.notes || "";
        if (verified && evidence) {
          notes = `${notes}${notes ? " " : ""}[verificado: "${evidence.replace(/"/g, "'")}"]`;
        } else if (candidate && !verified) {
          notes = `${notes}${notes ? " " : ""}[link direto nao confirmado - usando busca]`;
        }

        return {
          ...result,
          source_url: finalUrl,
          source_url_type: urlType,
          url_verified: verified,
          is_genuine: result.is_genuine === true,
          notes,
        } as ResultItem;
      }),
    );

    const enriched = validations
      .map((item) => (item.status === "fulfilled" ? item.value : null))
      .filter((item): item is ResultItem => item !== null);

    return new Response(JSON.stringify({
      search_summary: parsedAi.search_summary,
      results: enriched,
      dropped_parallel_count: droppedParallel,
      dropped_mismatch_count: droppedMismatch,
      verified_source_count: verifiedSources.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auto-market-research error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
