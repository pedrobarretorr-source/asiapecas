import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, LineChart } from "lucide-react";
import PriceLookupDialog, { type PartLite } from "./PriceLookupDialog";

type Row = {
  id: string;
  material: string;
  description: string;
  manufacturer: string | null;
  estimated_price: number;
  stock: number;
};

export default function PriceCompareTab() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PartLite | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["parts-price-compare", search],
    queryFn: async (): Promise<Row[]> => {
      let q = supabase
        .from("parts")
        .select("id, material, description, manufacturer, estimated_price, stock")
        .order("material")
        .limit(50);
      if (search.trim().length >= 2) {
        const s = `%${search.trim()}%`;
        q = q.or(`material.ilike.${s},description.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Row[];
    },
  });

  const totalStock = useMemo(() => parts.reduce((s, p) => s + p.stock, 0), [parts]);

  const openLookup = (p: Row) => {
    setSelected({ id: p.id, material: p.material, description: p.description });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar peça por código ou descrição..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="outline">{parts.length} peças · {totalStock} un</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Fabricante</TableHead>
            <TableHead className="text-right">Custo atual</TableHead>
            <TableHead className="text-center">Estoque</TableHead>
            <TableHead className="text-right w-24">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : parts.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma peça encontrada</TableCell></TableRow>
          ) : parts.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">{p.material}</TableCell>
              <TableCell className="text-xs truncate max-w-[300px]">{p.description}</TableCell>
              <TableCell className="text-xs">{p.manufacturer || "—"}</TableCell>
              <TableCell className="text-right font-mono">R$ {p.estimated_price.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-center">{p.stock}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openLookup(p)}>
                  <LineChart className="h-3 w-3" />
                  Comparar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PriceLookupDialog
        part={selected}
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setSelected(null); }}
      />
    </div>
  );
}
