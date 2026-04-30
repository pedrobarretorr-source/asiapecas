import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Customer = {
  id: string;
  name: string;
  company: string | null;
  cnpj_cpf: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  segment: string | null;
  notes: string | null;
  country: string | null;
  source: string | null;
  interest_models: string[] | null;
  relationship_status: string | null;
  last_visit_at: string | null;
  last_proposal_at: string | null;
  total_invoiced: number | null;
  enrichment_status: string | null;
  enriched_at: string | null;
  enrichment_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CustomerInsert = Partial<Omit<Customer, "id" | "created_at" | "updated_at">> & { name: string };

export type CustomerEquipment = {
  id: string;
  customer_id: string;
  model: string | null;
  serial_number: string | null;
  order_form: string | null;
  delivery_location: string | null;
  purchase_year: number | null;
  sale_value: number | null;
  notes: string | null;
  created_at: string;
};

export type CustomerInvoice = {
  id: string;
  customer_id: string;
  document_number: string | null;
  payment_terms: string | null;
  payer_name: string | null;
  invoice_date: string | null;
  total_value: number;
  source: string | null;
  created_at: string;
};

export type CustomerImport = {
  id: string;
  file_name: string;
  imported_at: string;
  total_rows: number;
  inserted: number;
  updated: number;
  skipped: number;
  status: string;
  report: Record<string, unknown> | null;
};

export type CustomersListParams = {
  search?: string;
  state?: string;        // "all" or UF
  segment?: string;      // "all" or segment
  enrichment?: string;   // "all" | "enriched" | "pending" | "empty"
  page?: number;
  pageSize?: number;
};

export type CustomersListResult = {
  rows: Customer[];
  total: number;
  page: number;
  pageSize: number;
};

/** Lightweight unpaginated list — for selects & lookups. Capped at 5000. */
export function useAllCustomers() {
  return useQuery({
    queryKey: ["customers-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id,name,company,cnpj_cpf,phone,email,city,state,segment,relationship_status,enrichment_status,total_invoiced")
        .order("name")
        .limit(5000);
      if (error) throw error;
      return (data || []) as Customer[];
    },
  });
}

export function useCustomers(params: CustomersListParams = {}) {
  const { search = "", state = "all", segment = "all", enrichment = "all", page = 1, pageSize = 25 } = params;
  return useQuery({
    queryKey: ["customers", { search, state, segment, enrichment, page, pageSize }],
    queryFn: async (): Promise<CustomersListResult> => {
      const hasFilters = !!search || state !== "all" || segment !== "all" || enrichment !== "all";
      let query = supabase
        .from("customers")
        .select("*", { count: hasFilters ? "exact" : "estimated" })
        .order("name");

      if (search) {
        query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,cnpj_cpf.ilike.%${search}%`);
      }
      if (state !== "all") query = query.eq("state", state);
      if (segment !== "all") query = query.eq("segment", segment);
      if (enrichment === "enriched") query = query.eq("enrichment_status", "enriched");
      else if (enrichment === "pending") query = query.neq("enrichment_status", "enriched");
      else if (enrichment === "empty") {
        // empty = no email AND no phone AND no cnpj_cpf
        query = query.is("email", null).is("phone", null).is("cnpj_cpf", null);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return {
        rows: (data || []) as Customer[],
        total: count || 0,
        page,
        pageSize,
      };
    },
  });
}

/** Lightweight global stats for header cards (independent of pagination). */
export function useCustomersStats() {
  return useQuery({
    queryKey: ["customers-stats"],
    queryFn: async () => {
      const [{ count: total }, { count: enriched }, { data: states }, { data: invoiced }] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("enrichment_status", "enriched"),
        supabase.from("customers").select("state").not("state", "is", null).limit(5000),
        supabase.from("customers").select("total_invoiced").gt("total_invoiced", 0).limit(5000),
      ]);
      const uniqueStates = new Set((states || []).map((s) => s.state).filter(Boolean));
      const totalInvoiced = (invoiced || []).reduce((s, x) => s + Number(x.total_invoiced || 0), 0);
      return {
        total: total || 0,
        enriched: enriched || 0,
        statesCount: uniqueStates.size,
        states: Array.from(uniqueStates).sort() as string[],
        totalInvoiced,
      };
    },
  });
}

export function useCustomerById(id: string | null | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Customer;
    },
  });
}

export function useCustomerEquipment(customerId: string | null | undefined) {
  return useQuery({
    queryKey: ["customer-equipment", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_equipment")
        .select("*")
        .eq("customer_id", customerId!)
        .order("purchase_year", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as CustomerEquipment[];
    },
  });
}

export function useCustomerInvoices(customerId: string | null | undefined) {
  return useQuery({
    queryKey: ["customer-invoices", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_invoices")
        .select("*")
        .eq("customer_id", customerId!)
        .order("invoice_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as CustomerInvoice[];
    },
  });
}

export type EquipmentInsert = Partial<Omit<CustomerEquipment, "id" | "created_at">> & { customer_id: string };
export type InvoiceInsert = Partial<Omit<CustomerInvoice, "id" | "created_at">> & { customer_id: string; total_value: number };

export function useUpsertEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<CustomerEquipment> & { customer_id: string }) => {
      if (id) {
        const { error } = await supabase.from("customer_equipment").update(rest as never).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customer_equipment").insert(rest as never);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["customer-equipment", vars.customer_id] });
      toast.success("Equipamento salvo");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; customer_id: string }) => {
      const { error } = await supabase.from("customer_equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["customer-equipment", vars.customer_id] });
      toast.success("Equipamento removido");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpsertInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<CustomerInvoice> & { customer_id: string; total_value: number }) => {
      if (id) {
        const { error } = await supabase.from("customer_invoices").update(rest as never).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customer_invoices").insert(rest as never);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["customer-invoices", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["customer", vars.customer_id] });
      toast.success("Nota fiscal salva");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; customer_id: string }) => {
      const { error } = await supabase.from("customer_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["customer-invoices", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["customer", vars.customer_id] });
      toast.success("Nota fiscal removida");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: CustomerInsert) => {
      const { data, error } = await supabase.from("customers").insert(customer as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-stats"] });
      toast.success("Cliente criado com sucesso");
    },
    onError: (e: Error) => toast.error("Erro ao criar cliente: " + e.message),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { error } = await supabase.from("customers").update(updates as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer", vars.id] });
      toast.success("Cliente atualizado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-stats"] });
      toast.success("Cliente removido");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

/** Bulk-update many customers with the same patch. Capped at 500 ids. */
export function useBulkUpdateCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Partial<Customer> }) => {
      const safe = ids.slice(0, 500);
      if (safe.length === 0 || Object.keys(patch).length === 0) return { updated: 0 };
      const { error } = await supabase.from("customers").update(patch as never).in("id", safe);
      if (error) throw error;
      return { updated: safe.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-stats"] });
      toast.success(`${r.updated} cliente(s) atualizados`);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

/** Bulk-delete customers. Capped at 500 ids. */
export function useBulkDeleteCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const safe = ids.slice(0, 500);
      if (safe.length === 0) return { deleted: 0 };
      const { error } = await supabase.from("customers").delete().in("id", safe);
      if (error) throw error;
      return { deleted: safe.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-stats"] });
      toast.success(`${r.deleted} cliente(s) excluídos`);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export type ImportPayload = {
  file_name: string;
  customers: Array<Record<string, unknown>>;
  equipment: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  brasim_leads: Array<Record<string, unknown>>;
  update_existing: boolean;
};

export function useImportCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ImportPayload) => {
      const { data, error } = await supabase.functions.invoke("import-customers", { body: payload });
      if (error) throw error;
      return data as {
        import_id: string;
        inserted: number;
        updated: number;
        skipped: number;
        equipment_inserted: number;
        invoices_inserted: number;
      };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-stats"] });
      toast.success(`Importação concluída: ${r.inserted} novos, ${r.updated} atualizados`);
    },
    onError: (e: Error) => toast.error("Erro na importação: " + e.message),
  });
}

export function useEnrichCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | { customer_id: string; search_override?: string }) => {
      const body = typeof input === "string"
        ? { customer_id: input }
        : { customer_id: input.customer_id, search_override: input.search_override };
      const { data, error } = await supabase.functions.invoke("enrich-customer", { body });
      if (error) {
        const msg = (data as { error?: string } | null)?.error || error.message || "Erro ao buscar informações";
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: (data, input) => {
      const id = typeof input === "string" ? input : input.customer_id;
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer", id] });
      const note = (data as { note?: string } | null)?.note;
      if (note === "no_public_results" || note === "no_verified_sources") {
        toast.warning("Sem fontes públicas verificáveis. Veja o diagnóstico para tentar outro termo de busca.");
      } else {
        toast.success("Informações atualizadas com fontes verificadas");
      }
    },
    onError: (e: Error) => {
      if (e.message?.includes("Firecrawl")) {
        toast.error("Conecte o Firecrawl em Connectors para habilitar a pesquisa verificada.");
      } else {
        toast.error("Erro: " + e.message);
      }
    },
  });
}

export function useEnrichFromUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customer_id, url }: { customer_id: string; url: string }) => {
      const { data, error } = await supabase.functions.invoke("enrich-customer-from-url", { body: { customer_id, url } });
      if (error) {
        const msg = (data as { error?: string } | null)?.error || error.message || "Erro";
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer", vars.customer_id] });
      toast.success("Dados extraídos da URL informada");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useVerifyCustomerSource() {
  return useMutation({
    mutationFn: async ({ url, customer_name }: { url: string; customer_name: string }) => {
      const { data, error } = await supabase.functions.invoke("verify-customer-source", { body: { url, customer_name } });
      if (error) throw error;
      return data as { ok: boolean; evidence?: string; reason?: string; url: string };
    },
    onError: (e: Error) => toast.error("Erro ao verificar: " + e.message),
  });
}

export type PreviewMatch = {
  customer_id: string; name: string; score: number; reason: string;
  existing: { cnpj_cpf: string | null; email: string | null; phone: string | null; city: string | null; state: string | null; company: string | null };
};
export type PreviewResult = { row_index: number; status: "new" | "match" | "ambiguous"; matches: PreviewMatch[] };

export function usePreviewImport() {
  return useMutation({
    mutationFn: async (rows: Array<Record<string, unknown>>) => {
      const payload = rows.map((r, i) => ({ row_index: i, ...r }));
      const { data, error } = await supabase.functions.invoke("preview-customer-import", { body: { rows: payload } });
      if (error) throw error;
      return (data as { results: PreviewResult[] }).results;
    },
    onError: (e: Error) => toast.error("Erro no preview: " + e.message),
  });
}

export function useProspectFromCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer_ids: string[]) => {
      const { data, error } = await supabase.functions.invoke("prospect-from-customer", { body: { customer_ids } });
      if (error) throw error;
      return data as { created: Array<{ customer_id: string; prospect_id: string; score: number }>; failed: Array<{ customer_id: string; error: string }> };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["customer-prospects"] });
      toast.success(`${r.created.length} prospects gerados${r.failed.length ? `, ${r.failed.length} falhas` : ""}`);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
