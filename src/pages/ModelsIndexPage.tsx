import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import B2BLeadDialog from "@/components/quote/B2BLeadDialog";
import PublicHeader from "@/components/quote/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { type Lang } from "@/components/quote/translations";
import { modelSlug } from "@/lib/slugs";
import { SEO, organizationLd, breadcrumbLd } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, ChevronRight } from "lucide-react";
import QuoteFooter from "@/components/quote/QuoteFooter";

export default function ModelsIndexPage() {
  const [lang, setLang] = useState<Lang>("pt");
  const [b2bOpen, setB2bOpen] = useState(false);

  const { data: models = [] } = useQuery({
    queryKey: ["models-index"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parts")
        .select("machine_model, stock, estimated_price")
        .gt("stock", 0)
        .not("machine_model", "is", null)
        .limit(5000);
      const m = new Map<string, { skus: number; value: number }>();
      for (const r of data || []) {
        const k = (r.machine_model || "").trim();
        if (!k) continue;
        const cur = m.get(k) || { skus: 0, value: 0 };
        cur.skus += 1;
        cur.value += (r.estimated_price || 0) * r.stock;
        m.set(k, cur);
      }
      return Array.from(m.entries())
        .map(([model, v]) => ({ model, ...v }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 60);
    },
  });

  const lds = [
    organizationLd(),
    breadcrumbLd([
      { name: "Início", url: "/" },
      { name: "Cotação", url: "/cotacao" },
      { name: "Modelos", url: "/cotacao/modelos" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Modelos XCMG · Peças por modelo de máquina · Ásia Peças"
        description="Encontre peças por modelo de máquina XCMG. Escavadeiras, pás carregadeiras, guindastes, perfuratrizes e caminhões elétricos com estoque real."
        canonical="/cotacao/modelos"
        jsonLd={lds}
      />

      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader lang={lang} onLangChange={setLang} onOpenB2B={() => setB2bOpen(true)} />

        <div className="border-b bg-gradient-to-br from-secondary to-secondary/80">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h1 className="text-3xl md:text-4xl font-bold font-['Space_Grotesk'] text-secondary-foreground">Peças por modelo</h1>
            <p className="text-secondary-foreground/70 mt-2 text-sm">Selecione o modelo da sua máquina XCMG para ver todas as peças em estoque.</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-6">
            <ol className="flex gap-1">
              <li><Link to="/" className="hover:text-primary">Início</Link></li>
              <li>/</li>
              <li><Link to="/cotacao" className="hover:text-primary">Cotação</Link></li>
              <li>/</li>
              <li className="text-foreground">Modelos</li>
            </ol>
          </nav>

          {models.length === 0 ? (
            <p className="text-sm text-muted-foreground">Carregando modelos...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map(m => (
                <Link key={m.model} to={`/cotacao/m/${modelSlug(m.model)}`}>
                  <Card className="hover:border-primary hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                        <Wrench className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{m.model}</p>
                        <Badge variant="secondary" className="text-[10px] mt-1">{m.skus} peças</Badge>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
