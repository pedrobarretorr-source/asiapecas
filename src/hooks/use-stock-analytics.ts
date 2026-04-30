import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HealthSeverity = "critical" | "warning" | "info";

export interface HealthMetric {
  count: number;
  severity: HealthSeverity;
  sample_ids: string[];
}

export interface DataHealth {
  totalSkus: number;
  noManufacturer: HealthMetric;
  noModel: HealthMetric;
  noCategory: HealthMetric;
  shortDescriptionCritical: HealthMetric;
  shortDescriptionWarn: HealthMetric;
  duplicateGroupsHigh: HealthMetric;
  duplicateGroupsMed: HealthMetric;
  priceOutliers: HealthMetric;
  nonLatinDescription: HealthMetric;
  descriptionEqualsMaterial: HealthMetric;
  noCompatibleModels: HealthMetric;
  zeroPrice: HealthMetric;
  zeroStock: HealthMetric;
}

export interface StockAnalytics {
  generatedAt: string;
  kpis: {
    totalSkus: number;
    totalUnits: number;
    totalValue: number;
    avgPrice: number;
    staleValue: number;
    staleSkus: number;
    healthyValue: number;
    neverSoldSkus: number;
    soldSkus: number;
    uncategorizedValue: number;
    accessoriesValue: number;
    accessoriesSkus: number;
  };
  byCategory: Array<{
    category: string;
    skus: number;
    units: number;
    value: number;
    avg_price: number;
    stale_value: number;
    mid_value: number;
    fresh_value: number;
    stale_skus: number;
  }>;
  byTime: Array<{ period: string; skus: number; units: number; value: number }>;
  byManufacturer: Array<{
    manufacturer: string;
    skus: number;
    units: number;
    value: number;
    stale_value: number;
  }>;
  manufacturerCategoryHeatmap: Array<{
    manufacturer: string;
    category: string;
    value: number;
    stale_value: number;
  }>;
  topStaleParts: Array<{
    id: string;
    material: string;
    description: string;
    manufacturer: string | null;
    machine_model: string | null;
    part_category: string | null;
    stock: number;
    estimated_price: number;
    total_value: number;
    last_entry_time: string | null;
  }>;
  bcgSample: Array<{
    id: string;
    material: string;
    description: string;
    part_category: string | null;
    manufacturer: string | null;
    stock: number;
    estimated_price: number;
    sold_12m: number;
  }>;
  dataHealth: DataHealth;
}

export function useStockAnalytics() {
  return useQuery({
    queryKey: ["stock-analytics"],
    queryFn: async (): Promise<StockAnalytics> => {
      const { data, error } = await supabase.rpc("get_stock_analytics" as never);
      if (error) throw error;
      return data as unknown as StockAnalytics;
    },
    staleTime: 60_000,
  });
}

/** Health score 0-100 — quanto maior, mais saudável a categoria. */
export function categoryHealthScore(c: {
  value: number;
  stale_value: number;
  stale_skus: number;
  skus: number;
}, totalValue: number): number {
  const stalePct = c.value > 0 ? c.stale_value / c.value : 0;
  const noSalesPct = c.skus > 0 ? c.stale_skus / c.skus : 0;
  const concentration = totalValue > 0 ? c.value / totalValue : 0;
  const concentrationPenalty = concentration > 0.3 ? (concentration - 0.3) * 100 : 0;
  const score = 100 - stalePct * 50 - noSalesPct * 30 - concentrationPenalty * 20;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function categoryVerdict(score: number): { label: string; tone: "good" | "warn" | "bad"; emoji: string } {
  if (score >= 70) return { label: "Vale a pena", tone: "good", emoji: "🟢" };
  if (score >= 40) return { label: "Otimizar", tone: "warn", emoji: "🟡" };
  return { label: "Liquidar", tone: "bad", emoji: "🔴" };
}

/** Score global de saúde 0-100, ponderando severidades. */
export function computeGlobalHealthScore(h: DataHealth): number {
  if (!h || !h.totalSkus) return 100;
  const metrics: HealthMetric[] = [
    h.noManufacturer, h.noModel, h.noCategory,
    h.shortDescriptionCritical, h.shortDescriptionWarn,
    h.duplicateGroupsHigh, h.duplicateGroupsMed,
    h.priceOutliers, h.nonLatinDescription,
    h.descriptionEqualsMaterial, h.noCompatibleModels,
    h.zeroPrice, h.zeroStock,
  ];
  const weights = { critical: 0.5, warning: 0.2, info: 0.05 } as const;
  const weighted = metrics.reduce((acc, m) => acc + (m?.count ?? 0) * weights[m?.severity ?? "info"], 0);
  const score = 100 - (weighted / h.totalSkus) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function totalProblemSkus(h: DataHealth): number {
  if (!h) return 0;
  const ids = new Set<string>();
  [
    h.noManufacturer, h.noModel, h.noCategory,
    h.shortDescriptionCritical, h.shortDescriptionWarn,
    h.duplicateGroupsHigh, h.duplicateGroupsMed,
    h.priceOutliers, h.nonLatinDescription,
    h.descriptionEqualsMaterial, h.zeroPrice,
  ].forEach((m) => m?.sample_ids?.forEach((id) => ids.add(id)));
  return ids.size;
}
