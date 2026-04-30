import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUtm } from "@/lib/utm";
import { track, trackServerConversion } from "@/lib/analytics";
import { notifyLeadEmail } from "@/lib/lead-email";
import { type Lang } from "./translations";

const COPY = {
  pt: { title: "Atendimento corporativo", desc: "Frota, revenda ou alto volume? Receba uma tabela e proposta personalizada.", name: "Seu nome", company: "Empresa", cnpj: "CNPJ", segment: "Segmento (mineração, construção...)", volume: "Volume estimado / mês", phone: "Telefone / WhatsApp", email: "E-mail", message: "Conte sobre sua necessidade", submit: "Solicitar contato", success: "Recebemos! Em breve nosso time entra em contato." },
  en: { title: "Corporate support", desc: "Fleet, reseller or high volume? Get a custom price list and proposal.", name: "Your name", company: "Company", cnpj: "Tax ID", segment: "Segment (mining, construction...)", volume: "Estimated monthly volume", phone: "Phone / WhatsApp", email: "Email", message: "Tell us about your needs", submit: "Request contact", success: "Got it! Our team will reach out shortly." },
  es: { title: "Atención corporativa", desc: "¿Flota, reventa o alto volumen? Reciba tabla y propuesta personalizada.", name: "Su nombre", company: "Empresa", cnpj: "CNPJ / NIT", segment: "Segmento (minería, construcción...)", volume: "Volumen mensual estimado", phone: "Teléfono / WhatsApp", email: "Correo", message: "Cuéntenos su necesidad", submit: "Solicitar contacto", success: "¡Recibido! Nuestro equipo contactará pronto." },
};

interface B2BLeadDialogProps {
  lang?: Lang;
  /** Custom trigger element. If omitted, no trigger is rendered (use `open`/`onOpenChange`). */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export default function B2BLeadDialog({ lang = "pt", trigger, open: openProp, onOpenChange }: B2BLeadDialogProps) {
  const [openLocal, setOpenLocal] = useState(false);
  const open = openProp !== undefined ? openProp : openLocal;
  const setOpen = onOpenChange ?? setOpenLocal;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", cnpj: "", segment: "", estimated_volume: "", phone: "", email: "", message: "" });
  const t = COPY[lang];

  const submit = async () => {
    if (!form.name || (!form.phone && !form.email)) {
      toast.error(lang === "en" ? "Name and phone or email required" : "Nome e telefone ou e-mail são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const utm = getUtm();
      const { error } = await supabase.from("b2b_leads").insert({ ...form, utm });
      if (error) throw error;
      track.generateLead("b2b", { company: form.company });
      trackServerConversion({ event: "b2b_lead", email: form.email, phone: form.phone });
      void notifyLeadEmail({
        type: "b2b_lead",
        title: "Novo lead B2B pelo site",
        fields: {
          Nome: form.name,
          Empresa: form.company || null,
          CNPJ: form.cnpj || null,
          Segmento: form.segment || null,
          "Volume estimado": form.estimated_volume || null,
          Telefone: form.phone || null,
          Email: form.email || null,
          Origem: "Formulário B2B",
        },
        notes: form.message || null,
        utm,
      });
      toast.success(t.success);
      setForm({ name: "", company: "", cnpj: "", segment: "", estimated_volume: "", phone: "", email: "", message: "" });
      setOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label className="text-xs">{t.name} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">{t.company}</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div><Label className="text-xs">{t.cnpj}</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
          </div>
          <div><Label className="text-xs">{t.segment}</Label><Input value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} /></div>
          <div><Label className="text-xs">{t.volume}</Label><Input value={form.estimated_volume} onChange={(e) => setForm({ ...form, estimated_volume: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">{t.phone} *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label className="text-xs">{t.email}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><Label className="text-xs">{t.message}</Label><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
