import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PublicHeader from "@/components/quote/PublicHeader";
import { getPartCategoryOption } from "@/components/quote/part-categories";
import { supabase } from "@/integrations/supabase/client";
import { type Lang } from "@/components/quote/translations";
import { modelSlug } from "@/lib/slugs";
import { useCategoryNameBySlug, useCategoryPageData } from "@/hooks/use-category-parts";
import { useCartSession } from "@/hooks/use-cart-session";
import { SEO, organizationLd, breadcrumbLd, itemListLd } from "@/lib/seo";
import { track, trackServerConversion } from "@/lib/analytics";
import { PUBLIC_WHATSAPP_URL } from "@/lib/whatsapp";
import CategoryHero from "@/components/quote/CategoryHero";
import RelatedChips from "@/components/quote/RelatedChips";
import CategoryFAQ, { faqLd } from "@/components/quote/CategoryFAQ";
import QuotePartCard from "@/components/quote/QuotePartCard";
import QuoteCart from "@/components/quote/QuoteCart";
import QuoteFooter from "@/components/quote/QuoteFooter";
import B2BLeadDialog from "@/components/quote/B2BLeadDialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function CategoryPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("pt");
  const { items, addToCart, updateQty, removeItem, clearCart } = useCartSession();
  const [b2bOpen, setB2bOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  const { data: categoryName, isLoading: isCategoryLoading } = useCategoryNameBySlug(slug || null);
  const { data: categoryData, isLoading } = useCategoryPageData(categoryName);
  const parts = categoryData?.parts ?? [];
  const relatedModels = categoryData?.relatedModels ?? [];

  const { data: seoOverride } = useQuery({
    queryKey: ["seo-override", "category", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase
        .from("vitrine_seo_overrides")
        .select("*")
        .eq("kind", "category")
        .eq("slug", slug!)
        .maybeSingle();
      return data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: promoCount = 0 } = useQuery({
    queryKey: ["category-promo-count", categoryName],
    enabled: !!categoryName && parts.length > 0,
    queryFn: async () => {
      const ids = parts.map((part) => part.id);
      const { count } = await supabase
        .from("part_promotions")
        .select("part_id", { count: "exact", head: true })
        .eq("active", true)
        .in("part_id", ids);
      return count || 0;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!isLoading && parts.length > 0 && categoryName) {
      track.viewItemList(parts.slice(0, 30), `category:${slug}`);
    }
  }, [isLoading, parts, categoryName, slug]);

  useEffect(() => {
    const onScroll = () => {
      if (scrolledRef.current) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.75) {
        scrolledRef.current = true;
        track.scroll75Category(slug || "");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  if (slug && !categoryName) {
    if (isCategoryLoading) {
      return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
    }
    return (
      <>
        <SEO title="Categoria não encontrada · Ásia Peças" canonical={`/cotacao/c/${slug}`} noindex />
        <div className="flex min-h-screen flex-col items-center justify-center gap-3">
          <p className="text-muted-foreground">Categoria não encontrada.</p>
          <Link to="/cotacao/categorias">
            <Button variant="outline">Ver todas as categorias</Button>
          </Link>
        </div>
      </>
    );
  }

  const categoryMeta = categoryName ? getPartCategoryOption(categoryName) : null;
  const top4 = parts.slice(0, 4);
  const cartItemsForCart = items.map((item) => ({
    material: item.material,
    description: item.description,
    quantity: item.quantity,
  }));
  const total = parts.length;
  const hasStock = total > 0;
  const noindex = !hasStock || !!seoOverride?.noindex;

  const handleWppClick = () => {
    track.contact("whatsapp_category", { slug });
    trackServerConversion({ event: "whatsapp_click" });
  };

  const handleScrollToList = () => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const wppUrl = PUBLIC_WHATSAPP_URL;

  const defaultTitle = `${categoryName} XCMG · ${total} em estoque · Ásia Peças`;
  const defaultDesc = `${total} ${categoryName?.toLowerCase()} originais e equivalentes para máquinas XCMG. Estoque real em Macapá-AP. Cotação rápida via WhatsApp em PT/EN/ES.`;

  const faqItems = categoryName
    ? [
        {
          q: `Vocês têm ${categoryName.toLowerCase()} XCMG em estoque?`,
          a: `Sim. Atualmente temos ${total} itens da categoria ${categoryName} disponíveis para pronta entrega no Brasil.`,
        },
        {
          q: `Como solicito uma cotação de ${categoryName.toLowerCase()}?`,
          a: "Adicione as peças ao carrinho de cotação ou clique em WhatsApp. Respondemos em até 1 hora útil.",
        },
        {
          q: "Há garantia nas peças?",
          a: "Todas as peças vendidas pela Ásia Peças & Máquinas têm 3 meses de garantia contra defeitos de fabricação.",
        },
      ]
    : [];

  const lds: any[] = [organizationLd()];
  if (categoryName) {
    lds.push(
      breadcrumbLd([
        { name: "Início", url: "/" },
        { name: "Cotação", url: "/cotacao" },
        { name: "Categorias", url: "/cotacao/categorias" },
        { name: categoryName, url: `/cotacao/c/${slug}` },
      ]),
    );
    if (top4.length) lds.push(itemListLd(top4 as any));
    lds.push(faqLd(faqItems));
  }

  const Icon = categoryMeta?.icon;

  return (
    <>
      <SEO
        title={seoOverride?.title || defaultTitle}
        description={seoOverride?.description || defaultDesc}
        canonical={`/cotacao/c/${slug}`}
        image={seoOverride?.og_image || top4[0]?.image_url || undefined}
        noindex={noindex}
        jsonLd={lds}
      />

      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader lang={lang} onLangChange={setLang} onOpenB2B={() => setB2bOpen(true)} />

        <CategoryHero
          title={`${categoryName} para máquinas XCMG`}
          subtitle={defaultDesc}
          countBadge={hasStock ? `${total} em estoque` : "Sob consulta"}
          Icon={Icon}
          whatsAppUrl={wppUrl}
          onB2bClick={() => setB2bOpen(true)}
          onScrollToList={handleScrollToList}
          campaignActive={total > 0 && promoCount / total > 0.5}
        />

        <div className="mx-auto w-full max-w-6xl px-6 py-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>

          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
            <ol className="flex flex-wrap gap-1">
              <li>
                <Link to="/" className="hover:text-primary">
                  Início
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link to="/cotacao" className="hover:text-primary">
                  Cotação
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link to="/cotacao/categorias" className="hover:text-primary">
                  Categorias
                </Link>
              </li>
              <li>/</li>
              <li className="text-foreground">{categoryName}</li>
            </ol>
          </nav>

          {top4.length > 0 && (
            <section className="mb-10 space-y-3">
              <h2 className="font-['Space_Grotesk'] text-lg font-semibold">Mais procurados em estoque</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {top4.map((part) => (
                  <QuotePartCard
                    key={part.id}
                    part={part as any}
                    inCart={items.some((item) => item.material === part.material)}
                    hasAiData={false}
                    onAdd={() => {
                      addToCart(part as any);
                      track.addToCart(part as any);
                      toast.success("Adicionado à cotação");
                    }}
                    onViewDetail={() => navigate(`/cotacao/p/${encodeURIComponent(part.material)}`)}
                    lang={lang}
                  />
                ))}
              </div>
            </section>
          )}

          <section ref={listRef} id="lista" className="mb-10 space-y-3">
            <h2 className="font-['Space_Grotesk'] text-lg font-semibold">Todas as peças desta categoria</h2>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : parts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem itens em estoque no momento.{" "}
                <a href={wppUrl} onClick={handleWppClick} className="text-primary underline">
                  Solicitar pelo WhatsApp
                </a>
                .
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {parts.map((part) => (
                  <QuotePartCard
                    key={part.id}
                    part={part as any}
                    inCart={items.some((item) => item.material === part.material)}
                    hasAiData={false}
                    onAdd={() => {
                      addToCart(part as any);
                      track.addToCart(part as any);
                      toast.success("Adicionado à cotação");
                    }}
                    onViewDetail={() => navigate(`/cotacao/p/${encodeURIComponent(part.material)}`)}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="mb-10">
            <RelatedChips
              title="Modelos compatíveis"
              items={relatedModels.map((model) => ({
                label: model.model,
                href: `/cotacao/m/${modelSlug(model.model)}`,
                count: model.count,
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
