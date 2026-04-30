import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-role";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Loader2, ShieldAlert, Search, ExternalLink, Tag, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminVitrinePage() {
  const isAdmin = useIsAdmin();
  const { user } = useAuth();

  if (!user) return <AppLayout><div className="p-6">Faça login.</div></AppLayout>;
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-6 max-w-2xl mx-auto text-center space-y-4">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Acesso restrito</h1>
          <p className="text-muted-foreground">Você precisa ter a função <code className="bg-muted px-1.5 py-0.5 rounded">admin</code> para gerenciar a vitrine. Peça a um administrador para te adicionar via tabela <code className="bg-muted px-1.5 py-0.5 rounded">user_roles</code>.</p>
          <p className="text-xs text-muted-foreground">Seu user id: <code className="bg-muted px-1.5 py-0.5 rounded">{user.id}</code></p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk']">Vitrine — Loja Pública</h1>
            <p className="text-sm text-muted-foreground">Configure banners, destaques, promoções e tracking que aparecem em <code className="bg-muted px-1 rounded">/cotacao</code>.</p>
          </div>
          <a href="/cotacao" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> Ver no site
            </Button>
          </a>
        </div>

        <Tabs defaultValue="banners">
          <TabsList>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="featured">Destaques</TabsTrigger>
            <TabsTrigger value="promotions">Promoções</TabsTrigger>
            <TabsTrigger value="settings">Tracking & Settings</TabsTrigger>
            <TabsTrigger value="leads">Leads B2B</TabsTrigger>
          </TabsList>

          <TabsContent value="banners" className="mt-4"><BannersPanel /></TabsContent>
          <TabsContent value="featured" className="mt-4"><FeaturedPanel /></TabsContent>
          <TabsContent value="promotions" className="mt-4"><PromotionsPanel /></TabsContent>
          <TabsContent value="settings" className="mt-4"><SettingsPanel /></TabsContent>
          <TabsContent value="leads" className="mt-4"><LeadsPanel /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ---------------- Banners ----------------
function BannersPanel() {
  const qc = useQueryClient();
  const { data: banners } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data } = await supabase.from("vitrine_banners").select("*").order("sort_order");
      return data || [];
    },
  });
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `banners/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("vitrine").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("vitrine").getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) { toast.error(e.message); return null; }
    finally { setUploading(false); }
  };

  const create = async () => {
    const { error } = await supabase.from("vitrine_banners").insert({ image_url: "", title: "Novo banner", lang: "pt", sort_order: (banners?.length || 0), active: false });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-banners"] });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 text-sm space-y-1">
          <p className="font-semibold text-foreground">Como publicar um banner</p>
          <ol className="list-decimal list-inside text-muted-foreground space-y-0.5 text-xs">
            <li>Suba uma imagem horizontal (recomendado <strong>1920×600</strong>).</li>
            <li>Defina título, subtítulo e botão de ação (CTA).</li>
            <li>Ative o switch <strong>"Ativo"</strong>.</li>
            <li>Aparece imediatamente no topo de <code className="bg-background px-1 rounded">/cotacao</code>.</li>
          </ol>
        </CardContent>
      </Card>

      <Button onClick={create} className="gap-2"><Plus className="h-4 w-4" />Novo banner</Button>
      <div className="grid md:grid-cols-2 gap-4">
        {(banners || []).map((b: any) => (
          <BannerCard key={b.id} banner={b} onUpload={handleUpload} uploading={uploading} onChange={() => qc.invalidateQueries({ queryKey: ["admin-banners"] })} />
        ))}
        {banners?.length === 0 && <p className="text-sm text-muted-foreground col-span-2">Nenhum banner. Crie o primeiro.</p>}
      </div>
    </div>
  );
}

function bannerStatus(b: any): { label: string; color: string } {
  if (!b.active) return { label: "INATIVO", color: "bg-muted text-muted-foreground" };
  const now = new Date();
  if (b.starts_at && new Date(b.starts_at) > now) return { label: "AGENDADO", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  if (b.ends_at && new Date(b.ends_at) < now) return { label: "EXPIRADO", color: "bg-destructive/15 text-destructive border-destructive/30" };
  return { label: "ATIVO", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
}

function BannerCard({ banner, onUpload, uploading, onChange }: any) {
  const [b, setB] = useState(banner);
  const status = bannerStatus(b);

  const save = async () => {
    if (!b.image_url) {
      toast.error("Suba uma imagem antes de salvar.");
      return;
    }
    const { error } = await supabase.from("vitrine_banners").update({
      image_url: b.image_url, title: b.title, subtitle: b.subtitle, cta_label: b.cta_label, cta_link: b.cta_link, lang: b.lang, sort_order: b.sort_order, active: b.active,
    }).eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success("Salvo"); onChange(); }
  };
  const remove = async () => {
    if (!confirm("Excluir este banner?")) return;
    await supabase.from("vitrine_banners").delete().eq("id", b.id);
    onChange();
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={status.color}>{status.label}</Badge>
          {!b.image_url && (
            <span className="text-[11px] text-destructive inline-flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> imagem obrigatória
            </span>
          )}
        </div>

        {/* Real preview at hero proportions */}
        <div className="aspect-[16/5] w-full rounded-md overflow-hidden bg-muted relative">
          {b.image_url ? (
            <>
              <img src={b.image_url} alt="" className="w-full h-full object-cover" />
              {(b.title || b.subtitle) && (
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center px-4 text-white">
                  {b.title && <p className="font-bold text-sm md:text-base line-clamp-1">{b.title}</p>}
                  {b.subtitle && <p className="text-[11px] md:text-xs opacity-80 line-clamp-1">{b.subtitle}</p>}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <Input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await onUpload(f); if (url) setB({ ...b, image_url: url }); } }} />
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <Input placeholder="Título" value={b.title || ""} onChange={(e) => setB({ ...b, title: e.target.value })} />
        <Input placeholder="Subtítulo" value={b.subtitle || ""} onChange={(e) => setB({ ...b, subtitle: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="CTA texto" value={b.cta_label || ""} onChange={(e) => setB({ ...b, cta_label: e.target.value })} />
          <Input placeholder="CTA link (#pecas, /cotacao/c/...)" value={b.cta_link || ""} onChange={(e) => setB({ ...b, cta_link: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Idioma (pt/en/es/all)" value={b.lang} onChange={(e) => setB({ ...b, lang: e.target.value })} />
          <Input type="number" placeholder="Ordem" value={b.sort_order} onChange={(e) => setB({ ...b, sort_order: Number(e.target.value) })} />
          <div className="flex items-center gap-2"><Switch checked={b.active} onCheckedChange={(v) => setB({ ...b, active: v })} /><span className="text-xs">Ativo</span></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} className="flex-1" disabled={!b.image_url}>Salvar</Button>
          <a href="/cotacao" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1"><ExternalLink className="h-3.5 w-3.5" />Ver</Button>
          </a>
          <Button size="sm" variant="destructive" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- Featured ----------------
function FeaturedPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: featured } = useQuery({
    queryKey: ["admin-featured"],
    queryFn: async () => {
      const { data } = await supabase.from("vitrine_featured_parts")
        .select("id, badge_label, sort_order, active, part:parts(id, material, description)")
        .order("sort_order");
      return data || [];
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ["search-parts", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase.from("parts").select("id, material, description")
        .or(`material.ilike.%${search}%,description.ilike.%${search}%`).limit(10);
      return data || [];
    },
  });

  const add = async (part_id: string) => {
    await supabase.from("vitrine_featured_parts").insert({ part_id, sort_order: (featured?.length || 0), badge_label: "Destaque" });
    qc.invalidateQueries({ queryKey: ["admin-featured"] });
    setSearch("");
  };
  const update = async (id: string, patch: any) => {
    await supabase.from("vitrine_featured_parts").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-featured"] });
  };
  const remove = async (id: string) => {
    await supabase.from("vitrine_featured_parts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-featured"] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Adicionar peça destaque</CardTitle></CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por código ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {searchResults && searchResults.length > 0 && (
            <div className="mt-2 border rounded divide-y max-h-60 overflow-y-auto">
              {searchResults.map((p: any) => (
                <button key={p.id} onClick={() => add(p.id)} className="w-full text-left p-2 hover:bg-muted text-sm flex justify-between items-center">
                  <span><Badge variant="outline" className="font-mono mr-2">{p.material}</Badge>{p.description}</span>
                  <Plus className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(featured || []).map((f: any) => (
          <Card key={f.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <Badge variant="outline" className="font-mono">{f.part?.material}</Badge>
              <span className="flex-1 text-sm truncate">{f.part?.description}</span>
              <Input className="w-32 h-8" placeholder="Badge" defaultValue={f.badge_label || ""} onBlur={(e) => update(f.id, { badge_label: e.target.value })} />
              <Input className="w-20 h-8" type="number" defaultValue={f.sort_order} onBlur={(e) => update(f.id, { sort_order: Number(e.target.value) })} />
              <Switch checked={f.active} onCheckedChange={(v) => update(f.id, { active: v })} />
              <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------- Promotions ----------------
function PromotionsPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; material: string; description: string; estimated_price: number } | null>(null);
  const [promoPrice, setPromoPrice] = useState<string>("");
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");

  const { data: promos } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("part_promotions")
        .select("id, promo_price, active, starts_at, ends_at, created_at, part:parts(id, material, description, estimated_price)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ["search-promo-parts", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase.from("parts").select("id, material, description, estimated_price")
        .or(`material.ilike.%${search}%,description.ilike.%${search}%`).limit(10);
      return data || [];
    },
  });

  const reset = () => { setSelected(null); setPromoPrice(""); setStartsAt(""); setEndsAt(""); setSearch(""); };

  const create = async () => {
    if (!selected) return toast.error("Selecione uma peça.");
    const price = Number(promoPrice);
    if (!price || price <= 0) return toast.error("Informe um preço promocional válido.");
    const payload: any = { part_id: selected.id, promo_price: price, active: true };
    if (startsAt) payload.starts_at = new Date(startsAt).toISOString();
    if (endsAt) payload.ends_at = new Date(endsAt).toISOString();
    const { error } = await supabase.from("part_promotions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Promoção criada");
    reset();
    qc.invalidateQueries({ queryKey: ["admin-promotions"] });
    qc.invalidateQueries({ queryKey: ["has-active-promotions"] });
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("part_promotions").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-promotions"] });
    qc.invalidateQueries({ queryKey: ["has-active-promotions"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta promoção?")) return;
    await supabase.from("part_promotions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-promotions"] });
    qc.invalidateQueries({ queryKey: ["has-active-promotions"] });
  };

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const isExpired = (p: any) => p.ends_at && new Date(p.ends_at) < new Date();
  const isScheduled = (p: any) => p.starts_at && new Date(p.starts_at) > new Date();

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 text-sm space-y-1">
          <p className="font-semibold text-foreground inline-flex items-center gap-1.5"><Tag className="h-4 w-4 text-primary" /> Como criar uma promoção</p>
          <ol className="list-decimal list-inside text-muted-foreground space-y-0.5 text-xs">
            <li>Busque a peça por código ou descrição.</li>
            <li>Defina o preço promocional e (opcional) período de validade.</li>
            <li>Ao salvar, uma faixa de aviso aparece no topo de <code className="bg-background px-1 rounded">/cotacao</code> e a peça ganha o selo <strong>"EM PROMOÇÃO"</strong>.</li>
            <li>Visitantes não veem o valor — só o selo. Vendedores logados veem o preço promocional + percentual.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Nova promoção</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!selected ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar peça por código ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {searchResults && searchResults.length > 0 && (
                <div className="border rounded divide-y max-h-60 overflow-y-auto">
                  {searchResults.map((p: any) => (
                    <button key={p.id} onClick={() => setSelected(p)} className="w-full text-left p-2 hover:bg-muted text-sm flex justify-between items-center gap-2">
                      <span className="flex-1 min-w-0">
                        <Badge variant="outline" className="font-mono mr-2">{p.material}</Badge>
                        <span className="truncate">{p.description}</span>
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{p.estimated_price > 0 ? fmt(Number(p.estimated_price)) : "—"}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 p-3 border rounded bg-muted/30">
                <div className="min-w-0">
                  <Badge variant="outline" className="font-mono text-xs">{selected.material}</Badge>
                  <p className="text-sm mt-1 line-clamp-2">{selected.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Preço atual: <strong>{selected.estimated_price > 0 ? fmt(Number(selected.estimated_price)) : "—"}</strong></p>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>Trocar</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Preço promocional (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} placeholder="0,00" />
                </div>
                <div>
                  <Label className="text-xs">Início (opcional)</Label>
                  <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Fim (opcional)</Label>
                  <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                </div>
              </div>

              <Button onClick={create} className="gap-1"><Plus className="h-4 w-4" /> Criar promoção</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Promoções existentes ({promos?.length || 0})</h3>
        {(promos || []).map((p: any) => {
          const original = Number(p.part?.estimated_price || 0);
          const promo = Number(p.promo_price || 0);
          const pct = original > 0 ? Math.round((1 - promo / original) * 100) : null;
          const expired = isExpired(p);
          const scheduled = isScheduled(p);
          return (
            <Card key={p.id}>
              <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="font-mono">{p.part?.material}</Badge>
                <span className="flex-1 min-w-0 text-sm truncate">{p.part?.description}</span>
                <div className="text-xs text-muted-foreground">
                  {original > 0 && <span className="line-through mr-2">{fmt(original)}</span>}
                  <strong className="text-red-600">{fmt(promo)}</strong>
                  {pct !== null && pct > 0 && <span className="ml-1 text-red-600">(-{pct}%)</span>}
                </div>
                {expired ? (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Expirada</Badge>
                ) : scheduled ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Agendada</Badge>
                ) : p.active ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Ativa</Badge>
                ) : (
                  <Badge variant="outline">Pausada</Badge>
                )}
                <Switch checked={p.active} onCheckedChange={(v) => toggle(p.id, v)} />
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          );
        })}
        {promos?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma promoção cadastrada ainda.</p>}
      </div>
    </div>
  );
}

// ---------------- Settings ----------------
function SettingsPanel() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["admin-vitrine-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("vitrine_settings").select("*").maybeSingle();
      return data;
    },
  });
  const [s, setS] = useState<any>(null);
  if (settings && !s) setS(settings);

  const save = async () => {
    if (!s) return;
    const { error } = await supabase.from("vitrine_settings").update({
      gtm_id: s.gtm_id, ga4_id: s.ga4_id, ads_conversion_id: s.ads_conversion_id, ads_conversion_label: s.ads_conversion_label, meta_pixel_id: s.meta_pixel_id, b2b_whatsapp: s.b2b_whatsapp,
    }).eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["admin-vitrine-settings"] }); }
  };
  if (!s) return <p>Carregando...</p>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tracking & Configurações</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Google Tag Manager ID (ex: GTM-XXXXXX)</Label><Input value={s.gtm_id || ""} onChange={(e) => setS({ ...s, gtm_id: e.target.value })} /></div>
        <div><Label>GA4 Measurement ID (ex: G-XXXXXXX)</Label><Input value={s.ga4_id || ""} onChange={(e) => setS({ ...s, ga4_id: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Google Ads Conversion ID (AW-...)</Label><Input value={s.ads_conversion_id || ""} onChange={(e) => setS({ ...s, ads_conversion_id: e.target.value })} /></div>
          <div><Label>Conversion Label</Label><Input value={s.ads_conversion_label || ""} onChange={(e) => setS({ ...s, ads_conversion_label: e.target.value })} /></div>
        </div>
        <div><Label>Meta Pixel ID</Label><Input value={s.meta_pixel_id || ""} onChange={(e) => setS({ ...s, meta_pixel_id: e.target.value })} /></div>
        <div><Label>WhatsApp B2B (com DDI, sem +)</Label><Input value={s.b2b_whatsapp || ""} onChange={(e) => setS({ ...s, b2b_whatsapp: e.target.value })} /></div>
        <Button onClick={save}>Salvar</Button>
      </CardContent>
    </Card>
  );
}

// ---------------- Leads ----------------
function LeadsPanel() {
  const { data: leads } = useQuery({
    queryKey: ["admin-b2b-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("b2b_leads").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });
  return (
    <div className="space-y-2">
      {(leads || []).map((l: any) => (
        <Card key={l.id}><CardContent className="p-3 text-sm">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="font-semibold">{l.name} {l.company && <span className="text-muted-foreground">— {l.company}</span>}</p>
              <p className="text-xs text-muted-foreground">{l.phone} {l.email && `· ${l.email}`} {l.cnpj && `· ${l.cnpj}`}</p>
              {l.segment && <p className="text-xs">Segmento: {l.segment}</p>}
              {l.estimated_volume && <p className="text-xs">Volume: {l.estimated_volume}</p>}
              {l.message && <p className="text-xs mt-1 italic text-muted-foreground">"{l.message}"</p>}
              {l.utm && Object.keys(l.utm).length > 0 && <p className="text-[10px] font-mono mt-1 text-muted-foreground/70">{JSON.stringify(l.utm)}</p>}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
        </CardContent></Card>
      ))}
      {leads?.length === 0 && <p className="text-sm text-muted-foreground">Sem leads B2B ainda.</p>}
    </div>
  );
}
