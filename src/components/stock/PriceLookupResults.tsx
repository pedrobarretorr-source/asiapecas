import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Save } from "lucide-react";
import type { LookupResult, SourceId } from "@/hooks/use-price-lookup";

const SOURCE_LABELS: Record<SourceId, string> = {
  mercadolivre: "Mercado Livre",
  lideranca: "Liderança XCMG",
  macromaq: "Macromaq",
  extramaquinas: "Extra Máquinas",
};

const ERROR_LABELS: Record<string, string> = {
  timeout: "Timeout",
  no_results: "Nada encontrado",
  parse_error: "Erro ao ler página",
  rejected: "Falhou",
  not_implemented: "—",
};

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function PriceLookupResults({
  results,
  onSaveAsCost,
}: {
  results: LookupResult[];
  onSaveAsCost?: (price: number) => void;
}) {
  const bySource = (Object.keys(SOURCE_LABELS) as SourceId[]).map((src) => ({
    source: src,
    items: results.filter((r) => r.source === src),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {bySource.map(({ source, items }) => {
        const errorRow = items.find((i) => i.error);
        const valid = items.filter((i) => !i.error && i.price_brl != null);
        return (
          <Card key={source}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{SOURCE_LABELS[source]}</CardTitle>
              {errorRow ? (
                <Badge variant="destructive" className="text-[10px]">
                  {ERROR_LABELS[errorRow.error || ""] || errorRow.error}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">{valid.length} resultados</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {valid.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum resultado válido.</p>
              ) : (
                valid.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-start gap-2 border rounded p-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.title || "—"}</p>
                      <p className="text-muted-foreground">{r.seller || ""}</p>
                      <p className="font-mono font-semibold text-primary">{fmt(r.price_brl)}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Abrir">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                      {onSaveAsCost && r.price_brl != null && (
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7"
                          title="Salvar como custo da peça"
                          onClick={() => onSaveAsCost(r.price_brl!)}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
