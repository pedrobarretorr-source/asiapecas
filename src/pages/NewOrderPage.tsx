import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAllCustomers, useCreateCustomer, type CustomerInsert } from "@/hooks/use-customers";
import { useCreateSale } from "@/hooks/use-sales";
import { usePricingSettings, useUpdatePricingSettings, applySellPrice } from "@/hooks/use-pricing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, Search, Check, UserPlus, Settings2, Sparkles } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";
import { routes } from "@/lib/routes";

type CartItem = {
  part_id: string;
  material: string;
  description: string;
  quantity: number;
  cost_price: number;
  sell_price: number;
  stock: number;
};

const PAYMENT_METHODS = ["Boleto", "PIX", "Cartão", "Transferência", "Cheque"];
const PAYMENT_TERMS = ["À vista", "30 dias", "30/60 dias", "30/60/90 dias"];

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get("customer_id") || "";
  const { data: customers = [] } = useAllCustomers();
  const createSale = useCreateSale();
  const createCustomer = useCreateCustomer();
  const globalCart = useCart();
  const { data: pricing } = usePricingSettings();
  const updatePricing = useUpdatePricingSettings();

  const markup = pricing?.default_markup ?? 30;

  const [step, setStep] = useState(preselectedCustomerId ? 2 : 1);
  const [customerId, setCustomerId] = useState(preselectedCustomerId);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load items from global cart on mount
  useEffect(() => {
    if (globalCart.items.length > 0 && cart.length === 0) {
      setCart(globalCart.items.map(i => ({
        part_id: i.part_id,
        material: i.material,
        description: i.description,
        quantity: i.quantity,
        cost_price: i.unit_price,
        sell_price: applySellPrice(i.unit_price, markup),
        stock: i.stock,
      })));
      globalCart.clearCart();
      setStep(2);
    }
  }, []);

  const [partSearch, setPartSearch] = useState("");
  const [partResults, setPartResults] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [markupOpen, setMarkupOpen] = useState(false);
  const [tempMarkup, setTempMarkup] = useState(markup);

  // New customer inline
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<CustomerInsert>({
    name: "", company: null, cnpj_cpf: null, email: null, phone: null,
    address: null, city: null, state: null, segment: "geral", notes: null,
  });

  const searchParts = async (q: string) => {
    setPartSearch(q);
    if (q.length < 2) { setPartResults([]); return; }
    const { data } = await supabase
      .from("parts")
      .select("id,material,description,estimated_price,stock")
      .or(`material.ilike.%${q}%,description.ilike.%${q}%,machine_model.ilike.%${q}%`)
      .limit(15);
    setPartResults(data || []);
  };

  const addToCart = (part: any) => {
    if (cart.find((i) => i.part_id === part.id)) {
      setCart((prev) => prev.map((i) => i.part_id === part.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart((prev) => [...prev, {
        part_id: part.id, material: part.material, description: part.description,
        quantity: 1, cost_price: part.estimated_price,
        sell_price: applySellPrice(part.estimated_price, markup),
        stock: part.stock,
      }]);
    }
    setPartSearch("");
    setPartResults([]);
  };

  const updateCartItem = (idx: number, field: keyof CartItem, value: number) => {
    setCart((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeFromCart = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));

  const applyMarkupToAll = (m: number) => {
    setCart(prev => prev.map(item => ({
      ...item,
      sell_price: applySellPrice(item.cost_price, m),
    })));
  };

  const handleSaveMarkup = () => {
    if (pricing) {
      updatePricing.mutate({ default_markup: tempMarkup });
    }
    applyMarkupToAll(tempMarkup);
    setMarkupOpen(false);
  };

  const totalCost = cart.reduce((s, i) => s + i.quantity * i.cost_price, 0);
  const totalSell = cart.reduce((s, i) => s + i.quantity * i.sell_price, 0);
  const totalProfit = totalSell - totalCost;
  const profitMargin = totalSell > 0 ? (totalProfit / totalSell) * 100 : 0;

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Sugestões de peças baseadas em equipamentos do cliente + histórico
  const { data: suggestions = [] } = useQuery({
    queryKey: ["order-suggestions", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const out: Array<{ id: string; material: string; description: string; estimated_price: number; stock: number; reason: string }> = [];
      const seen = new Set<string>();

      // 1) histórico de compras (top 8 mais comprados)
      const { data: hist } = await supabase
        .from("sale_items")
        .select("part_id, quantity, sales!inner(customer_id), parts(id,material,description,estimated_price,stock)")
        .eq("sales.customer_id", customerId)
        .limit(50);
      const counts = new Map<string, { qty: number; part: { id: string; material: string; description: string; estimated_price: number; stock: number } }>();
      for (const r of (hist || []) as Array<{ part_id: string; quantity: number; parts: { id: string; material: string; description: string; estimated_price: number; stock: number } | null }>) {
        if (!r.parts || !r.part_id) continue;
        const cur = counts.get(r.part_id);
        if (cur) cur.qty += r.quantity; else counts.set(r.part_id, { qty: r.quantity, part: r.parts });
      }
      Array.from(counts.values()).sort((a, b) => b.qty - a.qty).slice(0, 8).forEach((x) => {
        seen.add(x.part.id);
        out.push({ ...x.part, reason: `Comprou ${x.qty}x antes` });
      });

      // 2) peças compatíveis com equipamentos
      const { data: equipment } = await supabase
        .from("customer_equipment").select("model").eq("customer_id", customerId);
      const models = (equipment || []).map((e) => e.model).filter(Boolean) as string[];
      const interest = selectedCustomer?.interest_models || [];
      const allModels = Array.from(new Set([...models, ...interest]));
      if (allModels.length > 0) {
        const { data: compat } = await supabase
          .from("parts")
          .select("id,material,description,estimated_price,stock,compatible_models,machine_model")
          .gt("stock", 0)
          .limit(200);
        for (const p of (compat || []) as Array<{ id: string; material: string; description: string; estimated_price: number; stock: number; compatible_models: string[] | null; machine_model: string | null }>) {
          if (seen.has(p.id) || out.length >= 12) continue;
          const matchedModel = allModels.find((m) =>
            (p.compatible_models || []).some((cm) => cm.toLowerCase().includes(m.toLowerCase())) ||
            (p.machine_model || "").toLowerCase().includes(m.toLowerCase())
          );
          if (matchedModel) {
            seen.add(p.id);
            out.push({ id: p.id, material: p.material, description: p.description, estimated_price: p.estimated_price, stock: p.stock, reason: `Compatível ${matchedModel}` });
          }
        }
      }
      return out;
    },
  });

  const handleCreateCustomer = () => {
    if (!newCustomer.name.trim()) return;
    createCustomer.mutate(newCustomer, {
      onSuccess: (data) => {
        setCustomerId(data.id);
        setNewCustomerOpen(false);
        setNewCustomer({ name: "", company: null, cnpj_cpf: null, email: null, phone: null, address: null, city: null, state: null, segment: "geral", notes: null });
      },
    });
  };

  const handleConfirmOrder = async () => {
    if (!customerId || cart.length === 0) return;
    setConfirming(true);
    try {
      const saleData = {
        customer_id: customerId,
        notes: notes || null,
        payment_method: paymentMethod || null,
        payment_terms: paymentTerms || null,
        items: cart.map(({ part_id, quantity, cost_price, sell_price }) => ({
          part_id, quantity, unit_price: cost_price, sell_price,
        })),
      };

      createSale.mutate(saleData, {
        onSuccess: async (sale) => {
          const { data, error } = await supabase.functions.invoke("confirm-sale", {
            body: { sale_id: sale.id },
          });
          if (error || data?.error) {
            toast.error(data?.error || "Erro ao confirmar pedido");
            setConfirming(false);
            return;
          }
          toast.success("Pedido confirmado e estoque atualizado!");
          navigate(routes.sales);
        },
        onError: () => setConfirming(false),
      });
    } catch {
      setConfirming(false);
    }
  };

  const hasStockIssues = cart.some((i) => i.quantity > i.stock);

  return (
    <AppLayout>
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">Novo Pedido</h1>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <Badge key={s} variant={step >= s ? "default" : "outline"} className="text-xs">
                {s === 1 ? "Cliente" : s === 2 ? "Itens" : "Resumo"}
              </Badge>
            ))}
          </div>
        </div>

        {/* Step 1: Customer */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Selecionar Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar cliente existente..." /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ""} {c.cnpj_cpf ? `— ${c.cnpj_cpf}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={() => setNewCustomerOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />Novo
                </Button>
              </div>

              {selectedCustomer && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                  <p className="font-medium">{selectedCustomer.name}</p>
                  {selectedCustomer.company && <p className="text-sm text-muted-foreground">{selectedCustomer.company}</p>}
                  {selectedCustomer.phone && <p className="text-sm text-muted-foreground">Tel: {selectedCustomer.phone}</p>}
                  {selectedCustomer.email && <p className="text-sm text-muted-foreground">Email: {selectedCustomer.email}</p>}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!customerId}>
                  Próximo — Adicionar Itens
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Cart Items */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">2. Adicionar Peças ao Pedido</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => { setTempMarkup(markup); setMarkupOpen(true); }}>
                  <Settings2 className="h-4 w-4" />
                  Margem: {markup}%
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por material, descrição ou modelo..."
                  className="pl-10"
                  value={partSearch}
                  onChange={(e) => searchParts(e.target.value)}
                />
                {partResults.length > 0 && (
                  <div className="absolute z-10 w-full border rounded-md mt-1 max-h-60 overflow-y-auto bg-background shadow-lg">
                    {partResults.map((p) => (
                      <div
                        key={p.id}
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between items-center"
                        onClick={() => addToCart(p)}
                      >
                        <div className="flex-1">
                          <span className="font-mono text-xs">{p.material}</span>
                          <span className="text-muted-foreground ml-2 truncate">{p.description}</span>
                        </div>
                        <div className="flex items-center gap-3 ml-2 shrink-0">
                          <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-xs">
                            Estoque: {p.stock}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Custo: R$ {p.estimated_price.toLocaleString("pt-BR")}</span>
                          <span className="font-medium text-primary">Venda: R$ {applySellPrice(p.estimated_price, markup).toLocaleString("pt-BR")}</span>
                          <Plus className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {suggestions.length > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Sugestões para {selectedCustomer?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => addToCart(s)}
                          className="text-left text-xs bg-background hover:bg-primary/10 border rounded-md px-2 py-1.5 flex items-center gap-2 transition-colors disabled:opacity-50"
                          disabled={!!cart.find((i) => i.part_id === s.id)}
                        >
                          <Plus className="h-3 w-3 text-primary shrink-0" />
                          <div>
                            <p className="font-mono">{s.material} <span className="text-muted-foreground">— {s.description.slice(0, 40)}</span></p>
                            <p className="text-[10px] text-muted-foreground">{s.reason} · est. {s.stock} · R$ {applySellPrice(s.estimated_price, markup).toLocaleString("pt-BR")}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {cart.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-center">Est.</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead>Custo</TableHead>
                        <TableHead>Preço Venda</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item, idx) => (
                        <TableRow key={idx} className={item.quantity > item.stock ? "bg-destructive/5" : ""}>
                          <TableCell className="font-mono text-xs">{item.material}</TableCell>
                          <TableCell className="text-xs truncate max-w-[160px]">{item.description}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.stock > 0 ? "outline" : "destructive"}>{item.stock}</Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number" min={1} className="w-16 h-8 text-center"
                              value={item.quantity}
                              onChange={(e) => updateCartItem(idx, "quantity", Math.max(1, +e.target.value))}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            R$ {item.cost_price.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number" min={0} step={0.01} className="w-28 h-8"
                              value={item.sell_price}
                              onChange={(e) => updateCartItem(idx, "sell_price", +e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            R$ {(item.quantity * item.sell_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeFromCart(idx)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pricing summary */}
                  <div className="grid grid-cols-4 gap-3 bg-muted/30 rounded-lg p-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Custo Total</p>
                      <p className="font-mono text-sm">R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Venda Total</p>
                      <p className="font-mono text-sm font-bold text-primary">R$ {totalSell.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Lucro</p>
                      <p className={`font-mono text-sm font-bold ${totalProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                        R$ {totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Margem Real</p>
                      <p className={`font-mono text-sm font-bold ${profitMargin >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {profitMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Carrinho vazio — busque e adicione peças acima</p>
                </div>
              )}

              {hasStockIssues && (
                <p className="text-sm text-destructive">⚠️ Alguns itens excedem o estoque disponível</p>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <Button onClick={() => setStep(3)} disabled={cart.length === 0}>
                  Próximo — Resumo ({cart.length} itens)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">3. Resumo do Pedido</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Cliente</p>
                    <p className="font-medium">{selectedCustomer?.name}</p>
                    {selectedCustomer?.company && <p className="text-sm">{selectedCustomer.company}</p>}
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Total do Pedido (Venda)</p>
                    <p className="text-2xl font-bold text-primary">
                      R$ {totalSell.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">{cart.length} itens · Lucro: R$ {totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({profitMargin.toFixed(1)}%)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Condições</Label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>{PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o pedido..." />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead>Preço Venda</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{item.material}</TableCell>
                        <TableCell className="text-xs truncate max-w-[200px]">{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="font-mono">R$ {item.sell_price.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="font-mono font-medium">
                          R$ {(item.quantity * item.sell_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                  <Button
                    onClick={handleConfirmOrder}
                    disabled={confirming || hasStockIssues}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    {confirming ? "Confirmando..." : `Confirmar Pedido — R$ ${totalSell.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Markup Settings Dialog */}
      <Dialog open={markupOpen} onOpenChange={setMarkupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Configurar Margem de Lucro</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label>Margem Padrão (%)</Label>
              <Input
                type="number" min={0} max={500} step={1}
                value={tempMarkup}
                onChange={(e) => setTempMarkup(+e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ex: 30% → peça de custo R$ 100 será vendida por R$ 130
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkupOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMarkup}>Salvar e Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Cliente Rápido</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-3">
            <div><Label>Nome *</Label><Input value={newCustomer.name} onChange={(e) => setNewCustomer((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Empresa</Label><Input value={newCustomer.company || ""} onChange={(e) => setNewCustomer((f) => ({ ...f, company: e.target.value || null }))} /></div>
            <div><Label>CNPJ/CPF</Label><Input value={newCustomer.cnpj_cpf || ""} onChange={(e) => setNewCustomer((f) => ({ ...f, cnpj_cpf: e.target.value || null }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={newCustomer.phone || ""} onChange={(e) => setNewCustomer((f) => ({ ...f, phone: e.target.value || null }))} /></div>
              <div><Label>Email</Label><Input value={newCustomer.email || ""} onChange={(e) => setNewCustomer((f) => ({ ...f, email: e.target.value || null }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCustomer} disabled={createCustomer.isPending || !newCustomer.name.trim()}>
              {createCustomer.isPending ? "Salvando..." : "Criar e Selecionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
