import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
};

export function CustomerPagination({ page, pageSize, total, onPageChange, onPageSizeChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t">
      <p className="text-sm text-muted-foreground">
        Mostrando <strong>{start}</strong>–<strong>{end}</strong> de <strong>{total.toLocaleString("pt-BR")}</strong>
      </p>
      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n} / página</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="Primeira página">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Próxima">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} aria-label="Última página">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
