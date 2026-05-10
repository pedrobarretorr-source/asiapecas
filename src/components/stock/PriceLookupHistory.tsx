import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useDeletePriceLookup, type Lookup } from "@/hooks/use-price-lookup";
import PriceLookupResults from "./PriceLookupResults";

export default function PriceLookupHistory({ lookups, partId }: { lookups: Lookup[]; partId: string }) {
  const del = useDeletePriceLookup();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (lookups.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Sem histórico.</p>;
  }

  return (
    <div className="space-y-2">
      {lookups.map((l) => {
        const minPriceML = l.results
          .filter((r) => r.source === "mercadolivre" && r.price_brl != null)
          .reduce((min, r) => (min === null || r.price_brl! < min ? r.price_brl! : min), null as number | null);
        const isOpen = expanded === l.id;
        return (
          <div key={l.id} className="border rounded">
            <div className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/40"
              onClick={() => setExpanded(isOpen ? null : l.id)}>
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="text-xs font-mono">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                <Badge variant="outline" className="text-[10px]">"{l.query}"</Badge>
                <Badge variant="secondary" className="text-[10px]">{l.results.length} results</Badge>
                {minPriceML != null && (
                  <span className="text-[11px] text-muted-foreground">
                    ML mín: R$ {minPriceML.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <Button
                variant="ghost" size="icon"
                onClick={(e) => { e.stopPropagation(); del.mutate({ id: l.id, part_id: partId }); }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {isOpen && (
              <div className="p-3 bg-muted/20 border-t">
                <PriceLookupResults results={l.results} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
