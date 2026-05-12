import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PublicHeader from "@/components/quote/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { type Lang } from "@/components/quote/translations";
import { useModelParts, useModelDisplayName, useModelRelatedCategories } from "@/hooks/use-model-parts";
import { categorySlug } from "@/lib/slugs";
import { useCartSession } from "@/hooks/use-cart-session";
import { SEO, organizationLd, breadcrumbLd, itemListLd } from "@/lib/seo";
import { track, trackServerConversion } from "@/lib/analytics";
import { PUBLIC_WHATSAPP_URL } from "@/lib/whatsapp";
import ModelHero from "@/components/quote/ModelHero";
import RelatedChips from "@/components/quote/RelatedChips";
import CategoryFAQ, { faqLd } from "@/components/quote/CategoryFAQ";
import QuotePartCard from "@/components/quote/QuotePartCard";
import QuoteCart from "@/components/quote/QuoteCart";
import QuoteFooter from "@/components/quote/QuoteFooter";
import B2BLeadDialog from "@/components/quote/B2BLeadDialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function ModelPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("pt");
  const { data: parts = [], isLoading } = useModelParts(slug || null);
  const { data: modelName = slug?.toUpperCase() || "" } = useModelDisplayName(slug || null);
  const { data: relatedCats = [] } = useModelRelatedCategories(slug || null);
  const { items, addToCart, updateQty, removeItem, clearCart } = useCartSession();
  const [b2bOpen, setB2bOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  const { data: seoOverride } = useQuery({
    queryKey: ["seo-override", "model", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase.from("vitrine_seo_overrides")
        .select("*").eq("kind", "model").eq("slug", slug!).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!isLoading && parts.length > 0) {
      track.viewItemList(parts.slice(0, 30), `model:${slug}`);
    }
  }, [isLoading, parts.length, slug]);

  useEffect(() => {
    const onScroll = () => {
      if (scrolledRef.current) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.75) {
        scrolledRef.current = true;
        track.scroll75Category(`model:${slug}`);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  const total = parts.length;
  const top4 = parts.slice(0, 4);
  const cartItemsForCart = items.map(i => ({ material: i.material, description: i.description, quantity: i.quantity }));
  const noindex = total === 0 || !!seoOverride?.noindex;

  const wppUrl = PUBLIC_WHATSAPP_URL;
  const handleWppClick = () => {
    track.contact("whatsapp_model", { slug });
    trackServerConversion({ event: "whatsapp_click" });
  };
  const handleB2bClick = () => setB2bOpen(true);
  const handleScrollToList = () => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const defaultTitle = `Peças ${modelName} XCMG · ${total} em estoque · Ásia`;
  const defaultDesc = `${total} peças compatíveis com ${modelName} XCMG em estoque real. Filtros, motor, hidráulico, transmissão. Pronta entrega e suporte técnico para sua frota.`;

  const faqItems = [
    { q: `Vocês têm peças para ${modelName} em estoque?`, a: `Sim, temos ${total} itens compatíveis com ${modelName} disponíveis hoje. Veja a lista completa abaixo.` },
    { q: `Atendem para frota?`, a: `Sim. Solicite a tabela corporativa pelo formulário "Sou empresa" ou WhatsApp e receba condições especiais.` },
    { q: `Em quanto tempo recebo as peças?`, a: `Itens em estoque saem em 7 a 15 dias úteis após confirmação do pedido. Itens sob consulta variam por origem.` },
  ];

  const lds: any[] = [organizationLd(), breadcrumbLd([
    { name: "Início", url: "/" },
    { name: "Cotação", url: "/cotacao" },
    { name: "Segmentos", url: "/cotacao/segmentos" },
    { name: modelName, url: `/cotacao/m/${slug}` },
  ])];
  if (top4.length) lds.push(itemListLd(top4 as any));
  lds.push(faqLd(faqItems));

  return (
    <>
      <SEO
        title={seoOverride?.title || defaultTitle}
        description={seoOverride?.description || defaultDesc}
        canonical={`/cotacao/m/${slug}`}
        image={seoOverride?.og_image || top4[0]?.image_url || undefined}
        noindex={noindex}
        jsonLd={lds}
      />

      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader lang={lang} onLangChange={setLang} onOpenB2B={() => setB2bOpen(true)} />

        <ModelHero
          modelName={modelName}
          countBadge={total > 0 ? `${total} em estoque` : "Sob consulta"}
          whatsAppUrl={wppUrl}
          onB2bClick={handleB2bClick}
          onScrollToList={handleScrollToList}
        />

        <div className="max-w-6xl mx-auto px-6 py-6 w-full">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>

          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-6">
            <ol className="flex flex-wrap gap-1">
              <li><Link to="/" className="hover:text-primary">Início</Link></li>
              <li>/</li>
              <li><Link to="/cotacao" className="hover:text-primary">Cotação</Link></li>
              <li>/</li>
              <li><Link to="/cotacao/segmentos" className="hover:text-primary">Segmentos</Link></li>
              <li>/</li>
              <li className="text-foreground">{modelName}</li>
            </ol>
          </nav>

          {top4.length > 0 && (
            <section className="mb-10 space-y-3">
              <h2 className="text-lg font-semibold font-['Space_Grotesk']">Mais procurados em estoque</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {top4.map(p => (
                  <QuotePartCard
                    key={p.id}
                    part={p as any}
                    inCart={items.some(i => i.material === p.material)}
                    hasAiData={false}
                    onAdd={() => { addToCart(p as any); track.addToCart(p as any); toast.success("Adicionado à cotação"); }}
                    onViewDetail={() => navigate(`/cotacao/p/${encodeURIComponent(p.material)}`)}
                    lang={lang}
                  />
                ))}
              </div>
            </section>
          )}

          <section ref={listRef} id="lista" className="space-y-3 mb-10">
            <h2 className="text-lg font-semibold font-['Space_Grotesk']">Todas as peças compatíveis</h2>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : parts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem itens em estoque para {modelName}. <a href={wppUrl} onClick={handleWppClick} className="text-primary underline">Solicitar pelo WhatsApp</a>.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {parts.map(p => (
                  <QuotePartCard
                    key={p.id}
                    part={p as any}
                    inCart={items.some(i => i.material === p.material)}
                    hasAiData={false}
                    onAdd={() => { addToCart(p as any); track.addToCart(p as any); toast.success("Adicionado à cotação"); }}
                    onViewDetail={() => navigate(`/cotacao/p/${encodeURIComponent(p.material)}`)}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="mb-10">
            <RelatedChips
              title="Categorias relacionadas"
              items={relatedCats.map(c => ({
                label: c.category,
                href: `/cotacao/c/${categorySlug(c.category)}`,
                count: c.count,
              }))}
            />
          </div>

          <div className="mb-10">
            <CategoryFAQ items={faqItems} />
          </div>
        </div>

        <QuoteFooter lang={lang} />
      </div>

      <QuoteCart
        items={cartItemsForCart}
        onUpdateQty={updateQty}
        onRemove={removeItem}
        onClear={clearCart}
        lang={lang}
      />
      <B2BLeadDialog lang={lang} open={b2bOpen} onOpenChange={setB2bOpen} />
    </>
  );
}
