import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllCustomers } from "@/hooks/use-customers";
import { applySellPrice, usePricingSettings } from "@/hooks/use-pricing";
import { useProposalSettings } from "@/hooks/use-proposal-settings";
import { supabase } from "@/integrations/supabase/client";
import { loadLogoAsBase64 } from "@/lib/generate-proposal-pdf";
import {
  downloadProposalHTML,
  generateProposalHTML,
  getProposalHtmlFilename,
  openProposalHTML,
  type ProposalHtmlCustomer,
  type ProposalHtmlItem,
} from "@/lib/generate-proposal-html";
import { formatWhatsAppLink } from "@/lib/whatsapp";
import { Copy, Download, ExternalLink, FileCode2, MessageCircle, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

type SearchPart = {
  id: string;
  material: string;
  description: string;
  estimated_price: number;
  stock: number;
  machine_model: string | null;
};

type BuilderItem = ProposalHtmlItem & {
  id: string;
  partId: string;
  stock: number;
  costPrice: number;
  machineModel: string | null;
};

const emptyCustomer: ProposalHtmlCustomer = {
  name: "",
  company: "",
  document: "",
  address: "",
  phone: "",
  email: "",
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createProposalNumber() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("");
  return `PROP-${stamp}`;
}

function createItemId() {
  return globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function customerAddress(customer: { address?: string | null; city?: string | null; state?: string | null }) {
  return [customer.address, [customer.city, customer.state].filter(Boolean).join(" - ")]
    .filter(Boolean)
    .join(", ");
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name.trim();
}

function buildQuoteMessage(params: {
  customer: ProposalHtmlCustomer;
  items: BuilderItem[];
  proposalNumber: string;
  validity: string;
  deliveryTerms: string;
  total: number;
}) {
  const lines = [
    `Ola ${firstName(params.customer.name) || "cliente"}, segue a cotacao ${params.proposalNumber}.`,
    "",
    "Itens:",
    ...params.items.slice(0, 8).map((item) =>
      `- ${item.quantity}x ${item.material} - ${item.description}: ${formatMoney(item.quantity * item.unitPrice)}`,
    ),
  ];

  if (params.items.length > 8) {
    lines.push(`- Mais ${params.items.length - 8} item(ns) no HTML da cotacao`);
  }

  lines.push("", `Total: ${formatMoney(params.total)}`, `Validade: ${params.validity || "A combinar"}`);
  if (params.deliveryTerms.trim()) lines.push(`Entrega: ${params.deliveryTerms}`);
  lines.push("", "A cotacao em HTML esta pronta para envio/anexo.");

  return lines.join("\n");
}

export default function ProposalHtmlGeneratorTab() {
  const { data: customers = [] } = useAllCustomers();
  const { data: settings } = useProposalSettings();
  const { data: pricing } = usePricingSettings();
  const markup = pricing?.default_markup ?? 30;

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customer, setCustomer] = useState<ProposalHtmlCustomer>(emptyCustomer);
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [partSearch, setPartSearch] = useState("");
  const [partResults, setPartResults] = useState<SearchPart[]>([]);
  const [searching, setSearching] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | undefined>();

  const [proposalNumber, setProposalNumber] = useState(createProposalNumber);
  const [proposalDate, setProposalDate] = useState(todayInputValue);
  const [validity, setValidity] = useState("15 dias");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [warrantyText, setWarrantyText] = useState("");
  const [observations, setObservations] = useState("");

  useEffect(() => {
    loadLogoAsBase64().then(setLogoBase64);
  }, []);

  useEffect(() => {
    if (!settings) return;
    setValidity(`${settings.default_validity_days} dias`);
    setDeliveryTerms(settings.default_delivery_terms);
    setWarrantyText(settings.default_warranty_text);
    setObservations(settings.default_observations);
  }, [settings]);

  const company = useMemo(() => settings ? {
    name: settings.company_name,
    cnpj: settings.cnpj,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
  } : undefined, [settings]);

  const readyToGenerate = customer.name.trim().length > 0 && items.length > 0;

  const proposalHtml = useMemo(() => {
    if (!readyToGenerate) return "";
    return generateProposalHTML({
      company,
      customer,
      items,
      proposalNumber,
      proposalDate,
      validity,
      deliveryTerms,
      paymentTerms,
      warrantyText,
      observations,
      logoBase64,
    });
  }, [
    readyToGenerate,
    company,
    customer,
    items,
    proposalNumber,
    proposalDate,
    validity,
    deliveryTerms,
    paymentTerms,
    warrantyText,
    observations,
    logoBase64,
  ]);

  const filename = useMemo(() => getProposalHtmlFilename({
    proposalNumber,
    customer,
  }), [proposalNumber, customer]);

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const quoteMessage = useMemo(() => buildQuoteMessage({
    customer,
    items,
    proposalNumber,
    validity,
    deliveryTerms,
    total,
  }), [customer, items, proposalNumber, validity, deliveryTerms, total]);

  const whatsappUrl = useMemo(
    () => formatWhatsAppLink(customer.phone, quoteMessage),
    [customer.phone, quoteMessage],
  );

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const selected = customers.find((c) => c.id === customerId);
    if (!selected) return;
    setCustomer({
      name: selected.name || "",
      company: selected.company || "",
      document: selected.cnpj_cpf || "",
      phone: selected.phone || "",
      email: selected.email || "",
      address: customerAddress(selected),
    });
  };

  const searchParts = async (value: string) => {
    setPartSearch(value);
    const query = value.trim();
    if (query.length < 2) {
      setPartResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("parts")
        .select("id,material,description,estimated_price,stock,machine_model")
        .or(`material.ilike.%${query}%,description.ilike.%${query}%,machine_model.ilike.%${query}%`)
        .order("stock", { ascending: false })
        .limit(15);

      if (error) throw error;
      setPartResults((data || []) as SearchPart[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      toast.error(`Erro ao buscar pecas: ${message}`);
    } finally {
      setSearching(false);
    }
  };

  const addPart = (part: SearchPart) => {
    setItems((current) => {
      const found = current.find((item) => item.partId === part.id);
      if (found) {
        return current.map((item) => item.partId === part.id
          ? { ...item, quantity: item.quantity + 1 }
          : item);
      }

      return [...current, {
        id: createItemId(),
        partId: part.id,
        material: part.material,
        description: part.description,
        quantity: 1,
        unitPrice: applySellPrice(Number(part.estimated_price || 0), markup),
        costPrice: Number(part.estimated_price || 0),
        stock: part.stock,
        machineModel: part.machine_model,
      }];
    });
    setPartSearch("");
    setPartResults([]);
  };

  const updateItem = <K extends keyof ProposalHtmlItem>(id: string, field: K, value: ProposalHtmlItem[K]) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleCopy = async () => {
    if (!proposalHtml) return;
    try {
      await navigator.clipboard.writeText(proposalHtml);
      toast.success("Codigo HTML copiado");
    } catch {
      toast.error("Nao foi possivel copiar o HTML");
    }
  };

  const handleCopyMessage = async () => {
    if (!readyToGenerate) return;
    try {
      await navigator.clipboard.writeText(quoteMessage);
      toast.success("Mensagem da cotacao copiada");
    } catch {
      toast.error("Nao foi possivel copiar a mensagem");
    }
  };

  const handleOpen = () => {
    if (!proposalHtml) return;
    if (!openProposalHTML(proposalHtml)) {
      toast.error("O navegador bloqueou a abertura da proposta");
    }
  };

  const handleDownload = () => {
    if (!proposalHtml) return;
    downloadProposalHTML(proposalHtml, filename);
  };

  const handleWhatsApp = () => {
    if (!readyToGenerate) return;
    if (!whatsappUrl) {
      toast.error("Informe um telefone valido para enviar pelo WhatsApp");
      return;
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCode2 className="h-5 w-5" />
              Gerador de cotacao HTML
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Numero da cotacao</Label>
                <Input value={proposalNumber} onChange={(event) => setProposalNumber(event.target.value)} />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={proposalDate} onChange={(event) => setProposalDate(event.target.value)} />
              </div>
              <div>
                <Label>Validade</Label>
                <Input value={validity} onChange={(event) => setValidity(event.target.value)} />
              </div>
            </div>

            <div>
              <Label>Cliente cadastrado</Label>
              <Select value={selectedCustomerId || undefined} onValueChange={handleCustomerSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}{item.company ? ` (${item.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome do cliente</Label>
                <Input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input value={customer.company || ""} onChange={(event) => setCustomer((current) => ({ ...current, company: event.target.value }))} />
              </div>
              <div>
                <Label>CNPJ/CPF</Label>
                <Input value={customer.document || ""} onChange={(event) => setCustomer((current) => ({ ...current, document: event.target.value }))} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={customer.phone || ""} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={customer.email || ""} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} />
              </div>
              <div>
                <Label>Endereco</Label>
                <Input value={customer.address || ""} onChange={(event) => setCustomer((current) => ({ ...current, address: event.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Produtos do catalogo</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Selecione os produtos cadastrados no banco de dados para montar a cotacao.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={partSearch}
                onChange={(event) => searchParts(event.target.value)}
                placeholder="Buscar no banco por codigo, descricao ou modelo..."
                className="pl-10"
              />
              {(partResults.length > 0 || searching) && (
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                  {searching && <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>}
                  {!searching && partResults.map((part) => (
                    <button
                      type="button"
                      key={part.id}
                      onClick={() => addPart(part)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-xs">{part.material}</span>
                        <span className="block truncate text-muted-foreground">{part.description}</span>
                        {part.machine_model && <span className="block truncate text-[11px] text-muted-foreground">Modelo: {part.machine_model}</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant={part.stock > 0 ? "secondary" : "destructive"}>Est. {part.stock}</Badge>
                        <span className="text-xs font-medium text-primary">{formatMoney(applySellPrice(Number(part.estimated_price || 0), markup))}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Codigo</TableHead>
                      <TableHead className="min-w-[260px]">Produto do banco</TableHead>
                      <TableHead className="w-24 text-center">Qtd</TableHead>
                      <TableHead className="w-36">Valor unit.</TableHead>
                      <TableHead className="w-32 text-right">Subtotal</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.material}
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-medium leading-snug">{item.description}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Estoque: {item.stock}{item.machineModel ? ` | Modelo: ${item.machineModel}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) => updateItem(item.id, "quantity", Math.max(1, Number(event.target.value) || 1))}
                            className="h-8 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice}
                            onChange={(event) => updateItem(item.id, "unitPrice", Math.max(0, Number(event.target.value) || 0))}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatMoney(item.quantity * item.unitPrice)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                Busque no catalogo e selecione os produtos para montar a cotacao.
              </div>
            )}

            <div className="flex justify-end rounded-md bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Total:&nbsp;</span>
              <strong className="font-mono text-primary">{formatMoney(total)}</strong>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Condicoes da cotacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Pagamento</Label>
                <Input value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} placeholder="Ex: PIX, boleto 30 dias..." />
              </div>
              <div>
                <Label>Entrega</Label>
                <Input value={deliveryTerms} onChange={(event) => setDeliveryTerms(event.target.value)} />
              </div>
            </div>
            <div>
              <Label>Garantia</Label>
              <Textarea value={warrantyText} onChange={(event) => setWarrantyText(event.target.value)} rows={2} />
            </div>
            <div>
              <Label>Observacoes</Label>
              <Textarea value={observations} onChange={(event) => setObservations(event.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="xl:sticky xl:top-4 xl:self-start">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Cotacao HTML gerada</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyMessage} disabled={!proposalHtml} className="gap-2">
                <Copy className="h-4 w-4" />
                Mensagem
              </Button>
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={!proposalHtml} className="gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={!proposalHtml} className="gap-2">
                <Copy className="h-4 w-4" />
                HTML
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpen} disabled={!proposalHtml} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Abrir
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={!proposalHtml} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar HTML
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[720px] overflow-hidden rounded-md border bg-muted">
            {proposalHtml ? (
              <iframe
                title="Previa da proposta HTML"
                sandbox=""
                srcDoc={proposalHtml}
                className="h-full w-full bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Informe o cliente e selecione ao menos um produto do banco para visualizar a cotacao.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
