import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProposalSettings, useUpdateProposalSettings } from "@/hooks/use-proposal-settings";
import { usePricingSettings, useUpdatePricingSettings } from "@/hooks/use-pricing";
import { Save, Building2, Percent, FileText } from "lucide-react";

export default function ProposalConfigTab() {
  const { data: settings, isLoading } = useProposalSettings();
  const updateSettings = useUpdateProposalSettings();
  const { data: pricing } = usePricingSettings();
  const updatePricing = useUpdatePricingSettings();

  const [company, setCompany] = useState({ company_name: "", cnpj: "", address: "", phone: "", email: "" });
  const [proposal, setProposal] = useState({ default_validity_days: 15, default_delivery_terms: "", default_warranty_text: "", default_observations: "" });
  const [markup, setMarkup] = useState(30);

  useEffect(() => {
    if (settings) {
      setCompany({ company_name: settings.company_name, cnpj: settings.cnpj, address: settings.address, phone: settings.phone, email: settings.email });
      setProposal({ default_validity_days: settings.default_validity_days, default_delivery_terms: settings.default_delivery_terms, default_warranty_text: settings.default_warranty_text, default_observations: settings.default_observations });
    }
  }, [settings]);

  useEffect(() => {
    if (pricing) setMarkup(pricing.default_markup);
  }, [pricing]);

  if (isLoading) return <p className="text-muted-foreground p-4">Carregando configurações...</p>;

  return (
    <div className="space-y-6">
      {/* Company Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5" /> Dados da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Nome da Empresa</Label><Input value={company.company_name} onChange={e => setCompany(p => ({ ...p, company_name: e.target.value }))} /></div>
          <div><Label>CNPJ</Label><Input value={company.cnpj} onChange={e => setCompany(p => ({ ...p, cnpj: e.target.value }))} /></div>
          <div><Label>Endereço</Label><Input value={company.address} onChange={e => setCompany(p => ({ ...p, address: e.target.value }))} /></div>
          <div><Label>Telefone</Label><Input value={company.phone} onChange={e => setCompany(p => ({ ...p, phone: e.target.value }))} /></div>
          <div><Label>Email</Label><Input value={company.email} onChange={e => setCompany(p => ({ ...p, email: e.target.value }))} /></div>
          <div className="flex items-end">
            <Button onClick={() => updateSettings.mutate(company)} disabled={updateSettings.isPending} className="gap-2">
              <Save className="h-4 w-4" /> Salvar Dados da Empresa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Percent className="h-5 w-5" /> Precificação Global</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
          <div className="w-40">
            <Label>Margem de Lucro (%)</Label>
            <Input type="number" min={0} value={markup} onChange={e => setMarkup(Number(e.target.value))} />
          </div>
          <Button onClick={() => updatePricing.mutate({ default_markup: markup })} disabled={updatePricing.isPending} className="gap-2">
            <Save className="h-4 w-4" /> Salvar Margem
          </Button>
          <p className="text-sm text-muted-foreground">Ex: custo R$100 → venda R${(100 * (1 + markup / 100)).toFixed(2)}</p>
        </CardContent>
      </Card>

      {/* Proposal Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5" /> Padrões da Proposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Validade (dias)</Label>
              <Input type="number" min={1} value={proposal.default_validity_days} onChange={e => setProposal(p => ({ ...p, default_validity_days: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Prazo de Entrega</Label>
              <Input value={proposal.default_delivery_terms} onChange={e => setProposal(p => ({ ...p, default_delivery_terms: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Texto de Garantia</Label>
            <Textarea value={proposal.default_warranty_text} onChange={e => setProposal(p => ({ ...p, default_warranty_text: e.target.value }))} rows={3} />
          </div>
          <div>
            <Label>Observações Padrão</Label>
            <Textarea value={proposal.default_observations} onChange={e => setProposal(p => ({ ...p, default_observations: e.target.value }))} rows={4} />
          </div>
          <Button onClick={() => updateSettings.mutate(proposal)} disabled={updateSettings.isPending} className="gap-2">
            <Save className="h-4 w-4" /> Salvar Padrões da Proposta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
