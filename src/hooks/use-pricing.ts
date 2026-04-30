import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PricingSettings = {
  id: string;
  default_markup: number;
  updated_at: string;
};

export function usePricingSettings() {
  return useQuery({
    queryKey: ["pricing_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as PricingSettings;
    },
  });
}

export function useUpdatePricingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ default_markup }: { default_markup: number }) => {
      const { data: existing } = await supabase
        .from("pricing_settings")
        .select("id")
        .limit(1)
        .single();
      if (!existing) throw new Error("Configurações não encontradas");
      const { error } = await supabase
        .from("pricing_settings")
        .update({ default_markup, updated_at: new Date().toISOString() } as any)
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing_settings"] });
      toast.success("Margem atualizada!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function applySellPrice(costPrice: number, markupPercent: number): number {
  return Math.round(costPrice * (1 + markupPercent / 100) * 100) / 100;
}
