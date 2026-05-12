import { useState } from "react";
import { Link, useParams } from "react-router-dom";
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

export default function SegmentPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [lang, setLang] = useState<Lang>("pt");
  const [b2bOpen, setB2bOpen] = useState(false);

  const { data: segment } = useQuery({
    queryKey: ["segment", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase.from("machine_segments").select("*").eq("slug", slug!).maybeSingle();
      return data;
    },
  });

  const { data: models = [], isLoading } = useQuery({
    queryKey: ["segment-models", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("models_in_segment", { segment_slug_param: slug! });
      if (error) throw error;
      return data || [];
    },
  });

  const name = segment?.name || slug?.toUpperCase() || "";
  const totalParts = models.reduce((acc: number, m: any) => acc + Number(m.parts_count || 0), 0);

  const lds = [
    organizationLd(),
    breadcrumbLd([
      { name: "Início", url: "/" },
      { name: "Cotação", url: "/cotacao" },
      { name: "Segmentos", url: "/cotacao/segmentos" },
      { name, url: `/cotacao/segmentos/${slug}` },
    ]),
  ];

  return (
    <>
      <SEO
        title={`${name} XCMG · Modelos e peças em estoque · Ásia Peças`}
        description={`${totalParts} peças XCMG para ${name.toLowerCase()} em estoque real. Selecione seu modelo para ver itens disponíveis.`}
        canonical={`/cotacao/segmentos/${slug}`}
        image={segment?.hero_image_url || undefined}
        jsonLd={lds}
      />

      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader lang={lang} onLangChange={setLang} onOpenB2B={() => setB2bOpen(true)} />

        <div className="border-b bg-gradient-to-br from-secondary to-secondary/80">
          <div className="max-w-6xl mx-auto px-6 py-12 flex items-center gap-6">
            {segment?.hero_image_url && (
              <div className="w-32 h-24 rounded-xl overflow-hidden bg-background/20 shrink-0 hidden md:block">
                <img src={segment.hero_image_url} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-['Space_Grotesk'] text-secondary-foreground">{name}</h1>
              <p className="text-secondary-foreground/70 mt-2 text-sm">{totalParts} peças em estoque · {models.length} modelos disponíveis</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-6">
            <ol className="flex flex-wrap gap-1">
              <li><Link to="/" className="hover:text-primary">Início</Link></li>
              <li>/</li>
              <li><Link to="/cotacao" className="hover:text-primary">Cotação</Link></li>
              <li>/</li>
              <li><Link to="/cotacao/segmentos" className="hover:text-primary">Segmentos</Link></li>
              <li>/</li>
              <li className="text-foreground">{name}</li>
            </ol>
          </nav>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando modelos...</p>
          ) : models.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado neste segmento.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((m: any) => (
                <Link key={m.slug} to={`/cotacao/m/${m.slug}`}>
                  <Card className="hover:border-primary hover:shadow-md transition-all overflow-hidden h-full">
                    {m.image_url ? (
                      <div className="aspect-[16/10] bg-muted overflow-hidden">
                        <img src={m.image_url} alt={m.display_name} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <Wrench className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground truncate">{m.display_name}</p>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                      <Badge variant="secondary" className="text-[10px] mt-2">{m.parts_count} peças</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <QuoteFooter lang={lang} />
      </div>

      <B2BLeadDialog lang={lang} open={b2bOpen} onOpenChange={setB2bOpen} />
    </>
  );
}
