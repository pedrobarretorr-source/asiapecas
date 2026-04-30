import { useMemo, useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Grid3X3, List, Package } from "lucide-react";
import { PART_CATEGORIES } from "@/components/quote/part-categories";
import { useParts, formatBRL, formatCompact, type Part } from "@/hooks/use-parts";
import { PartCard } from "@/components/catalog/PartCard";
import { PartTable } from "@/components/catalog/PartTable";
import { PartDetailDialog } from "@/components/catalog/PartDetailDialog";

const VIEW_KEY = "catalog-view-mode";

export default function CategoriesPage() {
  const [active, setActive] = useState<string>(PART_CATEGORIES[0].key);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [view, setView] = useState<"grid" | "list">(
    () => (typeof window !== "undefined" && (localStorage.getItem(VIEW_KEY) as any)) || "list",
  );
  const [selected, setSelected] = useState<Part | null>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  // Counts per category (single aggregated query)
  const { data: counts } = useQuery({
    queryKey: ["category-counts"],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("part_category, stock, estimated_price");
      if (error) throw error;
      const map = new Map<string, { count: number; units: number; value: number }>();
      (data ?? []).forEach((p: any) => {
        const key = p.part_category || "Sem categoria";
        const cur = map.get(key) || { count: 0, units: 0, value: 0 };
        cur.count += 1;
        cur.units += Number(p.stock || 0);
        cur.value += Number(p.stock || 0) * Number(p.estimated_price || 0);
        map.set(key, cur);
      });
      return map;
    },
  });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on category change
  useEffect(() => setPage(0), [active]);

  // Query parts of active category
  const { data: partsData, isLoading } = useQuery({
    queryKey: ["parts-by-category", active, debounced, page],
    queryFn: async () => {
      let q = supabase
        .from("parts")
        .select("*", { count: "exact" })
        .eq("part_category", active)
        .order("estimated_price", { ascending: false })
        .range(page * 50, page * 50 + 49);
      if (debounced) {
        const term = `%${debounced}%`;
        q = q.or(`description.ilike.${term},material.ilike.${term},machine_model.ilike.${term}`);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { parts: (data ?? []) as Part[], total: count ?? 0 };
    },
  });

  const parts = partsData?.parts ?? [];
  const total = partsData?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  const summary = counts?.get(active);
  const avgPrice = useMemo(() => {
    if (!parts.length) return 0;
    return parts.reduce((s, p) => s + Number(p.estimated_price), 0) / parts.length;
  }, [parts]);
  const topPart = useMemo(() => {
    if (!parts.length) return null;
    return [...parts].sort(
      (a, b) =>
        Number(b.stock) * Number(b.estimated_price) -
        Number(a.stock) * Number(a.estimated_price),
    )[0];
  }, [parts]);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card overflow-y-auto shrink-0 hidden md:block">
          <div className="p-4 border-b">
            <h2 className="font-display font-bold text-sm">Categorias</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {counts ? counts.size : "..."} categorias
            </p>
          </div>
          <nav className="p-2 space-y-0.5">
            {PART_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const c = counts?.get(cat.key);
              const isActive = active === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActive(cat.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{cat.key}</span>
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className="text-[10px] py-0 h-5"
                  >
                    {c?.count ?? 0}
                  </Badge>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Mobile category select */}
            <div className="md:hidden flex flex-wrap gap-1">
              {PART_CATEGORIES.map((cat) => (
                <Badge
                  key={cat.key}
                  variant={active === cat.key ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setActive(cat.key)}
                >
                  {cat.key}
                </Badge>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">{active}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {(summary?.count ?? 0).toLocaleString("pt-BR")} peça(s) nesta categoria
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={view === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setView("grid")}
                  aria-pressed={view === "grid"}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setView("list")}
                  aria-pressed={view === "list"}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Peças" value={(summary?.count ?? 0).toLocaleString("pt-BR")} />
              <Kpi label="Unidades" value={(summary?.units ?? 0).toLocaleString("pt-BR")} />
              <Kpi label="Valor Total" value={formatCompact(summary?.value ?? 0)} />
              <Kpi label="Preço médio (página)" value={formatBRL(avgPrice)} />
            </div>

            {topPart && (
              <Card className="border-primary/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Peça destaque desta página
                    </p>
                    <p className="font-medium text-sm truncate">{topPart.description}</p>
                    <p className="text-xs text-muted-foreground font-mono">{topPart.material}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Valor estoque</p>
                    <p className="font-bold text-sm">
                      {formatCompact(Number(topPart.stock) * Number(topPart.estimated_price))}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nesta categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {parts.map((p) => (
                  <PartCard key={p.id} part={p} onClick={() => setSelected(p)} />
                ))}
              </div>
            ) : (
              <PartTable parts={parts} onSelect={setSelected} />
            )}

            {!isLoading && parts.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                Nenhuma peça encontrada nesta categoria.
              </p>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <PartDetailDialog part={selected} onClose={() => setSelected(null)} />
    </AppLayout>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4">
        <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
        <p className="text-lg font-display font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
