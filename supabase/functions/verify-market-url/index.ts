// Verify Market URL — on-demand re-verification of a single market_research link.
// Re-fetches the page (200KB), checks for literal/normalized presence of the part code,
// and updates the row's source_url/notes accordingly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  research_id: z.string().uuid(),
  url: z.string().url(),
  material: z.string().min(1).max(255),
  matched_part_number: z.string().max(255).optional().nullable(),
});

const GENERIC_PATH_REGEX =
  /^\/?$|^\/(produtos?|categorias?|catalogo|catálogo|busca|buscar|search|ofertas|loja|marca|marcas|lista|departamento|departamentos|home|index)(\/|$)|[?&](q|search|busca|query)=/i;

function normalizePartNumber(s: string): string {
  return (s || "").toLowerCase().replace(/[\s\-._]/g, "");
}

function isGenericUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (GENERIC_PATH_REGEX.test(u.pathname + u.search)) return true;
    if (/mercadolivre\.com|mercadolibre\./i.test(u.hostname)) {
      if (!/\/MLB-?\d|\/p\/MLB/i.test(u.pathname)) return true;
    }
    return false;
  } catch { return true; }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&shy;/gi, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCharCode(parseInt(n, 10)); } catch { return ""; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => { try { return String.fromCharCode(parseInt(n, 16)); } catch { return ""; } });
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function extractMetaSnippets(html: string): string {
  const parts: string[] = [];
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t) parts.push(t[1]);
  for (const m of html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:title|og:description|twitter:title|twitter:description|keywords)["'][^>]*content=["']([^"']+)["']/gi)) parts.push(m[1]);
  for (const m of html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)) parts.push(stripTags(m[1]));
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) parts.push(m[1]);
  return parts.join(" \n ");
}

function findEvidenceSnippet(text: string, needle: string): string | null {
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return null;
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + needle.length + 50);
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 120);
}

function buildSearchUrl(distributor: string, material: string): string {
  const d = (distributor || "").toLowerCase();
  const q = encodeURIComponent(`"${material}" "original XCMG"`);
  if (d.includes("mercadolivre") || d.includes("mercado livre")) return `https://lista.mercadolivre.com.br/${encodeURIComponent(material + " original XCMG")}`;
  if (d.includes("tracbel")) return `https://www.google.com/search?q=site%3Atracbel.com.br+${q}`;
  if (d.includes("sotreq")) return `https://www.google.com/search?q=site%3Asotreq.com.br+${q}`;
  if (d.includes("solar")) return `https://www.google.com/search?q=site%3Asolarequipamentos.com.br+${q}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${distributor} "${material}" "original XCMG"`)}`;
}

async function verify(url: string, material: string, alt?: string | null): Promise<{ ok: boolean; evidence: string | null; reason?: string }> {
  if (isGenericUrl(url)) return { ok: false, evidence: null, reason: "generic_url" };
  const targets = Array.from(new Set([material, alt].filter(Boolean) as string[]));
  const targetsNorm = targets.map(normalizePartNumber);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const resp = await fetch(url, {
      method: "GET", redirect: "follow", signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AsiaPecasBot/1.0)", Range: "bytes=0-204800", Accept: "text/html,application/xhtml+xml" },
    });
    if (resp.status >= 400) return { ok: false, evidence: null, reason: `http_${resp.status}` };
    const html = decodeHtmlEntities(await resp.text());
    const meta = extractMetaSnippets(html);
    const text = stripTags(html);
    const combinedNorm = normalizePartNumber(meta + " " + text);
    for (const target of targets) { const ev = findEvidenceSnippet(meta, target); if (ev) return { ok: true, evidence: ev }; }
    for (const target of targets) { const ev = findEvidenceSnippet(text, target); if (ev) return { ok: true, evidence: ev }; }
    for (const tn of targetsNorm) {
      if (tn && combinedNorm.includes(tn)) {
        const idx = combinedNorm.indexOf(tn);
        const ev = combinedNorm.slice(Math.max(0, idx - 40), Math.min(combinedNorm.length, idx + tn.length + 40));
        return { ok: true, evidence: `[normalizado] ${ev}`.slice(0, 120) };
      }
    }
    return { ok: false, evidence: null, reason: "no_match" };
  } catch (e) {
    return { ok: false, evidence: null, reason: "fetch_error" };
  } finally { clearTimeout(t); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // JWT required
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { research_id, url, material, matched_part_number } = parsed.data;

    // Fetch existing row (for distributor + notes preservation)
    const { data: row, error: rowErr } = await supabase
      .from("market_research")
      .select("id, distributor_name, notes, matched_part_number")
      .eq("id", research_id)
      .single();
    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: "Pesquisa não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await verify(url, material, matched_part_number || row.matched_part_number);

    // Strip prior verification markers from notes
    const cleanNotes = (row.notes || "")
      .replace(/\s*\[verificado:[^\]]*\]/g, "")
      .replace(/\s*\[link direto não confirmado[^\]]*\]/g, "")
      .replace(/\s*\[reverificado em [^\]]*\]/g, "")
      .trim();

    const stamp = new Date().toLocaleDateString("pt-BR");
    let newNotes: string;
    let newUrl: string;
    let verified: boolean;

    if (result.ok && result.evidence) {
      newNotes = `${cleanNotes}${cleanNotes ? " " : ""}[verificado: "${result.evidence.replace(/"/g, "'")}"] [reverificado em ${stamp}]`;
      newUrl = url;
      verified = true;
    } else {
      newNotes = `${cleanNotes}${cleanNotes ? " " : ""}[link direto não confirmado — substituído por busca] [reverificado em ${stamp}]`;
      newUrl = buildSearchUrl(row.distributor_name, material);
      verified = false;
    }

    const { error: upErr } = await supabase
      .from("market_research")
      .update({ notes: newNotes, source_url: newUrl })
      .eq("id", research_id);
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      verified,
      url: newUrl,
      evidence: result.evidence,
      reason: result.reason,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("verify-market-url error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
