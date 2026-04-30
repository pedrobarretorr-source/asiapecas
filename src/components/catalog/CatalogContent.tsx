import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Grid3X3, List, Upload, Filter, X, Brain, ShoppingCart, Loader2, Tags } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParts, categoryLabels, categoryKeys, priceRanges, timeLabels, useDistinctValues, type Part } from "@/hooks/use-parts";
import { useBatchAIResearch } from "@/hooks/use-batch-ai-research";
import { useCategorizeParts } from "@/hooks/use-categorize-parts";
import { useCart } from "@/contexts/CartContext";
import { PartCard } from "./PartCard";
import { PartTable } from "./PartTable";
import { PartDetailDialog } from "./PartDetailDialog";
import { ImportCatalogDialog } from "./ImportCatalogDialog";
import { ExportCatalogButton } from "./ExportCatalogButton";
import { routes } from "@/lib/routes";

export function CatalogContent() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [page, setPage] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [manufacturer, setManufacturer] = useState<string | null>(null);
  const [machineModel, setMachineModel] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("stock");
  const [sortAsc, setSortAsc] = useState(false);
  const pageSize = 50;

  const { data: manufacturers } = useDistinctValues("manufacturer");
  const { data: models } = useDistinctValues("machine_model");
  const { progress, startBatch, stop } = useBatchAIResearch();
  const { progress: catProgress, startCategorize, stop: stopCategorize } = useCategorizeParts();
  const { count: cartCount } = useCart();

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (value: string) => {
    setSearch(value);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => { setDebouncedSearch(value); setPage(0); }, 400);
    setTimer(t);
  };

  const pr = priceRange != null ? priceRanges[priceRange] : null;
  const hasFilters = manufacturer || machineModel || priceRange != null || timeFilter;

  const { data, isLoading } = useParts({
    search: debouncedSearch, category: activeCategory,
    manufacturer, machineModel,
    priceMin: pr?.min ?? null, priceMax: pr?.max ?? null,
    timeFilter, page, pageSize, sortBy, sortAsc,
  });

  const filtered = data?.parts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const clearFilters = () => {
    setManufacturer(null); setMachineModel(null);
    setPriceRange(null); setTimeFilter(null);
    setActiveCategory(null); setPage(0);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Catálogo de Peças</h1>
          <p className="text-sm text-muted-foreground mt-1">{total.toLocaleString("pt-BR")} peça(s)</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={catProgress.running ? stopCategorize : () => startCategorize(50)}
            className="gap-1"
          >
            {catProgress.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tags className="h-4 w-4" />}
            {catProgress.running ? `Categorizando (${catProgress.processed})...` : "Categorizar Peças"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={progress.running ? stop : startBatch}
            className="gap-1"
          >
            {progress.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {progress.running ? "Parar pesquisa" : "Carregar informações"}
          </Button>
          <ExportCatalogButton />
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-1" /> Importar
          </Button>
        </div>
      </div>

      {/* AI Batch Progress */}
      {progress.running && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-medium">
              Carregando informações — Lote {progress.currentBatch}/{progress.totalBatches}
            </span>
            <span className="text-muted-foreground">
              {progress.processed} processadas · {progress.skipped} existentes · {progress.errors} erros
            </span>
          </div>
          <Progress value={progress.totalBatches > 0 ? (progress.currentBatch / progress.totalBatches) * 100 : 0} />
        </div>
      )}

      {/* Search + Filter Toggle + View */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar código, descrição ou modelo..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-1" /> Filtros
            {hasFilters && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">!</Badge>}
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}><Grid3X3 className="h-4 w-4" /></Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-muted/50 rounded-lg border">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fabricante</label>
            <Select value={manufacturer || "__all__"} onValueChange={(v) => { setManufacturer(v === "__all__" ? null : v); setPage(0); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {(manufacturers || []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Modelo</label>
            <Select value={machineModel || "__all__"} onValueChange={(v) => { setMachineModel(v === "__all__" ? null : v); setPage(0); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {(models || []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Faixa de Preço</label>
            <Select value={priceRange != null ? String(priceRange) : "__all__"} onValueChange={(v) => { setPriceRange(v === "__all__" ? null : Number(v)); setPage(0); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {priceRanges.map((r, i) => <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tempo Parado</label>
            <Select value={timeFilter || "__all__"} onValueChange={(v) => { setTimeFilter(v === "__all__" ? null : v); setPage(0); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {timeLabels.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ordenar por</label>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(0); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Estoque</SelectItem>
                <SelectItem value="estimated_price">Preço</SelectItem>
                <SelectItem value="description">Nome</SelectItem>
                <SelectItem value="material">Código</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="col-span-full text-xs">
              <X className="h-3 w-3 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={activeCategory === null ? "default" : "outline"} className="cursor-pointer select-none" onClick={() => { setActiveCategory(null); setPage(0); }}>Todas</Badge>
        {categoryKeys.map((key) => (
          <Badge key={key} variant={activeCategory === key ? "default" : "outline"} className="cursor-pointer select-none"
            onClick={() => { setActiveCategory(activeCategory === key ? null : key); setPage(0); }}>
            {categoryLabels[key]}
          </Badge>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      )}

      {!isLoading && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((part) => <PartCard key={part.id} part={part} onClick={() => setSelectedPart(part)} />)}
        </div>
      )}

      {!isLoading && viewMode === "list" && <PartTable parts={filtered} onSelect={setSelectedPart} />}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">Nenhuma peça encontrada</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
        </div>
      )}

      {/* Floating Cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="rounded-full shadow-lg gap-2 h-14 px-6"
            onClick={() => navigate(routes.newOrder)}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="font-bold">{cartCount}</span>
            <span className="hidden sm:inline">itens no pedido</span>
          </Button>
        </div>
      )}

      <PartDetailDialog part={selectedPart} onClose={() => setSelectedPart(null)} />
      <ImportCatalogDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}

function PackageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}
