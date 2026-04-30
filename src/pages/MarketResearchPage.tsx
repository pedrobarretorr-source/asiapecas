import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useMarketResearchOverview, useAddMarketResearch, useUpdateMarketResearch, useDeleteMarketResearch } from "@/hooks/use-market-research";
import { useParts, formatBRL } from "@/hooks/use-parts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, Pencil, Trash2, Loader2, AlertTriangle, Download, ExternalLink, Link as LinkIcon, Search as SearchIcon, ShieldCheck, ShieldQuestion, CheckCircle2, Equal } from "lucide-react";
import { toast } from "sonner";
import { PART_CATEGORIES } from "@/components/quote/part-categories";
import { downloadCsv, todayStamp, type CsvColumn } from "@/lib/export-csv";

type ResearchEntry = NonNullable<ReturnType<typeof useMarketResearchOverview>["data"]>[number];

function detectUrlType(url: string | null | undefined): "page" | "search" {
  if (!url) return "search";
  const lower = url.toLowerCase();
  if (lower.includes("google.com/search") || lower.includes("lista.mercadolivre")) return "search";
  return "page";
}

export default function MarketResearchPage() {
  const { data: research = [], isLoading } = useMarketResearchOverview();
  const addMutation = useAddMarketResearch();
  const updateMutation = useUpdateMarketResearch();
  const deleteMutation = useDeleteMarketResearch();

  const [search, setSearch] = useState("");
  const [filterDistributor, setFilterDistributor] = useState<string>("all");
  const [filterAvailability, setFilterAvailability] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterGenuine, setFilterGenuine] = useState<string>("all");
  const [filterMatch, setFilterMatch] = useState<string>("all");
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [editEntry, setEditEntry] = useState<ResearchEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<ResearchEntry | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const distributors = useMemo(
    () => [...new Set(research.map(r => r.distributor_name))].sort(),
    [research],
  );

  const filtered = useMemo(() => research.filter(r => {
    if (filterDistributor !== "all" && r.distributor_name !== filterDistributor) return false;
    if (filterAvailability !== "all" && r.availability !== filterAvailability) return false;
    if (filterCategory !== "all") {
      const cat = r.parts?.part_category ?? "__none__";
      if (filterCategory === "__none__" ? cat !== "__none__" : cat !== filterCategory) return false;
    }
    if (filterSource !== "all") {
      const isAI = (r.researched_by || "").toLowerCase() === "ia";
      if (filterSource === "ia" && !isAI) return false;
      if (filterSource === "manual" && isAI) return false;
    }
    if (filterGenuine !== "all") {
      const g = (r as any).is_genuine;
      if (filterGenuine === "genuine" && g !== true) return false;
      if (filterGenuine === "parallel" && g !== false) return false;
      if (filterGenuine === "unknown" && g !== null && g !== undefined) return false;
    }
    if (filterMatch !== "all") {
      const mc = (r as any).match_confidence;
      if (filterMatch === "exact" && mc !== "exact") return false;
      if (filterMatch === "normalized" && mc !== "normalized") return false;
      if (filterMatch === "any_match" && mc !== "exact" && mc !== "normalized") return false;
    }
    if (search) {
      const s = search.toLowerCase();
      const partName = r.parts?.material || "";
      const partDesc = r.parts?.description || "";
      if (!r.distributor_name.toLowerCase().includes(s) && !partName.toLowerCase().includes(s) && !partDesc.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [research, filterDistributor, filterAvailability, filterCategory, filterSource, filterGenuine, filterMatch, search]);

  // KPIs
  const uniqueParts = new Set(research.map(r => r.part_id)).size;
  const totalEntries = research.length;
  const uniqueDistributors = new Set(research.map(r => r.distributor_name)).size;

  // Competitiveness
  const partsWithPrices = research.reduce((acc, r) => {
    const price = Number(r.price_found);
    if (price <= 0) return acc;
    if (!acc[r.part_id]) acc[r.part_id] = { market: [], ourPrice: r.parts?.estimated_price || 0 };
    acc[r.part_id].market.push(price);
    return acc;
  }, {} as Record<string, { market: number[]; ourPrice: number }>);

  let competitiveCount = 0, totalCompared = 0;
  Object.values(partsWithPrices).forEach(({ market, ourPrice }) => {
    if (ourPrice > 0 && market.length > 0) {
      const avgMarket = market.reduce((a, b) => a + b, 0) / market.length;
      if (ourPrice <= avgMarket) competitiveCount++;
      totalCompared++;
    }
  });

  // Distribution by category (KPI mini bars)
  const categoryDistribution = useMemo(() => {
    const map = new Map<string, number>();
    research.forEach(r => {
      const k = r.parts?.part_category || "Sem categoria";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [research]);
  const maxCatCount = categoryDistribution[0]?.[1] || 1;

  // Group filtered by category if enabled
  const grouped = useMemo(() => {
    if (!groupByCategory) return null;
    const map = new Map<string, ResearchEntry[]>();
    filtered.forEach(r => {
      const k = r.parts?.part_category || "Sem categoria";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupByCategory]);

  const handleDelete = async () => {
    if (!deleteEntry) return;
    await deleteMutation.mutateAsync({ id: deleteEntry.id, part_id: deleteEntry.part_id });
    toast.success("Pesquisa excluída");
    setDeleteEntry(null);
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const columns: CsvColumn<ResearchEntry>[] = [
      { header: "Código", value: r => r.parts?.material || "" },
      { header: "Descrição", value: r => r.parts?.description || "" },
      { header: "Categoria", value: r => r.parts?.part_category || "" },
      { header: "Distribuidor", value: r => r.distributor_name },
      { header: "Preço Encontrado (BRL)", value: r => Number(r.price_found).toFixed(2).replace(".", ",") },
      { header: "Nosso Preço (BRL)", value: r => (r.parts?.estimated_price || 0).toFixed(2).replace(".", ",") },
      {
        header: "Diferença %",
        value: r => {
          const our = r.parts?.estimated_price || 0;
          const p = Number(r.price_found);
          if (our <= 0 || p <= 0) return "";
          return (((p - our) / our) * 100).toFixed(1).replace(".", ",");
        },
      },
      { header: "Prazo (dias)", value: r => r.delivery_days ?? "" },
      { header: "Disponibilidade", value: r => r.availability || "" },
      { header: "Fonte", value: r => ((r.researched_by || "").toLowerCase() === "ia" ? "IA" : "Manual") },
      {
        header: "Tipo",
        value: r => {
          const g = (r as any).is_genuine;
          if (g === true) return "Original XCMG";
          if (g === false) return "Paralela";
          return "Não confirmado";
        },
      },
      {
        header: "Match",
        value: r => {
          const mc = (r as any).match_confidence;
          if (mc === "exact") return "Exato";
          if (mc === "normalized") return "Equivalente";
          return "—";
        },
      },
      {
        header: "Código encontrado",
        value: r => (r as any).matched_part_number || "",
      },
      { header: "Tipo de URL", value: r => detectUrlType(r.source_url) === "page" ? "Página" : "Busca" },
      { header: "URL", value: r => r.source_url || "" },
      { header: "Data", value: r => new Date(r.researched_at).toLocaleDateString("pt-BR") },
      { header: "Observações", value: r => r.notes || "" },
    ];
    downloadCsv(`pesquisa-mercado-${todayStamp()}.csv`, filtered, columns);
    toast.success(`Exportado: ${filtered.length} registro(s)`);
  };

  const renderTable = (rows: ResearchEntry[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Peça</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Distribuidor</TableHead>
          <TableHead>Preço Encontrado</TableHead>
          <TableHead>Nosso Preço</TableHead>
          <TableHead>Prazo</TableHead>
          <TableHead>Disp.</TableHead>
          <TableHead>Fonte</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Match</TableHead>
          <TableHead>Data</TableHead>
          <TableHead className="w-[80px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.slice(0, 200).map((r) => {
          const ourPrice = r.parts?.estimated_price || 0;
          const price = Number(r.price_found);
          const isNoRef = price === 0;
          const diff = ourPrice > 0 && price > 0 ? ((price - ourPrice) / ourPrice) * 100 : 0;
          const cat = r.parts?.part_category;
          const isAI = (r.researched_by || "").toLowerCase() === "ia";
          const urlType = detectUrlType(r.source_url);
          return (
            <TableRow key={r.id}>
              <TableCell>
                <div className="font-medium text-xs">{r.parts?.material || "—"}</div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{r.parts?.description || "—"}</div>
              </TableCell>
              <TableCell>
                {cat ? <Badge variant="outline" className="text-[10px]">{cat}</Badge> : <span className="text-[10px] text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1.5">
                  <span>{r.distributor_name}</span>
                  {r.source_url && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={urlType === "page" ? "Abrir página do produto" : "Abrir busca"}
                          className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded border border-border hover:bg-accent"
                        >
                          {urlType === "page" ? <LinkIcon className="h-2.5 w-2.5" /> : <SearchIcon className="h-2.5 w-2.5" />}
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        {urlType === "page" ? "Página direta" : "Link de busca — verificar resultado"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {isNoRef ? (
                  <Badge variant="outline" className="text-[10px]">Sem referências</Badge>
                ) : (
                  <span className={diff < -2 ? "text-red-600" : diff > 2 ? "text-green-600 font-semibold" : ""}>
                    {formatBRL(price)}
                  </span>
                )}
              </TableCell>
              <TableCell>{ourPrice > 0 ? formatBRL(ourPrice) : "—"}</TableCell>
              <TableCell>{r.delivery_days ? `${r.delivery_days}d` : "—"}</TableCell>
              <TableCell>
                <Badge variant={r.availability === "em estoque" ? "default" : "secondary"} className="text-[10px]">{r.availability}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={isAI ? "default" : "outline"} className="text-[10px]">{isAI ? "IA" : "Manual"}</Badge>
              </TableCell>
              <TableCell>
                {(r as any).is_genuine === true ? (
                  <Badge className="text-[10px] gap-0.5 bg-success hover:bg-success text-success-foreground">
                    <ShieldCheck className="h-2.5 w-2.5" /> Original
                  </Badge>
                ) : (r as any).is_genuine === false ? (
                  <Badge variant="secondary" className="text-[10px] gap-0.5">
                    <ShieldQuestion className="h-2.5 w-2.5" /> Paralela
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Não confirmado</Badge>
                )}
              </TableCell>
              <TableCell>
                {(r as any).match_confidence === "exact" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="text-[10px] gap-0.5 bg-success hover:bg-success text-success-foreground">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Exato
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{(r as any).matched_part_number || "Código bate caractere por caractere"}</TooltipContent>
                  </Tooltip>
                ) : (r as any).match_confidence === "normalized" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[10px] gap-0.5 border-warning text-warning">
                        <Equal className="h-2.5 w-2.5" /> Equivalente
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{(r as any).matched_part_number || "Mesmo código ignorando hífens/espaços"}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{new Date(r.researched_at).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditEntry(r)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteEntry(r)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Pesquisa de Mercado</h1>
              <p className="text-sm text-muted-foreground mt-1">Acompanhe preços de concorrentes e competitividade</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Exportar CSV
              </Button>
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Pesquisa
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Peças Pesquisadas</CardTitle></CardHeader><CardContent><p className="text-3xl font-display font-bold">{uniqueParts}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de Registros</CardTitle></CardHeader><CardContent><p className="text-3xl font-display font-bold">{totalEntries}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Distribuidores</CardTitle></CardHeader><CardContent><p className="text-3xl font-display font-bold">{uniqueDistributors}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Competitividade</CardTitle></CardHeader><CardContent>
              <p className="text-3xl font-display font-bold text-primary">{totalCompared > 0 ? `${Math.round((competitiveCount/totalCompared)*100)}%` : "—"}</p>
              <p className="text-xs text-muted-foreground">peças com preço competitivo</p>
            </CardContent></Card>
          </div>

          {/* Distribution by category */}
          {categoryDistribution.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Distribuição por Categoria</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {categoryDistribution.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs w-44 truncate">{name}</span>
                    <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(count / maxCatCount) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por peça ou distribuidor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {PART_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.key}</SelectItem>)}
                <SelectItem value="__none__">Sem categoria</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDistributor} onValueChange={setFilterDistributor}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Distribuidor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos distribuidores</SelectItem>
                {distributors.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAvailability} onValueChange={setFilterAvailability}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Disponibilidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="em estoque">Em estoque</SelectItem>
                <SelectItem value="sob encomenda">Sob encomenda</SelectItem>
                <SelectItem value="indisponível">Indisponível</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Fonte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas fontes</SelectItem>
                <SelectItem value="ia">IA</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGenuine} onValueChange={setFilterGenuine}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="genuine">Apenas Original XCMG</SelectItem>
                <SelectItem value="parallel">Apenas Paralelas</SelectItem>
                <SelectItem value="unknown">Não confirmado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMatch} onValueChange={setFilterMatch}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Match do código" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os matches</SelectItem>
                <SelectItem value="exact">Apenas código exato</SelectItem>
                <SelectItem value="normalized">Apenas equivalente</SelectItem>
                <SelectItem value="any_match">Exato + equivalente</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 px-3 rounded-md border border-border">
              <Switch id="group-cat" checked={groupByCategory} onCheckedChange={setGroupByCategory} />
              <Label htmlFor="group-cat" className="text-xs cursor-pointer">Agrupar por categoria</Label>
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <Card><CardContent className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="text-center py-8">
              <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma pesquisa encontrada.</p>
            </CardContent></Card>
          ) : groupByCategory && grouped ? (
            <div className="space-y-4">
              {grouped.map(([cat, rows]) => (
                <Card key={cat}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{cat}</CardTitle>
                    <Badge variant="secondary">{rows.length} registro(s)</Badge>
                  </CardHeader>
                  <CardContent className="p-0">{renderTable(rows)}</CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="p-0">{renderTable(filtered)}</CardContent></Card>
          )}
        </div>

        {/* Edit Dialog */}
        <ResearchFormDialog
          open={!!editEntry}
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSave={async (data) => {
            if (editEntry) {
              await updateMutation.mutateAsync({ id: editEntry.id, ...data });
              toast.success("Pesquisa atualizada");
              setEditEntry(null);
            }
          }}
          isPending={updateMutation.isPending}
        />

        {/* New Dialog */}
        <ResearchFormDialog
          open={showNewDialog}
          entry={null}
          onClose={() => setShowNewDialog(false)}
          onSave={async (data) => {
            if (!data.part_id) { toast.error("Selecione uma peça"); return; }
            await addMutation.mutateAsync({
              part_id: data.part_id!,
              distributor_name: data.distributor_name,
              price_found: data.price_found,
              delivery_days: data.delivery_days,
              payment_terms: data.payment_terms,
              availability: data.availability,
              source_url: data.source_url,
              notes: data.notes,
              researched_at: new Date().toISOString(),
              researched_by: null,
            });
            toast.success("Pesquisa registrada!");
            setShowNewDialog(false);
          }}
          isPending={addMutation.isPending}
          showPartSearch
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir pesquisa?</AlertDialogTitle>
              <AlertDialogDescription>
                Pesquisa de "{deleteEntry?.distributor_name}" será excluída permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </AppLayout>
  );
}

// --- Reusable form dialog ---
function ResearchFormDialog({ open, entry, onClose, onSave, isPending, showPartSearch }: {
  open: boolean;
  entry: ResearchEntry | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  isPending: boolean;
  showPartSearch?: boolean;
}) {
  const [form, setForm] = useState({
    part_id: "",
    distributor_name: "",
    price_found: "",
    delivery_days: "",
    payment_terms: "",
    availability: "em estoque",
    source_url: "",
    notes: "",
  });
  const [partSearch, setPartSearch] = useState("");
  const { data: partsData } = useParts({ search: partSearch, page: 0, pageSize: 10, category: null });
  const parts = partsData?.parts || [];

  // Reset form when entry changes
  const resetKey = entry?.id || (open ? "new" : "closed");
  useState(() => {
    if (entry) {
      setForm({
        part_id: entry.part_id,
        distributor_name: entry.distributor_name,
        price_found: String(entry.price_found),
        delivery_days: entry.delivery_days ? String(entry.delivery_days) : "",
        payment_terms: entry.payment_terms || "",
        availability: entry.availability || "em estoque",
        source_url: entry.source_url || "",
        notes: entry.notes || "",
      });
    } else {
      setForm({ part_id: "", distributor_name: "", price_found: "", delivery_days: "", payment_terms: "", availability: "em estoque", source_url: "", notes: "" });
    }
  });

  // Sync form with entry on open
  if (open && entry && form.distributor_name !== entry.distributor_name && form.price_found !== String(entry.price_found)) {
    setForm({
      part_id: entry.part_id,
      distributor_name: entry.distributor_name,
      price_found: String(entry.price_found),
      delivery_days: entry.delivery_days ? String(entry.delivery_days) : "",
      payment_terms: entry.payment_terms || "",
      availability: entry.availability || "em estoque",
      source_url: entry.source_url || "",
      notes: entry.notes || "",
    });
  }

  const handleSubmit = async () => {
    if (!form.distributor_name || !form.price_found) {
      toast.error("Preencha o distribuidor e o preço");
      return;
    }
    await onSave({
      part_id: form.part_id || undefined,
      distributor_name: form.distributor_name,
      price_found: parseFloat(form.price_found),
      delivery_days: form.delivery_days ? parseInt(form.delivery_days) : null,
      payment_terms: form.payment_terms || null,
      availability: form.availability,
      source_url: form.source_url || null,
      notes: form.notes || null,
    });
    setForm({ part_id: "", distributor_name: "", price_found: "", delivery_days: "", payment_terms: "", availability: "em estoque", source_url: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Editar Pesquisa" : "Nova Pesquisa de Mercado"}</DialogTitle>
          <DialogDescription>{entry ? "Atualize os dados desta pesquisa." : "Registre uma nova pesquisa de preço."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {showPartSearch && (
            <div>
              <Label className="text-xs">Peça *</Label>
              <Input placeholder="Buscar peça por código..." value={partSearch} onChange={e => setPartSearch(e.target.value)} />
              {partSearch && parts.length > 0 && (
                <div className="border rounded mt-1 max-h-32 overflow-auto">
                  {parts.map(p => (
                    <button key={p.id} className="w-full text-left text-xs px-3 py-2 hover:bg-accent" onClick={() => { setForm(f => ({ ...f, part_id: p.id })); setPartSearch(`${p.material} - ${p.description}`); }}>
                      <span className="font-mono">{p.material}</span> — {p.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Distribuidor *</Label>
              <Input value={form.distributor_name} onChange={e => setForm(f => ({ ...f, distributor_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Preço encontrado *</Label>
              <Input type="number" value={form.price_found} onChange={e => setForm(f => ({ ...f, price_found: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Prazo (dias)</Label>
              <Input type="number" value={form.delivery_days} onChange={e => setForm(f => ({ ...f, delivery_days: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Disponibilidade</Label>
              <Select value={form.availability} onValueChange={v => setForm(f => ({ ...f, availability: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="em estoque">Em estoque</SelectItem>
                  <SelectItem value="sob encomenda">Sob encomenda</SelectItem>
                  <SelectItem value="indisponível">Indisponível</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Condições de pagamento</Label>
            <Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">URL fonte</Label>
            <Input value={form.source_url} onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Notas</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : entry ? "Salvar" : "Registrar"}
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
