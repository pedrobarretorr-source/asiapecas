import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BatchProgress {
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  currentBatch: number;
  totalBatches: number;
  running: boolean;
}

export function useBatchAIResearch() {
  const [progress, setProgress] = useState<BatchProgress>({
    total: 0, processed: 0, skipped: 0, errors: 0,
    currentBatch: 0, totalBatches: 0, running: false,
  });

  const startBatch = useCallback(async () => {
    setProgress(p => ({ ...p, running: true, processed: 0, skipped: 0, errors: 0, currentBatch: 0 }));

    try {
      // Get all materials
      const { data: allParts, error } = await supabase
        .from("parts")
        .select("material")
        .order("material");

      if (error) throw error;
      const materials = (allParts || []).map(p => p.material);
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < materials.length; i += batchSize) {
        batches.push(materials.slice(i, i + batchSize));
      }

      setProgress(p => ({ ...p, total: materials.length, totalBatches: batches.length }));

      let totalProcessed = 0, totalSkipped = 0, totalErrors = 0;

      for (let i = 0; i < batches.length; i++) {
        setProgress(p => ({ ...p, currentBatch: i + 1 }));

        const { data, error: fnError } = await supabase.functions.invoke("batch-ai-research", {
          body: { materials: batches[i] },
        });

        if (fnError) {
          totalErrors += batches[i].length;
        } else if (data) {
          totalProcessed += data.processed || 0;
          totalSkipped += data.skipped || 0;
          totalErrors += data.errors || 0;
        }

        setProgress(p => ({
          ...p,
          processed: totalProcessed,
          skipped: totalSkipped,
          errors: totalErrors,
        }));

        // Delay between batches
        if (i < batches.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      toast.success(`Pesquisa concluída! ${totalProcessed} processadas, ${totalSkipped} já existiam.`);
    } catch (e: any) {
      toast.error(e.message || "Erro na pesquisa em massa");
    } finally {
      setProgress(p => ({ ...p, running: false }));
    }
  }, []);

  const stop = useCallback(() => {
    setProgress(p => ({ ...p, running: false }));
  }, []);

  return { progress, startBatch, stop };
}
