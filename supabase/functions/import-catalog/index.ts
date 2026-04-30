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

    const { items, file_name, source_label } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create stock_imports record
    const totalStock = items.reduce((s: number, i: any) => s + (Number(i.stock) || 0), 0);
    const totalValue = items.reduce((s: number, i: any) => s + (Number(i.stock) || 0) * (Number(i.estimated_price) || 0), 0);

    const { data: importRecord, error: importErr } = await supabase
      .from("stock_imports")
      .insert({
        file_name: file_name || "import.xlsx",
        source_label: source_label || "Estoque Principal",
        total_rows: items.length,
        total_stock: totalStock,
        total_value: totalValue,
        status: "processando",
      })
      .select("id")
      .single();

    if (importErr) throw importErr;
    const importId = importRecord.id;

    // 2. Insert items into stock_import_items in batches of 500
    const batchSize = 500;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize).map((item: any) => ({
        import_id: importId,
        material: String(item.material || "").trim(),
        description: String(item.description || "").trim(),
        stock: Number(item.stock) || 0,
        estimated_price: Number(item.estimated_price) || 0,
        machine_model: item.machine_model || null,
        manufacturer: item.manufacturer || null,
        supplier: item.supplier || null,
        last_entry_time: item.last_entry_time || null,
        is_mineracao: Boolean(item.is_mineracao),
        is_linha_amarela: Boolean(item.is_linha_amarela),
        is_perfuratriz: Boolean(item.is_perfuratriz),
        is_caminhao_eletrico: Boolean(item.is_caminhao_eletrico),
        is_guindaste: Boolean(item.is_guindaste),
      }));

      const { error: batchErr } = await supabase.from("stock_import_items").insert(batch);
      if (batchErr) console.error("Batch insert error:", batchErr.message);
    }

    // 3. Aggregate by material and upsert into parts
    // Get all unique materials from this import, aggregated
    const { data: aggregated, error: aggErr } = await supabase
      .from("stock_import_items")
      .select("material, description, stock, estimated_price, machine_model, manufacturer, supplier, last_entry_time, is_mineracao, is_linha_amarela, is_perfuratriz, is_caminhao_eletrico, is_guindaste")
      .eq("import_id", importId);

    if (aggErr) throw aggErr;

    // Group by material
    const materialMap = new Map<string, any>();
    for (const row of aggregated || []) {
      const key = row.material;
      if (!key) continue;
      const existing = materialMap.get(key);
      if (existing) {
        existing.stock += row.stock || 0;
        existing.estimated_price = Math.max(existing.estimated_price, row.estimated_price || 0);
        if (row.machine_model && !existing.models.includes(row.machine_model)) {
          existing.models.push(row.machine_model);
        }
      } else {
        materialMap.set(key, {
          material: key,
          description: row.description,
          stock: row.stock || 0,
          estimated_price: row.estimated_price || 0,
          machine_model: row.machine_model || null,
          manufacturer: row.manufacturer || null,
          supplier: row.supplier || null,
          last_entry_time: row.last_entry_time || null,
          is_mineracao: row.is_mineracao || false,
          is_linha_amarela: row.is_linha_amarela || false,
          is_perfuratriz: row.is_perfuratriz || false,
          is_caminhao_eletrico: row.is_caminhao_eletrico || false,
          is_guindaste: row.is_guindaste || false,
          models: row.machine_model ? [row.machine_model] : [],
        });
      }
    }

    let inserted = 0, updated = 0, errors = 0;
    const entries = Array.from(materialMap.values());

    // Process in batches
    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100);
      
      for (const entry of batch) {
        const partData: any = {
          description: entry.description,
          stock: entry.stock,
          estimated_price: entry.estimated_price,
          is_mineracao: entry.is_mineracao,
          is_linha_amarela: entry.is_linha_amarela,
          is_perfuratriz: entry.is_perfuratriz,
          is_caminhao_eletrico: entry.is_caminhao_eletrico,
          is_guindaste: entry.is_guindaste,
        };
        if (entry.machine_model) partData.machine_model = entry.machine_model;
        if (entry.manufacturer) partData.manufacturer = entry.manufacturer;
        if (entry.supplier) partData.supplier = entry.supplier;
        if (entry.last_entry_time) partData.last_entry_time = entry.last_entry_time;
        if (entry.models.length > 0) partData.compatible_models = entry.models;

        // Check if exists
        const { data: existing } = await supabase
          .from("parts")
          .select("id")
          .eq("material", entry.material)
          .maybeSingle();

        if (existing) {
          const { error: e } = await supabase.from("parts").update(partData).eq("id", existing.id);
          if (e) errors++;
          else updated++;
        } else {
          partData.material = entry.material;
          const { error: e } = await supabase.from("parts").insert([partData]);
          if (e) errors++;
          else inserted++;
        }
      }
    }

    // 4. Update import status
    const finalStock = entries.reduce((s, e) => s + e.stock, 0);
    const finalValue = entries.reduce((s, e) => s + e.stock * e.estimated_price, 0);

    await supabase.from("stock_imports").update({
      status: "completo",
      total_stock: finalStock,
      total_value: finalValue,
    }).eq("id", importId);

    return new Response(JSON.stringify({
      success: true,
      import_id: importId,
      total_rows: items.length,
      unique_materials: entries.length,
      inserted,
      updated,
      errors,
      total_stock: finalStock,
      total_value: finalValue,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
