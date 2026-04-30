import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShoppingCart, Brain, TrendingDown } from "lucide-react";
import { type Part, formatBRL, getActiveCategories } from "@/hooks/use-parts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePricingSettings, applySellPrice } from "@/hooks/use-pricing";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface PartTableProps {
  parts: Part[];
  onSelect: (part: Part) => void;
}

export function PartTable({ parts, onSelect }: PartTableProps) {
  const { data: pricing } = usePricingSettings();
  const markup = Number(pricing?.default_markup ?? 30);
  const { addItem } = useCart();

  const partIds = parts.map((p) => p.id);

  // Aggregated lowest market price per part (one query)
  const { data: lowestMap } = useQuery({
    queryKey: ["table-lowest-market", partIds.sort().join(",")],
    enabled: partIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_research")
        .select("part_id, distributor_name, price_found")
        .in("part_id", partIds)
        .gt("price_found", 0);
      if (error) throw error;
      const map = new Map<string, { price: number; distributor: string }>();
      (data ?? []).forEach((r: any) => {
        const cur = map.get(r.part_id);
        const price = Number(r.price_found);
        if (!cur || price < cur.price) {
          map.set(r.part_id, { price, distributor: r.distributor_name });
        }
      });
      return map;
    },
  });

  const handleAdd = (e: React.MouseEvent, part: Part) => {
    e.stopPropagation();
    addItem({
      part_id: part.id,
      material: part.material,
      description: part.description,
      unit_price: part.estimated_price,
      stock: part.stock,
    });
    toast.success("Adicionado ao pedido");
  };

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead className="text-right">Estoque</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead className="text-right">Sugerido</TableHead>
            <TableHead className="text-right">Mín. Mercado</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parts.map((part) => {
            const lowest = lowestMap?.get(part.id);
            const suggested = applySellPrice(Number(part.estimated_price || 0), markup);
            const tags = getActiveCategories(part);
            return (
              <TableRow
                key={part.id}
                className="cursor-pointer"
                onClick={() => onSelect(part)}
              >
                <TableCell className="font-mono text-xs">{part.material}</TableCell>
                <TableCell className="max-w-[260px] truncate text-sm">{part.description}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {part.part_category && (
                      <Badge variant="secondary" className="text-[10px] py-0">{part.part_category}</Badge>
                    )}
                    {tags.slice(0, 2).map((cat) => (
                      <Badge key={cat} variant="outline" className="text-[10px] py-0">{cat}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs">{part.machine_model}</TableCell>
                <TableCell className="text-right">{part.stock.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {formatBRL(Number(part.estimated_price))}
                </TableCell>
                <TableCell className="text-right text-sm font-semibold">
                  {formatBRL(suggested)}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {lowest ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={
                            lowest.price < suggested
                              ? "text-destructive font-medium"
                              : "text-emerald-600 font-medium"
                          }
                        >
                          {formatBRL(lowest.price)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{lowest.distributor}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 items-center">
                    {lowest && (
                      <Badge variant="default" className="text-[10px] gap-0.5 bg-primary/90">
                        <Brain className="h-2.5 w-2.5" /> Pesquisado
                      </Badge>
                    )}
                    {part.last_entry_time === "mais de 2 anos" && (
                      <Badge variant="destructive" className="text-[10px]">Parado</Badge>
                    )}
                    {lowest && lowest.price < suggested && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent>Concorrente abaixo do preço sugerido</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => handleAdd(e, part)}
                  >
                    <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
