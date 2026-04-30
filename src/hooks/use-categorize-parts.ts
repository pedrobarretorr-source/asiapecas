import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CategorizeProgress {
  running: boolean;
  processed: number;
  errors: number;
  total: number;
}

export function useCategorizeParts() {
  const [progress, setProgress] = useState<CategorizeProgress>({
    running: false, processed: 0, errors: 0, total: 0,
  });

  const startCategorize = useCallback(async (batchLimit = 20) => {
    setProgress({ running: true, processed: 0, errors: 0, total: 0 });

    try {
      // Process in rounds until done
      let totalProcessed = 0;
      let totalErrors = 0;
      let remaining = true;
      let round = 0;

      while (remaining && round < 200) {
        round++;
        const { data, error } = await supabase.functions.invoke("categorize-parts", {
          body: { limit: batchLimit },
        });

        if (error) {
          toast.error("Erro ao categorizar: " + error.message);
          break;
        }

        totalProcessed += data?.processed || 0;
        totalErrors += data?.errors || 0;
        const total = data?.total || 0;

        setProgress(p => ({
          ...p,
          processed: totalProcessed,
          errors: totalErrors,
          total: totalProcessed + totalErrors,
        }));

        // If the batch returned fewer than limit, we're done
        if (total < batchLimit) {
          remaining = false;
        }

        // Rate limit delay
        if (remaining) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      toast.success(`Categorização concluída! ${totalProcessed} peças categorizadas.`);
    } catch (e: any) {
      toast.error(e.message || "Erro na categorização");
    } finally {
      setProgress(p => ({ ...p, running: false }));
    }
  }, []);

  const stop = useCallback(() => {
    setProgress(p => ({ ...p, running: false }));
  }, []);

  return { progress, startCategorize, stop };
}
