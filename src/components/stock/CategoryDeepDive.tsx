import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type StockAnalytics, categoryHealthScore, categoryVerdict } from "@/hooks/use-stock-analytics";

const fmtBRL = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(2)}M` : `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const fmtNum = (v: number) => v.toLocaleString("pt-BR");

interface Props {
  data: StockAnalytics;
  initialCategory?: string | null;
  onClose?: () => void;
}

export function CategoryDeepDive({ data, initialCategory, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(initialCategory ?? null);
  const total = data.kpis.totalValue;

  const rows = useMemo(
    () =>
      data.byCategory.map((c) => {
        const score = categoryHealthScore(c, total);
        const verdict = categoryVerdict(score);
        const stalePct = c.value > 0 ? (c.stale_value / c.value) * 100 : 0;
        const share = total > 0 ? (c.value / total) * 100 : 0;
        return { ...c, score, verdict, stalePct, share };
      }),
    [data, total],
  );

  const detail = selected ? rows.find((r) => r.category === selected) : null;
  const detailTopParts = useMemo(
    () =>
      selected
        ? data.topStaleParts.filter((p) => (p.part_category || "Sem categoria") === selected).slice(0, 10)
        : [],
    [selected, data.topStaleParts],
  );

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">SKUs</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% total</TableHead>
                  <TableHead className="text-right">Preço médio</TableHead>
                  <TableHead className="text-right">% parado</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Veredito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.category}
                    className="cursor-pointer"
                    onClick={() => setSelected(r.category)}
                  >
                    <TableCell className="font-medium">{r.category}</TableCell>
                    <TableCell className="text-right">{fmtNum(r.skus)}</TableCell>
                    <TableCell className="text-right">{fmtNum(r.units)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBRL(r.value)}</TableCell>
                    <TableCell className="text-right">{r.share.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{fmtBRL(r.avg_price)}</TableCell>
                    <TableCell className="text-right">
                      <span className={r.stalePct > 40 ? "text-destructive font-medium" : ""}>
                        {r.stalePct.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="w-32">
                      <div className="flex items-center gap-2">
                        <Progress value={r.score} className="h-2" />
                        <span className="text-xs tabular-nums">{r.score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.verdict.tone === "good" ? "default" : r.verdict.tone === "warn" ? "secondary" : "destructive"}
                      >
                        {r.verdict.emoji} {r.verdict.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); onClose?.(); } }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.category}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="SKUs" value={fmtNum(detail.skus)} />
                  <Stat label="Unidades" value={fmtNum(detail.units)} />
                  <Stat label="Valor" value={fmtBRL(detail.value)} />
                  <Stat label="Preço médio" value={fmtBRL(detail.avg_price)} />
                  <Stat label="% do total" value={`${detail.share.toFixed(1)}%`} />
                  <Stat label="Health Score" value={String(detail.score)} />
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">Distribuição por idade</div>
                  <div className="flex h-6 overflow-hidden rounded">
                    {[
                      { v: detail.fresh_value, color: "hsl(142, 70%, 45%)", label: "≤12m" },
                      { v: detail.mid_value, color: "hsl(45, 90%, 55%)", label: "1-2a" },
                      { v: detail.stale_value, color: "hsl(0, 70%, 50%)", label: "+2a" },
                    ].map((seg, i) => {
                      const sum = detail.fresh_value + detail.mid_value + detail.stale_value;
                      const pct = sum > 0 ? (seg.v / sum) * 100 : 0;
                      return pct > 0 ? (
                        <div
                          key={i}
                          style={{ width: `${pct}%`, background: seg.color }}
                          className="flex items-center justify-center text-[10px] font-bold text-white"
                          title={`${seg.label}: ${fmtBRL(seg.v)}`}
                        >
                          {pct > 8 ? `${seg.label} ${pct.toFixed(0)}%` : ""}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {detail.stale_value > 0 && (
                  <Card className="border-l-4 border-l-destructive">
                    <CardContent className="pt-4 text-sm">
                      💡 Promover <strong>{fmtNum(detail.stale_skus)}</strong> peças paradas há &gt;2 anos
                      pode recuperar até <strong>{fmtBRL(detail.stale_value)}</strong> de capital.
                    </CardContent>
                  </Card>
                )}

                {detailTopParts.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-medium">Top peças paradas</div>
                    <div className="space-y-2">
                      {detailTopParts.map((p) => (
                        <div key={p.id} className="flex justify-between gap-3 rounded border p-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{p.description}</div>
                            <div className="text-muted-foreground">
                              {p.material} · {p.manufacturer || "—"} · {fmtNum(p.stock)} un
                            </div>
                          </div>
                          <div className="shrink-0 text-right font-semibold">{fmtBRL(p.total_value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-bold">{value}</div>
    </div>
  );
}
