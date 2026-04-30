import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { updates } = await req.json();
    // updates: [{material, stock, price}, ...]

    if (!updates || !updates.length) {
      return new Response(JSON.stringify({ error: "No updates" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    let updated = 0;
    let errors = 0;

    // Update one by one using parameterized queries (safe, no raw SQL)
    for (const u of updates) {
      const updateData: Record<string, any> = {};
      if (u.stock !== undefined) updateData.stock = Number(u.stock);
      if (u.price !== undefined) updateData.estimated_price = Number(u.price);

      if (Object.keys(updateData).length === 0) continue;

      const { error: e } = await supabase
        .from("parts")
        .update(updateData)
        .eq("material", String(u.material));

      if (e) errors++;
      else updated++;
    }

    return new Response(JSON.stringify({ updated, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
