import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Prospect = {
  id: string;
  name: string;
  company: string | null;
  cnpj_cpf: string | null;
  email: string | null;
  phone: string | null;
  country: string;
  state: string | null;
  city: string | null;
  segment: string | null;
  source: string;
  status: string;
  score: number;
  matched_parts: string[];
  notes: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
};

export function useProspects(filters?: { country?: string; status?: string; segment?: string; search?: string }) {
  return useQuery({
    queryKey: ["prospects", filters],
    queryFn: async () => {
      let query = supabase.from("prospects").select("*").order("score", { ascending: false });
      if (filters?.country) query = query.eq("country", filters.country);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.segment) query = query.ilike("segment", `%${filters.segment}%`);
      if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Prospect[];
    },
  });
}

export function useUpdateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prospect> & { id: string }) => {
      const { error } = await supabase.from("prospects").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Prospect atualizado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Prospect removido");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useConvertToCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospect: Prospect) => {
      const { error: custError } = await supabase.from("customers").insert({
        name: prospect.name,
        company: prospect.company,
        cnpj_cpf: prospect.cnpj_cpf,
        email: prospect.email,
        phone: prospect.phone,
        city: prospect.city,
        state: prospect.state,
        segment: prospect.segment,
        country: prospect.country,
        source: "ia",
        notes: `Convertido de prospect IA. Score: ${prospect.score}. ${prospect.ai_summary || ""}`,
      } as any);
      if (custError) throw custError;

      const { error: updateError } = await supabase
        .from("prospects")
        .update({ status: "convertido" })
        .eq("id", prospect.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Prospect convertido para cliente!");
    },
    onError: (e: Error) => toast.error("Erro ao converter: " + e.message),
  });
}

export function useSearchProspectsAI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { country: string; state?: string; segment?: string; count?: number }) => {
      const { data, error } = await supabase.functions.invoke("prospect-search", { body: params });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Prospects gerados com sucesso!");
    },
    onError: (e: Error) => toast.error("Erro na busca IA: " + e.message),
  });
}
