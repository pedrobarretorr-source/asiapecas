import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  keep_id: z.string().uuid(),
  merge_ids: z.array(z.string().uuid()).min(1).max(20),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { keep_id, merge_ids } = parsed.data;
    if (merge_ids.includes(keep_id)) {
      return new Response(JSON.stringify({ error: "keep_id cannot be in merge_ids" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch all parts (keep + merges)
    const allIds = [keep_id, ...merge_ids];
    const { data: parts, error: partsErr } = await admin
      .from("parts")
      .select("id,material,description,stock,estimated_price")
      .in("id", allIds);
    if (partsErr) throw partsErr;
    if (!parts || parts.length !== allIds.length) {
      return new Response(JSON.stringify({ error: "Some parts not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keep = parts.find((p) => p.id === keep_id)!;
    const merges = parts.filter((p) => merge_ids.includes(p.id));
    const totalStock = parts.reduce((s, p) => s + (p.stock ?? 0), 0);
    const totalValue = parts.reduce((s, p) => s + (p.stock ?? 0) * Number(p.estimated_price ?? 0), 0);
    const avgPrice = totalStock > 0 ? totalValue / totalStock : Number(keep.estimated_price);

    // 1. Transfer sale_items
    const { error: transferErr } = await admin
      .from("sale_items")
      .update({ part_id: keep_id })
      .in("part_id", merge_ids);
    if (transferErr) throw transferErr;

    // 2. Update keep with consolidated stock + weighted avg price
    const { error: updateErr } = await admin
      .from("parts")
      .update({
        stock: totalStock,
        estimated_price: avgPrice,
        updated_at: new Date().toISOString(),
      })
      .eq("id", keep_id);
    if (updateErr) throw updateErr;

    // 3. Delete merged parts
    const { error: deleteErr } = await admin.from("parts").delete().in("id", merge_ids);
    if (deleteErr) throw deleteErr;

    // 4. Audit log (reuse customer_imports as generic log)
    await admin.from("customer_imports").insert({
      file_name: `merge-parts-${new Date().toISOString()}`,
      total_rows: merge_ids.length,
      inserted: 0,
      updated: 1,
      skipped: 0,
      status: "completed",
      report: {
        type: "merge_duplicate_parts",
        actor: userData.user.email,
        keep: { id: keep_id, material: keep.material, description: keep.description },
        merged: merges.map((m) => ({ id: m.id, material: m.material, stock: m.stock })),
        result: { total_stock: totalStock, avg_price: avgPrice },
      },
    });

    return new Response(
      JSON.stringify({ success: true, merged: merge_ids.length, total_stock: totalStock, avg_price: avgPrice }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("merge-duplicate-parts error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
