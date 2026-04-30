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
  "ltda", "ltd", "me", "epp", "eireli", "sa", "s/a", "s.a", "sas",
  "cia", "cias", "company", "comp", "co", "inc", "corp", "corporation",
  "filial", "matriz", "grupo", "group", "holding", "holdings",
  "comercio", "comercial", "industria", "industrial", "industrias",
  "servicos", "servico", "ltdame", "ltdaepp",
  "construcoes", "construcao", "construtora",
  "mineracao", "mineracoes", "mineradora",
  "transportes", "transporte", "logistica",
  "engenharia", "tecnologia",
  "do", "da", "de", "dos", "das", "e", "&",
]);

function basicSlug(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalCompanyName(v?: string | null): string {
  if (!v) return "";
  const slug = basicSlug(String(v));
  if (!slug) return "";
  const tokens = slug.split(" ").filter((t) => t && !COMPANY_SUFFIXES.has(t));
  const cleaned = tokens.filter((t) => t.length > 1);
  return (cleaned.length > 0 ? cleaned : tokens).join("");
}

function dedupKey(c: { cnpj_cpf?: string | null; email?: string | null; name?: string | null; city?: string | null }) {
  const cnpj = normalizeCnpj(c.cnpj_cpf);
  if (cnpj) return `cnpj:${cnpj}`;
  const e = normalizeEmail(c.email);
  if (e) return `email:${e}`;
  return `name:${canonicalCompanyName(c.name)}|${canonicalCompanyName(c.city)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { file_name, customers = [], equipment = [], invoices = [], brasim_leads = [], update_existing = true, decisions = null } =
      await req.json();
    const decisionsByIdx: Map<number, { action: string; target_id?: string }> = new Map();
    if (Array.isArray(decisions)) for (const d of decisions) decisionsByIdx.set(d.row_index, d);

    // 1. Load existing customers (id, cnpj_cpf, email, name, city) for dedup
    const { data: existing, error: exErr } = await supabase
      .from("customers")
      .select("id, cnpj_cpf, email, name, city")
      .limit(10000);
    if (exErr) throw exErr;

    const existingByKey = new Map<string, { id: string; cnpj_cpf: string | null; email: string | null; name: string; city: string | null }>();
    for (const c of existing || []) existingByKey.set(dedupKey(c as never), c as never);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const customerIdByKey = new Map<string, string>();
    for (const [k, v] of existingByKey) customerIdByKey.set(k, v.id);

    // Merge brasim leads into customers list (mark source)
    const allCustomerRows = [
      ...customers.map((c: Record<string, unknown>) => ({ ...c, source: c.source || "xlsx_import" })),
      ...brasim_leads.map((c: Record<string, unknown>) => ({ ...c, source: "brasim_2025" })),
    ];

    // 2. Process customers in chunks
    const chunk = 100;
    for (let i = 0; i < allCustomerRows.length; i += chunk) {
      const slice = allCustomerRows.slice(i, i + chunk);

      for (let idx = 0; idx < slice.length; idx++) {
        const row = slice[idx];
        const globalIdx = i + idx;
        const r = row as Record<string, unknown>;
        const name = String(r.name || "").trim();
        if (!name) { skipped++; continue; }
        const decision = decisionsByIdx.get(globalIdx);
        if (decision?.action === "ignore") { skipped++; continue; }
        const key = dedupKey({
          cnpj_cpf: r.cnpj_cpf as string | null,
          email: r.email as string | null,
          name,
          city: r.city as string | null,
        });

        const payload: Record<string, unknown> = {
          name,
          company: r.company || null,
          cnpj_cpf: r.cnpj_cpf || null,
          email: normalizeEmail(r.email as string) || (r.email as string | null) || null,
          phone: r.phone || null,
          address: r.address || null,
          city: r.city || null,
          state: r.state || null,
          segment: r.segment || "geral",
          notes: r.notes || null,
          country: r.country || "BR",
          source: r.source || "xlsx_import",
          interest_models: r.interest_models || null,
          relationship_status: r.relationship_status || "prospect",
          last_visit_at: r.last_visit_at || null,
          last_proposal_at: r.last_proposal_at || null,
        };

        let existingMatch = existingByKey.get(key);
        if (decision?.action === "merge" && decision.target_id) {
          const forced = (existing || []).find((x) => x.id === decision.target_id) as typeof existingMatch | undefined;
          if (forced) existingMatch = forced;
        }
        if (decision?.action === "create") existingMatch = undefined;
        if (existingMatch) {
          if (!update_existing) {
            skipped++;
            customerIdByKey.set(key, existingMatch.id);
            continue;
          }
          // Only fill fields that are empty in DB (non-destructive merge)
          const patch: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(payload)) {
            if (v === null || v === undefined || v === "") continue;
            // always allow updating these
            if (["interest_models", "relationship_status", "last_visit_at", "last_proposal_at", "notes"].includes(k)) {
              patch[k] = v;
              continue;
            }
            // for sensitive fields, only fill if empty — fetch current value
            patch[k] = v;
          }
          // Fetch full record then merge non-destructively
          const { data: cur } = await supabase.from("customers").select("*").eq("id", existingMatch.id).single();
          if (cur) {
            const safe: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(patch)) {
              const curVal = (cur as Record<string, unknown>)[k];
              if (["interest_models", "notes", "last_visit_at", "last_proposal_at", "relationship_status", "source"].includes(k)) {
                safe[k] = v;
              } else if (curVal === null || curVal === undefined || curVal === "") {
                safe[k] = v;
              }
            }
            if (Object.keys(safe).length > 0) {
              const { error } = await supabase.from("customers").update(safe).eq("id", existingMatch.id);
              if (!error) updated++;
              else skipped++;
            } else {
              skipped++;
            }
          }
          customerIdByKey.set(key, existingMatch.id);
        } else {
          const { data: ins, error } = await supabase.from("customers").insert(payload).select("id").single();
          if (error || !ins) {
            skipped++;
            continue;
          }
          inserted++;
          existingByKey.set(key, { id: ins.id, cnpj_cpf: payload.cnpj_cpf as string | null, email: payload.email as string | null, name, city: payload.city as string | null });
          customerIdByKey.set(key, ins.id);
        }
      }
    }

    // 3. Equipment
    let equipment_inserted = 0;
    const equipmentRows: Array<Record<string, unknown>> = [];
    for (const e of equipment) {
      const er = e as Record<string, unknown>;
      const key = dedupKey({
        cnpj_cpf: er.cnpj_cpf as string | null,
        email: er.email as string | null,
        name: er.customer_name as string | null,
        city: er.city as string | null,
      });
      const customer_id = customerIdByKey.get(key);
      if (!customer_id) continue;
      equipmentRows.push({
        customer_id,
        model: er.model || null,
        serial_number: er.serial_number || null,
        order_form: er.order_form || null,
        delivery_location: er.delivery_location || null,
        purchase_year: er.purchase_year ? Number(er.purchase_year) : null,
        sale_value: er.sale_value ? Number(er.sale_value) : null,
        notes: er.notes || null,
      });
    }
    if (equipmentRows.length > 0) {
      for (let i = 0; i < equipmentRows.length; i += 200) {
        const batch = equipmentRows.slice(i, i + 200);
        const { error, data } = await supabase.from("customer_equipment").insert(batch).select("id");
        if (error) console.error("equipment insert error", error);
        else equipment_inserted += data?.length || batch.length;
      }
    }

    // 4. Invoices
    let invoices_inserted = 0;
    const invoiceRows: Array<Record<string, unknown>> = [];
    for (const inv of invoices) {
      const ir = inv as Record<string, unknown>;
      const key = dedupKey({
        cnpj_cpf: ir.cnpj_cpf as string | null,
        email: ir.email as string | null,
        name: ir.customer_name as string | null,
        city: ir.city as string | null,
      });
      const customer_id = customerIdByKey.get(key);
      if (!customer_id) continue;
      invoiceRows.push({
        customer_id,
        document_number: ir.document_number ? String(ir.document_number) : null,
        payment_terms: ir.payment_terms || null,
        payer_name: ir.payer_name || null,
        invoice_date: ir.invoice_date || null,
        total_value: Number(ir.total_value) || 0,
        source: "sap",
      });
    }
    if (invoiceRows.length > 0) {
      for (let i = 0; i < invoiceRows.length; i += 200) {
        const batch = invoiceRows.slice(i, i + 200);
        const { error, data } = await supabase.from("customer_invoices").insert(batch).select("id");
        if (error) console.error("invoice insert error", error);
        else invoices_inserted += data?.length || batch.length;
      }
    }

    // 5. Aggregate total_invoiced per customer
    const totals = new Map<string, number>();
    for (const r of invoiceRows) {
      const id = r.customer_id as string;
      totals.set(id, (totals.get(id) || 0) + (r.total_value as number));
    }
    for (const [cid, total] of totals) {
      await supabase.from("customers").update({ total_invoiced: total }).eq("id", cid);
    }

    // 6. Audit
    const { data: importLog } = await supabase
      .from("customer_imports")
      .insert({
        file_name: file_name || "import.xlsx",
        total_rows: allCustomerRows.length,
        inserted,
        updated,
        skipped,
        status: "completed",
        report: { equipment_inserted, invoices_inserted, totals_updated: totals.size },
      })
      .select("id")
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        import_id: importLog?.id,
        inserted,
        updated,
        skipped,
        equipment_inserted,
        invoices_inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("import-customers error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
