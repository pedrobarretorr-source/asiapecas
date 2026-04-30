import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PartAIAnalysis {
  technical_description: string;
  probable_function: string;
  compatible_machines: string[];
  technical_specs: string[];
  maintenance_tips: string;
  related_parts: string[];
  catalog_related?: { material: string; description: string; machine_model: string; stock: number; estimated_price: number }[];
}

export interface SavedAIResult {
  id: string;
  part_id: string;
  material: string;
  compatible_machines: string[];
  technical_description: string;
  probable_function: string;
  technical_specs: string[];
  maintenance_tips: string;
  related_parts: string[];
  researched_at: string;
  model_used: string;
}

export function usePartAIResearch(material: string) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PartAIAnalysis | null>(null);
  const queryClient = useQueryClient();

  // Query saved result
  const { data: savedResult, isLoading: loadingSaved } = useQuery({
    queryKey: ["ai-compatibility", material],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_compatibility_results" as any)
        .select("*")
        .eq("material", material)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SavedAIResult | null;
    },
    enabled: !!material,
  });

  const research = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("part-research", {
        body: { material },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data as PartAIAnalysis);
      // Invalidate saved result query to pick up the newly saved data
      queryClient.invalidateQueries({ queryKey: ["ai-compatibility", material] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar informações");
    } finally {
      setLoading(false);
    }
  };

  return { research, loading, analysis, savedResult, loadingSaved, clear: () => setAnalysis(null) };
}
