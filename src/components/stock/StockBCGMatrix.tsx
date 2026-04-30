import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceLine,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StockAnalytics } from "@/hooks/use-stock-analytics";

const fmtBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

interface Props {
  data: StockAnalytics;
}

export function StockBCGMatrix({ data }: Props) {
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(
    () => Array.from(new Set(data.bcgSample.map((p) => p.part_category || "Sem categoria"))).sort(),
    [data.bcgSample],
  );

  const points = useMemo(() => {
    const filtered =
      category === "all"
        ? data.bcgSample
        : data.bcgSample.filter((p) => (p.part_category || "Sem categoria") === category);
    return filtered.map((p) => {
      const turnover = p.stock > 0 ? p.sold_12m / p.stock : 0;
      return {
        x: turnover,
        y: p.estimated_price,
        z: p.stock,
        name: p.description,
        material: p.material,
        manufacturer: p.manufacturer,
        sold: p.sold_12m,
      };
    });
  }, [data.bcgSample, category]);

  const medianTurnover = useMemo(() => {
    const sorted = [...points.map((p) => p.x)].sort((a, b) => a - b);
    return sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
  }, [points]);
  const medianPrice = useMemo(() => {
    const sorted = [...points.map((p) => p.y)].sort((a, b) => a - b);
    return sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
  }, [points]);

  const totalSold = points.reduce((a, b) => a + b.sold, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Matriz BCG do Estoque</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Eixo X: giro 12m (vendas/estoque) · Eixo Y: preço unitário · Tamanho: estoque
          </p>
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {totalSold === 0 && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            ⚠️ Estoque com baixíssimo giro histórico (somente 7 SKUs venderam em 12 meses na amostra). Matriz é
            indicativa — todos os itens caem em "Pontos de interrogação" ou "Abacaxis" até o pipeline comercial girar.
          </div>
        )}
        <div className="h-[480px] w-full">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="x"
                name="Giro"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                label={{ value: "Giro (vendas / estoque)", position: "insideBottom", offset: -10, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Preço"
                scale="log"
                domain={["auto", "auto"]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                label={{ value: "Preço unit (log)", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="z" range={[20, 400]} />
              <ReferenceLine x={medianTurnover} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
              <ReferenceLine y={medianPrice} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value: any, name: any) => {
                  if (name === "Preço") return fmtBRL(value);
                  if (name === "Giro") return value.toFixed(2);
                  return value;
                }}
                content={({ active, payload }) =>
                  active && payload && payload[0] ? (
                    <div className="rounded border bg-popover p-2 text-xs shadow">
                      <div className="font-medium">{(payload[0].payload as any).name}</div>
                      <div className="text-muted-foreground">{(payload[0].payload as any).material}</div>
                      <div>Preço: {fmtBRL((payload[0].payload as any).y)}</div>
                      <div>Giro 12m: {(payload[0].payload as any).x.toFixed(2)}</div>
                      <div>Estoque: {(payload[0].payload as any).z}</div>
                    </div>
                  ) : null
                }
              />
              <Scatter data={points} fill="hsl(var(--primary))" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <Quadrant emoji="🌟" title="Estrelas" desc="Alto valor + alto giro · manter e repor" />
          <Quadrant emoji="🐄" title="Vacas leiteiras" desc="Baixo valor + alto giro · fluxo de caixa" />
          <Quadrant emoji="❓" title="Interrogação" desc="Alto valor + baixo giro · revisar" />
          <Quadrant emoji="🐕" title="Abacaxis" desc="Baixo valor + baixo giro · liquidar" />
        </div>
      </CardContent>
    </Card>
  );
}

function Quadrant({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded border p-2">
      <div className="font-medium">
        {emoji} {title}
      </div>
      <div className="text-muted-foreground">{desc}</div>
    </div>
  );
}
