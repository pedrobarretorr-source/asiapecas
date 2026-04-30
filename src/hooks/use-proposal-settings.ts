import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ProposalSettings = {
  id: string;
  company_name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  default_validity_days: number;
  default_delivery_terms: string;
  default_warranty_text: string;
  default_observations: string;
  updated_at: string;
};

export function useProposalSettings() {
  return useQuery({
    queryKey: ["proposal_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as ProposalSettings;
    },
  });
}

export function useUpdateProposalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Omit<ProposalSettings, "id" | "updated_at">>) => {
      const { data: existing } = await supabase
        .from("proposal_settings")
        .select("id")
        .limit(1)
        .single();
      if (!existing) throw new Error("Configurações não encontradas");
      const { error } = await supabase
        .from("proposal_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal_settings"] });
      toast.success("Configurações salvas");
    },
    onError: (e: Error) => toast.error("Erro ao salvar: " + e.message),
  });
}
