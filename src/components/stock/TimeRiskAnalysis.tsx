import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { downloadCsv, todayStamp } from "@/lib/export-csv";
import type { StockAnalytics } from "@/hooks/use-stock-analytics";

const fmtBRL = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(2)}M` : `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

interface Props {
  data: StockAnalytics;
}

export function TimeRiskAnalysis({ data }: Props) {
  const stacked = useMemo(
    () =>
      data.byCategory.slice(0, 12).map((c) => ({
        category: c.category.length > 20 ? c.category.slice(0, 18) + "…" : c.category,
        "≤12m": c.fresh_value,
        "1-2 anos": c.mid_value,
        "+2 anos": c.stale_value,
      })),
    [data.byCategory],
  );

  // Heatmap: top 8 fabricantes × top 8 categorias
  const heatmap = useMemo(() => {
    const topMfrs = [...new Set(data.manufacturerCategoryHeatmap.map((r) => r.manufacturer))]
      .map((m) => ({
        manufacturer: m,
        total: data.manufacturerCategoryHeatmap
          .filter((r) => r.manufacturer === m)
          .reduce((a, b) => a + Number(b.value), 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((x) => x.manufacturer);
    const topCats = data.byCategory.slice(0, 8).map((c) => c.category);
    const map = new Map(
      data.manufacturerCategoryHeatmap.map((r) => [`${r.manufacturer}__${r.category}`, r]),
    );
    const max = Math.max(
      ...topMfrs.flatMap((m) => topCats.map((c) => Number(map.get(`${m}__${c}`)?.stale_value ?? 0))),
      1,
    );
    return { topMfrs, topCats, map, max };
  }, [data]);

  const exportPromo = () => {
    downloadCsv(`promocao-paradas-${todayStamp()}.csv`, data.topStaleParts, [
      { header: "Material", value: (r) => r.material },
      { header: "Descrição", value: (r) => r.description },
      { header: "Fabricante", value: (r) => r.manufacturer ?? "" },
      { header: "Modelo", value: (r) => r.machine_model ?? "" },
      { header: "Categoria", value: (r) => r.part_category ?? "" },
      { header: "Estoque", value: (r) => r.stock },
      { header: "Preço unit", value: (r) => r.estimated_price.toFixed(2) },
      { header: "Valor total", value: (r) => Number(r.total_value).toFixed(2) },
      { header: "Idade", value: (r) => r.last_entry_time ?? "" },
    ]);
  };

  const totalStale = data.topStaleParts.reduce((a, b) => a + Number(b.total_value), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Valor por categoria × idade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[360px] w-full">
            <ResponsiveContainer>
              <BarChart data={stacked}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-30} textAnchor="end" height={80} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${(v / 1000).toFixed(0)}k`)}
                />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="≤12m" stackId="a" fill="hsl(142, 70%, 45%)" />
                <Bar dataKey="1-2 anos" stackId="a" fill="hsl(45, 90%, 55%)" />
                <Bar dataKey="+2 anos" stackId="a" fill="hsl(0, 70%, 50%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Heatmap de capital parado: fabricante × categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left"></th>
                  {heatmap.topCats.map((c) => (
                    <th key={c} className="p-2 text-left font-medium" style={{ minWidth: 80 }}>
                      {c.length > 14 ? c.slice(0, 12) + "…" : c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.topMfrs.map((m) => (
                  <tr key={m}>
                    <td className="p-2 font-medium">{m.length > 18 ? m.slice(0, 16) + "…" : m}</td>
                    {heatmap.topCats.map((c) => {
                      const v = Number(heatmap.map.get(`${m}__${c}`)?.stale_value ?? 0);
                      const intensity = v / heatmap.max;
                      return (
                        <td
                          key={c}
                          className="p-2 text-center tabular-nums"
                          style={{
                            background: `hsl(0, 70%, ${100 - intensity * 50}%)`,
                            color: intensity > 0.4 ? "white" : "inherit",
                          }}
                          title={`${m} · ${c}: ${fmtBRL(v)}`}
                        >
                          {v > 0 ? (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Top 50 âncoras de capital parado</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Total: <strong>{fmtBRL(totalStale)}</strong> · custo de oportunidade ~
              <strong>{fmtBRL(totalStale * 0.08)}/ano</strong> a 8% a.a.
            </p>
          </div>
          <Button onClick={exportPromo} size="sm" variant="outline">
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="p-2 text-left">Descrição</th>
                  <th className="p-2 text-left">Fabricante</th>
                  <th className="p-2 text-right">Estoque</th>
                  <th className="p-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.topStaleParts.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="p-2">
                      <div className="font-medium">{p.description}</div>
                      <div className="text-muted-foreground">{p.material}</div>
                    </td>
                    <td className="p-2">{p.manufacturer || "—"}</td>
                    <td className="p-2 text-right">{p.stock}</td>
                    <td className="p-2 text-right font-semibold">{fmtBRL(Number(p.total_value))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
