import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface PartRow {
  id: string;
  material: string;
  description: string;
  manufacturer: string | null;
  machine_model: string | null;
  stock: number;
  estimated_price: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partIds: string[];
}

export function MergeDuplicatesDialog({ open, onOpenChange, partIds }: Props) {
  const [parts, setParts] = useState<PartRow[]>([]);
  const [keepId, setKeepId] = useState<string>("");
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open || partIds.length === 0) {
      setParts([]);
      setKeepId("");
      setConfirming(false);
      return;
    }
    supabase
      .from("parts")
      .select("id,material,description,manufacturer,machine_model,stock,estimated_price")
      .in("id", partIds)
      .then(({ data, error }) => {
        if (error) {
          toast.error("Erro: " + error.message);
          return;
        }
        const rows = (data ?? []) as PartRow[];
        setParts(rows);
        // Default: maior estoque vence
        const top = [...rows].sort((a, b) => b.stock - a.stock)[0];
        if (top) setKeepId(top.id);
      });
  }, [open, partIds]);

  const preview = useMemo(() => {
    if (!parts.length) return null;
    const totalStock = parts.reduce((s, p) => s + p.stock, 0);
    const totalValue = parts.reduce((s, p) => s + p.stock * p.estimated_price, 0);
    const avgPrice = totalStock > 0 ? totalValue / totalStock : 0;
    return { totalStock, avgPrice, mergedCount: parts.length - 1 };
  }, [parts]);

  const handleMerge = async () => {
    if (!keepId) return;
    setWorking(true);
    const mergeIds = partIds.filter((id) => id !== keepId);
    const { data, error } = await supabase.functions.invoke("merge-duplicate-parts", {
      body: { keep_id: keepId, merge_ids: mergeIds },
    });
    setWorking(false);
    if (error) {
      toast.error("Falha na mesclagem: " + error.message);
      return;
    }
    toast.success(`Peças mescladas: ${data?.merged ?? mergeIds.length} consolidadas em 1.`);
    queryClient.invalidateQueries({ queryKey: ["stock-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["parts"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mesclar peças duplicadas</DialogTitle>
          <DialogDescription>
            Selecione qual cadastro deve ser <strong>mantido</strong>. As demais terão estoque somado e serão removidas.
            Histórico de vendas é transferido automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!confirming ? (
          <RadioGroup value={keepId} onValueChange={setKeepId} className="space-y-2">
            {parts.map((p) => (
              <Label
                key={p.id}
                htmlFor={p.id}
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition ${
                  keepId === p.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
              >
                <RadioGroupItem value={p.id} id={p.id} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-muted-foreground">{p.material}</div>
                  <div className="font-medium truncate">{p.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.manufacturer ?? "—"} · {p.machine_model ?? "sem modelo"}
                  </div>
                  <div className="text-sm mt-1">
                    Estoque: <strong>{p.stock}</strong> · Preço: R$ {p.estimated_price.toLocaleString("pt-BR")}
                  </div>
                </div>
              </Label>
            ))}
          </RadioGroup>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Confirme:</strong> {preview?.mergedCount} peças serão removidas e o estoque consolidado em
              {" "}<strong>{preview?.totalStock} unidades</strong> com preço médio ponderado de
              {" "}<strong>R$ {preview?.avgPrice.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</strong>.
              Esta ação <strong>não pode ser desfeita</strong>.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
            Cancelar
          </Button>
          {!confirming ? (
            <Button onClick={() => setConfirming(true)} disabled={!keepId || parts.length < 2}>
              Continuar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={working}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={handleMerge} disabled={working}>
                {working && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Confirmar mesclagem
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
