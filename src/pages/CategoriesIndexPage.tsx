import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import B2BLeadDialog from "@/components/quote/B2BLeadDialog";
import PublicHeader from "@/components/quote/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { type Lang } from "@/components/quote/translations";
import { getPartCategoryOption } from "@/components/quote/part-categories";
import { categorySlug } from "@/lib/slugs";
import { SEO, organizationLd, breadcrumbLd } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import QuoteFooter from "@/components/quote/QuoteFooter";

export default function CategoriesIndexPage() {
  const [lang, setLang] = useState<Lang>("pt");
  const [b2bOpen, setB2bOpen] = useState(false);

  const { data: stats = [] } = useQuery({
    queryKey: ["categories-index-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parts")
        .select("part_category, stock, estimated_price")
        .gt("stock", 0)
        .not("part_category", "is", null)
        .limit(5000);
      const m = new Map<string, { skus: number; value: number }>();
      for (const r of data || []) {
        const c = (r.part_category || "").trim();
        if (!c) continue;
        const cur = m.get(c) || { skus: 0, value: 0 };
        cur.skus += 1;
        cur.value += (r.estimated_price || 0) * r.stock;
        m.set(c, cur);
      }
      return Array.from(m.entries())
        .map(([key, summary]) => ({
          ...getPartCategoryOption(key),
          skus: summary.skus,
          value: summary.value,
        }))
        .sort((a, b) => b.value - a.value);
    },
  });

  const lds = [
    organizationLd(),
    breadcrumbLd([
      { name: "Início", url: "/" },
      { name: "Cotação", url: "/cotacao" },
      { name: "Categorias", url: "/cotacao/categorias" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Categorias de peças XCMG · Ásia Peças & Máquinas"
        description="Explore todas as categorias de peças XCMG disponíveis em estoque: filtros, motor, hidráulico, transmissão, freios, elétrico e mais."
        canonical="/cotacao/categorias"
        jsonLd={lds}
      />

      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader lang={lang} onLangChange={setLang} onOpenB2B={() => setB2bOpen(true)} />

        <div className="border-b bg-gradient-to-br from-secondary to-secondary/80">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h1 className="text-3xl md:text-4xl font-bold font-['Space_Grotesk'] text-secondary-foreground">Todas as categorias</h1>
            <p className="text-secondary-foreground/70 mt-2 text-sm">Encontre a categoria certa para sua máquina XCMG. Estoque real, pronta entrega.</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-6">
            <ol className="flex gap-1">
              <li><Link to="/" className="hover:text-primary">Início</Link></li>
              <li>/</li>
              <li><Link to="/cotacao" className="hover:text-primary">Cotação</Link></li>
              <li>/</li>
              <li className="text-foreground">Categorias</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map(c => {
              const Icon = c.icon;
              const slug = categorySlug(c.key);
              return (
                <Link key={c.key} to={`/cotacao/c/${slug}`}>
                  <Card className="hover:border-primary hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{c.key}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">{c.skus} itens</Badge>
                          {c.skus === 0 && (
                            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                              Kits de Manutenção
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        <QuoteFooter lang={lang} />
      </div>

      <B2BLeadDialog lang={lang} open={b2bOpen} onOpenChange={setB2bOpen} />
    </>
  );
}
