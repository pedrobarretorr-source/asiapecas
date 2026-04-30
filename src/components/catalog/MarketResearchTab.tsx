import { useState } from "react";
import { useMarketResearch, useAddMarketResearch, useUpdateMarketResearch, useDeleteMarketResearch, useVerifyMarketUrl, type MarketResearch } from "@/hooks/use-market-research";
import { formatBRL } from "@/hooks/use-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, TrendingDown, TrendingUp, Minus, ExternalLink, Loader2, Pencil, Trash2, Brain, Search as SearchIcon, LinkIcon, AlertOctagon, ShieldCheck, ShieldQuestion, CheckCircle2, Equal, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAutoMarketResearch } from "@/hooks/use-auto-market-research";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  partId: string;
  ourPrice: number;
}

type EnrichedResearch = MarketResearch & { source_url_type?: string | null; url_verified?: boolean | null; is_genuine?: boolean | null; matched_part_number?: string | null; match_confidence?: string | null };

function detectUrlType(url: string | null | undefined): "page" | "search" {
  if (!url) return "search";
  const lower = url.toLowerCase();
  if (lower.includes("google.com/search") || lower.includes("lista.mercadolivre")) return "search";
  return "page";
}

export function MarketResearchTab({ partId, ourPrice }: Props) {
  const { data: entries = [], isLoading } = useMarketResearch(partId);
  const addMutation = useAddMarketResearch();
  const updateMutation = useUpdateMarketResearch();
  const deleteMutation = useDeleteMarketResearch();
  const verifyMutation = useVerifyMarketUrl();
  const aiResearch = useAutoMarketResearch();
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<MarketResearch | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<MarketResearch | null>(null);
  const [includeParallel, setIncludeParallel] = useState(false);
  const [form, setForm] = useState({
    distributor_name: "", price_found: "", delivery_days: "", payment_terms: "", availability: "em estoque", source_url: "", notes: "",
  });

  const { data: part } = useQuery({
    queryKey: ["part-meta", partId],
    enabled: !!partId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("material, description, manufacturer, machine_model")
        .eq("id", partId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleAIResearch = () => {
    if (!part) return;
    aiResearch.mutate({
      partId,
      material: part.material,
      description: part.description,
      manufacturer: part.manufacturer,
      machine_model: part.machine_model,
      genuineOnly: !includeParallel,
    });
  };

  const resetForm = () => setForm({ distributor_name: "", price_found: "", delivery_days: "", payment_terms: "", availability: "em estoque", source_url: "", notes: "" });

  // Sorted by lowest price first; entries with price 0 (no references) go last
  const sortedEntries = [...entries].sort((a, b) => {
    const pa = Number(a.price_found) || 0;
    const pb = Number(b.price_found) || 0;
    if (pa === 0 && pb === 0) return 0;
    if (pa === 0) return 1;
    if (pb === 0) return -1;
    return pa - pb;
  });

  const pricedEntries = sortedEntries.filter((e) => Number(e.price_found) > 0);
  const avgMarket = pricedEntries.length > 0 ? pricedEntries.reduce((s, e) => s + Number(e.price_found), 0) / pricedEntries.length : 0;
  const minMarket = pricedEntries.length > 0 ? Math.min(...pricedEntries.map(e => Number(e.price_found))) : 0;
  const maxMarket = pricedEntries.length > 0 ? Math.max(...pricedEntries.map(e => Number(e.price_found))) : 0;
  const competitiveness = avgMarket > 0 ? ((ourPrice - avgMarket) / avgMarket) * 100 : 0;

  const handleSubmit = async () => {
    if (!form.distributor_name || !form.price_found) { toast.error("Preencha o distribuidor e o preço"); return; }
    await addMutation.mutateAsync({
      part_id: partId, distributor_name: form.distributor_name, price_found: parseFloat(form.price_found),
      delivery_days: form.delivery_days ? parseInt(form.delivery_days) : null,
      payment_terms: form.payment_terms || null, availability: form.availability,
      source_url: form.source_url || null, notes: form.notes || null,
      researched_at: new Date().toISOString(), researched_by: null,
    });
    toast.success("Pesquisa registrada!");
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (e: MarketResearch) => {
    setEditEntry(e);
    setForm({
      distributor_name: e.distributor_name, price_found: String(e.price_found),
      delivery_days: e.delivery_days ? String(e.delivery_days) : "",
      payment_terms: e.payment_terms || "", availability: e.availability || "em estoque",
      source_url: e.source_url || "", notes: e.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    await updateMutation.mutateAsync({
      id: editEntry.id, distributor_name: form.distributor_name, price_found: parseFloat(form.price_found),
      delivery_days: form.delivery_days ? parseInt(form.delivery_days) : null,
      payment_terms: form.payment_terms || null, availability: form.availability,
      source_url: form.source_url || null, notes: form.notes || null,
    });
    toast.success("Atualizado!");
    setEditEntry(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    await deleteMutation.mutateAsync({ id: deleteEntry.id, part_id: deleteEntry.part_id });
    toast.success("Excluído!");
    setDeleteEntry(null);
  };

  const handleReportBroken = async (e: MarketResearch) => {
    const prevNotes = e.notes ? `${e.notes} | ` : "";
    await updateMutation.mutateAsync({
      id: e.id,
      source_url: null,
      notes: `${prevNotes}Link reportado como quebrado em ${new Date().toLocaleDateString("pt-BR")}`,
    });
    toast.success("Link removido. Obrigado pelo feedback!");
  };

  const handleReverify = (e: EnrichedResearch) => {
    if (!e.source_url || !part) return;
    verifyMutation.mutate({
      research_id: e.id,
      url: e.source_url,
      material: part.material,
      matched_part_number: e.matched_part_number,
      part_id: partId,
    });
  };

  const extractEvidence = (notes: string | null | undefined): string | null => {
    if (!notes) return null;
    const m = notes.match(/\[verificado:\s*"([^"]+)"\]/);
    return m ? m[1] : null;
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {pricedEntries.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Menor Preço</p>
              <p className="font-bold text-sm">{formatBRL(minMarket)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Média Mercado</p>
              <p className="font-bold text-sm">{formatBRL(avgMarket)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Maior Preço</p>
              <p className="font-bold text-sm">{formatBRL(maxMarket)}</p>
            </div>
          </div>
        )}

        {pricedEntries.length > 0 && (
          <div className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
            competitiveness < -5 ? "bg-green-500/10 text-green-600" :
            competitiveness > 5 ? "bg-red-500/10 text-red-600" :
            "bg-yellow-500/10 text-yellow-600"
          }`}>
            {competitiveness < -5 ? <TrendingDown className="h-4 w-4" /> : competitiveness > 5 ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            <span>Nosso preço ({formatBRL(ourPrice)}) está {competitiveness < -5 ? `${Math.abs(competitiveness).toFixed(1)}% abaixo` : competitiveness > 5 ? `${competitiveness.toFixed(1)}% acima` : "na faixa"} da média</span>
          </div>
        )}

        {sortedEntries.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Distribuidor</TableHead><TableHead>Preço</TableHead><TableHead>Prazo</TableHead><TableHead>Disp.</TableHead><TableHead className="w-[100px]">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {sortedEntries.map((raw) => {
                const e = raw as EnrichedResearch;
                const price = Number(e.price_found);
                const isNoRef = price === 0;
                const urlType = (e.source_url_type as "page" | "search" | null | undefined) ?? detectUrlType(e.source_url);
                const evidence = extractEvidence(e.notes);
                const isVerifiedPage = urlType === "page" && (e.url_verified === true || !!evidence);
                const isReverifying = verifyMutation.isPending && verifyMutation.variables?.research_id === e.id;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{e.distributor_name}</span>
                        {e.is_genuine === true ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="text-[10px] gap-0.5 bg-success hover:bg-success text-success-foreground">
                                <ShieldCheck className="h-2.5 w-2.5" /> Original XCMG
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Confirmado como peça original/genuína XCMG</TooltipContent>
                          </Tooltip>
                        ) : e.is_genuine === false ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="text-[10px] gap-0.5">
                                <ShieldQuestion className="h-2.5 w-2.5" /> Paralela
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Peça paralela / não original — comparação não-equivalente</TooltipContent>
                          </Tooltip>
                        ) : null}
                        {e.match_confidence === "exact" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="text-[10px] gap-0.5 bg-success hover:bg-success text-success-foreground">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Código exato
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Código bate caractere por caractere{e.matched_part_number ? `: ${e.matched_part_number}` : ""}
                            </TooltipContent>
                          </Tooltip>
                        ) : e.match_confidence === "normalized" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[10px] gap-0.5 border-warning text-warning">
                                <Equal className="h-2.5 w-2.5" /> Código equivalente
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Mesmo código ignorando hífens/espaços{e.matched_part_number ? `: ${e.matched_part_number}` : ""}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        {e.source_url && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={e.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={isVerifiedPage ? "Abrir página verificada do produto" : "Abrir busca pelo produto"}
                                className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border hover:bg-accent ${
                                  isVerifiedPage ? "border-success text-success" : "border-border"
                                }`}
                              >
                                {isVerifiedPage ? <CheckCircle2 className="h-2.5 w-2.5" /> : urlType === "page" ? <LinkIcon className="h-2.5 w-2.5" /> : <SearchIcon className="h-2.5 w-2.5" />}
                                <span>{isVerifiedPage ? "Verificado" : urlType === "page" ? "Página" : "Busca"}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {isVerifiedPage ? (
                                <div className="space-y-1">
                                  <p className="font-semibold">Link confirmado — código encontrado na página</p>
                                  {evidence && <p className="text-xs italic opacity-90">"{evidence}"</p>}
                                </div>
                              ) : (
                                "Link de busca — verificar resultado manualmente"
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {e.payment_terms && <p className="text-[10px] text-muted-foreground">{e.payment_terms}</p>}
                    </TableCell>
                    <TableCell>
                      {isNoRef ? (
                        <Badge variant="outline" className="text-[10px]">Sem referências</Badge>
                      ) : (
                        <span className={price < ourPrice ? "text-green-600 font-semibold" : price > ourPrice ? "text-red-600" : ""}>
                          {formatBRL(price)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{e.delivery_days ? `${e.delivery_days}d` : "—"}</TableCell>
                    <TableCell><Badge variant={e.availability === "em estoque" ? "default" : "secondary"} className="text-[10px]">{e.availability}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {e.source_url && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-primary/70 hover:text-primary" onClick={() => handleReverify(e)} disabled={isReverifying || !part} aria-label="Reverificar conteúdo do link">
                                  {isReverifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reverificar conteúdo do link</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={() => handleReportBroken(e)} aria-label="Reportar link quebrado">
                                  <AlertOctagon className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reportar link quebrado</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEdit(e)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteEntry(e)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pesquisa registrada para esta peça.</p>
        )}

        {showForm ? (
          <ResearchForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={() => { setShowForm(false); resetForm(); }} isPending={addMutation.isPending} label="Salvar" />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Switch id="include-parallel" checked={includeParallel} onCheckedChange={setIncludeParallel} />
                <Label htmlFor="include-parallel" className="text-xs cursor-pointer">
                  Incluir peças paralelas na busca
                </Label>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-muted-foreground">
                    {includeParallel ? "Original + paralelas" : "Apenas Original XCMG"}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Por padrão, a busca retorna SOMENTE peças originais XCMG. Ative para também ver paralelas.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={handleAIResearch}
                disabled={aiResearch.isPending || !part}
                className="gap-1"
              >
                {aiResearch.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <SearchIcon className="h-3 w-3" />}
                {aiResearch.isPending ? "Pesquisando..." : "Pesquisar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="h-3 w-3 mr-1" /> Manual
              </Button>
            </div>
          </div>
        )}

        <Dialog open={!!editEntry} onOpenChange={o => { if (!o) { setEditEntry(null); resetForm(); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Editar Pesquisa</DialogTitle><DialogDescription>Atualize os dados.</DialogDescription></DialogHeader>
            <ResearchForm form={form} setForm={setForm} onSubmit={handleSaveEdit} onCancel={() => { setEditEntry(null); resetForm(); }} isPending={updateMutation.isPending} label="Salvar" />
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteEntry} onOpenChange={o => !o && setDeleteEntry(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Excluir pesquisa?</AlertDialogTitle><AlertDialogDescription>Pesquisa de "{deleteEntry?.distributor_name}" será excluída.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

function ResearchForm({ form, setForm, onSubmit, onCancel, isPending, label }: {
  form: any; setForm: any; onSubmit: () => void; onCancel: () => void; isPending: boolean; label: string;
}) {
  return (
    <div className="space-y-3 border rounded-lg p-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Distribuidor *</Label><Input value={form.distributor_name} onChange={e => setForm((f: any) => ({ ...f, distributor_name: e.target.value }))} /></div>
        <div><Label className="text-xs">Preço *</Label><Input type="number" value={form.price_found} onChange={e => setForm((f: any) => ({ ...f, price_found: e.target.value }))} /></div>
        <div><Label className="text-xs">Prazo (dias)</Label><Input type="number" value={form.delivery_days} onChange={e => setForm((f: any) => ({ ...f, delivery_days: e.target.value }))} /></div>
        <div><Label className="text-xs">Disponibilidade</Label>
          <Select value={form.availability} onValueChange={v => setForm((f: any) => ({ ...f, availability: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="em estoque">Em estoque</SelectItem><SelectItem value="sob encomenda">Sob encomenda</SelectItem><SelectItem value="indisponível">Indisponível</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs">Condições de pagamento</Label><Input value={form.payment_terms} onChange={e => setForm((f: any) => ({ ...f, payment_terms: e.target.value }))} /></div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSubmit} disabled={isPending}>{isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : label}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
