import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Plus, Minus, Trash2, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type Lang, tr } from "./translations";
import { getUtm } from "@/lib/utm";
import { track, trackServerConversion } from "@/lib/analytics";
import { notifyLeadEmail } from "@/lib/lead-email";

type CartItem = { material: string; description: string; quantity: number };

interface QuoteCartProps {
  items: CartItem[];
  onUpdateQty: (material: string, qty: number) => void;
  onRemove: (material: string) => void;
  onClear: () => void;
  lang: Lang;
}

export default function QuoteCart({ items, onUpdateQty, onRemove, onClear, lang }: QuoteCartProps) {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", cnpj: "", email: "", phone: "", notes: "" });

  const handleSubmit = async () => {
    if (!form.name || !form.email || items.length === 0) {
      toast.error(tr("cart.error", lang));
      return;
    }
    setSubmitting(true);
    const utm = getUtm();
    track.beginCheckout(items as any);
    const { error } = await supabase.from("quote_requests").insert({
      customer_name: form.name,
      company: form.company || null,
      cnpj_cpf: form.cnpj || null,
      email: form.email,
      phone: form.phone || null,
      items: items.map(({ material, quantity }) => ({ material, quantity })),
      notes: form.notes || null,
      utm,
    });
    setSubmitting(false);
    if (error) { toast.error(tr("cart.errorSend", lang)); return; }
    track.generateLead("quote", { items: items.length });
    trackServerConversion({ event: "quote_lead", email: form.email, phone: form.phone, utm } as any);
    void notifyLeadEmail({
      type: "quote_cart",
      title: "Nova cotação pelo carrinho do catálogo",
      fields: {
        Nome: form.name,
        Empresa: form.company || null,
        "CNPJ/CPF": form.cnpj || null,
        Email: form.email,
        Telefone: form.phone || null,
        Origem: "Carrinho do catálogo",
      },
      items: items.map(({ material, description, quantity }) => ({ material, description, quantity })),
      notes: form.notes || null,
      utm,
    });
    setSubmitted(true);
  };

  const resetAll = () => {
    setSubmitted(false);
    setShowForm(false);
    setForm({ name: "", company: "", cnpj: "", email: "", phone: "", notes: "" });
    onClear();
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground h-14 w-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
          <ShoppingCart className="h-6 w-6" />
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center">
              {items.length}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {tr("cart.title", lang)} ({items.length} {tr("cart.items", lang)})
          </SheetTitle>
        </SheetHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-primary" />
            <h3 className="text-xl font-bold text-foreground">{tr("cart.sent", lang)}</h3>
            <p className="text-sm text-muted-foreground">{tr("cart.sentDesc", lang)}</p>
            <Button onClick={resetAll}>{tr("cart.new", lang)}</Button>
          </div>
        ) : showForm ? (
          <div className="space-y-3 mt-4">
            <div><Label>{tr("cart.name", lang)} *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{tr("cart.company", lang)}</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div><Label>CNPJ/CPF</Label><Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} /></div>
            <div><Label>{tr("cart.email", lang)} *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>{tr("cart.phone", lang)}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>{tr("cart.notes", lang)}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
              <Send className="h-4 w-4" /> {submitting ? tr("cart.sending", lang) : tr("cart.send", lang)}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowForm(false)}>{tr("cart.back", lang)}</Button>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">{tr("cart.empty", lang)}</p>
            ) : (
              <>
                {items.map(item => (
                  <div key={item.material} className="flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-muted-foreground">{item.material}</p>
                      <p className="text-sm text-foreground truncate">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQty(item.material, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-7 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQty(item.material, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(item.material)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button onClick={() => setShowForm(true)} className="w-full gap-2 mt-4">
                  <Send className="h-4 w-4" /> {tr("cart.submit", lang)}
                </Button>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
