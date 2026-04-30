import { useState, useMemo } from "react";
import { useCatalogIntelligence } from "@/hooks/use-catalog-intelligence";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { fmtBRL, SUBCATEGORY_ICONS } from "@/lib/subcategory-rules";
import { FileSpreadsheet, FileText, LayoutGrid, Table as TableIcon, BarChart3, Grid3x3 } from "lucide-react";
import { exportIntelligenceXlsx } from "@/lib/export-xlsx";
import { exportExecutivePdf } from "@/lib/export-pdf-report";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SubcategoryDetail } from "./SubcategoryDetail";
import { SubcategoryMachineMatrix } from "./SubcategoryMachineMatrix";
import { UnifiedFilters, DEFAULT_FILTERS, type UnifiedFiltersState } from "./UnifiedFilters";
import { SavedViews } from "./SavedViews";
import * as XLSX from "xlsx";

export function ReportsTab() {
  const { data, isLoading, refetch } = useCatalogIntelligence();
  const [filters, setFilters] = useState<UnifiedFiltersState>(DEFAULT_FILTERS);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  // distinct dimensions for filter selects
  const dimensions = useMemo(() => {
    if (!data) return { subcategories: [], models: [], manufacturers: [] };
    const subs = new Set<string>();
    const models = new Set<string>();
    for (const r of data.subcategoryByModel) {
      if (r.subcategory) subs.add(r.subcategory);
      if (r.model && r.model !== "(sem modelo)") models.add(r.model);
    }
    return {
      subcategories: Array.from(subs).sort(),
      models: Array.from(models).sort(),
      manufacturers: [], // populated below from bySubcategory? Not in dataset; leave empty
    };
  }, [data]);

  // filter the granular dataset
  const filteredRows = useMemo(() => {
    if (!data) return [];
    const search = filters.search.trim().toLowerCase();
    return data.subcategoryByModel.filter((r) => {
      if (filters.subcategory !== "all" && r.subcategory !== filters.subcategory) return false;
      if (filters.model !== "all" && r.model !== filters.model) return false;
      if (filters.staleOnly && r.stale_value === 0) return false;
      if (search) {
        const blob = `${r.subcategory} ${r.model}`.toLowerCase();
        if (!blob.includes(search)) return false;
      }
      return true;
    });
  }, [data, filters]);

  // group by selected dimension
  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; skus: number; units: number; value: number; stale: number }>();
    for (const r of filteredRows) {
      const k = filters.groupBy === "subcategory" ? r.subcategory : r.model;
      const e = map.get(k) ?? { key: k, skus: 0, units: 0, value: 0, stale: 0 };
      e.skus += r.skus; e.units += r.units; e.value += r.value; e.stale += r.stale_value;
      map.set(k, e);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredRows, filters.groupBy]);

  const kpis = useMemo(() => {
    const skus = grouped.reduce((a, r) => a + r.skus, 0);
    const units = grouped.reduce((a, r) => a + r.units, 0);
    const value = grouped.reduce((a, r) => a + r.value, 0);
    const stale = grouped.reduce((a, r) => a + r.stale, 0);
    return {
      skus, units, value, stale,
      stalePct: value > 0 ? (stale / value) * 100 : 0,
      avg: skus > 0 ? value / skus : 0,
    };
  }, [grouped]);

  async function runAISubcategorize() {
    setAiBusy(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("subcategorize-parts", {
        body: { mode: "auto", limit: 500 },
      });
      if (error) throw error;
      toast.success(`IA classificou ${(res as any)?.updated ?? 0} peças`);
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao classificar com IA");
    } finally { setAiBusy(false); }
  }

  function exportFilteredXlsx() {
    const wb = XLSX.utils.book_new();
    const label = filters.groupBy === "subcategory" ? "Subcategoria" : filters.groupBy === "model" ? "Modelo" : "Fabricante";
    const aoa = [
      [label, "SKUs", "Unidades", "Valor (R$)", "% total", "Parado +2a (R$)", "% parado"],
      ...grouped.map((r) => [
        r.key, r.skus, r.units,
        Number(r.value.toFixed(2)),
        Number(((r.value / Math.max(1, kpis.value)) * 100).toFixed(2)),
        Number(r.stale.toFixed(2)),
        Number(((r.stale / Math.max(1, r.value)) * 100).toFixed(2)),
      ]),
      [],
      ["Total", kpis.skus, kpis.units, Number(kpis.value.toFixed(2)), 100, Number(kpis.stale.toFixed(2)), Number(kpis.stalePct.toFixed(2))],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio-${filters.groupBy}-${ymd()}.xlsx`);
    logExport("xlsx", "unified");
  }

  function exportFullReport() {
    if (!data) return;
    exportExecutivePdf(data, `relatorio-executivo-${ymd()}.pdf`);
    logExport("pdf", "executive");
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
      </div>
    );
  }

  const classifiedPct = Math.round(
    (data.overall.classifiedSkus / Math.max(1, data.overall.totalSkus)) * 100,
  );

  return (
    <div className="space-y-4">
      {/* Saved views bar */}
      <SavedViews current={filters} onLoad={setFilters} />

      {/* Sticky filters */}
      <UnifiedFilters
        state={filters}
        onChange={setFilters}
        subcategories={dimensions.subcategories}
        models={dimensions.models}
        manufacturers={dimensions.manufacturers}
        onAIRefine={runAISubcategorize}
        aiBusy={aiBusy}
      />

      {/* Global KPIs (always show full catalog stats too) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Kpi label="SKUs (filtro)" value={kpis.skus.toLocaleString("pt-BR")} sub={`${data.overall.totalSkus.toLocaleString("pt-BR")} total`} />
        <Kpi label="Unidades" value={kpis.units.toLocaleString("pt-BR")} />
        <Kpi label="Valor" value={fmtBRL(kpis.value)} highlight />
        <Kpi label="Ticket médio" value={fmtBRL(kpis.avg)} />
        <Kpi label="% parado" value={`${kpis.stalePct.toFixed(1)}%`} sub={fmtBRL(kpis.stale)} danger={kpis.stalePct > 25} />
        <Kpi label="Classificado" value={`${classifiedPct}%`} sub={`${data.overall.unclassifiedSkus} restam`} />
      </div>

      {/* Export actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1" onClick={exportFilteredXlsx}>
          <FileSpreadsheet className="h-4 w-4" /> Exportar XLSX (filtrado)
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => { exportIntelligenceXlsx(data, `catalogo-completo-${ymd()}.xlsx`); logExport("xlsx", "intelligence"); }}>
          <FileSpreadsheet className="h-4 w-4" /> XLSX completo
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={exportFullReport}>
          <FileText className="h-4 w-4" /> PDF Executivo
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {grouped.length} grupos · agrupado por <strong>{filters.groupBy}</strong>
        </span>
      </div>

      {/* Visualisations */}
      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards" className="gap-1"><LayoutGrid className="h-3.5 w-3.5" /> Cards</TabsTrigger>
          <TabsTrigger value="table" className="gap-1"><TableIcon className="h-3.5 w-3.5" /> Tabela</TabsTrigger>
          <TabsTrigger value="chart" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Gráfico</TabsTrigger>
          <TabsTrigger value="matrix" className="gap-1"><Grid3x3 className="h-3.5 w-3.5" /> Matriz × Máquina</TabsTrigger>
        </TabsList>

        {/* CARDS view (uses bySubcategory if grouping by subcategory, else groups) */}
        <TabsContent value="cards" className="space-y-3">
          {filters.groupBy === "subcategory" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {data.bySubcategory
                .filter((s) => grouped.some((g) => g.key === s.subcategory))
                .sort((a, b) => b.value - a.value)
                .map((s) => {
                  const stalePct = s.value > 0 ? (s.stale_value / s.value) * 100 : 0;
                  const icon = SUBCATEGORY_ICONS[s.subcategory] ?? "📦";
                  return (
                    <Card key={s.subcategory} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl" aria-hidden>{icon}</span>
                            <span className="font-semibold text-sm">{s.subcategory}</span>
                          </div>
                          {stalePct > 30 && <Badge variant="destructive" className="text-[10px]">{stalePct.toFixed(0)}% parado</Badge>}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <Stat label="SKUs" value={s.skus.toLocaleString("pt-BR")} />
                          <Stat label="Unidades" value={s.units.toLocaleString("pt-BR")} />
                          <Stat label="Valor" value={fmtBRL(s.value)} highlight />
                        </div>
                        {s.top_attributes && s.top_attributes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {s.top_attributes.slice(0, 6).map((a, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">{a.attr}: {a.val} ({a.cnt})</Badge>
                            ))}
                          </div>
                        )}
                        <Button size="sm" variant="outline" className="w-full" onClick={() => setOpenSub(s.subcategory)}>
                          Ver lista completa
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {grouped.map((g) => (
                <Card key={g.key} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <p className="font-semibold text-sm truncate">{g.key}</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <Stat label="SKUs" value={g.skus.toLocaleString("pt-BR")} />
                      <Stat label="Unidades" value={g.units.toLocaleString("pt-BR")} />
                      <Stat label="Valor" value={fmtBRL(g.value)} highlight />
                    </div>
                    {g.stale > 0 && <p className="text-[11px] text-destructive">⚠ {fmtBRL(g.stale)} parado +2a</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TABLE view */}
        <TabsContent value="table">
          <div className="border rounded overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{filters.groupBy === "subcategory" ? "Subcategoria" : "Modelo"}</TableHead>
                  <TableHead className="text-right">SKUs</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% total</TableHead>
                  <TableHead className="text-right">Parado +2a</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((r) => (
                  <TableRow
                    key={r.key}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => filters.groupBy === "subcategory" && setOpenSub(r.key)}
                  >
                    <TableCell className="font-medium">{r.key}</TableCell>
                    <TableCell className="text-right">{r.skus.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{r.units.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{fmtBRL(r.value)}</TableCell>
                    <TableCell className="text-right text-xs">{((r.value / Math.max(1, kpis.value)) * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right text-xs text-destructive">{r.stale > 0 ? fmtBRL(r.stale) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* CHART view */}
        <TabsContent value="chart">
          <Card>
            <CardContent className="p-3">
              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart data={grouped.slice(0, 15)}>
                    <XAxis dataKey="key" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtBRL(v as number)} width={90} />
                    <Tooltip formatter={(v) => fmtBRL(v as number)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1">Top 15 por valor</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MATRIX view */}
        <TabsContent value="matrix">
          <SubcategoryMachineMatrix
            data={filteredRows}
            onCell={(sub, model) => setOpenSub(`${sub}|||${model}`)}
          />
        </TabsContent>
      </Tabs>

      <SubcategoryDetail openKey={openSub} onClose={() => setOpenSub(null)} />
    </div>
  );
}

function Kpi({ label, value, sub, highlight, danger }: { label: string; value: string; sub?: string; highlight?: boolean; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-2.5">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-0.5 font-bold ${highlight ? "text-primary text-lg" : danger ? "text-destructive text-base" : "text-base"}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded bg-muted/40 p-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-xs font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function ymd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function logExport(format: string, scope: string) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("catalog_reports_log" as never).insert({
      user_id: u.user.id, format, scope,
    } as never);
  } catch { /* ignore */ }
}
