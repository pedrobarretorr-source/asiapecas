import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true if there is at least one active promotion within its valid period.
 * Lightweight HEAD count, refreshed every 5 minutes.
 */
export function useHasActivePromotions() {
  const { data } = useQuery({
    queryKey: ["has-active-promotions"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { count } = await supabase
        .from("part_promotions")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`);
      return (count ?? 0) > 0;
    },
    staleTime: 5 * 60 * 1000,
  });
  return !!data;
}
