import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import B2BLeadDialog from "@/components/quote/B2BLeadDialog";
import ConsentBanner from "@/components/quote/ConsentBanner";
import QuoteCatalog from "@/components/quote/QuoteCatalog";
import QuoteCart from "@/components/quote/QuoteCart";
import PublicHeader from "@/components/quote/PublicHeader";
import WhatsAppFloatingButton from "@/components/quote/WhatsAppFloatingButton";
import { Search } from "lucide-react";
import { type Lang } from "@/components/quote/translations";
import { SEO, organizationLd } from "@/lib/seo";
import { Input } from "@/components/ui/input";
import { useCartSession } from "@/hooks/use-cart-session";

const WHATSAPP_URL = "https://wa.me/5595974009289?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20pe%C3%A7as%20XCMG";

function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function QuotePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPartCategory = searchParams.get("partCategory");
  const requestedSearch = searchParams.get("q") || "";
  const [search, setSearch] = useState(requestedSearch);
  const debouncedSearch = useDebouncedValue(search.trim(), 280);
  const [partCategory, setPartCategory] = useState<string | null>(requestedPartCategory || null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("pt");
  const [b2bOpen, setB2bOpen] = useState(false);

  const { items: cartItems, addToCart, updateQty, removeItem, clearCart } = useCartSession();

  const catalogTitle =
    lang === "en"
      ? "Public catalog with available parts"
      : lang === "es"
        ? "Catalogo publico con repuestos disponibles"
        : "Catalogo publico com pecas disponiveis";

  const catalogDescription =
    lang === "en"
      ? "Search by part, code, OEM, keyword or machine model and filter available stock directly."
      : lang === "es"
        ? "Busque por repuesto, codigo, OEM, palabra clave o modelo de maquina y filtre el stock disponible directamente."
        : "Busque por peca, codigo, OEM, palavra-chave ou modelo de maquina e filtre o estoque disponivel diretamente.";

  const searchPlaceholder =
    lang === "en"
      ? "Search part, code, OEM or machine model"
      : lang === "es"
        ? "Buscar repuesto, codigo, OEM o modelo de maquina"
        : "Buscar peca, codigo, OEM ou modelo de maquina";

  useEffect(() => {
    setPartCategory(requestedPartCategory || null);
  }, [requestedPartCategory]);

  useEffect(() => {
    setSearch(requestedSearch);
  }, [requestedSearch]);

  useEffect(() => {
    const currentSearch = searchParams.get("q") || "";
    if (debouncedSearch === currentSearch) return;

    const nextParams = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      nextParams.set("q", debouncedSearch);
    } else {
      nextParams.delete("q");
    }
    setSearchParams(nextParams, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams]);

  const handlePartCategoryChange = (key: string) => {
    const nextCategory = partCategory === key ? null : key;
    setPartCategory(nextCategory);

    const nextParams = new URLSearchParams(searchParams);
    if (nextCategory) {
      nextParams.set("partCategory", nextCategory);
    } else {
      nextParams.delete("partCategory");
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Sonner />

      <PublicHeader lang={lang} onLangChange={setLang} onOpenB2B={() => setB2bOpen(true)} whatsappUrl={WHATSAPP_URL} />

      <SEO
        title="Catalogo de pecas XCMG | Asia Pecas & Maquinas"
        description="Area dedicada de catalogo para pesquisar pecas XCMG por codigo, descricao, modelo e disponibilidade."
        canonical="/cotacao"
        lang={lang}
        jsonLd={organizationLd()}
      />

      <main className="flex-1">
        <section className="border-b bg-card/60">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  {lang === "en" ? "Catalog" : lang === "es" ? "Catalogo" : "Catalogo"}
                </p>
                <h2 className="mt-2 font-['Space_Grotesk'] text-3xl font-bold text-foreground md:text-4xl">
                  {catalogTitle}
                </h2>
                <p className="mt-3 text-sm text-muted-foreground md:text-base">
                  {catalogDescription}
                </p>
              </div>

              <div className="w-full max-w-xl">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-11 pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div id="catalogo">
          <QuoteCatalog
            search={debouncedSearch}
            category={null}
            partCategory={partCategory}
            subcategory={subcategory}
            onSubcategoryChange={setSubcategory}
            onPartCategoryChange={handlePartCategoryChange}
            cartItems={cartItems}
            onAddToCart={addToCart}
            lang={lang}
          />
        </div>
      </main>

      <QuoteCart items={cartItems} onUpdateQty={updateQty} onRemove={removeItem} onClear={clearCart} lang={lang} />

      <B2BLeadDialog lang={lang} open={b2bOpen} onOpenChange={setB2bOpen} />
      <ConsentBanner lang={lang} />

      <WhatsAppFloatingButton href={WHATSAPP_URL} />
    </div>
  );
}
