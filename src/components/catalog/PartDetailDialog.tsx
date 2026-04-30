import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Part, formatBRL, getActiveCategories, useUpdatePart, useSimilarParts, usePartSales } from "@/hooks/use-parts";
import { Package, Clock, Layers, Truck, Search, Brain, Pencil, CheckCircle2, Copy, ShoppingCart as ShoppingCartIcon } from "lucide-react";
import { MarketResearchTab } from "./MarketResearchTab";
import { PartAIResearch } from "./PartAIResearch";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface PartDetailDialogProps {
  part: Part | null;
  onClose: () => void;
}

export function PartDetailDialog({ part, onClose }: PartDetailDialogProps) {
  if (!part) return null;
  return <PartDetailContent part={part} onClose={onClose} />;
}

function PartDetailContent({ part, onClose }: { part: Part; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("details");
  const [editing, setEditing] = useState(false);
  const [editStock, setEditStock] = useState(String(part.stock));
  const [editPrice, setEditPrice] = useState(String(part.estimated_price));
  const [editModel, setEditModel] = useState(part.machine_model || "");
  const updatePart = useUpdatePart();
  const { data: similarParts } = useSimilarParts(part.description);
  const { data: partSales } = usePartSales(part.id);
  const { addItem } = useCart();

  const categories = getActiveCategories(part);
  const totalValue = part.stock * part.estimated_price;
  const filteredSimilar = (similarParts || []).filter(p => p.id !== part.id);

  const handleAddToCart = () => {
    addItem({
      part_id: part.id,
      material: part.material,
      description: part.description,
      unit_price: part.estimated_price,
      stock: part.stock,
    });
    toast.success("Adicionado ao pedido");
  };

  const handleUpdate = () => {
    updatePart.mutate({
      id: part.id,
      stock: Number(editStock),
      estimated_price: Number(editPrice),
      machine_model: editModel || undefined,
    }, {
      onSuccess: () => { toast.success("Peça atualizada"); setEditing(false); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleReview = () => {
    updatePart.mutate({
      id: part.id,
      reviewed_at: new Date().toISOString(),
    }, {
      onSuccess: () => toast.success("Peça marcada como revisada"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={!!part} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Detalhes da Peça
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-mono">{part.material}</p>
              <p className="font-semibold text-foreground mt-1">{part.description}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="default" size="sm" onClick={handleAddToCart} className="gap-1">
                <ShoppingCartIcon className="h-3 w-3" /> Pedido
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="gap-1">
                <Pencil className="h-3 w-3" /> Editar
              </Button>
              <Button variant="outline" size="sm" onClick={handleReview} className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Revisar
              </Button>
            </div>
          </div>

          {editing && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg border">
              <div><Label className="text-xs">Estoque</Label><Input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} className="h-8" /></div>
              <div><Label className="text-xs">Preço</Label><Input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="h-8" /></div>
              <div><Label className="text-xs">Modelo</Label><Input value={editModel} onChange={e => setEditModel(e.target.value)} className="h-8" /></div>
              <Button size="sm" onClick={handleUpdate} disabled={updatePart.isPending} className="col-span-3">
                {updatePart.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <Badge key={cat} variant="outline">{cat}</Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow icon={<Layers className="h-4 w-4" />} label="Modelo" value={part.machine_model ?? "—"} />
            <InfoRow icon={<Truck className="h-4 w-4" />} label="Fornecedor" value={part.supplier ?? "—"} />
            <InfoRow icon={<Clock className="h-4 w-4" />} label="Última Entrada" value={part.last_entry_time ?? "—"} />
            <InfoRow icon={<Package className="h-4 w-4" />} label="Estoque" value={part.stock.toLocaleString("pt-BR") + " un."} />
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">Preço Unitário</p>
              <p className="font-display font-bold text-lg text-foreground">{formatBRL(part.estimated_price)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <p className="font-display font-bold text-lg text-primary">{formatBRL(totalValue)}</p>
            </div>
          </div>

          {part.compatible_models && part.compatible_models.length > 1 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Compatível com outros modelos</p>
              <div className="flex flex-wrap gap-1.5">
                {part.compatible_models.map((model) => (
                  <Badge key={model} variant="secondary" className="text-xs">{model}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="details" className="gap-1 text-xs"><Search className="h-3 w-3" /> Mercado</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1 text-xs"><Brain className="h-3 w-3" /> IA</TabsTrigger>
            <TabsTrigger value="similar" className="gap-1 text-xs"><Copy className="h-3 w-3" /> Similares</TabsTrigger>
            <TabsTrigger value="sales" className="gap-1 text-xs"><ShoppingCartIcon className="h-3 w-3" /> Vendas</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <MarketResearchTab partId={part.id} ourPrice={part.estimated_price} />
          </TabsContent>
          <TabsContent value="ai">
            <PartAIResearch material={part.material} />
          </TabsContent>
          <TabsContent value="similar">
            {filteredSimilar.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma peça similar encontrada</p>
            ) : (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground">{filteredSimilar.length} peça(s) com descrição similar</p>
                {filteredSimilar.map(p => (
                  <div key={p.id} className="flex justify-between items-center text-sm bg-muted/50 rounded px-3 py-2">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{p.material}</span>
                      <p className="text-foreground truncate max-w-[280px]">{p.description}</p>
                      <p className="text-xs text-muted-foreground">{p.machine_model}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{p.stock} un.</p>
                      <p className="font-semibold text-xs">{formatBRL(p.estimated_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="sales">
            {!partSales || partSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma venda registrada para esta peça</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partSales.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">#{item.sales?.order_number}</TableCell>
                      <TableCell className="text-xs">{item.sales?.sale_date ? new Date(item.sales.sale_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-xs">{item.sales?.customers?.name || "—"}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatBRL(item.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
