import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import B2BLeadDialog from "@/components/quote/B2BLeadDialog";
import PublicHeader from "@/components/quote/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { type Lang } from "@/components/quote/translations";
import { SEO, organizationLd, breadcrumbLd } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Wrench } from "lucide-react";
import QuoteFooter from "@/components/quote/QuoteFooter";

export default function SegmentsIndexPage() {
  const [lang, setLang] = useState<Lang>("pt");
  const [b2bOpen, setB2bOpen] = useState(false);

  const { data: segments = [] } = useQuery({
    queryKey: ["segments-index"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("segment_stats");
      if (error) throw error;
      return data || [];
    },
  });

  const lds = [
    organizationLd(),
    breadcrumbLd([
      { name: "Início", url: "/" },
      { name: "Cotação", url: "/cotacao" },
      { name: "Segmentos", url: "/cotacao/segmentos" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Segmentos de máquinas XCMG · Peças por linha · Ásia Peças"
        description="Encontre peças XCMG por segmento: escavadeiras, pás carregadeiras, retroescavadeiras, motoniveladoras, rolos, guindastes e mais. Estoque real."
        canonical="/cotacao/segmentos"
        jsonLd={lds}
      />

      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader lang={lang} onLangChange={setLang} onOpenB2B={() => setB2bOpen(true)} />

        <div className="border-b bg-gradient-to-br from-secondary to-secondary/80">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h1 className="text-3xl md:text-4xl font-bold font-['Space_Grotesk'] text-secondary-foreground">Peças por segmento</h1>
            <p className="text-secondary-foreground/70 mt-2 text-sm">Escolha o tipo de máquina XCMG para ver os modelos e peças em estoque.</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-6">
            <ol className="flex gap-1">
              <li><Link to="/" className="hover:text-primary">Início</Link></li>
              <li>/</li>
              <li><Link to="/cotacao" className="hover:text-primary">Cotação</Link></li>
              <li>/</li>
              <li className="text-foreground">Segmentos</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((s: any) => (
              <Link key={s.slug} to={`/cotacao/segmentos/${s.slug}`}>
                <Card className="hover:border-primary hover:shadow-md transition-all overflow-hidden h-full">
                  {s.hero_image_url ? (
                    <div className="aspect-[16/10] bg-muted overflow-hidden">
                      <img src={s.hero_image_url} alt={s.name} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <Wrench className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">{s.name}</p>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">{s.parts_count} peças</Badge>
                      <Badge variant="outline" className="text-[10px]">{s.model_count} modelos</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <QuoteFooter lang={lang} />
      </div>

      <B2BLeadDialog lang={lang} open={b2bOpen} onOpenChange={setB2bOpen} />
    </>
  );
}
