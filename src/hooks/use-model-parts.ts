import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slugs";

export function useModelParts(modelSlugValue: string | null) {
  return useQuery({
    queryKey: ["model-parts", modelSlugValue],
    enabled: !!modelSlugValue,
    queryFn: async () => {
      const target = modelSlugValue!.toLowerCase();

      // Prefer canonical model via machine_models.match_patterns
      const { data: rpcData, error: rpcError } = await supabase.rpc("parts_for_model_slug", { model_slug_param: target });
      if (!rpcError && rpcData && rpcData.length > 0) {
        return rpcData
          .filter((p: any) => (p.stock ?? 0) > 0)
          .sort((a: any, b: any) => {
            const va = (a.estimated_price || 0) * a.stock;
            const vb = (b.estimated_price || 0) * b.stock;
            if (vb !== va) return vb - va;
            return b.stock - a.stock;
          });
      }

      // Fallback: legacy slug match against raw machine_model / compatible_models
      const { data, error } = await supabase
        .from("parts")
        .select("id, material, description, manufacturer, machine_model, stock, estimated_price, image_url, part_category, compatible_models, updated_at")
        .gt("stock", 0)
        .or(`machine_model.not.is.null,compatible_models.not.is.null`)
        .limit(2000);
      if (error) throw error;
      const filtered = (data || []).filter(p => {
        if (p.machine_model && slugify(p.machine_model) === target) return true;
        if (Array.isArray(p.compatible_models)) {
          return p.compatible_models.some(cm => slugify(cm) === target);
        }
        return false;
      });
      return filtered.sort((a, b) => {
        const va = (a.estimated_price || 0) * a.stock;
        const vb = (b.estimated_price || 0) * b.stock;
        if (vb !== va) return vb - va;
        return b.stock - a.stock;
      });
    },
  });
}

export function useModelDisplayName(modelSlugValue: string | null) {
  return useQuery({
    queryKey: ["model-display-name", modelSlugValue],
    enabled: !!modelSlugValue,
    queryFn: async () => {
      const target = modelSlugValue!.toLowerCase();

      // Prefer canonical model display name
      const { data: canonical } = await supabase
        .from("machine_models")
        .select("display_name")
        .eq("slug", target)
        .maybeSingle();
      if (canonical?.display_name) return canonical.display_name;

      const { data } = await supabase
        .from("parts")
        .select("machine_model")
        .gt("stock", 0)
        .not("machine_model", "is", null)
        .limit(2000);
      const match = (data || []).find(r => r.machine_model && slugify(r.machine_model) === target);
      return match?.machine_model || modelSlugValue!.toUpperCase();
    },
  });
}

export function useModelRelatedCategories(modelSlugValue: string | null) {
  return useQuery({
    queryKey: ["model-related-cats", modelSlugValue],
    enabled: !!modelSlugValue,
    queryFn: async () => {
      const target = modelSlugValue!.toLowerCase();

      // Use canonical-model parts when available
      const { data: rpcParts } = await supabase.rpc("parts_for_model_slug", { model_slug_param: target });
      const source = Array.isArray(rpcParts) && rpcParts.length > 0
        ? rpcParts.filter((p: any) => (p.stock ?? 0) > 0).map((p: any) => ({ part_category: p.part_category }))
        : null;

      let rows: any[] = source ?? [];
      if (!source) {
        const { data } = await supabase
          .from("parts")
          .select("part_category, machine_model, compatible_models")
          .gt("stock", 0)
          .not("part_category", "is", null)
          .limit(2000);
        rows = (data || []).filter(r =>
          (r.machine_model && slugify(r.machine_model) === target) ||
          (Array.isArray(r.compatible_models) && r.compatible_models.some(cm => slugify(cm) === target))
        );
      }

      const counts = new Map<string, number>();
      for (const r of rows) {
        const c = (r.part_category || "").trim();
        if (!c) continue;
        counts.set(c, (counts.get(c) || 0) + 1);
      }
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([category, count]) => ({ category, count }));
    },
  });
}
