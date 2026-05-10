import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SourceId = "mercadolivre" | "lideranca" | "macromaq" | "extramaquinas";

export type LookupResult = {
  id: string;
  source: SourceId;
  rank: number;
  title: string | null;
  price_brl: number | null;
  url: string | null;
  seller: string | null;
  image_url: string | null;
  in_stock: boolean | null;
  error: string | null;
};

export type Lookup = {
  id: string;
  part_id: string;
  query: string;
  created_at: string;
  results: LookupResult[];
};

export function usePriceLookup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { part_id: string; query: string; sources?: SourceId[] }) => {
      const { data, error } = await supabase.functions.invoke("search-external-prices", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { lookup_id: string; created_at: string; results: LookupResult[] };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["price-lookups", vars.part_id] });
      toast.success("Busca concluída");
    },
    onError: (e: Error) => toast.error("Erro na busca: " + e.message),
  });
}

export function usePriceLookupHistory(partId: string | null) {
  return useQuery({
    queryKey: ["price-lookups", partId],
    enabled: !!partId,
    queryFn: async (): Promise<Lookup[]> => {
      const { data, error } = await supabase
        .from("price_lookups" as any)
        .select("id, part_id, query, created_at, price_lookup_results(*)")
        .eq("part_id", partId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        results: d.price_lookup_results || [],
      }));
    },
  });
}

export function useDeletePriceLookup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, part_id: _ }: { id: string; part_id: string }) => {
      const { error } = await supabase.from("price_lookups" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["price-lookups", vars.part_id] });
      toast.success("Lookup removido");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
