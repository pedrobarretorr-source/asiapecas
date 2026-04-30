import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLink, RefreshCw, Info, AlertTriangle, ShieldCheck, ShieldAlert, FileSearch, Link as LinkIcon, ChevronDown, Activity } from "lucide-react";
import type { Customer } from "@/hooks/use-customers";
import { useEnrichCustomer, useVerifyCustomerSource, useEnrichFromUrl } from "@/hooks/use-customers";
import { toast } from "sonner";

type Evidence = { source_url: string; source_excerpt: string };
type WeakSource = { url: string; title?: string; description?: string; level?: string };
type Telemetry = {
  searched_queries?: number;
  urls_returned?: number;
  urls_unique?: number;
  urls_scraped_ok?: number;
  urls_matched_strong?: number;
  urls_matched_medium?: number;
  urls_matched_weak?: number;
  country?: string;
  rounds_executed?: number;
  round1_yielded?: number;
  round2_yielded?: number;
  queries_round1?: string[];
  queries_round2?: string[];
  search_override?: string | null;
  core_name_used?: string;
};

type Enrichment = {
  official_name?: string | null;
  cnpj_formatted?: string | null;
  cnae?: string | null;
  company_size?: string | null;
  segment?: string;
  website?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  alt_phone?: string | null;
  full_address?: string | null;
  decision_maker_role?: string | null;
  commercial_notes?: string | null;
  confidence?: "high" | "medium" | "low";
  sources?: string[];
  weak_sources?: WeakSource[];
  evidence?: Record<string, Evidence>;
  telemetry?: Telemetry;
  _note?: string;
};

export function EnrichmentPanel({ customer }: { customer: Customer }) {
  const enrich = useEnrichCustomer();
  const verify = useVerifyCustomerSource();
  const enrichUrl = useEnrichFromUrl();
  const [manualUrl, setManualUrl] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideName, setOverrideName] = useState("");
  const data = (customer.enrichment_data || {}) as Enrichment;
  const isEnriched = customer.enrichment_status === "enriched";
  const sources = data.sources || [];
  const weakSources = data.weak_sources || [];
  const telemetry = data.telemetry || {};
  const hasNoVerifiedSources = isEnriched && sources.length === 0;

  const rawName = customer.company || customer.name || "";
  // Detect "risky" names: legal suffixes, parens, accents in odd places, lots of punctuation
  const nameLooksRisky = /\(|\)|S\/?A|S\.A|LTDA|EIRELI|EPP|\bME\b|\bCIA\b|\.[A-Z]/i.test(rawName) || /[À-Ÿ]/.test(rawName.slice(0, 1));
  const cleanedPreview = rawName
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(s\/?a|s\.?a\.?|ltda|eireli|epp|me|cia|companhia)\b\.?/gi, " ")
    .replace(/[.,;:/\\"'`]/g, " ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim();

  const submitManualUrl = async () => {
    const url = manualUrl.trim();
    if (!url) return;
    try { new URL(url); } catch { toast.error("URL inválida"); return; }
    await enrichUrl.mutateAsync({ customer_id: customer.id, url });
    setManualUrl("");
  };

  const runEnrich = (override?: string) => {
    enrich.mutate(override ? { customer_id: customer.id, search_override: override } : customer.id);
  };

  const submitOverride = () => {
    const v = overrideName.trim();
    if (!v) return;
    runEnrich(v);
    setOverrideOpen(false);
    setOverrideName("");
  };

  if (!isEnriched) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <Info className="h-10 w-10 mx-auto text-primary" />
          <div>
            <p className="font-semibold">Nenhuma informação carregada ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Buscamos páginas públicas reais para extrair dados verificados sobre {rawName}.
            </p>
            {nameLooksRisky && (
              <p className="text-xs text-muted-foreground mt-2">
                Vamos buscar como <strong className="text-foreground">{cleanedPreview}</strong>.
              </p>
            )}
          </div>
          <Button onClick={() => runEnrich()} disabled={enrich.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${enrich.isPending ? "animate-spin" : ""}`} />
            {enrich.isPending ? "Pesquisando…" : "Carregar informações"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const confColor = data.confidence === "high" ? "default" : data.confidence === "medium" ? "secondary" : "outline";

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Informações verificadas</span>
            <Badge variant={confColor as never} className="gap-1">
              {data.confidence === "high" ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
              Confiança: {data.confidence || "—"}
            </Badge>
            <Badge variant="outline">{sources.length} fonte(s) verificada(s)</Badge>
            {weakSources.length > 0 && (
              <Badge variant="outline" className="border-amber-400/50 text-amber-700">{weakSources.length} indício(s)</Badge>
            )}
            {customer.enriched_at && (
              <span className="text-xs text-muted-foreground">
                · {new Date(customer.enriched_at).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => runEnrich()} disabled={enrich.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${enrich.isPending ? "animate-spin" : ""}`} />
            {enrich.isPending ? "Pesquisando…" : "Reverificar"}
          </Button>
        </div>

        {/* Search override */}
        {(nameLooksRisky || hasNoVerifiedSources) && (
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <FileSearch className="h-3.5 w-3.5 text-primary" />
                  {nameLooksRisky
                    ? <>Buscamos como <strong>{cleanedPreview}</strong>. Não bateu? </>
                    : <>A busca não encontrou nada. </>}
                  Tente outro nome:
                </p>
                {!overrideOpen && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setOverrideOpen(true); setOverrideName(cleanedPreview); }}>
                    Buscar com outro nome
                  </Button>
                )}
              </div>
              {overrideOpen && (
                <div className="flex gap-2">
                  <Input
                    value={overrideName}
                    onChange={(e) => setOverrideName(e.target.value)}
                    placeholder="Ex.: Anglo American, Andrade Gutierrez Engenharia"
                    className="h-9 text-sm"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") submitOverride(); }}
                  />
                  <Button size="sm" onClick={submitOverride} disabled={enrich.isPending || !overrideName.trim()}>
                    {enrich.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Buscar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOverrideOpen(false)}>Cancelar</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasNoVerifiedSources && (
          <Card className="border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/10">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm flex-1">
                <p className="font-semibold">Sem confirmação inequívoca</p>
                <p className="text-muted-foreground mt-1">
                  {data._note || "Não conseguimos verificar o nome da empresa em fontes públicas. Cole abaixo uma URL (site, LinkedIn, perfil) que você sabe ser desta empresa para forçarmos a leitura."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual URL input */}
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-primary" />
              Adicionar fonte manual
            </p>
            <p className="text-[11px] text-muted-foreground">
              Tem o site oficial, LinkedIn ou perfil público desta empresa? Cole a URL aqui para extrair dados direto da página.
            </p>
            <div className="flex gap-2">
              <Input
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://site-da-empresa.com.br"
                className="h-9 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") submitManualUrl(); }}
              />
              <Button size="sm" onClick={submitManualUrl} disabled={enrichUrl.isPending || !manualUrl.trim()}>
                {enrichUrl.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Usar URL"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {!hasNoVerifiedSources && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <EvidenceField label="Razão social" value={data.official_name} evidence={data.evidence?.official_name} />
            <EvidenceField label="CNPJ" value={data.cnpj_formatted} evidence={data.evidence?.cnpj_formatted} mono />
            <EvidenceField label="CNAE" value={data.cnae} evidence={data.evidence?.cnae} />
            <EvidenceField label="Porte" value={data.company_size} evidence={data.evidence?.company_size} />
            <EvidenceField label="Setor" value={data.segment} evidence={data.evidence?.segment} capitalize />
            <EvidenceField label="Decisor típico" value={data.decision_maker_role} evidence={data.evidence?.decision_maker_role} />
            <EvidenceField label="Telefone alt." value={data.alt_phone} evidence={data.evidence?.alt_phone} />
            <EvidenceField label="Endereço" value={data.full_address} evidence={data.evidence?.full_address} />
          </div>
        )}

        {data.commercial_notes && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Observações comerciais</p>
                {data.evidence?.commercial_notes && (
                  <EvidenceTooltip evidence={data.evidence.commercial_notes} />
                )}
              </div>
              <p className="text-sm">{data.commercial_notes}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          {data.website && <LinkBadge url={data.website} label="Site" />}
          {data.linkedin && <LinkBadge url={data.linkedin} label="LinkedIn" />}
          {data.instagram && <LinkBadge url={data.instagram} label="Instagram" />}
        </div>

        {sources.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Fontes verificadas</p>
            <div className="space-y-1">
              {sources.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <a href={s} target="_blank" rel="noopener noreferrer" className="flex-1 text-primary hover:underline truncate">
                    {s}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={verify.isPending}
                    onClick={async () => {
                      const r = await verify.mutateAsync({ url: s, customer_name: customer.company || customer.name });
                      if (r.ok) toast.success("Fonte ainda contém o nome da empresa.");
                      else toast.warning("Fonte não confirma mais o nome do cliente.");
                    }}
                  >
                    <FileSearch className="h-3 w-3 mr-1" />
                    Reverificar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {weakSources.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Indícios (não confirmados)</p>
            <div className="space-y-1.5">
              {weakSources.map((s, i) => (
                <div key={i} className="border border-amber-200/40 bg-amber-50/30 dark:bg-amber-950/10 rounded-md p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] border-amber-400/40 text-amber-700">indício</Badge>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-primary hover:underline truncate">
                      {s.title || s.url}
                    </a>
                  </div>
                  {s.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnostic */}
        {Object.keys(telemetry).length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7">
                <Activity className="h-3 w-3" />
                Diagnóstico da pesquisa
                <ChevronDown className="h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-[11px]">
                <DiagItem label="Consultas executadas" value={telemetry.searched_queries} />
                <DiagItem label="Rounds executados" value={telemetry.rounds_executed} />
                <DiagItem label="URLs encontradas" value={telemetry.urls_returned} />
                <DiagItem label="URLs únicas" value={telemetry.urls_unique} />
                <DiagItem label="Páginas lidas" value={telemetry.urls_scraped_ok} />
                <DiagItem label="Match forte" value={telemetry.urls_matched_strong} />
                <DiagItem label="Match médio" value={telemetry.urls_matched_medium} />
                <DiagItem label="Match fraco" value={telemetry.urls_matched_weak} />
                <DiagItem label="Round 1 → URLs" value={telemetry.round1_yielded} />
                <DiagItem label="Round 2 → URLs" value={telemetry.round2_yielded} />
                <DiagItem label="País" value={telemetry.country?.toUpperCase()} />
                <DiagItem label="Termo override" value={telemetry.search_override || "—"} />
              </div>
              {telemetry.core_name_used && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Nome usado para busca: <strong className="text-foreground">{telemetry.core_name_used}</strong>
                </p>
              )}
              {(telemetry.queries_round1?.length || telemetry.queries_round2?.length) ? (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Queries enviadas</p>
                  {telemetry.queries_round1?.map((q, i) => (
                    <div key={`r1-${i}`} className="text-[11px] font-mono bg-muted/30 rounded px-2 py-1">
                      <span className="text-muted-foreground mr-1">R1:</span>{q}
                    </div>
                  ))}
                  {telemetry.queries_round2?.map((q, i) => (
                    <div key={`r2-${i}`} className="text-[11px] font-mono bg-muted/30 rounded px-2 py-1">
                      <span className="text-muted-foreground mr-1">R2:</span>{q}
                    </div>
                  ))}
                </div>
              ) : null}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </TooltipProvider>
  );
}

function DiagItem({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="border rounded-md p-2 bg-muted/20">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function EvidenceField({
  label, value, evidence, mono, capitalize,
}: { label: string; value?: string | null; evidence?: Evidence; mono?: boolean; capitalize?: boolean }) {
  const hasEvidence = !!evidence?.source_excerpt;
  return (
    <div className="border rounded-md p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        {hasEvidence && <EvidenceTooltip evidence={evidence!} />}
      </div>
      <p className={`text-sm mt-1 ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}>
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

function EvidenceTooltip({ evidence }: { evidence: Evidence }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a href={evidence.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
          <ShieldCheck className="h-3 w-3" />
          fonte
        </a>
      </TooltipTrigger>
      <TooltipContent className="max-w-md">
        <p className="text-xs italic mb-1">"{evidence.source_excerpt}"</p>
        <p className="text-[10px] text-muted-foreground truncate">{evidence.source_url}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function LinkBadge({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Badge variant="outline" className="gap-1 hover:bg-accent">
        <ExternalLink className="h-3 w-3" />
        {label}
      </Badge>
    </a>
  );
}
