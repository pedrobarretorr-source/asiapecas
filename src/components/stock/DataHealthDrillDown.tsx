import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Pencil, GitMerge, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv, todayStamp } from "@/lib/export-csv";
import { toast } from "sonner";
import type { HealthSeverity } from "@/hooks/use-stock-analytics";

interface PartRow {
  id: string;
  material: string;
  description: string;
  manufacturer: string | null;
  machine_model: string | null;
  part_category: string | null;
  stock: number;
  estimated_price: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  severity: HealthSeverity;
  sampleIds: string[];
  totalCount: number;
  showMerge?: boolean;
  onEdit?: (partId: string) => void;
  onMerge?: (partIds: string[]) => void;
}

const severityBadge = (s: HealthSeverity) => {
  if (s === "critical") return <Badge variant="destructive">Crítico</Badge>;
  if (s === "warning") return <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">Atenção</Badge>;
  return <Badge variant="secondary">Informativo</Badge>;
};

export function DataHealthDrillDown({
  open, onOpenChange, title, description, severity, sampleIds, totalCount,
  showMerge, onEdit, onMerge,
}: Props) {
  const [rows, setRows] = useState<PartRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [stockOnly, setStockOnly] = useState(false);
  const [highValueOnly, setHighValueOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || sampleIds.length === 0) {
      setRows([]);
      setSelected(new Set());
      return;
    }
    setLoading(true);
    supabase
      .from("parts")
      .select("id,material,description,manufacturer,machine_model,part_category,stock,estimated_price")
      .in("id", sampleIds)
      .then(({ data, error }) => {
        if (error) toast.error("Erro ao carregar peças: " + error.message);
        setRows((data ?? []) as PartRow[]);
        setLoading(false);
      });
  }, [open, sampleIds]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stockOnly && r.stock <= 0) return false;
      if (highValueOnly && r.estimated_price * r.stock < 1000) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.material.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.manufacturer ?? "").toLowerCase().includes(q) ||
          (r.machine_model ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, search, stockOnly, highValueOnly]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleExport = () => {
    const slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    downloadCsv(`saude-dados-${slug}-${todayStamp()}.csv`, filtered, [
      { header: "Material", value: (r) => r.material },
      { header: "Descrição", value: (r) => r.description },
      { header: "Fabricante", value: (r) => r.manufacturer ?? "" },
      { header: "Modelo", value: (r) => r.machine_model ?? "" },
      { header: "Categoria", value: (r) => r.part_category ?? "" },
      { header: "Estoque", value: (r) => r.stock },
      { header: "Preço unit (R$)", value: (r) => r.estimated_price },
      { header: "Valor total (R$)", value: (r) => (r.stock * r.estimated_price).toFixed(2) },
    ]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-xl">{title}</SheetTitle>
            {severityBadge(severity)}
          </div>
          <SheetDescription>{description}</SheetDescription>
          <p className="text-xs text-muted-foreground">
            Mostrando {Math.min(sampleIds.length, 50)} de <strong>{totalCount.toLocaleString("pt-BR")}</strong> peças afetadas
            {sampleIds.length < totalCount && " (top 50)"}.
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar material, descrição, fabricante…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Button
              variant={stockOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setStockOnly((v) => !v)}
            >
              Estoque &gt; 0
            </Button>
            <Button
              variant={highValueOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setHighValueOnly((v) => !v)}
            >
              Valor &gt; R$ 1k
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>

          {showMerge && selected.size >= 2 && (
            <div className="flex items-center justify-between rounded-md border bg-accent/30 px-3 py-2 text-sm">
              <span><strong>{selected.size}</strong> peças selecionadas para mesclar</span>
              <Button size="sm" onClick={() => onMerge?.(Array.from(selected))}>
                <GitMerge className="h-4 w-4 mr-1" /> Mesclar
              </Button>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhuma peça encontrada com os filtros atuais.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showMerge && <TableHead className="w-8"></TableHead>}
                    <TableHead>Material</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fabricante</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className={selected.has(r.id) ? "bg-accent/50" : ""}>
                      {showMerge && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggle(r.id)}
                            className="h-4 w-4"
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs">{r.material}</TableCell>
                      <TableCell className="max-w-[280px] truncate" title={r.description}>
                        {r.description}
                        {r.machine_model && <div className="text-xs text-muted-foreground">{r.machine_model}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{r.manufacturer ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.stock}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        R$ {(r.stock * r.estimated_price).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => onEdit?.(r.id)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
