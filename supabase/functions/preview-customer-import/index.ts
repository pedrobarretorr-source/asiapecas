import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeCnpj(v?: string | null): string | null {
  if (!v) return null;
  const d = String(v).replace(/\D/g, "");
  if (d.length !== 11 && d.length !== 14) return null;
  return d;
}
function normalizeEmail(v?: string | null): string | null {
  if (!v) return null;
  const t = String(v).trim().toLowerCase();
  return t.includes("@") ? t : null;
}
const COMPANY_SUFFIXES = new Set([
  "ltda","ltd","me","epp","eireli","sa","s/a","s.a","sas","cia","cias","company","comp","co","inc","corp",
  "corporation","filial","matriz","grupo","group","holding","holdings","comercio","comercial","industria",
  "industrial","industrias","servicos","servico","ltdame","ltdaepp","construcoes","construcao","construtora",
  "mineracao","mineracoes","mineradora","transportes","transporte","logistica","engenharia","tecnologia",
  "do","da","de","dos","das","e","&",
]);
function basicSlug(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function canonicalCompanyName(v?: string | null): string {
  if (!v) return "";
  const slug = basicSlug(String(v));
  if (!slug) return "";
  const tokens = slug.split(" ").filter((t) => t && !COMPANY_SUFFIXES.has(t));
  const cleaned = tokens.filter((t) => t.length > 1);
  return (cleaned.length > 0 ? cleaned : tokens).join("");
}

// Jaro-Winkler similarity 0..1
function jaroWinkler(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const m1 = s1.length, m2 = s2.length;
  const matchDist = Math.max(0, Math.floor(Math.max(m1, m2) / 2) - 1);
  const s1Matches = new Array(m1).fill(false);
  const s2Matches = new Array(m2).fill(false);
  let matches = 0;
  for (let i = 0; i < m1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, m2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < m1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  t /= 2;
  const jaro = (matches / m1 + matches / m2 + (matches - t) / matches) / 3;
  // Winkler bonus for common prefix up to 4 chars
  let prefix = 0;
  for (let i = 0; i < Math.min(4, m1, m2); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

type Existing = {
  id: string;
  name: string;
  cnpj_cpf: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  company: string | null;
};

type RowIn = {
  row_index: number;
  name?: string | null;
  cnpj_cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  company?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { rows = [] } = (await req.json()) as { rows: RowIn[] };

    const { data: existing } = await supabase.from("customers")
      .select("id, name, cnpj_cpf, email, phone, city, state, company").limit(10000);

    const ex: Existing[] = (existing || []) as Existing[];
    // Pre-index for fast lookup
    const byCnpj = new Map<string, Existing>();
    const byEmail = new Map<string, Existing>();
    for (const e of ex) {
      const c = normalizeCnpj(e.cnpj_cpf);
      if (c) byCnpj.set(c, e);
      const m = normalizeEmail(e.email);
      if (m) byEmail.set(m, e);
    }

    const results = rows.map((r) => {
      const candidates: Array<{ customer_id: string; name: string; score: number; reason: string; existing: Existing }> = [];
      const cnpj = normalizeCnpj(r.cnpj_cpf);
      const email = normalizeEmail(r.email);
      const canonRow = canonicalCompanyName(r.name);
      const cityRow = canonicalCompanyName(r.city);

      // CNPJ exact
      if (cnpj && byCnpj.has(cnpj)) {
        const e = byCnpj.get(cnpj)!;
        candidates.push({ customer_id: e.id, name: e.name, score: 100, reason: "CNPJ idêntico", existing: e });
      }
      // Email exact
      if (email && byEmail.has(email)) {
        const e = byEmail.get(email)!;
        if (!candidates.some((c) => c.customer_id === e.id)) {
          candidates.push({ customer_id: e.id, name: e.name, score: 90, reason: "Email idêntico", existing: e });
        }
      }
      // Fuzzy name+city
      if (canonRow.length > 2) {
        for (const e of ex) {
          if (candidates.some((c) => c.customer_id === e.id)) continue;
          const canonE = canonicalCompanyName(e.name);
          if (!canonE) continue;
          const sim = jaroWinkler(canonRow, canonE);
          if (sim < 0.82) continue;
          let score = Math.round(sim * 80);
          const cityE = canonicalCompanyName(e.city);
          if (cityRow && cityE && cityRow === cityE) score += 10;
          if (score >= 60) {
            candidates.push({ customer_id: e.id, name: e.name, score, reason: `Nome similar (${Math.round(sim * 100)}%)${cityRow === cityE && cityRow ? " + cidade" : ""}`, existing: e });
          }
        }
      }

      candidates.sort((a, b) => b.score - a.score);
      const top = candidates.slice(0, 5);
      const hi = top.filter((c) => c.score >= 50);
      let status: "new" | "match" | "ambiguous" = "new";
      if (top.length === 0) status = "new";
      else if (hi.length >= 2 && top[0].score < 90) status = "ambiguous";
      else if (top[0].score >= 60) status = "match";

      return {
        row_index: r.row_index,
        status,
        matches: top.map((m) => ({
          customer_id: m.customer_id,
          name: m.name,
          score: m.score,
          reason: m.reason,
          existing: {
            cnpj_cpf: m.existing.cnpj_cpf,
            email: m.existing.email,
            phone: m.existing.phone,
            city: m.existing.city,
            state: m.existing.state,
            company: m.existing.company,
          },
        })),
      };
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("preview-customer-import error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
