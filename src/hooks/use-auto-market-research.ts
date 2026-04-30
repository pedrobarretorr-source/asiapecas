import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIResultItem {
  distributor_name: string;
  price_brl: number;
  delivery_days?: number;
  availability?: string;
  source_url?: string;
  is_genuine?: boolean;
  matched_part_number?: string;
  match_confidence?: "exact" | "normalized";
  notes?: string;
}

interface AIResponse {
  search_summary: string;
  results: AIResultItem[];
  dropped_parallel_count?: number;
  dropped_mismatch_count?: number;
  error?: string;
}

interface RunInput {
  partId: string;
  material: string;
  description: string;
  manufacturer?: string | null;
  machine_model?: string | null;
  genuineOnly?: boolean;
}

export function useAutoMarketResearch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: RunInput) => {
      const genuineOnly = input.genuineOnly !== false;
      const { data, error } = await supabase.functions.invoke<AIResponse>(
        "auto-market-research",
        {
          body: {
            material: input.material,
            description: input.description,
            manufacturer: input.manufacturer ?? null,
            machine_model: input.machine_model ?? null,
            genuine_only: genuineOnly,
          },
        },
      );

      if (error) {
        const status = (error as any)?.context?.status;
        if (status === 429) throw new Error("Limite de requisições. Aguarde e tente novamente.");
        if (status === 402) throw new Error("Créditos da IA esgotados.");
        throw new Error(error.message || "Erro ao chamar IA");
      }
      if (data?.error) throw new Error(data.error);

      const results = data?.results ?? [];
      const summary = data?.search_summary ?? "";
      const now = new Date().toISOString();

      const droppedParallel = data?.dropped_parallel_count ?? 0;
      const droppedMismatch = data?.dropped_mismatch_count ?? 0;

      if (results.length === 0) {
        const reason: "mismatch" | "parallel" | "none" =
          droppedMismatch > 0 && droppedParallel === 0
            ? "mismatch"
            : droppedParallel > 0 && droppedMismatch === 0
              ? "parallel"
              : droppedMismatch > 0 || droppedParallel > 0
                ? "mismatch"
                : "none";

        const distributorLabel =
          reason === "mismatch"
            ? "IA — código não encontrado"
            : reason === "parallel"
              ? "IA — apenas paralelas"
              : "IA — sem resultados";

        const noteText =
          summary ||
          (reason === "mismatch"
            ? `IA não localizou anúncios com o código exato ${input.material}`
            : reason === "parallel"
              ? "IA encontrou apenas peças paralelas — sem referência de original XCMG"
              : "IA não encontrou referências confiáveis");

        await supabase.from("market_research").insert({
          part_id: input.partId,
          distributor_name: distributorLabel,
          price_found: 0,
          availability: "indisponível",
          notes: noteText,
          researched_at: now,
          researched_by: "IA",
          is_genuine: null,
        });
        return { inserted: 0, summary, reason };
      }

      const rows = results
        .filter((r) => r.distributor_name && r.price_brl > 0)
        .slice(0, 5)
        .map((r) => ({
          part_id: input.partId,
          distributor_name: r.distributor_name,
          price_found: r.price_brl,
          delivery_days: r.delivery_days ?? null,
          availability: r.availability ?? "em estoque",
          source_url: r.source_url ?? null,
          notes: r.notes ?? summary,
          researched_at: now,
          researched_by: "IA",
          is_genuine: r.is_genuine === true,
          matched_part_number: r.matched_part_number ?? null,
          match_confidence: r.match_confidence ?? null,
        }));

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("market_research").insert(rows);
        if (insErr) throw insErr;
      }

      return { inserted: rows.length, summary, reason: "ok" as const };
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["market-research", vars.partId] });
      qc.invalidateQueries({ queryKey: ["market-research-overview"] });
      qc.invalidateQueries({ queryKey: ["lowest-market-price", vars.partId] });
      qc.invalidateQueries({ queryKey: ["has-market-research", vars.partId] });
      if (res.inserted === 0) {
        if (res.reason === "mismatch") {
          toast.warning(`Não foi possível localizar anúncios com o código exato — apenas códigos diferentes/similares.`);
        } else if (res.reason === "parallel") {
          toast.warning("Apenas peças paralelas encontradas — nenhuma referência de Original XCMG.");
        } else {
          toast.warning("Nenhuma referência confiável encontrada para esta peça.");
        }
      } else {
        toast.success(`${res.inserted} referência(s) encontrada(s) com código exato.`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Returns the lowest competitor price + distributor for a given part. */
export function useLowestMarketPrice(partId: string | undefined) {
  return useQuery({
    queryKey: ["lowest-market-price", partId],
    enabled: !!partId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_research")
        .select("distributor_name, price_found")
        .eq("part_id", partId!)
        .gt("price_found", 0)
        .order("price_found", { ascending: true })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

/** Quick existence check for "Pesquisado" badge. */
export function useHasMarketResearch(partId: string | undefined) {
  return useQuery({
    queryKey: ["has-market-research", partId],
    enabled: !!partId,
    staleTime: 120_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("market_research")
        .select("id", { count: "exact", head: true })
        .eq("part_id", partId!);
      return (count ?? 0) > 0;
    },
  });
}
