import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubcategoryAttribute {
  attr: string;
  val: string;
  cnt: number;
}
export interface SubcategoryModel {
  model: string;
  cnt: number;
}
export interface SubcategoryStat {
  subcategory: string;
  skus: number;
  units: number;
  value: number;
  avg_price: number;
  stale_value: number;
  stale_skus: number;
  top_models: SubcategoryModel[] | null;
  top_attributes: SubcategoryAttribute[] | null;
}
export interface SubcategoryByModelRow {
  subcategory: string;
  model: string;
  skus: number;
  units: number;
  value: number;
  stale_value: number;
}
export interface CatalogIntelligence {
  generatedAt: string;
  overall: {
    totalSkus: number;
    totalUnits: number;
    totalValue: number;
    classifiedSkus: number;
    unclassifiedSkus: number;
  };
  bySubcategory: SubcategoryStat[];
  subcategoryByModel: SubcategoryByModelRow[];
}

export function useCatalogIntelligence() {
  return useQuery({
    queryKey: ["catalog-intelligence"],
    staleTime: 60_000,
    queryFn: async (): Promise<CatalogIntelligence> => {
      const { data, error } = await supabase.rpc("get_catalog_intelligence" as never);
      if (error) throw error;
      return data as unknown as CatalogIntelligence;
    },
  });
}

export interface SubcategoryPart {
  id: string;
  material: string;
  description: string;
  manufacturer: string | null;
  machine_model: string | null;
  stock: number;
  estimated_price: number;
  last_entry_time: string | null;
  attributes: Record<string, string> | null;
  subcategory: string | null;
}

export function useSubcategoryParts(subcategory: string | null, model?: string | null) {
  return useQuery({
    queryKey: ["subcategory-parts", subcategory, model ?? null],
    enabled: !!subcategory,
    staleTime: 30_000,
    queryFn: async (): Promise<SubcategoryPart[]> => {
      let q = supabase
        .from("parts")
        .select(
          "id,material,description,manufacturer,machine_model,stock,estimated_price,last_entry_time,attributes,subcategory",
        )
        .order("estimated_price", { ascending: false })
        .limit(500);
      if (subcategory === "(não classificado)") q = q.is("subcategory", null);
      else q = q.eq("subcategory", subcategory!);
      if (model) {
        if (model === "(sem modelo)") q = q.is("machine_model", null);
        else q = q.eq("machine_model", model);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SubcategoryPart[];
    },
  });
}
