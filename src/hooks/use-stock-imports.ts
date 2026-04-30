import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StockImport {
  id: string;
  file_name: string;
  source_label: string;
  imported_at: string;
  total_rows: number;
  total_stock: number;
  total_value: number;
  status: string;
  created_at: string;
}

export function useStockImports() {
  return useQuery({
    queryKey: ["stock-imports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_imports")
        .select("*")
        .order("imported_at", { ascending: false });
      if (error) throw error;
      return data as StockImport[];
    },
  });
}

export function useDeleteStockImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_imports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-imports"] });
    },
  });
}

export function useImportCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { items: any[]; file_name: string; source_label: string }) => {
      const { data, error } = await supabase.functions.invoke("import-catalog", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["stock-imports"] });
    },
  });
}
