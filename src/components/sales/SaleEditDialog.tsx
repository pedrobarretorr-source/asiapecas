import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search, Save, FileDown } from "lucide-react";
import { type Sale, useUpdateSale } from "@/hooks/use-sales";
import { usePricingSettings, applySellPrice } from "@/hooks/use-pricing";
import { supabase } from "@/integrations/supabase/client";

type EditItem = {
  part_id: string;
  material: string;
  description: string;
  quantity: number;
  unit_price: number;
  sell_price: number;
  stock?: number;
};

type PartSearchResult = {
  id: string;
  material: string;
  description: string;
  estimated_price: number;
  stock: number;
};

const PAYMENT_METHODS = ["Boleto", "PIX", "Cartão", "Transferência", "Cheque"];
const PAYMENT_TERMS = ["À vista", "30 dias", "30/60 dias", "30/60/90 dias"];

export default function SaleEditDialog({
  sale,
  open,
  onOpenChange,
  onGenerateProposal,
}: {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGenerateProposal?: (sale: Sale) => void;
}) {
  const updateSale = useUpdateSale();
  const { data: pricing } = usePricingSettings();
  const defaultMarkup = pricing?.default_markup ?? 30;

  const [items, setItems] = useState<EditItem[]>([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [markup, setMarkup] = useState(defaultMarkup);
  const [useMarkup, setUseMarkup] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PartSearchResult[]>([]);

  useEffect(() => {
    if (sale) {
      setItems(
        (sale.sale_items || []).map((it) => ({
          part_id: it.part_id || "",
          material: it.parts?.material || "",
          description: it.parts?.description || "",
          quantity: it.quantity,
          unit_price: it.unit_price,
          sell_price: it.sell_price > 0 ? it.sell_price : it.unit_price,
        })),
      );
      setNotes(sale.notes || "");
      setPaymentMethod(sale.payment_method || "");
      setPaymentTerms(sale.payment_terms || "");
    }
  }, [sale]);

  useEffect(() => {
    setMarkup(defaultMarkup);
  }, [defaultMarkup]);

  const isEditable = sale?.status === "orcamento";

  const searchParts = async (q: string) => {
    setSearch(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from("parts")
      .select("id,material,description,estimated_price,stock")
      .or(`material.ilike.%${q}%,description.ilike.%${q}%,machine_model.ilike.%${q}%`)
      .limit(15);
    setSearchResults((data as PartSearchResult[]) || []);
  };

  const addPart = (p: PartSearchResult) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.part_id === p.id);
      if (existing) {
        return prev.map((i) => (i.part_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          part_id: p.id,
          material: p.material,
          description: p.description,
          quantity: 1,
          unit_price: p.estimated_price,
          sell_price: useMarkup ? applySellPrice(p.estimated_price, markup) : p.estimated_price,
          stock: p.stock,
        },
      ];
    });
    setSearch("");
    setSearchResults([]);
  };

  const updateItem = (idx: number, patch: Partial<EditItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const applyMarkupToAll = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        sell_price: useMarkup ? applySellPrice(it.unit_price, markup) : it.unit_price,
      })),
    );
  };

  const totalCost = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const totalSell = items.reduce((s, i) => s + i.quantity * i.sell_price, 0);
  const profit = totalSell - totalCost;
  const margin = totalSell > 0 ? (profit / totalSell) * 100 : 0;

  const handleSave = () => {
    if (!sale) return;
    if (items.length === 0) return;
    updateSale.mutate(
      {
        id: sale.id,
        data: {
          notes: notes || null,
          payment_method: paymentMethod || null,
          payment_terms: paymentTerms || null,
        },
        items: items.map((i) => ({
          part_id: i.part_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          sell_price: i.sell_price,
        })),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditable ? "Editar Cotação" : "Detalhes da Venda"}{" "}
            {(sale as { order_number?: string } | null)?.order_number
              ? `#${(sale as { order_number?: string }).order_number}`
              : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2 -mr-2">
          {sale && !isEditable && (
            <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-sm rounded-md p-3">
              Esta venda está como <b>{sale.status}</b>. Para editar itens e valores,
              mude o status para <b>Orçamento</b> primeiro.
            </div>
          )}

          {sale && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-medium">{sale.customers?.name || "—"}</p>
                {sale.customers?.company && (
                  <p className="text-xs text-muted-foreground">{sale.customers.company}</p>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="font-medium">{new Date(sale.sale_date).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          )}

          {isEditable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar peça para adicionar (material, descrição ou modelo)..."
                className="pl-10"
                value={search}
                onChange={(e) => searchParts(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full border rounded-md mt-1 max-h-60 overflow-y-auto bg-background shadow-lg">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between items-center"
                      onClick={() => addPart(p)}
                    >
                      <div className="flex-1">
                        <span className="font-mono text-xs">{p.material}</span>
                        <span className="text-muted-foreground ml-2 truncate">{p.description}</span>
                      </div>
                      <div className="flex items-center gap-3 ml-2 shrink-0">
                        <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-xs">
                          Est: {p.stock}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          R$ {p.estimated_price.toLocaleString("pt-BR")}
                        </span>
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isEditable && (
            <div className="flex flex-wrap items-center gap-3 bg-muted/40 rounded-lg p-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={useMarkup} onCheckedChange={(v) => setUseMarkup(!!v)} />
                Aplicar markup
              </label>
              <Input
                type="number"
                min={0}
                max={500}
                step={1}
                value={markup}
                disabled={!useMarkup}
                onChange={(e) => setMarkup(+e.target.value)}
                className="w-24 h-8"
              />
              <span className="text-xs text-muted-foreground">% sobre o custo</span>
              <Button size="sm" variant="outline" onClick={applyMarkupToAll}>
                Recalcular preços
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {useMarkup ? `Preço = custo × (1 + ${markup}%)` : "Preço = custo (sem markup)"}
              </span>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center w-20">Qtd</TableHead>
                <TableHead className="w-28">Custo</TableHead>
                <TableHead className="w-28">Preço Venda</TableHead>
                <TableHead className="w-28">Subtotal</TableHead>
                {isEditable && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isEditable ? 7 : 6} className="text-center py-6 text-muted-foreground">
                    Nenhum item nesta cotação
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it, idx) => (
                  <TableRow key={`${it.part_id}-${idx}`}>
                    <TableCell className="font-mono text-xs">{it.material}</TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]">{it.description}</TableCell>
                    <TableCell>
                      {isEditable ? (
                        <Input
                          type="number"
                          min={1}
                          className="w-16 h-8 text-center"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Math.max(1, +e.target.value) })}
                        />
                      ) : (
                        <span className="text-center block">{it.quantity}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditable ? (
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-24 h-8"
                          value={it.unit_price}
                          onChange={(e) => updateItem(idx, { unit_price: +e.target.value })}
                        />
                      ) : (
                        <span className="font-mono text-xs">R$ {it.unit_price.toLocaleString("pt-BR")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditable ? (
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-24 h-8"
                          value={it.sell_price}
                          onChange={(e) => updateItem(idx, { sell_price: +e.target.value })}
                        />
                      ) : (
                        <span className="font-mono">R$ {it.sell_price.toLocaleString("pt-BR")}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      R$ {(it.quantity * it.sell_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    {isEditable && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="grid grid-cols-4 gap-3 bg-muted/30 rounded-lg p-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Custo Total</p>
              <p className="font-mono text-sm">
                R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p
                className={`font-mono text-sm font-bold ${
                  profit >= 0 ? "text-green-600" : "text-destructive"
                }`}
              >
                R$ {profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Margem</p>
              <p
                className={`font-mono text-sm font-bold ${
                  margin >= 0 ? "text-green-600" : "text-destructive"
                }`}
              >
                {margin.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Venda</p>
              <p className="font-mono text-sm font-bold text-primary">
                R$ {totalSell.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {isEditable ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condições</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas sobre a cotação..."
                />
              </div>
            </>
          ) : (
            sale && (
              <div className="space-y-1 text-sm">
                {sale.payment_method && (
                  <p>
                    <span className="text-muted-foreground">Pagamento:</span> {sale.payment_method}
                    {sale.payment_terms ? ` — ${sale.payment_terms}` : ""}
                  </p>
                )}
                {sale.notes && (
                  <p>
                    <span className="text-muted-foreground">Notas:</span> {sale.notes}
                  </p>
                )}
              </div>
            )
          )}
        </div>

        <DialogFooter className="gap-2">
          {sale && onGenerateProposal && (
            <Button
              variant="outline"
              onClick={() => onGenerateProposal(sale)}
              className="gap-2 mr-auto"
            >
              <FileDown className="h-4 w-4" />
              Gerar Proposta (PDF)
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {isEditable && (
            <Button
              onClick={handleSave}
              disabled={updateSale.isPending || items.length === 0}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateSale.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
