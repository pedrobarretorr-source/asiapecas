import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Menu, X, LayoutGrid, List, ShoppingCart, Eye } from "lucide-react";
import QuotePartCard from "./QuotePartCard";
import QuotePartDetail from "./QuotePartDetail";
import CategoryGroupedView from "./CategoryGroupedView";
import { type Lang, tr } from "./translations";
import { MACHINE_CATEGORIES } from "./machine-categories";

type CartItem = { material: string; description: string; quantity: number };

interface QuoteCatalogProps {
  search: string;
  category: string | null;
  partCategory?: string | null;
  onPartCategoryChange?: (key: string) => void;
  subcategory?: string | null;
  onSubcategoryChange?: (val: string | null) => void;
  cartItems: CartItem[];
  onAddToCart: (part: any) => void;
  lang: Lang;
}

const PAGE_SIZE = 12;

const CATEGORY_MAP: Record<string, string> = {
  mineracao: "is_mineracao",
  linha_amarela: "is_linha_amarela",
  perfuratriz: "is_perfuratriz",
  guindaste: "is_guindaste",
  caminhao_eletrico: "is_caminhao_eletrico",
};

type SortOption = "relevance" | "stockDesc" | "nameAsc" | "newest" | "priceAsc" | "priceDesc";
type ViewMode = "grid" | "list";

const SEARCH_MIN_LENGTH = 2;

function sanitizePostgrestSearchTerm(term: string) {
  return term
    .normalize("NFKC")
    .replace(/[%(),'"`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchTerms(search: string) {
  const normalized = sanitizePostgrestSearchTerm(search);
  const tokens = normalized
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length >= SEARCH_MIN_LENGTH);

  return Array.from(new Set([normalized, ...tokens].filter((term) => term.length >= SEARCH_MIN_LENGTH))).slice(0, 8);
}

function buildFallbackSearchOr(search: string) {
  const terms = getSearchTerms(search);
  if (terms.length === 0) return "";

  return terms
    .flatMap((term) => [
      `material.ilike.%${term}%`,
      `description.ilike.%${term}%`,
      `machine_model.ilike.%${term}%`,
      `manufacturer.ilike.%${term}%`,
      `part_category.ilike.%${term}%`,
      `subcategory.ilike.%${term}%`,
      `supplier.ilike.%${term}%`,
    ])
    .join(",");
}

function compactFilters(filters: Record<string, string | boolean | null | undefined>) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== "all"),
  );
}

export default function QuoteCatalog({ search, category, partCategory, onPartCategoryChange, subcategory, onSubcategoryChange, cartItems, onAddToCart, lang }: QuoteCatalogProps) {
  const showPrice = false;
  const [page, setPage] = useState(0);
  const [detailPart, setDetailPart] = useState<any | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [model, setModel] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("relevance");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [attrFilter, setAttrFilter] = useState<{ key: string; value: string } | null>(null);
  const [equipmentType, setEquipmentType] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategoryExpanded = (key: string) => {
    setExpandedCategory((prev) => (prev === key ? null : key));
  };

  // Show grouped view when nothing is filtered (e-commerce default)
  const isUnfilteredDefault =
    !search && !category && !partCategory && !subcategory && !attrFilter && !equipmentType &&
    model === "all";

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [search, category, partCategory, subcategory, model, sort, attrFilter, equipmentType]);

  const activeFilterCount = [model !== "all", !!partCategory, !!subcategory, !!attrFilter, !!equipmentType].filter(Boolean).length;

  const equipmentModels =
    equipmentType ? MACHINE_CATEGORIES.find((c) => c.key === equipmentType)?.models ?? [] : [];

  const { data, isLoading } = useQuery({
    queryKey: ["quote-parts", search, category, partCategory, subcategory, page, model, sort, attrFilter, equipmentType],
    enabled: !isUnfilteredDefault,
    queryFn: async () => {
      const searchTerm = search.trim();
      const shouldUseRankedSearch = searchTerm.length >= SEARCH_MIN_LENGTH && equipmentModels.length === 0;

      if (shouldUseRankedSearch) {
        const filters = compactFilters({
          in_stock: true,
          segment: category || null,
          part_category: partCategory || null,
          subcategory: subcategory || null,
          machine_model: model,
          sort,
          attribute_key: attrFilter?.key,
          attribute_value: attrFilter?.value,
        });

        const { data: rankedParts, error: rankedError } = await supabase.rpc("search_parts", {
          q: searchTerm,
          filters,
          _limit: PAGE_SIZE,
          _offset: page * PAGE_SIZE,
        });

        if (!rankedError) {
          const parts = rankedParts || [];
          const ids = parts.map((p: any) => p.id);
          let aiMap: Record<string, string> = {};

          if (ids.length > 0) {
            const { data: aiData } = await supabase
              .from("ai_compatibility_results")
              .select("part_id, technical_description")
              .in("part_id", ids);
            (aiData || []).forEach((a: any) => { aiMap[a.part_id] = a.technical_description || ""; });
          }

          return {
            parts,
            count: Number(parts[0]?.total_count || 0),
            aiMap,
          };
        }

        console.warn("search_parts RPC failed, falling back to direct catalog search", rankedError);
      }

      let query: any = supabase
        .from("parts")
        .select("id, material, description, machine_model, stock, manufacturer, estimated_price, image_url, subcategory, attributes", { count: "exact" })
        .gt("stock", 0);

      const fallbackOr = buildFallbackSearchOr(searchTerm);
      if (fallbackOr) {
        query = query.or(fallbackOr);
      }
      if (category && CATEGORY_MAP[category]) {
        query = query.eq(CATEGORY_MAP[category], true);
      }
      if (model !== "all") query = query.eq("machine_model", model);
      else if (equipmentModels.length > 0) query = query.in("machine_model", equipmentModels);
      if (partCategory) query = query.eq("part_category", partCategory);
      if (subcategory) query = query.eq("subcategory", subcategory);
      if (attrFilter) query = query.eq(`attributes->>${attrFilter.key}`, attrFilter.value);

      // Sort
      switch (sort) {
        case "stockDesc": query = query.order("stock", { ascending: false }); break;
        case "nameAsc": query = query.order("description", { ascending: true }); break;
        case "newest": query = query.order("created_at", { ascending: false }); break;
        case "priceAsc": query = query.order("estimated_price", { ascending: true }); break;
        case "priceDesc": query = query.order("estimated_price", { ascending: false }); break;
        default: query = query.order("stock", { ascending: false });
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data: parts, count } = await query;

      const ids = (parts || []).map((p: any) => p.id);
      let aiMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: aiData } = await supabase
          .from("ai_compatibility_results")
          .select("part_id, technical_description")
          .in("part_id", ids);
        (aiData || []).forEach((a: any) => { aiMap[a.part_id] = a.technical_description || ""; });
      }

      return { parts: parts || [], count: count || 0, aiMap };
    },
  });

  // Translate descriptions
  useEffect(() => {
    if (!data?.parts || data.parts.length === 0 || lang === "pt") {
      setTranslations({});
      return;
    }
    const descriptions = data.parts.map((p: any) => p.description);
    const cacheKey = `${lang}-${descriptions.join("|")}`;
    if (translations._cacheKey === cacheKey) return;

    const translateParts = async () => {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-parts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ descriptions, targetLang: lang }),
          }
        );
        if (resp.ok) {
          const { translations: translated } = await resp.json();
          const map: Record<string, string> = { _cacheKey: cacheKey };
          data.parts.forEach((p: any, i: number) => {
            map[p.material] = translated[i] || p.description;
          });
          setTranslations(map);
        }
      } catch { /* fallback to originals */ }
    };
    translateParts();
  }, [data?.parts, lang]);

  const getDescription = (part: any) => {
    if (lang === "pt") return part.description;
    return translations[part.material] || part.description;
  };

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);
  const inCartMaterials = new Set(cartItems.map(i => i.material));

  const clearFilters = () => {
    setModel("all");
    setSort("relevance");
    setAttrFilter(null);
    setEquipmentType(null);
    setExpandedCategory(null);
    if (onSubcategoryChange) onSubcategoryChange(null);
    if (onPartCategoryChange && partCategory) onPartCategoryChange(partCategory);
  };

  const selectAll = () => {
    setEquipmentType(null);
    setModel("all");
  };

  const selectEquipmentType = (key: string) => {
    setEquipmentType(key);
    setModel("all");
  };

  const selectModel = (m: string) => {
    setEquipmentType(null);
    setModel(m);
  };

  const FilterPanel = ({ inSheet = false }: { inSheet?: boolean } = {}) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">
          {lang === "en" ? "Machines" : "Máquinas"}
        </h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-8 gap-1 text-destructive px-2" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> {tr("filter.clear", lang)}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <button
          onClick={selectAll}
          className={`text-left text-sm px-3 py-2.5 rounded-md transition-colors font-semibold min-h-[44px] ${
            !equipmentType && model === "all"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-foreground"
          }`}
        >
          {lang === "en" ? "All machines" : lang === "es" ? "Todas las máquinas" : "Todas as máquinas"}
        </button>

        {MACHINE_CATEGORIES.map((cat) => {
          const isCatActive = equipmentType === cat.key;
          const hasActiveModel = cat.models.includes(model);
          const isExpanded = expandedCategory === cat.key;
          const rowSize = inSheet ? "text-sm" : "text-xs sm:text-[13px]";
          return (
            <div key={cat.key} className="space-y-0.5">
              <button
                onClick={() => toggleCategoryExpanded(cat.key)}
                aria-expanded={isExpanded}
                className={`flex items-center gap-2.5 w-full text-left ${rowSize} px-3 py-2.5 rounded-md transition-colors min-h-[44px] ${
                  isCatActive || hasActiveModel
                    ? "bg-primary/10 text-foreground font-medium"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <cat.icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{cat.label}</span>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>
              {isExpanded && (
                <div className="flex flex-col gap-1 pl-9 pr-1 pb-2 pt-1">
                  <button
                    onClick={() => selectEquipmentType(cat.key)}
                    className={`text-left text-xs px-2.5 py-2 rounded transition-colors min-h-[36px] ${
                      isCatActive
                        ? "bg-primary text-primary-foreground"
                        : "text-primary hover:bg-primary/10"
                    }`}
                  >
                    {lang === "en" ? `View all ${cat.label.toLowerCase()}` : `Ver toda categoria`}
                  </button>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cat.models.map((m) => (
                      <button
                        key={m}
                        onClick={() => selectModel(m)}
                        className={`text-[11px] font-mono px-2.5 py-1.5 rounded border transition-colors min-h-[32px] ${
                          model === m
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24 space-y-4">
            <FilterPanel />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {isUnfilteredDefault ? (
            <CategoryGroupedView
              lang={lang}
              cartMaterials={inCartMaterials}
              onAddToCart={(p) => onAddToCart({ ...p, description: getDescription(p) })}
              onViewDetail={(p) => setDetailPart({ ...p, description: getDescription(p) })}
              onSelectSubcategory={(sub) => onSubcategoryChange?.(sub)}
              onSelectAttribute={(sub, k, v) => {
                onSubcategoryChange?.(sub);
                setAttrFilter({ key: k, value: v });
              }}
            />
          ) : (
          <>

          {/* Top bar: results count + sort + mobile filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {data?.count ? `${data.count.toLocaleString("pt-BR")} ${tr("catalog.found", lang)}` : tr("catalog.searching", lang)}
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={clearFilters}>
                  <X className="h-3 w-3" /> {activeFilterCount} {tr("filter.activeFilters", lang)}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center border rounded-md">
                <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-9 w-9 p-0" onClick={() => setViewMode("grid")}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="h-9 w-9 p-0" onClick={() => setViewMode("list")}>
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Sort */}
              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger className="h-9 text-xs w-[160px]">
                  <SelectValue placeholder={tr("sort.label", lang)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">{tr("sort.relevance", lang)}</SelectItem>
                  <SelectItem value="stockDesc">{tr("sort.stockDesc", lang)}</SelectItem>
                  <SelectItem value="nameAsc">{tr("sort.nameAsc", lang)}</SelectItem>
                  <SelectItem value="newest">{tr("sort.newest", lang)}</SelectItem>
                  {showPrice && <SelectItem value="priceAsc">{tr("sort.priceAsc", lang)}</SelectItem>}
                  {showPrice && <SelectItem value="priceDesc">{tr("sort.priceDesc", lang)}</SelectItem>}
                </SelectContent>
              </Select>

              {/* Mobile machines drawer */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden h-9 gap-1.5">
                    <Menu className="h-4 w-4" />
                    {lang === "en" ? "Machines" : "Máquinas"}
                    {activeFilterCount > 0 && (
                      <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px]">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{lang === "en" ? "Browse by machine" : lang === "es" ? "Buscar por máquina" : "Navegar por máquina"}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 pb-6">
                    <FilterPanel inSheet />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Pagination info */}
          {totalPages > 1 && (
            <p className="text-xs text-muted-foreground mb-4">
              {tr("catalog.page", lang)} {page + 1} {tr("catalog.of", lang)} {totalPages}
            </p>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className={viewMode === "grid" ? "h-72 rounded-xl" : "h-14 rounded-lg"} />
              ))}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.parts.map((part: any) => (
                <QuotePartCard
                  key={part.id}
                  part={{ ...part, description: getDescription(part) }}
                  inCart={inCartMaterials.has(part.material)}
                  hasAiData={!!data.aiMap[part.id]}
                  aiPreview={data.aiMap[part.id] || null}
                  onAdd={() => onAddToCart({ ...part, description: getDescription(part) })}
                  onViewDetail={() => setDetailPart({ ...part, description: getDescription(part) })}
                  lang={lang}
                />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[80px]"></TableHead>
                    <TableHead>{lang === "pt" ? "Produto" : lang === "en" ? "Product" : "Producto"}</TableHead>
                    <TableHead className="hidden md:table-cell">{lang === "pt" ? "Modelo" : lang === "en" ? "Model" : "Modelo"}</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">{showPrice ? (lang === "pt" ? "Preço" : lang === "en" ? "Price" : "Precio") : tr("part.availability", lang)}</TableHead>
                    <TableHead className="text-right">{lang === "pt" ? "Estoque" : lang === "en" ? "Stock" : "Stock"}</TableHead>
                    <TableHead className="text-right w-[160px]">{lang === "pt" ? "Ações" : lang === "en" ? "Actions" : "Acciones"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.parts.map((part: any) => {
                    const desc = getDescription(part);
                    const isInCart = inCartMaterials.has(part.material);
                    const price = Number(part.estimated_price || 0);
                    const fmtPrice = (v: number) => {
                      const locale = lang === "en" ? "en-US" : lang === "es" ? "es-AR" : "pt-BR";
                      const currency = lang === "en" ? "USD" : "BRL";
                      try { return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(v); }
                      catch { return `R$ ${v.toFixed(2)}`; }
                    };
                    const goToDetail = () => window.location.assign(`/cotacao/p/${encodeURIComponent(part.material)}`);
                    return (
                      <TableRow key={part.id} className="hover:bg-muted/40 cursor-pointer" onClick={goToDetail}>
                        <TableCell className="p-2">
                          <div className="h-14 w-14 rounded-md bg-muted/40 overflow-hidden flex items-center justify-center">
                            {part.image_url ? (
                              <img src={part.image_url} alt={desc} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <span className="text-[10px] font-bold text-primary/40 font-['Space_Grotesk']">XCMG</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-foreground line-clamp-1">{desc}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">#{part.material}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{part.machine_model || "—"}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          {part.stock > 10 ? (
                            <span className="text-xs text-muted-foreground italic">
                              {lang === "en" ? "Ready to ship" : lang === "es" ? "Entrega inmediata" : "Pronta entrega"}
                            </span>
                          ) : part.stock > 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              {lang === "en" ? "Last" : lang === "es" ? "Últimas" : "Últimas"} {part.stock}
                            </span>
                          ) : (
                            <a
                              href="/cotacao/kits-de-manutencao"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              {tr("part.kitsManutencao", lang)}
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {part.stock > 10 ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">{part.stock}</Badge>
                          ) : part.stock > 0 ? (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-600">{part.stock}</Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDetailPart({ ...part, description: desc })}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant={isInCart ? "secondary" : "default"}
                              size="sm"
                              className="h-8 text-xs gap-1"
                              disabled={isInCart}
                              onClick={() => onAddToCart({ ...part, description: desc })}
                            >
                              <ShoppingCart className="h-3 w-3" />
                              {isInCart ? tr("part.added", lang) : tr("part.quote", lang)}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" /> {tr("catalog.prev", lang)}
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                  const p = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
                  return (
                    <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className="w-9" onClick={() => setPage(p)}>
                      {p + 1}
                    </Button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                {tr("catalog.next", lang)} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          </>
          )}
        </div>
      </div>

      <QuotePartDetail
        part={detailPart}
        open={!!detailPart}
        onClose={() => setDetailPart(null)}
        inCart={detailPart ? inCartMaterials.has(detailPart.material) : false}
        onAdd={() => { if (detailPart) { onAddToCart(detailPart); setDetailPart(null); } }}
        lang={lang}
      />
    </section>
  );
}
