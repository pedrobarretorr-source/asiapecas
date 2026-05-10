import { createClient } from "npm:@supabase/supabase-js@2";
import type { NormalizedResult, ParserFn, SourceId } from "./parsers/types.ts";
import { searchMercadoLivre } from "./parsers/mercadolivre.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCES: Record<SourceId, ParserFn> = {
  mercadolivre: searchMercadoLivre,
  lideranca: async () => [{ source: "lideranca", rank: 0, error: "not_implemented" }],
  macromaq: async () => [{ source: "macromaq", rank: 0, error: "not_implemented" }],
  extramaquinas: async () => [{ source: "extramaquinas", rank: 0, error: "not_implemented" }],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { part_id, query, sources } = await req.json();
    if (!part_id || !query) {
      return new Response(JSON.stringify({ error: "part_id e query obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selected: SourceId[] = sources?.length ? sources : (Object.keys(SOURCES) as SourceId[]);

    const settled = await Promise.allSettled(
      selected.map(async (s) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12_000);
        try {
          return await SOURCES[s](query, ctrl.signal);
        } catch (e) {
          return [{ source: s, rank: 0, error: String((e as Error).message || e) } as NormalizedResult];
        } finally {
          clearTimeout(t);
        }
      })
    );

    const results: NormalizedResult[] = settled.flatMap((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return [{ source: selected[i], rank: 0, error: "rejected" } as NormalizedResult];
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const auth = req.headers.get("Authorization") || "";
    const userId = await getUserIdFromAuth(auth, supabase).catch(() => null);

    const { data: lookup, error: lookupErr } = await supabase
      .from("price_lookups")
      .insert({ part_id, query, created_by: userId })
      .select("id, created_at")
      .single();
    if (lookupErr) throw lookupErr;

    if (results.length > 0) {
      const rows = results.map((r) => ({
        lookup_id: lookup.id,
        source: r.source,
        rank: r.rank,
        title: r.title,
        price_brl: r.price_brl,
        url: r.url,
        seller: r.seller,
        image_url: r.image_url,
        in_stock: r.in_stock,
        error: r.error,
      }));
      const { error: insErr } = await supabase.from("price_lookup_results").insert(rows);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({
      lookup_id: lookup.id,
      created_at: lookup.created_at,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getUserIdFromAuth(authHeader: string, supabase: ReturnType<typeof createClient>): Promise<string | null> {
  if (!authHeader) return null;
  const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  return data.user?.id || null;
}
