const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { url, customer_name } = await req.json();
    if (!url || !customer_name || typeof url !== "string" || typeof customer_name !== "string") {
      return new Response(JSON.stringify({ error: "url and customer_name are required strings" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl não conectado." }), { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, reason: "fetch_failed", status: res.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const md: string = (data.markdown || data.data?.markdown || "").slice(0, 100_000);
    if (!md) return new Response(JSON.stringify({ ok: false, reason: "empty_content" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const lower = md.toLowerCase();
    const norm = normalize(customer_name);
    let ok = false;
    let evidence = "";
    if (norm.length >= 6 && lower.includes(norm)) {
      const idx = lower.indexOf(norm);
      ok = true;
      evidence = md.slice(Math.max(0, idx - 80), idx + 200);
    } else {
      const tokens = norm.split(" ").filter((w) => w.length >= 4);
      let hits = 0;
      let firstIdx = -1;
      for (const tok of tokens) {
        const i = lower.indexOf(tok);
        if (i >= 0) { hits++; if (firstIdx < 0) firstIdx = i; }
      }
      if (hits >= Math.min(2, tokens.length) && firstIdx >= 0) {
        ok = true;
        evidence = md.slice(Math.max(0, firstIdx - 80), firstIdx + 200);
      }
    }

    return new Response(JSON.stringify({ ok, evidence, url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-customer-source error", err);
    return new Response(JSON.stringify({ ok: false, reason: "error", error: err instanceof Error ? err.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
