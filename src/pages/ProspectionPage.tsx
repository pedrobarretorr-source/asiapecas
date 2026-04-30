import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProspects, useUpdateProspect, useDeleteProspect, useConvertToCustomer, useSearchProspectsAI, Prospect } from "@/hooks/use-prospects";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Sparkles, Users, Globe, TrendingUp, Trash2, Edit, UserPlus, Loader2,
  Phone, Mail, MessageSquare, ChevronDown, ChevronRight, Package, MapPin,
  Building2, ShoppingCart, ExternalLink, FileText
} from "lucide-react";

const COUNTRIES = [
  { value: "BR", label: "🇧🇷 Brasil" },
  { value: "VE", label: "🇻🇪 Venezuela" },
  { value: "GY", label: "🇬🇾 Guiana" },
];

const BR_STATES = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const VE_STATES = ["Amazonas","Anzoátegui","Apure","Aragua","Barinas","Bolívar","Carabobo","Cojedes","Delta Amacuro","Falcón","Guárico","Lara","Mérida","Miranda","Monagas","Nueva Esparta","Portuguesa","Sucre","Táchira","Trujillo","Vargas","Yaracuy","Zulia"];
const GY_STATES = ["Barima-Waini","Cuyuni-Mazaruni","Demerara-Mahaica","East Berbice-Corentyne","Essequibo Islands-West Demerara","Mahaica-Berbice","Pomeroon-Supenaam","Potaro-Siparuni","Upper Demerara-Berbice","Upper Takutu-Upper Essequibo"];

const SEGMENTS = ["mineração", "construção", "logística", "energia", "infraestrutura"];
const STATUSES = ["novo", "contatado", "qualificado", "negociação", "convertido", "descartado"];

const statusColors: Record<string, string> = {
  novo: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contatado: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  qualificado: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "negociação": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  convertido: "bg-green-500/10 text-green-400 border-green-500/20",
  descartado: "bg-muted text-muted-foreground border-muted",
};

const pipelineSteps = [
  { key: "novo", label: "Novo", icon: "🆕" },
  { key: "contatado", label: "Contatado", icon: "📞" },
  { key: "qualificado", label: "Qualificado", icon: "✅" },
  { key: "negociação", label: "Negociação", icon: "🤝" },
  { key: "convertido", label: "Convertido", icon: "🎉" },
];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold">{score}</span>
    </div>
  );
}

function ProspectCard({
  prospect,
  onEdit,
  onConvert,
  onDelete,
  onStatusChange,
  parts,
}: {
  prospect: Prospect;
  onEdit: () => void;
  onConvert: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  parts: any[];
}) {
  const [expanded, setExpanded] = useState(false);
  const { addItem } = useCart();

  const matchedPartsData = parts.filter(p =>
    prospect.matched_parts?.includes(p.material)
  );

  const parsedPartsDetails = (() => {
    if (!prospect.notes?.startsWith("PEÇAS RECOMENDADAS:")) return [];
    return prospect.notes
      .replace("PEÇAS RECOMENDADAS:\n", "")
      .split("\n")
      .filter(l => l.startsWith("•"))
      .map(l => {
        const match = l.match(/^• (\S+) - (.+?): (.+)$/);
        if (!match) return null;
        return { material: match[1], description: match[2], reason: match[3] };
      })
      .filter(Boolean) as { material: string; description: string; reason: string }[];
  })();

  const whatsappPhone = prospect.phone?.replace(/[\s()-]/g, "").replace("+", "");
  const whatsappMsg = encodeURIComponent(
    `Olá ${prospect.name}! Sou da Lopes & Lopes, distribuidor autorizado XCMG. Gostaria de apresentar nossas soluções em peças para máquinas pesadas. Podemos conversar?`
  );

  return (
    <Card className={`transition-all ${expanded ? "ring-1 ring-primary/30" : "hover:bg-accent/30"}`}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer">
            <div className="flex items-start gap-3">
              {/* Avatar/Icon */}
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{prospect.name}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[prospect.status]}`}>
                    {prospect.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                  {prospect.company && <span className="font-medium">{prospect.company}</span>}
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {prospect.country === "BR" ? "🇧🇷" : prospect.country === "VE" ? "🇻🇪" : "🇬🇾"}
                    {" "}{prospect.city}{prospect.state ? `, ${prospect.state}` : ""}
                  </span>
                  {prospect.segment && <span className="capitalize">· {prospect.segment}</span>}
                </div>

                {/* Contact quick icons */}
                <div className="flex items-center gap-1 mt-2">
                  {prospect.phone && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={`tel:${prospect.phone}`} title={prospect.phone} onClick={e => e.stopPropagation()}>
                          <Phone className="h-3.5 w-3.5 text-blue-400" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={`https://wa.me/${whatsappPhone}?text=${whatsappMsg}`} target="_blank" rel="noopener" title="WhatsApp" onClick={e => e.stopPropagation()}>
                          <MessageSquare className="h-3.5 w-3.5 text-green-400" />
                        </a>
                      </Button>
                    </>
                  )}
                  {prospect.email && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={`mailto:${prospect.email}?subject=Peças XCMG - Lopes %26 Lopes`} title={prospect.email} onClick={e => e.stopPropagation()}>
                        <Mail className="h-3.5 w-3.5 text-orange-400" />
                      </a>
                    </Button>
                  )}
                  {(prospect.matched_parts?.length || 0) > 0 && (
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      <Package className="h-3 w-3 mr-0.5" /> {prospect.matched_parts?.length} peças
                    </Badge>
                  )}
                </div>
              </div>

              {/* Score + expand */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <ScoreBar score={prospect.score} />
                {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            {/* Contact details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <div className="text-sm flex items-center gap-2">
                  {prospect.phone ? (
                    <a href={`tel:${prospect.phone}`} className="text-blue-400 hover:underline">{prospect.phone}</a>
                  ) : <span className="text-muted-foreground italic">Não informado</span>}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="text-sm">
                  {prospect.email ? (
                    <a href={`mailto:${prospect.email}`} className="text-orange-400 hover:underline">{prospect.email}</a>
                  ) : <span className="text-muted-foreground italic">Não informado</span>}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CNPJ/CPF</Label>
                <div className="text-sm">{prospect.cnpj_cpf || <span className="text-muted-foreground italic">Não informado</span>}</div>
              </div>
            </div>

            {/* AI Summary */}
            {prospect.ai_summary && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">Análise</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{prospect.ai_summary}</p>
              </div>
            )}

            {/* Recommended parts */}
            {(matchedPartsData.length > 0 || parsedPartsDetails.length > 0) && (
              <div>
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" /> Peças Recomendadas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {matchedPartsData.length > 0
                    ? matchedPartsData.map((part: any) => {
                        const detail = parsedPartsDetails.find(d => d.material === part.material);
                        return (
                          <div key={part.id} className="flex items-center gap-3 rounded-md border bg-card p-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{part.material}</Badge>
                                <span className="text-xs truncate">{part.description}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Estoque: {part.stock} · R$ {Number(part.estimated_price).toLocaleString("pt-BR")}
                              </div>
                              {detail?.reason && (
                                <div className="text-[10px] text-primary/70 mt-0.5 italic">💡 {detail.reason}</div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              title="Adicionar ao orçamento"
                              onClick={() => addItem({
                                part_id: part.id,
                                material: part.material,
                                description: part.description,
                                unit_price: Number(part.estimated_price),
                                stock: part.stock,
                              })}
                            >
                              <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          </div>
                        );
                      })
                    : parsedPartsDetails.map((d, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-md border bg-card p-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{d.material}</Badge>
                              <span className="text-xs truncate">{d.description}</span>
                            </div>
                            <div className="text-[10px] text-primary/70 mt-0.5 italic">💡 {d.reason}</div>
                          </div>
                        </div>
                      ))
                  }
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
              <Select value={prospect.status} onValueChange={onStatusChange}>
                <SelectTrigger className={`h-8 text-xs w-[130px] ${statusColors[prospect.status] || ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onEdit}>
                <Edit className="h-3 w-3 mr-1" /> Editar
              </Button>
              {prospect.phone && (
                <Button variant="outline" size="sm" className="h-8 text-xs text-green-400 border-green-500/20" asChild>
                  <a href={`https://wa.me/${whatsappPhone}?text=${whatsappMsg}`} target="_blank" rel="noopener">
                    <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                  </a>
                </Button>
              )}
              {prospect.status !== "convertido" && (
                <Button variant="outline" size="sm" className="h-8 text-xs text-green-400 border-green-500/20" onClick={onConvert}>
                  <UserPlus className="h-3 w-3 mr-1" /> Converter
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive ml-auto">
                    <Trash2 className="h-3 w-3 mr-1" /> Descartar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover prospect?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Remover</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function ProspectionPage() {
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSegment, setFilterSegment] = useState<string>("");

  const [aiCountry, setAiCountry] = useState("BR");
  const [aiState, setAiState] = useState("");
  const [aiSegment, setAiSegment] = useState("");
  const [aiCount, setAiCount] = useState(5);

  const [editProspect, setEditProspect] = useState<Prospect | null>(null);
  const [editForm, setEditForm] = useState<Partial<Prospect>>({});

  const { data: prospects = [], isLoading } = useProspects({
    country: filterCountry || undefined,
    status: filterStatus || undefined,
    segment: filterSegment || undefined,
    search: search || undefined,
  });

  // Fetch parts for matching
  const { data: allParts = [] } = useQuery({
    queryKey: ["parts-for-prospects"],
    queryFn: async () => {
      const allMaterials = new Set(prospects.flatMap(p => p.matched_parts || []));
      if (allMaterials.size === 0) return [];
      const { data } = await supabase
        .from("parts")
        .select("id, material, description, stock, estimated_price")
        .in("material", Array.from(allMaterials));
      return data || [];
    },
    enabled: prospects.length > 0,
  });

  const updateProspect = useUpdateProspect();
  const deleteProspect = useDeleteProspect();
  const convertToCustomer = useConvertToCustomer();
  const searchAI = useSearchProspectsAI();

  const stateOptions = aiCountry === "BR" ? BR_STATES : aiCountry === "VE" ? VE_STATES : GY_STATES;

  const totalProspects = prospects.length;
  const byCountry = prospects.reduce((acc, p) => { acc[p.country] = (acc[p.country] || 0) + 1; return acc; }, {} as Record<string, number>);
  const avgScore = totalProspects > 0 ? Math.round(prospects.reduce((s, p) => s + p.score, 0) / totalProspects) : 0;

  const handleEdit = (p: Prospect) => {
    setEditProspect(p);
    setEditForm({ name: p.name, company: p.company, email: p.email, phone: p.phone, cnpj_cpf: p.cnpj_cpf, status: p.status, notes: p.notes });
  };

  const handleSaveEdit = () => {
    if (!editProspect) return;
    updateProspect.mutate({ id: editProspect.id, ...editForm }, { onSuccess: () => setEditProspect(null) });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Prospecção Inteligente</h1>
          <p className="text-sm text-muted-foreground">Encontre clientes potenciais — contatos reais, peças sugeridas e ações rápidas</p>
        </div>

        {/* Pipeline Visual */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pipelineSteps.map(step => {
            const count = prospects.filter(p => p.status === step.key).length;
            const isActive = filterStatus === step.key;
            return (
              <button
                key={step.key}
                onClick={() => setFilterStatus(isActive ? "" : step.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : `${statusColors[step.key]} hover:opacity-80`
                }`}
              >
                <span>{step.icon}</span>
                <span>{step.label}</span>
                <Badge variant={isActive ? "secondary" : "outline"} className="text-[10px] h-5 px-1.5 ml-1">
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="h-3.5 w-3.5" /> Total</div>
            <p className="text-2xl font-bold">{totalProspects}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Globe className="h-3.5 w-3.5" /> Países</div>
            <p className="text-sm font-medium">{Object.entries(byCountry).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3.5 w-3.5" /> Convertidos</div>
            <p className="text-2xl font-bold text-green-400">{prospects.filter(p => p.status === "convertido").length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Sparkles className="h-3.5 w-3.5" /> Score Médio</div>
            <p className="text-2xl font-bold">{avgScore}</p>
          </CardContent></Card>
        </div>

        {/* AI Search Panel */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Buscar Prospects
            </CardTitle>
            <p className="text-xs text-muted-foreground">Encontre empresas reais com telefone, email e peças recomendadas do seu estoque</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Select value={aiCountry} onValueChange={v => { setAiCountry(v); setAiState(""); }}>
                <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={aiState} onValueChange={setAiState}>
                <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {stateOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={aiSegment} onValueChange={setAiSegment}>
                <SelectTrigger><SelectValue placeholder="Segmento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(aiCount)} onValueChange={v => setAiCount(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 15].map(n => <SelectItem key={n} value={String(n)}>{n} prospects</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={() => searchAI.mutate({
                  country: aiCountry,
                  state: aiState && aiState !== "todos" ? aiState : undefined,
                  segment: aiSegment && aiSegment !== "todos" ? aiSegment : undefined,
                  count: aiCount,
                })}
                disabled={searchAI.isPending}
                className="font-semibold"
              >
                {searchAI.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, empresa, telefone, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCountry} onValueChange={v => setFilterCountry(v === "todos" ? "" : v)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="País" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSegment} onValueChange={v => setFilterSegment(v === "todos" ? "" : v)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Prospect Cards */}
        <div className="space-y-3">
          {isLoading ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /><p className="text-sm text-muted-foreground">Carregando prospects...</p></CardContent></Card>
          ) : prospects.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum prospect encontrado.</p>
              <p className="text-xs text-muted-foreground mt-1">Use a busca acima para gerar prospects com contatos reais.</p>
            </CardContent></Card>
          ) : prospects.map(p => (
            <ProspectCard
              key={p.id}
              prospect={p}
              parts={allParts}
              onEdit={() => handleEdit(p)}
              onConvert={() => convertToCustomer.mutate(p)}
              onDelete={() => deleteProspect.mutate(p.id)}
              onStatusChange={(status) => updateProspect.mutate({ id: p.id, status })}
            />
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editProspect} onOpenChange={o => !o && setEditProspect(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Editar Prospect</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Empresa</Label><Input value={editForm.company || ""} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={editForm.phone || ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+55 11 9xxxx-xxxx" /></div>
                <div><Label>Email</Label><Input value={editForm.email || ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>CNPJ/CPF</Label><Input value={editForm.cnpj_cpf || ""} onChange={e => setEditForm(f => ({ ...f, cnpj_cpf: e.target.value }))} /></div>
                <div><Label>Status</Label>
                  <Select value={editForm.status || "novo"} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notas</Label><Textarea value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
              <Button onClick={handleSaveEdit} disabled={updateProspect.isPending} className="w-full">Salvar Alterações</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
