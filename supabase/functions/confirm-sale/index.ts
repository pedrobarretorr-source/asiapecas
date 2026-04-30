import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sale_id } = await req.json();
    if (!sale_id) {
      return new Response(JSON.stringify({ error: "sale_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get sale items
    const { data: items, error: itemsErr } = await supabase
      .from("sale_items")
      .select("id, part_id, quantity")
      .eq("sale_id", sale_id);
    if (itemsErr) throw itemsErr;
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Venda sem itens" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check stock for all items
    const partIds = items.filter((i) => i.part_id).map((i) => i.part_id!);
    const { data: parts, error: partsErr } = await supabase
      .from("parts")
      .select("id, stock, material")
      .in("id", partIds);
    if (partsErr) throw partsErr;

    const partsMap = new Map(parts!.map((p) => [p.id, p]));
    const insufficientStock: string[] = [];

    for (const item of items) {
      if (!item.part_id) continue;
      const part = partsMap.get(item.part_id);
      if (!part || part.stock < item.quantity) {
        insufficientStock.push(
          `${part?.material || item.part_id}: disponível ${part?.stock ?? 0}, solicitado ${item.quantity}`
        );
      }
    }

    if (insufficientStock.length > 0) {
      return new Response(
        JSON.stringify({ error: "Estoque insuficiente", details: insufficientStock }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrement stock for each item
    for (const item of items) {
      if (!item.part_id) continue;
      const part = partsMap.get(item.part_id)!;
      const { error: updateErr } = await supabase
        .from("parts")
        .update({ stock: part.stock - item.quantity })
        .eq("id", item.part_id);
      if (updateErr) throw updateErr;
    }

    // Update sale status
    const { error: saleErr } = await supabase
      .from("sales")
      .update({ status: "confirmado" })
      .eq("id", sale_id);
    if (saleErr) throw saleErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
