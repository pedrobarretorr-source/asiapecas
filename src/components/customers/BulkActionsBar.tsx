import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, RefreshCw, Target, Download, MessageCircle, X } from "lucide-react";

type Props = {
  count: number;
  onClear: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEnrich: () => void;
  onProspect: () => void;
  onExport: () => void;
  onWhatsApp: () => void;
  busy?: boolean;
};

export function BulkActionsBar({ count, onClear, onEdit, onDelete, onEnrich, onProspect, onExport, onWhatsApp, busy }: Props) {
  if (count === 0) return null;
  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-card/95 backdrop-blur p-3 shadow-md">
      <Badge variant="default" className="text-sm">
        {count} selecionado{count > 1 ? "s" : ""}
      </Badge>
      <div className="flex flex-wrap gap-2 ml-auto">
        <Button size="sm" variant="outline" onClick={onEdit} disabled={busy}>
          <Pencil className="h-4 w-4 mr-1" /> Editar em lote
        </Button>
        <Button size="sm" variant="outline" onClick={onEnrich} disabled={busy}>
          <RefreshCw className="h-4 w-4 mr-1" /> Carregar informações
        </Button>
        <Button size="sm" variant="outline" onClick={onProspect} disabled={busy}>
          <Target className="h-4 w-4 mr-1" /> Buscar prospects
        </Button>
        <Button size="sm" variant="outline" onClick={onWhatsApp} disabled={busy}>
          <MessageCircle className="h-4 w-4 mr-1 text-emerald-600" /> WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={onExport} disabled={busy}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete} disabled={busy}>
          <Trash2 className="h-4 w-4 mr-1" /> Excluir
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear} aria-label="Limpar seleção">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
