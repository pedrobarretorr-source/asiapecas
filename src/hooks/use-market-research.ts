import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Re-verify a single market_research URL by content (server downloads the page and looks for the part code). */
export function useVerifyMarketUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { research_id: string; url: string; material: string; matched_part_number?: string | null; part_id: string }) => {
      const { data, error } = await supabase.functions.invoke<{
        verified: boolean;
        url: string;
        evidence: string | null;
        reason?: string;
      }>("verify-market-url", {
        body: {
          research_id: input.research_id,
          url: input.url,
          material: input.material,
          matched_part_number: input.matched_part_number ?? null,
        },
      });
      if (error) throw new Error(error.message || "Falha na reverificação");
      return { ...data!, part_id: input.part_id, material: input.material };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["market-research", res.part_id] });
      qc.invalidateQueries({ queryKey: ["market-research-overview"] });
      if (res.verified) {
        toast.success(`Link confirma o código ${res.material}`);
      } else {
        const reason = res.reason === "generic_url"
          ? "URL genérica (homepage/listagem)"
          : res.reason === "no_match"
            ? "código não encontrado na página"
            : res.reason?.startsWith("http_")
              ? `página retornou ${res.reason.replace("http_", "HTTP ")}`
              : "página inacessível";
        toast.warning(`Link não contém o código (${reason}) — substituído por busca`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface MarketResearch {
  id: string;
  part_id: string;
  distributor_name: string;
  price_found: number;
  delivery_days: number | null;
  payment_terms: string | null;
  availability: string | null;
  source_url: string | null;
  notes: string | null;
  researched_at: string;
  researched_by: string | null;
  created_at: string;
  is_genuine?: boolean | null;
  matched_part_number?: string | null;
  match_confidence?: string | null;
}

export function useMarketResearch(partId: string | undefined) {
  return useQuery({
    queryKey: ["market-research", partId],
    enabled: !!partId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_research")
        .select("*")
        .eq("part_id", partId!)
        .order("researched_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MarketResearch[];
    },
  });
}

export function useAddMarketResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<MarketResearch, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("market_research")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["market-research", vars.part_id] });
      qc.invalidateQueries({ queryKey: ["market-research-overview"] });
    },
  });
}

export function useUpdateMarketResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MarketResearch> & { id: string }) => {
      const { data, error } = await supabase
        .from("market_research")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["market-research", (data as any).part_id] });
      qc.invalidateQueries({ queryKey: ["market-research-overview"] });
    },
  });
}

export function useDeleteMarketResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, part_id }: { id: string; part_id: string }) => {
      const { error } = await supabase
        .from("market_research")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { part_id };
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ["market-research", vars.part_id] });
      qc.invalidateQueries({ queryKey: ["market-research-overview"] });
    },
  });
}

export function useMarketResearchOverview() {
  return useQuery({
    queryKey: ["market-research-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_research")
        .select("*, parts(material, description, estimated_price, part_category)")
        .order("researched_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as (MarketResearch & { is_genuine: boolean | null; matched_part_number: string | null; match_confidence: string | null; parts: { material: string; description: string; estimated_price: number; part_category: string | null } | null })[];
    },
  });
}
