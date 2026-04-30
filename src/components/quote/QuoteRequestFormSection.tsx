import { useState } from "react";
import { Building2, CheckCircle2, ClipboardList, Loader2, Mail, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUtm } from "@/lib/utm";
import { track, trackServerConversion } from "@/lib/analytics";
import { notifyLeadEmail } from "@/lib/lead-email";
import type { Lang } from "./translations";

const COPY = {
  pt: {
    eyebrow: "Cotação assistida",
    title: "Receba uma cotação com peça, prazo, frete e condição de pagamento.",
    desc: "Envie códigos, modelos, fotos, cidade de entrega ou lista de reposição. O time comercial valida o contexto e responde com uma proposta mais precisa.",
    contextTitle: "Compatibilidade antes do pedido",
    contextDesc: "Quanto mais dados sobre máquina e aplicação, menor o risco de cotar a peça errada.",
    termsTitle: "Condição para compra B2B",
    termsDesc: "Frota, obra, oficina e revenda podem informar volume, recorrência e urgência já no primeiro contato.",
    name: "Nome",
    company: "Empresa",
    email: "Email",
    phone: "Telefone / WhatsApp",
    request: "O que você precisa cotar?",
    requestPlaceholder:
      "Ex: filtros Fleetguard para XE215, bomba hidráulica, pneus para carregadeira, entrega em Manaus, urgência alta, quantidade e fotos...",
    submit: "Enviar solicitação",
    newRequest: "Nova solicitação",
    successTitle: "Solicitação enviada",
    successDesc: "Recebemos sua cotação. O time comercial deve retornar em breve.",
    validation: "Preencha nome, telefone ou email, e descreva a solicitação.",
    error: "Não foi possível enviar a solicitação.",
  },
  en: {
    eyebrow: "Assisted quote",
    title: "Get a quote with part, lead time, freight and payment terms.",
    desc: "Send codes, models, photos, delivery city or a replenishment list. The commercial team validates the context and replies with a more precise proposal.",
    contextTitle: "Compatibility before ordering",
    contextDesc: "The more details about machine and application, the lower the risk of quoting the wrong part.",
    termsTitle: "Terms for B2B purchasing",
    termsDesc: "Fleets, jobsites, workshops and resellers can share volume, recurrence and urgency in the first contact.",
    name: "Name",
    company: "Company",
    email: "Email",
    phone: "Phone / WhatsApp",
    request: "What do you need quoted?",
    requestPlaceholder:
      "Ex: Fleetguard filters for XE215, hydraulic pump, loader tires, delivery to Manaus, high urgency, quantity and photos...",
    submit: "Send request",
    newRequest: "New request",
    successTitle: "Request sent",
    successDesc: "We received your quote request. The commercial team should reply soon.",
    validation: "Fill in your name, phone or email, and describe the request.",
    error: "Could not send the request.",
  },
  es: {
    eyebrow: "Cotización asistida",
    title: "Reciba una cotización con pieza, plazo, flete y condición de pago.",
    desc: "Envíe códigos, modelos, fotos, ciudad de entrega o lista de reposición. El equipo comercial valida el contexto y responde con una propuesta más precisa.",
    contextTitle: "Compatibilidad antes del pedido",
    contextDesc: "Cuantos más datos sobre máquina y aplicación, menor es el riesgo de cotizar la pieza incorrecta.",
    termsTitle: "Condición para compra B2B",
    termsDesc: "Flota, obra, taller y reventa pueden informar volumen, recurrencia y urgencia en el primer contacto.",
    name: "Nombre",
    company: "Empresa",
    email: "Email",
    phone: "Teléfono / WhatsApp",
    request: "¿Qué necesita cotizar?",
    requestPlaceholder:
      "Ej: filtros Fleetguard para XE215, bomba hidráulica, neumáticos para cargadora, entrega en Manaus, urgencia alta, cantidad y fotos...",
    submit: "Enviar solicitud",
    newRequest: "Nueva solicitud",
    successTitle: "Solicitud enviada",
    successDesc: "Recibimos su cotización. El equipo comercial debe responder pronto.",
    validation: "Complete nombre, teléfono o email, y describa la solicitud.",
    error: "No fue posible enviar la solicitud.",
  },
} as const;

export default function QuoteRequestFormSection({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    request: "",
  });

  const submit = async () => {
    if (!form.name.trim() || (!form.email.trim() && !form.phone.trim()) || !form.request.trim()) {
      toast.error(t.validation);
      return;
    }

    setSubmitting(true);
    const utm = getUtm();
    const notes = `Origem: landing_page\n\nSolicitação:\n${form.request.trim()}`;

    const { error } = await supabase.from("quote_requests").insert({
      customer_name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      cnpj_cpf: null,
      items: [],
      notes,
      utm,
    });

    setSubmitting(false);

    if (error) {
      toast.error(t.error);
      return;
    }

    track.generateLead("quote", { items: 0, source: "landing_form" });
    trackServerConversion({ event: "quote_lead", email: form.email.trim() || undefined, phone: form.phone.trim() || undefined });
    void notifyLeadEmail({
      type: "quote_request",
      title: "Nova cotação pelo formulário da home",
      fields: {
        Nome: form.name.trim(),
        Empresa: form.company.trim() || null,
        Email: form.email.trim() || null,
        Telefone: form.phone.trim() || null,
        Origem: "Formulário da home",
      },
      notes: form.request.trim(),
      utm,
    });
    setSubmitted(true);
    setForm({ name: "", company: "", email: "", phone: "", request: "" });
  };

  return (
    <section className="border-y bg-card public-section">
      <div className="public-shell-wide grid items-start gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <div className="max-w-xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t.eyebrow}</p>
          <h2 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-foreground md:text-4xl">{t.title}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{t.desc}</p>

          <div className="grid gap-3">
            <div className="flex items-start gap-3 rounded-lg border bg-background p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_8px_22px_-12px_rgba(245,180,0,0.5)]">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t.contextTitle}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.contextDesc}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-background p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_8px_22px_-12px_rgba(245,180,0,0.5)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t.termsTitle}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.termsDesc}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-5 shadow-sm md:p-8">
          {submitted ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center space-y-4 text-center">
              <CheckCircle2 className="h-14 w-14 text-primary" />
              <h3 className="font-['Space_Grotesk'] text-2xl font-bold text-foreground">{t.successTitle}</h3>
              <p className="max-w-md text-muted-foreground">{t.successDesc}</p>
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                {t.newRequest}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t.name} *</Label>
                  <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <Label>{t.company}</Label>
                  <Input value={form.company} onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t.email}
                  </Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {t.phone}
                  </Label>
                  <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>{t.request} *</Label>
                <Textarea
                  rows={8}
                  placeholder={t.requestPlaceholder}
                  value={form.request}
                  onChange={(e) => setForm((prev) => ({ ...prev, request: e.target.value }))}
                />
              </div>

              <Button onClick={submit} disabled={submitting} className="h-11 w-full gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t.submit}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
