import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Truck, Wrench, MessageCircle, Building2 } from "lucide-react";

interface ModelHeroProps {
  modelName: string;
  countBadge?: string;
  whatsAppUrl: string;
  onB2bClick: () => void;
  onScrollToList: () => void;
}

export default function ModelHero({ modelName, countBadge, whatsAppUrl, onB2bClick, onScrollToList }: ModelHeroProps) {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-br from-secondary via-secondary to-primary/10">
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <div className="hidden md:flex h-24 w-24 rounded-2xl bg-primary/15 items-center justify-center shrink-0">
            <Wrench className="h-12 w-12 text-primary" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {countBadge && <Badge className="bg-primary text-primary-foreground">{countBadge}</Badge>}
              <Badge variant="outline" className="border-primary/40">XCMG</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-['Space_Grotesk'] text-secondary-foreground leading-tight">
              Peças para {modelName} · Ásia Peças & Máquinas
            </h1>
            <p className="text-base text-secondary-foreground/80 max-w-2xl">
              Catálogo completo de peças compatíveis com {modelName} em estoque real no Brasil. Filtros, motor, hidráulico, transmissão e muito mais — pronta entrega e suporte técnico.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-secondary-foreground/80">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Garantia 3 meses</span>
              <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-primary" /> Entrega para todo o BR</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="lg" onClick={onScrollToList} className="gap-2">Ver peças disponíveis</Button>
              <Button size="lg" variant="outline" onClick={onB2bClick} className="gap-2">
                <Building2 className="h-4 w-4" /> Tabela para frota
              </Button>
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" data-cta="whatsapp">
                <Button size="lg" variant="outline" className="gap-2 border-[hsl(142,71%,45%)] text-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,45%)]/10">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
