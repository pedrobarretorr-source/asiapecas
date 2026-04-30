const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = Deno.env.get("PUBLIC_SITE_URL") || "https://asiapecas.com.br";

function slugify(s: string) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const urls: { loc: string; lastmod?: string; priority?: string }[] = [
      { loc: `${SITE}/`, priority: "1.0" },
      { loc: `${SITE}/cotacao`, priority: "0.9" },
      { loc: `${SITE}/cotacao/categorias`, priority: "0.8" },
      { loc: `${SITE}/cotacao/modelos`, priority: "0.8" },
    ];

    const partsRes = await fetch(`${SUPABASE_URL}/rest/v1/parts?select=material,updated_at,part_category,machine_model,compatible_models&stock=gt.0&limit=5000`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const parts = await partsRes.json() as any[];

    // Per-part URLs
    for (const p of parts) {
      urls.push({
        loc: `${SITE}/cotacao/p/${encodeURIComponent(p.material)}`,
        lastmod: p.updated_at?.split("T")[0],
        priority: "0.7",
      });
    }

    // Categories aggregation
    const catMap = new Map<string, string>();
    for (const p of parts) {
      const c = (p.part_category || "").trim();
      if (!c) continue;
      const slug = slugify(c);
      const prev = catMap.get(slug);
      if (!prev || (p.updated_at && p.updated_at > prev)) catMap.set(slug, p.updated_at);
    }
    for (const [slug, lastmod] of catMap) {
      urls.push({ loc: `${SITE}/cotacao/c/${slug}`, lastmod: lastmod?.split("T")[0], priority: "0.8" });
    }

    // Models aggregation (machine_model + compatible_models)
    const modelMap = new Map<string, string>();
    for (const p of parts) {
      const models: string[] = [];
      if (p.machine_model) models.push(p.machine_model);
      if (Array.isArray(p.compatible_models)) models.push(...p.compatible_models);
      for (const m of models) {
        const t = (m || "").trim();
        if (!t) continue;
        const slug = slugify(t);
        const prev = modelMap.get(slug);
        if (!prev || (p.updated_at && p.updated_at > prev)) modelMap.set(slug, p.updated_at);
      }
    }
    for (const [slug, lastmod] of modelMap) {
      urls.push({ loc: `${SITE}/cotacao/m/${slug}`, lastmod: lastmod?.split("T")[0], priority: "0.7" });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}${u.priority ? `\n    <priority>${u.priority}</priority>` : ""}
  </url>`).join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return new Response(`<!-- error: ${err instanceof Error ? err.message : "unknown"} -->`, {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});
