import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProposalSettings } from "@/hooks/use-proposal-settings";
import { usePricingSettings, applySellPrice } from "@/hooks/use-pricing";
import type { Sale } from "@/hooks/use-sales";
import { generateProposalPDF, loadLogoAsBase64 } from "@/lib/generate-proposal-pdf";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";

type Props = {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function ProposalCustomizeDialog({ sale, open, onOpenChange }: Props) {
  const { data: settings } = useProposalSettings();
  const { data: pricing } = usePricingSettings();
  const markup = pricing?.default_markup ?? 30;

  const [validity, setValidity] = useState("15 dias");
  const [delivery, setDelivery] = useState("");
  const [warranty, setWarranty] = useState("");
  const [observations, setObservations] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (settings) {
      setValidity(`${settings.default_validity_days} dias`);
      setDelivery(settings.default_delivery_terms);
      setWarranty(settings.default_warranty_text);
      setObservations(settings.default_observations);
    }
  }, [settings]);

  if (!sale) return null;

  const items = sale.sale_items || [];
  const totalSell = items.reduce((s, item) => {
    const sp = (item as any).sell_price > 0 ? (item as any).sell_price : applySellPrice(item.unit_price, markup);
    return s + sp * item.quantity;
  }, 0);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const logo = await loadLogoAsBase64();
      const companyData = settings ? {
        name: settings.company_name,
        cnpj: settings.cnpj,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
      } : undefined;

      await generateProposalPDF(sale, logo, {
        company: companyData,
        markup,
        validity,
        deliveryTerms: delivery,
        warrantyText: warranty,
        observations,
      });
      toast.success("Proposta gerada com sucesso!");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao gerar proposta: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar Proposta Comercial</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Items preview */}
          <div>
            <Label className="text-sm font-medium">Itens da Proposta</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const sp = (item as any).sell_price > 0 ? (item as any).sell_price : applySellPrice(item.unit_price, markup);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.parts?.material || "—"}</TableCell>
                      <TableCell className="text-xs">{item.parts?.description || "—"}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{fmt(item.unit_price)}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{fmt(sp)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{fmt(sp * item.quantity)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="text-right mt-2">
              <span className="text-lg font-bold text-primary">{fmt(totalSell)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Validade da Proposta</Label>
              <Input value={validity} onChange={e => setValidity(e.target.value)} />
            </div>
            <div>
              <Label>Prazo de Entrega</Label>
              <Input value={delivery} onChange={e => setDelivery(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Condições de Garantia</Label>
            <Textarea value={warranty} onChange={e => setWarranty(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
