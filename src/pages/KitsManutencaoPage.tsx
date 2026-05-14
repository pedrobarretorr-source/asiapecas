import { useState } from "react";
import { Link } from "react-router-dom";
import B2BLeadDialog from "@/components/quote/B2BLeadDialog";
import PublicHeader from "@/components/quote/PublicHeader";
import QuoteFooter from "@/components/quote/QuoteFooter";
import { type Lang } from "@/components/quote/translations";
import { SEO, organizationLd, breadcrumbLd } from "@/lib/seo";
import { MACHINE_CATEGORIES } from "@/components/quote/machine-categories";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PUBLIC_WHATSAPP_URL } from "@/lib/whatsapp";
import { ChevronRight, MessageCircle, Wrench, Clock, Shield, PackageCheck } from "lucide-react";

const KIT_HIGHLIGHTS = [
  {
    icon: PackageCheck,
    title: "Itens compatíveis em um só pedido",
    desc: "Filtros, vedações, fluidos, correias e consumíveis selecionados pela engenharia para cada modelo XCMG.",
  },
  {
    icon: Clock,
    title: "Pronto para as revisões programadas",
    desc: "Kits dimensionados para 250h, 500h, 1000h e 2000h, agilizando a manutenção preventiva.",
  },
  {
    icon: Shield,
    title: "Peças originais e homologadas",
    desc: "Procedência rastreada, garantia de fábrica e suporte técnico da Ásia Peças & Máquinas.",
  },
];

export default function KitsManutencaoPage() {
  const [lang, setLang] = useState<Lang>("pt");
  const [b2bOpen, setB2bOpen] = useState(false);

  const lds = [
    organizationLd(),
    breadcrumbLd([
      { name: "Início", url: "/" },
      { name: "Cotação", url: "/cotacao" },
      { name: "Kits de Manutenção", url: "/cotacao/kits-de-manutencao" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Kits de Manutenção XCMG · Ásia Peças & Máquinas"
        description="Kits de manutenção preventiva para máquinas XCMG. Filtros, vedações, fluidos e consumíveis agrupados por intervalo de revisão (250h, 500h, 1000h, 2000h)."
        canonical="/cotacao/kits-de-manutencao"
        jsonLd={lds}
      />

      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader lang={lang} onLangChange={setLang} onOpenB2B={() => setB2bOpen(true)} whatsappUrl={PUBLIC_WHATSAPP_URL} />

        <div className="border-b bg-gradient-to-br from-secondary to-secondary/80">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <Badge className="bg-primary/15 text-primary border-primary/30 mb-3">Manutenção Preventiva</Badge>
            <h1 className="text-3xl md:text-4xl font-bold font-['Space_Grotesk'] text-secondary-foreground">
              Kits de Manutenção XCMG
            </h1>
            <p className="text-secondary-foreground/80 mt-3 text-sm md:text-base max-w-2xl">
              Conjuntos completos de peças para revisões programadas. Receba uma cotação personalizada conforme o modelo da sua máquina e o intervalo de manutenção.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Button asChild size="lg" className="gap-2">
                <a href={PUBLIC_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Solicitar cotação via WhatsApp
                </a>
              </Button>
              <Button variant="outline" size="lg" onClick={() => setB2bOpen(true)} className="gap-2">
                <Wrench className="h-4 w-4" />
                Falar com um especialista
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1 space-y-12">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <ol className="flex gap-1">
              <li><Link to="/" className="hover:text-primary">Início</Link></li>
              <li>/</li>
              <li><Link to="/cotacao" className="hover:text-primary">Cotação</Link></li>
              <li>/</li>
              <li className="text-foreground">Kits de Manutenção</li>
            </ol>
          </nav>

          {/* Highlights */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {KIT_HIGHLIGHTS.map((h) => (
              <Card key={h.title} className="border">
                <CardContent className="p-5 space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <h.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{h.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{h.desc}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Models grid */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-foreground">Selecione o modelo da sua máquina</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Solicite o kit de manutenção compatível para o modelo abaixo. Atendemos toda a linha XCMG no Brasil.
              </p>
            </div>

            <div className="space-y-6">
              {MACHINE_CATEGORIES.map((cat) => (
                <div key={cat.key} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <cat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg text-foreground font-['Space_Grotesk']">{cat.label}</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {cat.models.map((m) => (
                      <a
                        key={m}
                        href={`${PUBLIC_WHATSAPP_URL}${PUBLIC_WHATSAPP_URL.includes("?") ? "&" : "?"}text=${encodeURIComponent(
                          `Olá! Gostaria de cotar um Kit de Manutenção para a máquina XCMG ${m}.`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between gap-2 border rounded-lg px-3 py-2.5 hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <span className="font-mono text-sm font-medium text-foreground">{m}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="border rounded-xl bg-muted/30 p-6 md:p-8 text-center space-y-3">
            <h2 className="text-xl md:text-2xl font-bold font-['Space_Grotesk']">Não encontrou o modelo da sua máquina?</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Atendemos toda a linha XCMG, incluindo modelos sob encomenda. Fale com nosso time e receba uma cotação dedicada.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button asChild size="lg" className="gap-2">
                <a href={PUBLIC_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </Button>
              <Button variant="outline" size="lg" onClick={() => setB2bOpen(true)} className="gap-2">
                <Wrench className="h-4 w-4" /> Solicitar contato
              </Button>
            </div>
          </section>
        </div>

        <QuoteFooter lang={lang} />
      </div>

      <B2BLeadDialog lang={lang} open={b2bOpen} onOpenChange={setB2bOpen} />
    </>
  );
}
