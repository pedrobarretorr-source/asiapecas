import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slugs";

const PUBLIC_CATEGORY_STALE_TIME = 5 * 60 * 1000;
const PUBLIC_CATEGORY_GC_TIME = 30 * 60 * 1000;

export function usePublicCategoryDirectory() {
  return useQuery({
    queryKey: ["public-category-directory"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_distinct_values", {
        col_name: "part_category",
        stock_min: 1,
      });
      if (error) throw error;

      return ((data ?? []) as string[])
        .map((value) => value.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
    staleTime: 15 * 60 * 1000,
    gcTime: PUBLIC_CATEGORY_GC_TIME,
  });
}

export function useCategoryNameBySlug(slug: string | null) {
  const { data: categories = [], isLoading } = usePublicCategoryDirectory();
  const target = slug ? slugify(slug) : null;
  const categoryName = target ? categories.find((value) => slugify(value) === target) ?? null : null;

  return { data: categoryName, isLoading };
}

export function useCategoryParts(category: string | null) {
  return useQuery({
    queryKey: ["category-parts", category],
    enabled: !!category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("id, material, description, manufacturer, machine_model, stock, estimated_price, image_url, part_category, compatible_models, updated_at")
        .eq("part_category", category!)
        .gt("stock", 0)
        .order("estimated_price", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).sort((a, b) => {
        const va = (a.estimated_price || 0) * a.stock;
        const vb = (b.estimated_price || 0) * b.stock;
        if (vb !== va) return vb - va;
        return b.stock - a.stock;
      });
    },
    staleTime: PUBLIC_CATEGORY_STALE_TIME,
    gcTime: PUBLIC_CATEGORY_GC_TIME,
  });
}

export function useCategoryRelatedModels(category: string | null) {
  return useQuery({
    queryKey: ["category-related-models", category],
    enabled: !!category,
    queryFn: async () => {
      const { data } = await supabase
        .from("parts")
        .select("machine_model")
        .eq("part_category", category!)
        .gt("stock", 0)
        .not("machine_model", "is", null)
        .limit(500);
      const counts = new Map<string, number>();
      for (const r of data || []) {
        const m = (r.machine_model || "").trim();
        if (!m) continue;
        counts.set(m, (counts.get(m) || 0) + 1);
      }
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([model, count]) => ({ model, count }));
    },
    staleTime: PUBLIC_CATEGORY_STALE_TIME,
    gcTime: PUBLIC_CATEGORY_GC_TIME,
  });
}

export function useCategoryPageData(category: string | null) {
  return useQuery({
    queryKey: ["category-page-data", category],
    enabled: !!category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select(
          "id, material, description, manufacturer, machine_model, stock, estimated_price, image_url, part_category, compatible_models, updated_at",
        )
        .eq("part_category", category!)
        .gt("stock", 0)
        .order("estimated_price", { ascending: false })
        .limit(500);
      if (error) throw error;

      const sortedParts = (data || []).sort((a, b) => {
        const va = (a.estimated_price || 0) * a.stock;
        const vb = (b.estimated_price || 0) * b.stock;
        if (vb !== va) return vb - va;
        return b.stock - a.stock;
      });

      const relatedModelCounts = new Map<string, number>();
      for (const row of sortedParts) {
        const model = (row.machine_model || "").trim();
        if (!model) continue;
        relatedModelCounts.set(model, (relatedModelCounts.get(model) || 0) + 1);
      }

      const relatedModels = Array.from(relatedModelCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([model, count]) => ({ model, count }));

      return {
        parts: sortedParts.slice(0, 200),
        relatedModels,
      };
    },
    staleTime: PUBLIC_CATEGORY_STALE_TIME,
    gcTime: PUBLIC_CATEGORY_GC_TIME,
  });
}
