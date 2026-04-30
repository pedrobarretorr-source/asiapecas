import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, AlertTriangle, Boxes, Sparkles } from "lucide-react";
import type { StockAnalytics } from "@/hooks/use-stock-analytics";

const fmtBRL = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `R$ ${(v / 1_000).toFixed(0)}k`
    : `R$ ${v.toFixed(0)}`;

const fmtNum = (v: number) => v.toLocaleString("pt-BR");

interface Props {
  data: StockAnalytics;
  onCategoryClick?: (category: string) => void;
}

export function ExecutiveOverview({ data, onCategoryClick }: Props) {
  const { kpis, byCategory } = data;
  const stalePct = kpis.totalValue > 0 ? (kpis.staleValue / kpis.totalValue) * 100 : 0;
  const neverSoldPct = kpis.totalSkus > 0 ? (kpis.neverSoldSkus / kpis.totalSkus) * 100 : 0;
  const topCat = byCategory[0];
  const topPct = topCat && kpis.totalValue > 0 ? (topCat.value / kpis.totalValue) * 100 : 0;
  const goodSkus = kpis.totalSkus - kpis.staleSkus;

  const treemapData = byCategory.slice(0, 12).map((c) => ({
    name: c.category,
    size: c.value,
    stalePct: c.value > 0 ? (c.stale_value / c.value) * 100 : 0,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Boxes className="h-5 w-5" />}
          label="Capital imobilizado"
          value={fmtBRL(kpis.totalValue)}
          sub={`${fmtNum(kpis.totalSkus)} SKUs · ${fmtNum(kpis.totalUnits)} un.`}
          accent="primary"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Capital parado >2 anos"
          value={fmtBRL(kpis.staleValue)}
          sub={`${stalePct.toFixed(1)}% do total · ${fmtNum(kpis.staleSkus)} SKUs`}
          accent={stalePct > 15 ? "danger" : "warn"}
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="SKUs sem venda"
          value={`${neverSoldPct.toFixed(1)}%`}
          sub={`${fmtNum(kpis.neverSoldSkus)} de ${fmtNum(kpis.totalSkus)} · só ${kpis.soldSkus} venderam`}
          accent={neverSoldPct > 80 ? "danger" : "warn"}
        />
        <KpiCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Categoria líder"
          value={topCat?.category ?? "—"}
          sub={topCat ? `${fmtBRL(topCat.value)} · ${topPct.toFixed(0)}% do total` : ""}
          accent="primary"
        />
      </div>

      {/* Diagnóstico Automático */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Diagnóstico automático
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            Seu estoque tem <strong>{fmtBRL(kpis.totalValue)}</strong> em{" "}
            <strong>{fmtNum(kpis.totalSkus)} SKUs</strong> e{" "}
            <strong>{fmtNum(kpis.totalUnits)} unidades</strong>.
          </p>
          {kpis.accessoriesValue > kpis.totalValue * 0.2 && (
            <p>
              ⚠️ <strong>{fmtBRL(kpis.accessoriesValue)}</strong> ({((kpis.accessoriesValue / kpis.totalValue) * 100).toFixed(0)}%) está em
              <em> Acessórios e Outros</em> ({fmtNum(kpis.accessoriesSkus)} SKUs) — recomendado{" "}
              <strong>reclassificar</strong> (aba "Subcategorizar") para análise útil.
            </p>
          )}
          <p>
            Apenas <strong>{kpis.soldSkus} SKUs</strong> tiveram venda nos últimos 12 meses (
            {neverSoldPct.toFixed(1)}% do catálogo nunca girou) — pipeline comercial subutilizado vs tamanho do estoque.
          </p>
          {kpis.staleValue > 0 && (
            <p>
              💰 <strong>{fmtBRL(kpis.staleValue)}</strong> parados há <strong>+2 anos</strong> ({fmtNum(kpis.staleSkus)} SKUs) —
              candidatos prioritários para promoção/leilão. Custo de oportunidade ~
              <strong>{fmtBRL(kpis.staleValue * 0.08)}/ano</strong> a 8% a.a.
            </p>
          )}
          <p className="text-muted-foreground">
            ✅ {fmtNum(goodSkus)} SKUs com entrada recente · valor saudável (≤12m): {fmtBRL(kpis.healthyValue)}
          </p>
        </CardContent>
      </Card>

      {/* Treemap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapa de valor por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[420px] w-full">
            <ResponsiveContainer>
              <Treemap
                data={treemapData}
                dataKey="size"
                stroke="hsl(var(--background))"
                fill="hsl(var(--primary))"
                content={<TreemapCell onCategoryClick={onCategoryClick} />}
              >
                <Tooltip
                  formatter={(value: number) => fmtBRL(value)}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tamanho = valor em estoque · cor = % parado &gt;2 anos · clique para drill-down
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: "primary" | "warn" | "danger";
}) {
  const accentClass =
    accent === "danger"
      ? "text-destructive"
      : accent === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : "text-primary";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wide ${accentClass}`}>
          {icon} {label}
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function TreemapCell(props: any) {
  const { x, y, width, height, name, stalePct, onCategoryClick } = props;
  if (width < 2 || height < 2) return null;
  // cor: verde→amarelo→vermelho conforme stalePct
  const hue = Math.max(0, 120 - (stalePct ?? 0) * 1.2);
  const fill = `hsl(${hue}, 60%, 50%)`;
  return (
    <g style={{ cursor: onCategoryClick ? "pointer" : "default" }} onClick={() => onCategoryClick?.(name)}>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="hsl(var(--background))" strokeWidth={2} />
      {width > 70 && height > 30 && (
        <>
          <text x={x + 6} y={y + 18} fill="white" fontSize={12} fontWeight={600} style={{ pointerEvents: "none" }}>
            {name}
          </text>
          {height > 50 && (
            <text x={x + 6} y={y + 34} fill="white" fontSize={10} opacity={0.85} style={{ pointerEvents: "none" }}>
              {(stalePct ?? 0).toFixed(0)}% parado
            </text>
          )}
        </>
      )}
    </g>
  );
}
