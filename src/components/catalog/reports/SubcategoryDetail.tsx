import { useSubcategoryParts } from "@/hooks/use-catalog-intelligence";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet } from "lucide-react";
import { fmtBRL } from "@/lib/subcategory-rules";
import { exportPartsXlsx } from "@/lib/export-xlsx";

interface Props {
  openKey: string | null;
  onClose: () => void;
}

export function SubcategoryDetail({ openKey, onClose }: Props) {
  const [sub, model] = (openKey ?? "").split("|||");
  const subcategory = sub || null;
  const machineModel = model || null;
  const { data, isLoading } = useSubcategoryParts(subcategory, machineModel);

  const total = (data ?? []).reduce((a, p) => a + p.stock * p.estimated_price, 0);
  const units = (data ?? []).reduce((a, p) => a + p.stock, 0);

  return (
    <Dialog open={!!openKey} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>
              {subcategory}
              {machineModel && <span className="text-muted-foreground"> · {machineModel}</span>}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={!data || data.length === 0}
              onClick={() =>
                exportPartsXlsx(
                  data!,
                  `${(subcategory ?? "subcategoria").replace(/\W+/g, "-").toLowerCase()}${machineModel ? "-" + machineModel.replace(/\W+/g, "-") : ""}.xlsx`,
                  subcategory ?? undefined,
                )
              }
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar XLSX
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 text-xs text-muted-foreground border-b pb-2">
          <span>{(data ?? []).length} SKUs</span>
          <span>·</span>
          <span>{units} unidades</span>
          <span>·</span>
          <span className="text-primary font-semibold">{fmtBRL(total)}</span>
        </div>

        <div className="overflow-auto flex-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Atributos</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.material}</TableCell>
                    <TableCell className="max-w-xs truncate" title={p.description}>{p.description}</TableCell>
                    <TableCell className="text-xs">{p.machine_model ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.attributes && Object.entries(p.attributes).map(([k, v]) => (
                          <Badge key={k} variant="secondary" className="text-[10px]">{k}: {String(v)}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">{p.stock}</TableCell>
                    <TableCell className="text-right text-xs">{fmtBRL(p.estimated_price)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{fmtBRL(p.stock * p.estimated_price)}</TableCell>
                  </TableRow>
                ))}
                {(data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma peça nesta subcategoria.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
