import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Part = Tables<"parts">;

export const categoryLabels: Record<string, string> = {
  is_mineracao: "Mineração",
  is_linha_amarela: "Linha Amarela",
  is_perfuratriz: "Perfuratriz",
  is_caminhao_eletrico: "Caminhão Elétrico",
  is_guindaste: "Guindaste",
};

export const categoryKeys = Object.keys(categoryLabels);

export const timeLabels = [
  "6 até 12 meses",
  "1 ano até 2 anos",
  "mais de 2 anos",
];

export const priceRanges = [
  { label: "Até R$ 1k", min: 0, max: 1000 },
  { label: "R$ 1k – 10k", min: 1000, max: 10000 },
  { label: "R$ 10k – 50k", min: 10000, max: 50000 },
  { label: "R$ 50k – 100k", min: 50000, max: 100000 },
  { label: "R$ 100k+", min: 100000, max: 999999999 },
];

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatBRL(value);
}

export function getActiveCategories(part: Part): string[] {
  return categoryKeys
    .filter((key) => part[key as keyof Part] === true)
    .map((key) => categoryLabels[key]);
}

interface UsePartsOptions {
  search?: string;
  category?: string | null;
  manufacturer?: string | null;
  machineModel?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  timeFilter?: string | null;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortAsc?: boolean;
}

export function useParts({
  search, category, manufacturer, machineModel,
  priceMin, priceMax, timeFilter,
  page = 0, pageSize = 50,
  sortBy = "stock", sortAsc = false,
}: UsePartsOptions = {}) {
  return useQuery({
    queryKey: ["parts", search, category, manufacturer, machineModel, priceMin, priceMax, timeFilter, page, pageSize, sortBy, sortAsc],
    queryFn: async () => {
      let query = supabase
        .from("parts")
        .select("*", { count: "exact" })
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order(sortBy as any, { ascending: sortAsc });

      if (search) {
        const q = `%${search}%`;
        query = query.or(`description.ilike.${q},material.ilike.${q},machine_model.ilike.${q}`);
      }
      if (category) query = (query as any).eq(category, true);
      if (manufacturer) query = query.eq("manufacturer", manufacturer);
      if (machineModel) query = query.eq("machine_model", machineModel);
      if (priceMin != null) query = query.gte("estimated_price", priceMin);
      if (priceMax != null) query = query.lte("estimated_price", priceMax);
      if (timeFilter) query = query.eq("last_entry_time", timeFilter);

      const { data, error, count } = await query;
      if (error) throw error;
      return { parts: (data ?? []) as Part[], total: count ?? 0 };
    },
  });
}

export function useDistinctValues(column: "manufacturer" | "machine_model", stockMin: number = 0) {
  return useQuery({
    queryKey: ["distinct", column, stockMin],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_distinct_values", {
        col_name: column,
        stock_min: stockMin,
      });
      if (error) throw error;
      return (data ?? []) as string[];
    },
    staleTime: 300_000,
  });
}

export interface DashboardStats {
  totalParts: number;
  totalSkuRows: number;
  totalStock: number;
  totalValue: number;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  staleStock: number;
  staleValue: number;
  staleUnits: number;
  lowStockHighValue: number;
  totalSales: number;
  totalSalesValue: number;
  openTickets: number;
  totalProspects: number;
  hotProspects: number;
  totalCustomers: number;
  recentSales: { id: string; order_number: number; total_amount: number; status: string; sale_date: string; customer_name: string }[];
  salesByMonth: { month: string; count: number; value: number }[];
  neverSoldCount: number;
  duplicateCount: number;
  byCategory: { name: string; quantidade: number; units: number; value: number }[];
  byTime: { name: string; quantidade: number; units: number; value: number }[];
  byManufacturer: { name: string; quantidade: number; units: number; value: number }[];
  topModels: { name: string; quantidade: number; units: number; value: number }[];
  criticalParts: { material: string; description: string; stock: number; estimated_price: number; machine_model: string; last_entry_time: string }[];
  staleParts: { material: string; description: string; stock: number; estimated_price: number; machine_model: string; total_value: number }[];
}

export function useDuplicateParts() {
  return useQuery({
    queryKey: ["duplicate-parts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("find_duplicate_parts");
      if (error) throw error;
      return (data ?? []) as { material_a: string; description_a: string; stock_a: number; price_a: number; material_b: string; description_b: string; stock_b: number; price_b: number }[];
    },
    staleTime: 300_000,
  });
}

export function useSimilarParts(description: string) {
  return useQuery({
    queryKey: ["similar-parts", description],
    queryFn: async () => {
      const words = description.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
      if (words.length === 0) return [];
      const q = words.map(w => `description.ilike.%${w}%`).join(",");
      const { data, error } = await supabase
        .from("parts")
        .select("id,material,description,stock,estimated_price,machine_model")
        .or(q)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!description && description.length > 3,
    staleTime: 300_000,
  });
}

export function useUpdatePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (update: { id: string; stock?: number; estimated_price?: number; machine_model?: string; reviewed_at?: string }) => {
      const { id, ...fields } = update;
      const { error } = await supabase.from("parts").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function usePartSales(partId: string) {
  return useQuery({
    queryKey: ["part-sales", partId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_items")
        .select("id, quantity, unit_price, total_price, sale_id, sales(id, order_number, sale_date, status, customers(name))")
        .eq("part_id", partId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!partId,
  });
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      return data as unknown as DashboardStats;
    },
    staleTime: 60_000,
  });
}
