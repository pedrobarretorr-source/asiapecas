import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, GitMerge, Info,
} from "lucide-react";
import {
  computeGlobalHealthScore, totalProblemSkus,
  type DataHealth, type HealthMetric, type HealthSeverity,
} from "@/hooks/use-stock-analytics";
import { DataHealthDrillDown } from "./DataHealthDrillDown";
import { MergeDuplicatesDialog } from "./MergeDuplicatesDialog";

interface Props {
  data: { dataHealth: DataHealth };
}

interface MetricDef {
  key: keyof DataHealth;
  label: string;
  description: string;
  rule: string;
  showMerge?: boolean;
}

const METRICS: MetricDef[] = [
  {
    key: "noManufacturer", label: "Sem fabricante",
    description: "Peças sem marca cadastrada bloqueiam buscas e propostas.",
    rule: "manufacturer IS NULL OR manufacturer = ''",
  },
  {
    key: "noCategory", label: "Sem categoria",
    description: "Sem categoria, a peça fica fora dos relatórios e do portal.",
    rule: "part_category IS NULL OR part_category = ''",
  },
  {
    key: "shortDescriptionCritical", label: "Descrição muito curta",
    description: "Menos de 10 caracteres — bloqueia venda online.",
    rule: "length(description) < 10",
  },
  {
    key: "duplicateGroupsHigh", label: "Duplicatas (alta confiança)",
    description: "Mesma descrição + mesmo fabricante + mesmo modelo de máquina.",
    rule: "Agrupados por descrição normalizada + manufacturer + machine_model, materiais distintos",
    showMerge: true,
  },
  {
    key: "nonLatinDescription", label: "Caracteres não-latinos",
    description: "Descrições em chinês/japonês bloqueiam o portal público.",
    rule: "description contém caracteres fora do ASCII e do alfabeto latino estendido",
  },
  {
    key: "zeroPrice", label: "Preço zerado",
    description: "Não pode ser vendida sem preço.",
    rule: "estimated_price <= 0",
  },
  {
    key: "noModel", label: "Sem modelo de máquina",
    description: "Dificulta recomendação cruzada.",
    rule: "machine_model IS NULL OR machine_model = ''",
  },
  {
    key: "shortDescriptionWarn", label: "Descrição genérica (10-19 chars)",
    description: "Sem código técnico (GB/T, DIN, M\\d+) — pode estar incompleta.",
    rule: "length entre 10 e 19 e sem padrões técnicos",
  },
  {
    key: "duplicateGroupsMed", label: "Duplicatas (média confiança)",
    description: "Mesma descrição + mesmo fabricante, modelos diferentes.",
    rule: "Mesma descrição normalizada + manufacturer (modelo varia)",
    showMerge: true,
  },
  {
    key: "priceOutliers", label: "Preços suspeitos (outliers)",
    description: "Preço muito fora da média da categoria — pode ser erro de digitação.",
    rule: "z-score > 3 dentro da categoria (>=10 itens)",
  },
  {
    key: "descriptionEqualsMaterial", label: "Descrição = código material",
    description: "Descrição apenas repete o código — informação insuficiente.",
    rule: "upper(description) = upper(material) ou começa com material",
  },
  {
    key: "noCompatibleModels", label: "Sem modelos compatíveis",
    description: "Impede sugestão automática no carrinho.",
    rule: "compatible_models IS NULL OR vazio",
  },
  {
    key: "zeroStock", label: "Estoque zerado",
    description: "SKU sem unidades disponíveis.",
    rule: "stock <= 0",
  },
];

const severityIcon = (s: HealthSeverity, count: number) => {
  if (count === 0) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (s === "critical") return <AlertCircle className="h-5 w-5 text-destructive" />;
  if (s === "warning") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  return <Info className="h-5 w-5 text-muted-foreground" />;
};

const severityCardClass = (s: HealthSeverity, count: number) => {
  if (count === 0) return "border-green-500/30";
  if (s === "critical") return "border-destructive/40 bg-destructive/5 hover:border-destructive/60";
  if (s === "warning") return "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60";
  return "hover:border-foreground/30";
};

export function DataHealthTab({ data }: Props) {
  const h = data.dataHealth;
  const [drillKey, setDrillKey] = useState<keyof DataHealth | null>(null);
  const [mergeIds, setMergeIds] = useState<string[]>([]);

  const score = useMemo(() => computeGlobalHealthScore(h), [h]);
  const problemCount = useMemo(() => totalProblemSkus(h), [h]);

  const grouped = useMemo(() => {
    const critical: MetricDef[] = [];
    const warning: MetricDef[] = [];
    const info: MetricDef[] = [];
    METRICS.forEach((m) => {
      const metric = h[m.key] as HealthMetric;
      if (!metric) return;
      if (metric.severity === "critical") critical.push(m);
      else if (metric.severity === "warning") warning.push(m);
      else info.push(m);
    });
    return { critical, warning, info };
  }, [h]);

  const activeDef = drillKey ? METRICS.find((m) => m.key === drillKey) : null;
  const activeMetric = drillKey ? (h[drillKey] as HealthMetric) : null;

  const scoreTone = score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-destructive";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Score global */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">Score Global de Saúde</span>
                  <span className={`text-5xl font-bold tabular-nums ${scoreTone}`}>{score}</span>
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <Progress value={score} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {h.totalSkus.toLocaleString("pt-BR")} SKUs no catálogo · {problemCount.toLocaleString("pt-BR")} com problemas detectados
                  {h.totalSkus > 0 && ` (${((problemCount / h.totalSkus) * 100).toFixed(1)}%)`}
                </p>
              </div>
              <div className="flex flex-col items-start md:items-end text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{grouped.critical.reduce((s, m) => s + (h[m.key] as HealthMetric).count, 0).toLocaleString("pt-BR")}</Badge>
                  <span>críticos (bloqueiam venda)</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">
                    {grouped.warning.reduce((s, m) => s + (h[m.key] as HealthMetric).count, 0).toLocaleString("pt-BR")}
                  </Badge>
                  <span>atenção</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">
                    {grouped.info.reduce((s, m) => s + (h[m.key] as HealthMetric).count, 0).toLocaleString("pt-BR")}
                  </Badge>
                  <span>informativos</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Críticos */}
        <Section title="Críticos — bloqueiam venda" tone="critical" metrics={grouped.critical} h={h} onOpen={setDrillKey} />
        {/* Atenção */}
        <Section title="Atenção — qualidade comercial" tone="warning" metrics={grouped.warning} h={h} onOpen={setDrillKey} />
        {/* Informativos */}
        <Section title="Informativos — recomendações" tone="info" metrics={grouped.info} h={h} onOpen={setDrillKey} />

        <p className="text-xs text-muted-foreground">
          As regras de detecção foram refinadas para evitar falsos positivos. Por exemplo, duplicatas exigem
          mesmo fabricante para serem contadas — variantes (M8 vs M10) não inflam mais a contagem.
          Passe o cursor no <Info className="inline h-3 w-3" /> de cada card para ver a regra exata.
        </p>
      </div>

      {activeDef && activeMetric && (
        <DataHealthDrillDown
          open={!!drillKey}
          onOpenChange={(v) => !v && setDrillKey(null)}
          title={activeDef.label}
          description={activeDef.description}
          severity={activeMetric.severity}
          sampleIds={activeMetric.sample_ids ?? []}
          totalCount={activeMetric.count}
          showMerge={activeDef.showMerge}
          onMerge={(ids) => {
            setMergeIds(ids);
            setDrillKey(null);
          }}
        />
      )}

      <MergeDuplicatesDialog
        open={mergeIds.length >= 2}
        onOpenChange={(v) => !v && setMergeIds([])}
        partIds={mergeIds}
      />
    </TooltipProvider>
  );
}

function Section({
  title, tone, metrics, h, onOpen,
}: {
  title: string;
  tone: HealthSeverity;
  metrics: MetricDef[];
  h: DataHealth;
  onOpen: (k: keyof DataHealth) => void;
}) {
  if (metrics.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {tone === "critical" && <AlertCircle className="h-4 w-4 text-destructive" />}
          {tone === "warning" && <AlertTriangle className="h-4 w-4 text-amber-600" />}
          {tone === "info" && <Info className="h-4 w-4 text-muted-foreground" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((m) => {
            const metric = h[m.key] as HealthMetric;
            const empty = metric.count === 0;
            return (
              <button
                key={m.key as string}
                disabled={empty}
                onClick={() => onOpen(m.key)}
                className={`group text-left rounded-lg border p-4 transition min-h-[110px] flex flex-col justify-between ${severityCardClass(metric.severity, metric.count)} ${empty ? "opacity-60 cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {severityIcon(metric.severity, metric.count)}
                    <span className="font-medium text-sm truncate">{m.label}</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" onClick={(e) => e.stopPropagation()} />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium">{m.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Regra: {m.rule}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-3xl font-bold tabular-nums">
                    {metric.count.toLocaleString("pt-BR")}
                  </span>
                  {!empty && (
                    <span className="flex items-center text-xs text-muted-foreground group-hover:text-foreground transition">
                      {m.showMerge && <GitMerge className="h-3 w-3 mr-1" />}
                      Ver lista <ChevronRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
