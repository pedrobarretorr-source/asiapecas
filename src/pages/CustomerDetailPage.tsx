import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Sheet primitives are used inside Customer360Section
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Info as InfoIcon, Plus, Target, ShoppingCart,
  Wrench, Receipt, LifeBuoy, FileText, BadgeCheck,
} from "lucide-react";
import {
  useCustomerById, useCustomerEquipment, useCustomerInvoices, useProspectFromCustomer,
} from "@/hooks/use-customers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EnrichmentPanel } from "@/components/customers/EnrichmentPanel";
import { CustomerEquipmentTab } from "@/components/customers/CustomerEquipmentTab";
import { CustomerInvoicesTab } from "@/components/customers/CustomerInvoicesTab";
import { CustomerSalesTab } from "@/components/customers/CustomerSalesTab";
import { CustomerAfterSalesTab } from "@/components/customers/CustomerAfterSalesTab";
import { CustomerProspectionTab } from "@/components/customers/CustomerProspectionTab";
import { Customer360Section } from "@/components/customers/Customer360Section";
import { WhatsAppButton } from "@/components/customers/WhatsAppButton";
import { routes } from "@/lib/routes";

const SECTIONS = [
  { id: "contato", label: "Contato", icon: Phone },
  { id: "ia", label: "Informações", icon: InfoIcon },
  { id: "equipamentos", label: "Equipamentos", icon: Wrench },
  { id: "faturamento", label: "Faturamento", icon: Receipt },
  { id: "pedidos", label: "Pedidos", icon: ShoppingCart },
  { id: "posvenda", label: "Pós-venda", icon: LifeBuoy },
  { id: "prospeccao", label: "Prospecção", icon: Target },
  { id: "observacoes", label: "Observações", icon: FileText },
] as const;

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomerById(id);
  const { data: equipment = [] } = useCustomerEquipment(id);
  const { data: invoices = [] } = useCustomerInvoices(id);
  const prospectMut = useProspectFromCustomer();
  const [activeSection, setActiveSection] = useState<string>("contato");

  // Lightweight side queries for inline summaries (top 5 + counts)
  const { data: salesSummary } = useQuery({
    queryKey: ["customer-sales-summary", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, order_number, sale_date, status, total_amount")
        .eq("customer_id", id!)
        .order("sale_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });
  const { data: ticketsSummary } = useQuery({
    queryKey: ["customer-after-sales-summary", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("after_sales")
        .select("id, type, status, priority, description, created_at")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });
  const { data: prospectsSummary } = useQuery({
    queryKey: ["customer-prospects-summary", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("id, score, status, ai_summary, segment, created_at")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  // IntersectionObserver for active section highlight
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) {
        sectionRefs.current[s.id] = el;
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, [customer?.id]);

  const totalInv = useMemo(() => invoices.reduce((s, i) => s + i.total_value, 0), [invoices]);
  const isEmpty = customer ? (!customer.email && !customer.phone && !customer.cnpj_cpf && equipment.length === 0 && invoices.length === 0) : false;

  const scrollTo = (sid: string) => {
    const el = document.getElementById(sid);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) return <AppLayout><div className="p-6 text-muted-foreground">Carregando…</div></AppLayout>;
  if (!customer) return <AppLayout><div className="p-6">Cliente não encontrado.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(routes.customers)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>

        {/* Sticky header */}
        <div className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-background/95 backdrop-blur border-b">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-display text-2xl md:text-3xl font-bold truncate">{customer.name}</h1>
              {customer.company && (
                <p className="text-base text-muted-foreground flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4" />{customer.company}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="capitalize">{customer.segment || "geral"}</Badge>
                {customer.relationship_status && <Badge variant="secondary" className="capitalize">{customer.relationship_status}</Badge>}
                {customer.enrichment_status === "enriched" && (
                  <Badge className="gap-1">✓ Carregado</Badge>
                )}
                {isEmpty && <Badge variant="destructive">📭 Cadastro vazio</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <WhatsAppButton phone={customer.phone} name={customer.name} variant="outline" size="default" showLabel />
              {customer.email && (
                <Button variant="outline" size="default" onClick={() => window.open(`mailto:${customer.email}`)}>
                  <Mail className="h-4 w-4 mr-2" /> Email
                </Button>
              )}
              {customer.phone && (
                <Button variant="outline" size="default" onClick={() => window.open(`tel:${customer.phone}`)}>
                  <Phone className="h-4 w-4 mr-2" /> Ligar
                </Button>
              )}
              {isEmpty && (
                <Button variant="outline" onClick={() => prospectMut.mutate([customer.id])} disabled={prospectMut.isPending} className="gap-2">
                  <Target className="h-4 w-4" /> {prospectMut.isPending ? "Pesquisando…" : "Buscar prospects"}
                </Button>
              )}
              <Button onClick={() => navigate(routes.newOrderForCustomer(customer.id))} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Pedido
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Total faturado" value={`R$ ${totalInv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
          <Kpi label="Equipamentos" value={String(equipment.length)} />
          <Kpi label="Última visita" value={customer.last_visit_at ? new Date(customer.last_visit_at).toLocaleDateString("pt-BR") : "—"} />
          <Kpi label="Última proposta" value={customer.last_proposal_at ? new Date(customer.last_proposal_at).toLocaleDateString("pt-BR") : "—"} />
        </div>

        {/* 360 layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar nav */}
          <aside className="lg:sticky lg:top-40 lg:self-start">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0" aria-label="Seções do perfil 360°">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const active = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                      active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Sections column */}
          <div className="space-y-6 min-w-0">
            <Customer360Section id="contato" title="Contato & Localização" icon={<Phone className="h-5 w-5 text-primary" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info icon={<Phone className="h-4 w-4" />} label="Telefone" value={customer.phone} />
                <Info icon={<Mail className="h-4 w-4" />} label="Email" value={customer.email} />
                <Info icon={<Building2 className="h-4 w-4" />} label="CNPJ/CPF" value={customer.cnpj_cpf} mono />
                <Info icon={<MapPin className="h-4 w-4" />} label="Localização" value={[customer.city, customer.state].filter(Boolean).join(" / ") || null} />
                <Info icon={<MapPin className="h-4 w-4" />} label="Endereço" value={customer.address} />
                {customer.interest_models && customer.interest_models.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Modelos de interesse</p>
                    <div className="flex flex-wrap gap-2">
                      {customer.interest_models.map((m, i) => <Badge key={i} variant="secondary">{m}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            </Customer360Section>

            <Customer360Section id="ia" title="Informações complementares" icon={<InfoIcon className="h-5 w-5 text-primary" />}>
              <EnrichmentPanel customer={customer} />
            </Customer360Section>

            <Customer360Section
              id="equipamentos"
              title={`Equipamentos (${equipment.length})`}
              icon={<Wrench className="h-5 w-5 text-primary" />}
              fullView={<CustomerEquipmentTab customerId={customer.id} />}
              fullViewTitle="Todos os equipamentos"
            >
              {equipment.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum equipamento registrado.</p>
              ) : (
                <ul className="divide-y">
                  {equipment.slice(0, 5).map((e) => (
                    <li key={e.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{e.model || "—"} {e.serial_number ? <span className="font-mono text-xs text-muted-foreground">· {e.serial_number}</span> : null}</p>
                        <p className="text-xs text-muted-foreground">{e.purchase_year || "—"} · {e.delivery_location || "—"}</p>
                      </div>
                      <p className="text-sm font-medium whitespace-nowrap">{e.sale_value ? `R$ ${e.sale_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Customer360Section>

            <Customer360Section
              id="faturamento"
              title={`Faturamento SAP (${invoices.length})`}
              icon={<Receipt className="h-5 w-5 text-primary" />}
              fullView={<CustomerInvoicesTab customerId={customer.id} />}
              fullViewTitle="Todas as notas fiscais"
            >
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma nota fiscal registrada.</p>
              ) : (
                <ul className="divide-y">
                  {invoices.slice(0, 5).map((i) => (
                    <li key={i.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-mono">{i.document_number || "—"}</p>
                        <p className="text-xs text-muted-foreground">{i.invoice_date ? new Date(i.invoice_date).toLocaleDateString("pt-BR") : "—"} · {i.payer_name || "—"}</p>
                      </div>
                      <p className="text-sm font-medium whitespace-nowrap">R$ {i.total_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Customer360Section>

            <Customer360Section
              id="pedidos"
              title="Pedidos"
              icon={<ShoppingCart className="h-5 w-5 text-primary" />}
              fullView={<CustomerSalesTab customerId={customer.id} />}
              fullViewTitle="Todos os pedidos"
            >
              {!salesSummary || salesSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pedido registrado.</p>
              ) : (
                <ul className="divide-y">
                  {salesSummary.map((s) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-mono">#{s.order_number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.sale_date).toLocaleDateString("pt-BR")} · <span className="capitalize">{s.status}</span></p>
                      </div>
                      <p className="text-sm font-medium whitespace-nowrap">R$ {Number(s.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Customer360Section>

            <Customer360Section
              id="posvenda"
              title="Pós-venda"
              icon={<LifeBuoy className="h-5 w-5 text-primary" />}
              fullView={<CustomerAfterSalesTab customerId={customer.id} />}
              fullViewTitle="Todos os chamados"
            >
              {!ticketsSummary || ticketsSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum chamado pós-venda.</p>
              ) : (
                <ul className="divide-y">
                  {ticketsSummary.map((t) => (
                    <li key={t.id} className="py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm capitalize"><Badge variant={t.priority === "urgente" || t.priority === "alta" ? "destructive" : "secondary"} className="mr-2 capitalize">{t.priority}</Badge>{t.type}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-md">{t.description}</p>
                      </div>
                      <Badge variant="outline" className="capitalize whitespace-nowrap">{t.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Customer360Section>

            <Customer360Section
              id="prospeccao"
              title="Prospecção"
              icon={<Target className="h-5 w-5 text-primary" />}
              fullView={<CustomerProspectionTab customerId={customer.id} />}
              fullViewTitle="Toda a prospecção"
            >
              {!prospectsSummary || prospectsSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma informação de prospecção carregada.</p>
              ) : (
                <ul className="space-y-3">
                  {prospectsSummary.map((p) => (
                    <li key={p.id} className="border-l-2 border-primary/40 pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={p.score >= 70 ? "default" : "secondary"} className="gap-1"><BadgeCheck className="h-3 w-3" /> Score {p.score}</Badge>
                        <Badge variant="outline" className="capitalize">{p.status}</Badge>
                      </div>
                      {p.ai_summary && <p className="text-sm line-clamp-3">{p.ai_summary}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Customer360Section>

            <Customer360Section id="observacoes" title="Observações" icon={<FileText className="h-5 w-5 text-primary" />}>
              {customer.notes ? (
                <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Sem observações.</p>
              )}
            </Customer360Section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-base md:text-lg font-bold mt-1">{value}</p>
    </CardContent></Card>
  );
}

function Info({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-sm ${mono ? "font-mono" : ""} break-words`}>{value || "—"}</p>
      </div>
    </div>
  );
}
