# Busca de Preços Externos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o usuário, a partir do `/app/estoque`, dispare uma busca de preços por código (`material`) e nome (`description`) em Mercado Livre + 3 sites de fornecedores, exibindo resultados em modal e persistindo o histórico em duas tabelas novas.

**Architecture:** Uma Edge Function `search-external-prices` despacha requests em paralelo para 4 parsers (1 API + 3 scrapers HTML), grava `price_lookups` + `price_lookup_results` e retorna o lookup. Frontend tem nova aba **"Comparar Preços"** em `StockPage` com tabela de peças e dialog `PriceLookupDialog` com 2 abas (Buscar agora / Histórico).

**Tech Stack:** React + Vite + TanStack Query + shadcn/ui · Supabase (Postgres + Edge Functions Deno) · Mercado Livre Public API · vitest

**Spec:** `asiapecas/docs/superpowers/specs/2026-05-10-busca-precos-externos-design.md`

---

## File Structure

**Criar:**
- `asiapecas/supabase/migrations/<ts>_price_lookups.sql` — tabelas + RLS
- `asiapecas/supabase/functions/search-external-prices/index.ts` — Edge Function entrypoint
- `asiapecas/supabase/functions/search-external-prices/parsers/mercadolivre.ts`
- `asiapecas/supabase/functions/search-external-prices/parsers/lideranca.ts`
- `asiapecas/supabase/functions/search-external-prices/parsers/macromaq.ts`
- `asiapecas/supabase/functions/search-external-prices/parsers/extramaquinas.ts`
- `asiapecas/supabase/functions/search-external-prices/parsers/types.ts` — `NormalizedResult` shape
- `asiapecas/supabase/functions/search-external-prices/parsers/extract-price.ts` — util compartilhado
- `asiapecas/src/hooks/use-price-lookup.ts` — 3 hooks (mutation + queries)
- `asiapecas/src/components/stock/PriceLookupDialog.tsx` — dialog com tabs
- `asiapecas/src/components/stock/PriceLookupResults.tsx` — render dos cards por fonte
- `asiapecas/src/components/stock/PriceLookupHistory.tsx` — render da aba histórico
- `asiapecas/src/components/stock/PriceCompareTab.tsx` — nova tab "Comparar Preços" com tabela
- `asiapecas/src/components/stock/__tests__/parsers.test.ts` — testes unitários dos parsers

**Modificar:**
- `asiapecas/src/pages/StockPage.tsx` — adicionar `<TabsTrigger value="compare">` e `<TabsContent>`
- `asiapecas/src/integrations/supabase/types.ts` — regenerar (ou aceitar que os tipos novos serão `as any` até regenerar)

---

## Task 1: Migration — tabelas e RLS

**Files:**
- Create: `asiapecas/supabase/migrations/20260510120000_price_lookups.sql`

- [ ] **Step 1.1: Criar arquivo de migration**

```sql
-- Tabela: price_lookups (1 row por busca disparada)
create table public.price_lookups (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_price_lookups_part_created on public.price_lookups(part_id, created_at desc);

-- Tabela: price_lookup_results (N rows por lookup)
create table public.price_lookup_results (
  id uuid primary key default gen_random_uuid(),
  lookup_id uuid not null references public.price_lookups(id) on delete cascade,
  source text not null check (source in ('mercadolivre', 'lideranca', 'macromaq', 'extramaquinas')),
  rank int not null default 0,
  title text,
  price_brl numeric(12, 2),
  url text,
  seller text,
  image_url text,
  in_stock boolean,
  error text
);
create index idx_price_lookup_results_lookup on public.price_lookup_results(lookup_id);

-- RLS
alter table public.price_lookups enable row level security;
alter table public.price_lookup_results enable row level security;

create policy "auth read price_lookups"
  on public.price_lookups for select
  to authenticated using (true);

create policy "auth insert price_lookups"
  on public.price_lookups for insert
  to authenticated with check (true);

create policy "auth delete price_lookups"
  on public.price_lookups for delete
  to authenticated using (true);

create policy "auth read price_lookup_results"
  on public.price_lookup_results for select
  to authenticated using (true);

create policy "auth insert price_lookup_results"
  on public.price_lookup_results for insert
  to authenticated with check (true);
```

- [ ] **Step 1.2: Aplicar a migration no projeto Supabase**

Run: `npx supabase db push` (ou aplicar via dashboard SQL editor se preferir).
Esperado: as duas tabelas aparecem em `public` com RLS ativo.

- [ ] **Step 1.3: Verificar via SQL**

Run no SQL editor:
```sql
select tablename, rowsecurity from pg_tables where schemaname='public' and tablename like 'price_lookup%';
```
Esperado: 2 linhas, ambas `rowsecurity=true`.

- [ ] **Step 1.4: Regerar tipos TypeScript**

Run: `npx supabase gen types typescript --local > src/integrations/supabase/types.ts` (ou via CLI remoto).
Se não regerar agora, aceitar `as any` nos hooks até a próxima regeneração.

---

## Task 2: Edge Function — esqueleto + types compartilhados

**Files:**
- Create: `asiapecas/supabase/functions/search-external-prices/parsers/types.ts`
- Create: `asiapecas/supabase/functions/search-external-prices/parsers/extract-price.ts`
- Create: `asiapecas/supabase/functions/search-external-prices/index.ts`

- [ ] **Step 2.1: Criar `types.ts`**

```ts
export type SourceId = "mercadolivre" | "lideranca" | "macromaq" | "extramaquinas";

export type NormalizedResult = {
  source: SourceId;
  rank: number;
  title?: string;
  price_brl?: number;
  url?: string;
  seller?: string;
  image_url?: string;
  in_stock?: boolean;
  error?: string;
};

export type ParserFn = (query: string, signal: AbortSignal) => Promise<NormalizedResult[]>;
```

- [ ] **Step 2.2: Criar `extract-price.ts`**

```ts
// Util: extrai o primeiro valor R$ de um texto/HTML.
// Aceita "R$ 1.234,56", "R$1234,56", "R$ 1234". Retorna em BRL como number.
export function extractPriceBRL(text: string): number | undefined {
  const m = text.match(/R\$\s*([\d.]+,\d{2}|\d{1,3}(?:\.\d{3})*|\d+)/);
  if (!m) return undefined;
  const raw = m[1];
  // "1.234,56" → 1234.56 ; "1234,56" → 1234.56 ; "1234" → 1234
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/\./g, "");
  const n = parseFloat(normalized);
  return isNaN(n) ? undefined : n;
}
```

- [ ] **Step 2.3: Criar `index.ts` (Edge Function entrypoint, sem parsers ainda)**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { NormalizedResult, ParserFn, SourceId } from "./parsers/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCES: Record<SourceId, ParserFn> = {
  // preenchidos nas próximas tasks
  mercadolivre: async () => [{ source: "mercadolivre", rank: 0, error: "not_implemented" }],
  lideranca: async () => [{ source: "lideranca", rank: 0, error: "not_implemented" }],
  macromaq: async () => [{ source: "macromaq", rank: 0, error: "not_implemented" }],
  extramaquinas: async () => [{ source: "extramaquinas", rank: 0, error: "not_implemented" }],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { part_id, query, sources } = await req.json();
    if (!part_id || !query) {
      return new Response(JSON.stringify({ error: "part_id e query obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selected: SourceId[] = sources?.length ? sources : (Object.keys(SOURCES) as SourceId[]);

    const settled = await Promise.allSettled(
      selected.map(async (s) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12_000);
        try {
          return await SOURCES[s](query, ctrl.signal);
        } catch (e) {
          return [{ source: s, rank: 0, error: String((e as Error).message || e) } as NormalizedResult];
        } finally {
          clearTimeout(t);
        }
      })
    );

    const results: NormalizedResult[] = settled.flatMap((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return [{ source: selected[i], rank: 0, error: "rejected" } as NormalizedResult];
    });

    // Persistir
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const auth = req.headers.get("Authorization") || "";
    const userId = await getUserIdFromAuth(auth, supabase).catch(() => null);

    const { data: lookup, error: lookupErr } = await supabase
      .from("price_lookups")
      .insert({ part_id, query, created_by: userId })
      .select("id, created_at")
      .single();
    if (lookupErr) throw lookupErr;

    if (results.length > 0) {
      const rows = results.map((r) => ({
        lookup_id: lookup.id,
        source: r.source,
        rank: r.rank,
        title: r.title,
        price_brl: r.price_brl,
        url: r.url,
        seller: r.seller,
        image_url: r.image_url,
        in_stock: r.in_stock,
        error: r.error,
      }));
      const { error: insErr } = await supabase.from("price_lookup_results").insert(rows);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({
      lookup_id: lookup.id,
      created_at: lookup.created_at,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getUserIdFromAuth(authHeader: string, supabase: ReturnType<typeof createClient>): Promise<string | null> {
  if (!authHeader) return null;
  const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  return data.user?.id || null;
}
```

- [ ] **Step 2.4: Deploy provisório só pra validar shape**

Run: `npx supabase functions deploy search-external-prices`
Esperado: deploy OK.

- [ ] **Step 2.5: Smoke test manual**

Pelo painel Supabase ou via curl autenticado, chamar com `{ part_id: "<um_id_real>", query: "12345" }`. Esperado: resposta 200 com 4 results todos com `error: "not_implemented"`, e 1 row em `price_lookups` + 4 rows em `price_lookup_results`.

---

## Task 3: Parser Mercado Livre

**Files:**
- Create: `asiapecas/supabase/functions/search-external-prices/parsers/mercadolivre.ts`
- Modify: `asiapecas/supabase/functions/search-external-prices/index.ts` (registrar)

- [ ] **Step 3.1: Implementar parser**

```ts
import type { NormalizedResult, ParserFn } from "./types.ts";

export const searchMercadoLivre: ParserFn = async (query, signal) => {
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AsiaPecas/1.0)" },
  });
  if (!res.ok) {
    return [{ source: "mercadolivre", rank: 0, error: `http_${res.status}` }];
  }
  const json = await res.json() as { results?: Array<{
    title: string; price: number; permalink: string; thumbnail: string;
    seller?: { nickname?: string }; available_quantity?: number;
  }> };
  const items = json.results || [];
  if (items.length === 0) {
    return [{ source: "mercadolivre", rank: 0, error: "no_results" }];
  }
  return items.slice(0, 5).map<NormalizedResult>((it, i) => ({
    source: "mercadolivre",
    rank: i,
    title: it.title,
    price_brl: typeof it.price === "number" ? it.price : undefined,
    url: it.permalink,
    seller: it.seller?.nickname,
    image_url: it.thumbnail,
    in_stock: (it.available_quantity ?? 0) > 0,
  }));
};
```

- [ ] **Step 3.2: Registrar no `index.ts`**

Substituir o stub `mercadolivre`:
```ts
import { searchMercadoLivre } from "./parsers/mercadolivre.ts";
// ...
const SOURCES: Record<SourceId, ParserFn> = {
  mercadolivre: searchMercadoLivre,
  // ... resto continua stub
};
```

- [ ] **Step 3.3: Redeploy**

Run: `npx supabase functions deploy search-external-prices`

- [ ] **Step 3.4: Smoke test com termo real**

Chamar com `{ part_id: "<id>", query: "filtro de óleo XCMG", sources: ["mercadolivre"] }`. Esperado: até 5 resultados com preço, título, link funcional, sem `error`.

---

## Task 4: Hooks no frontend

**Files:**
- Create: `asiapecas/src/hooks/use-price-lookup.ts`

- [ ] **Step 4.1: Criar hooks**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SourceId = "mercadolivre" | "lideranca" | "macromaq" | "extramaquinas";

export type LookupResult = {
  id: string;
  source: SourceId;
  rank: number;
  title: string | null;
  price_brl: number | null;
  url: string | null;
  seller: string | null;
  image_url: string | null;
  in_stock: boolean | null;
  error: string | null;
};

export type Lookup = {
  id: string;
  part_id: string;
  query: string;
  created_at: string;
  results: LookupResult[];
};

export function usePriceLookup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { part_id: string; query: string; sources?: SourceId[] }) => {
      const { data, error } = await supabase.functions.invoke("search-external-prices", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { lookup_id: string; created_at: string; results: LookupResult[] };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["price-lookups", vars.part_id] });
      toast.success("Busca concluída");
    },
    onError: (e: Error) => toast.error("Erro na busca: " + e.message),
  });
}

export function usePriceLookupHistory(partId: string | null) {
  return useQuery({
    queryKey: ["price-lookups", partId],
    enabled: !!partId,
    queryFn: async (): Promise<Lookup[]> => {
      const { data, error } = await supabase
        .from("price_lookups" as any)
        .select("id, part_id, query, created_at, price_lookup_results(*)")
        .eq("part_id", partId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        results: d.price_lookup_results || [],
      }));
    },
  });
}

export function useDeletePriceLookup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, part_id: _ }: { id: string; part_id: string }) => {
      const { error } = await supabase.from("price_lookups" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["price-lookups", vars.part_id] });
      toast.success("Lookup removido");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
```

- [ ] **Step 4.2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Esperado: exit 0 (ok usar `as any` nos selects até regerar tipos do Supabase).

---

## Task 5: PriceLookupResults — render de cards por fonte

**Files:**
- Create: `asiapecas/src/components/stock/PriceLookupResults.tsx`

- [ ] **Step 5.1: Criar componente**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Save } from "lucide-react";
import type { LookupResult, SourceId } from "@/hooks/use-price-lookup";

const SOURCE_LABELS: Record<SourceId, string> = {
  mercadolivre: "Mercado Livre",
  lideranca: "Liderança XCMG",
  macromaq: "Macromaq",
  extramaquinas: "Extra Máquinas",
};

const ERROR_LABELS: Record<string, string> = {
  timeout: "Timeout",
  no_results: "Nada encontrado",
  parse_error: "Erro ao ler página",
  rejected: "Falhou",
  not_implemented: "—",
};

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function PriceLookupResults({
  results,
  onSaveAsCost,
}: {
  results: LookupResult[];
  onSaveAsCost?: (price: number) => void;
}) {
  const bySource = (Object.keys(SOURCE_LABELS) as SourceId[]).map((src) => ({
    source: src,
    items: results.filter((r) => r.source === src),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {bySource.map(({ source, items }) => {
        const errorRow = items.find((i) => i.error);
        const valid = items.filter((i) => !i.error && i.price_brl != null);
        return (
          <Card key={source}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{SOURCE_LABELS[source]}</CardTitle>
              {errorRow ? (
                <Badge variant="destructive" className="text-[10px]">
                  {ERROR_LABELS[errorRow.error || ""] || errorRow.error}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">{valid.length} resultados</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {valid.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum resultado válido.</p>
              ) : (
                valid.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-start gap-2 border rounded p-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.title || "—"}</p>
                      <p className="text-muted-foreground">{r.seller || ""}</p>
                      <p className="font-mono font-semibold text-primary">{fmt(r.price_brl)}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Abrir">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                      {onSaveAsCost && r.price_brl != null && (
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7"
                          title="Salvar como custo da peça"
                          onClick={() => onSaveAsCost(r.price_brl!)}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5.2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Esperado: exit 0.

---

## Task 6: PriceLookupHistory — render da aba histórico

**Files:**
- Create: `asiapecas/src/components/stock/PriceLookupHistory.tsx`

- [ ] **Step 6.1: Criar componente**

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useDeletePriceLookup, type Lookup } from "@/hooks/use-price-lookup";
import PriceLookupResults from "./PriceLookupResults";

export default function PriceLookupHistory({ lookups, partId }: { lookups: Lookup[]; partId: string }) {
  const del = useDeletePriceLookup();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (lookups.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Sem histórico.</p>;
  }

  return (
    <div className="space-y-2">
      {lookups.map((l) => {
        const minPriceML = l.results
          .filter((r) => r.source === "mercadolivre" && r.price_brl != null)
          .reduce((min, r) => (min === null || r.price_brl! < min ? r.price_brl! : min), null as number | null);
        const isOpen = expanded === l.id;
        return (
          <div key={l.id} className="border rounded">
            <div className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/40"
              onClick={() => setExpanded(isOpen ? null : l.id)}>
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="text-xs font-mono">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                <Badge variant="outline" className="text-[10px]">"{l.query}"</Badge>
                <Badge variant="secondary" className="text-[10px]">{l.results.length} results</Badge>
                {minPriceML != null && (
                  <span className="text-[11px] text-muted-foreground">
                    ML mín: R$ {minPriceML.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <Button
                variant="ghost" size="icon"
                onClick={(e) => { e.stopPropagation(); del.mutate({ id: l.id, part_id: partId }); }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {isOpen && (
              <div className="p-3 bg-muted/20 border-t">
                <PriceLookupResults results={l.results} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6.2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Esperado: exit 0.

---

## Task 7: PriceLookupDialog — dialog principal com 2 abas

**Files:**
- Create: `asiapecas/src/components/stock/PriceLookupDialog.tsx`

- [ ] **Step 7.1: Criar dialog**

```tsx
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search } from "lucide-react";
import { usePriceLookup, usePriceLookupHistory, type LookupResult } from "@/hooks/use-price-lookup";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PriceLookupResults from "./PriceLookupResults";
import PriceLookupHistory from "./PriceLookupHistory";

export type PartLite = { id: string; material: string; description: string };

export default function PriceLookupDialog({
  part,
  open,
  onOpenChange,
}: {
  part: PartLite | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const lookup = usePriceLookup();
  const { data: history = [] } = usePriceLookupHistory(part?.id || null);
  const [query, setQuery] = useState("");
  const [currentResults, setCurrentResults] = useState<LookupResult[]>([]);

  useEffect(() => {
    if (part) {
      setQuery(part.material);
      setCurrentResults([]);
    }
  }, [part]);

  if (!part) return null;

  const handleSearch = () => {
    if (!query.trim()) return;
    lookup.mutate(
      { part_id: part.id, query: query.trim() },
      { onSuccess: (data) => setCurrentResults(data.results) }
    );
  };

  const saveAsCost = async (price: number) => {
    const { error } = await supabase.from("parts").update({ estimated_price: price }).eq("id", part.id);
    if (error) toast.error("Erro ao salvar custo: " + error.message);
    else toast.success(`Custo atualizado para R$ ${price.toLocaleString("pt-BR")}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Comparar Preços — <span className="font-mono">{part.material}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{part.description}</p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-2 -mr-2">
          <Tabs defaultValue="search">
            <TabsList>
              <TabsTrigger value="search">Buscar agora</TabsTrigger>
              <TabsTrigger value="history">Histórico ({history.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-4 space-y-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Termo de busca</Label>
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="OEM ou nome" />
                </div>
                <Button onClick={handleSearch} disabled={lookup.isPending} className="gap-2">
                  {lookup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Buscar
                </Button>
              </div>

              {lookup.isPending && (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border rounded p-3 animate-pulse h-32 bg-muted/30" />
                  ))}
                </div>
              )}

              {!lookup.isPending && currentResults.length > 0 && (
                <PriceLookupResults results={currentResults} onSaveAsCost={saveAsCost} />
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <PriceLookupHistory lookups={history} partId={part.id} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7.2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Esperado: exit 0.

---

## Task 8: PriceCompareTab — tabela na aba nova do StockPage

**Files:**
- Create: `asiapecas/src/components/stock/PriceCompareTab.tsx`

- [ ] **Step 8.1: Criar componente com tabela paginada**

```tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, LineChart } from "lucide-react";
import PriceLookupDialog, { type PartLite } from "./PriceLookupDialog";

type Row = {
  id: string;
  material: string;
  description: string;
  manufacturer: string | null;
  estimated_price: number;
  stock: number;
};

export default function PriceCompareTab() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PartLite | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["parts-price-compare", search],
    queryFn: async (): Promise<Row[]> => {
      let q = supabase
        .from("parts")
        .select("id, material, description, manufacturer, estimated_price, stock")
        .order("material")
        .limit(50);
      if (search.trim().length >= 2) {
        const s = `%${search.trim()}%`;
        q = q.or(`material.ilike.${s},description.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Row[];
    },
  });

  const totalStock = useMemo(() => parts.reduce((s, p) => s + p.stock, 0), [parts]);

  const openLookup = (p: Row) => {
    setSelected({ id: p.id, material: p.material, description: p.description });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar peça por código ou descrição..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="outline">{parts.length} peças · {totalStock} un</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Fabricante</TableHead>
            <TableHead className="text-right">Custo atual</TableHead>
            <TableHead className="text-center">Estoque</TableHead>
            <TableHead className="text-right w-24">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : parts.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma peça encontrada</TableCell></TableRow>
          ) : parts.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">{p.material}</TableCell>
              <TableCell className="text-xs truncate max-w-[300px]">{p.description}</TableCell>
              <TableCell className="text-xs">{p.manufacturer || "—"}</TableCell>
              <TableCell className="text-right font-mono">R$ {p.estimated_price.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-center">{p.stock}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openLookup(p)}>
                  <LineChart className="h-3 w-3" />
                  Comparar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PriceLookupDialog
        part={selected}
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setSelected(null); }}
      />
    </div>
  );
}
```

- [ ] **Step 8.2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Esperado: exit 0.

---

## Task 9: Integrar nova aba em StockPage

**Files:**
- Modify: `asiapecas/src/pages/StockPage.tsx`

- [ ] **Step 9.1: Adicionar import**

Adicionar:
```tsx
import PriceCompareTab from "@/components/stock/PriceCompareTab";
```

- [ ] **Step 9.2: Adicionar TabsTrigger e TabsContent**

Em `StockPage.tsx`, dentro de `<TabsList>`, adicionar último item:
```tsx
<TabsTrigger value="compare">Comparar Preços</TabsTrigger>
```

E após o último `<TabsContent value="health">`:
```tsx
<TabsContent value="compare" className="mt-4">
  <PriceCompareTab />
</TabsContent>
```

Importante: a `PriceCompareTab` não depende de `data` do `useStockAnalytics`, então deve renderizar mesmo se `data` estiver carregando. Mover `<TabsContent value="compare">` para **fora** do bloco condicional `{data && (...)}` se necessário, OU simplesmente deixar dentro (carrega após análise) — preferir DENTRO para manter UX consistente, já que a página inteira espera analytics.

- [ ] **Step 9.3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Esperado: exit 0.

- [ ] **Step 9.4: Smoke test no browser**

Run: `npm run dev` (já dentro de `asiapecas/`) e abrir `/app/estoque`.
- Verificar que a nova aba "Comparar Preços" aparece.
- Buscar uma peça pelo código.
- Clicar "Comparar" → dialog abre com material pré-preenchido.
- Clicar "Buscar" → ML retorna resultados (3 outras fontes mostram "—" ou "rejected").
- Conferir aba "Histórico (1)".
- Reabrir, fazer outra busca, ver "Histórico (2)".

---

## Task 10: Testes unitários — extract-price util

**Files:**
- Create: `asiapecas/src/components/stock/__tests__/parsers.test.ts`

> Nota: como `extract-price.ts` mora em `supabase/functions/...` (Deno), e os testes rodam em vitest (Node), vamos copiar a função pura para um teste local. Alternativa: extrair a função para `src/lib/extract-price.ts` e importar dos dois lados (Deno aceita import com extensão `.ts`). Vamos pelo path B — DRY e testável.

- [ ] **Step 10.1: Mover `extract-price.ts` para `src/lib/`**

Criar `asiapecas/src/lib/extract-price.ts` com o conteúdo da Task 2.2.
Editar `supabase/functions/search-external-prices/parsers/extract-price.ts` para re-exportar via copy (Deno não consegue importar de fora da pasta `supabase/functions/`). Manter as duas cópias sincronizadas, OU melhor: deixar a função no Deno-side e duplicá-la no lib-side (única linha de divergência: o path).

Decisão pragmática: **manter duplicado** — função pequena e estável.

- [ ] **Step 10.2: Criar teste**

```ts
import { describe, it, expect } from "vitest";
import { extractPriceBRL } from "@/lib/extract-price";

describe("extractPriceBRL", () => {
  it("parseia R$ 1.234,56", () => {
    expect(extractPriceBRL("Preço: R$ 1.234,56")).toBe(1234.56);
  });
  it("parseia R$1234,56 sem espaço", () => {
    expect(extractPriceBRL("R$1234,56")).toBe(1234.56);
  });
  it("parseia inteiro sem decimais", () => {
    expect(extractPriceBRL("R$ 1234")).toBe(1234);
  });
  it("retorna undefined sem match", () => {
    expect(extractPriceBRL("Consulte preço")).toBeUndefined();
  });
  it("ignora segundo R$ no texto", () => {
    expect(extractPriceBRL("De R$ 100,00 por R$ 80,00")).toBe(100);
  });
});
```

- [ ] **Step 10.3: Rodar testes**

Run: `npm test -- extract-price`
Esperado: 5 passing.

---

## Task 11: Parser — Liderança XCMG

**Files:**
- Create: `asiapecas/supabase/functions/search-external-prices/parsers/lideranca.ts`
- Modify: `asiapecas/supabase/functions/search-external-prices/index.ts`

> Pré-requisito: visitar `https://www.liderancaxcmg.com.br/?s=<termo>` (ou onde for a busca real do site) no browser, abrir DevTools → Network, copiar HTML de um resultado de exemplo. Inspecionar a estrutura: classe do card, tag do título, formato do preço. Esse passo é manual — adapte os seletores ao real.

- [ ] **Step 11.1: Investigar URL de busca e estrutura HTML**

Manualmente: abrir o site, fazer uma busca e capturar:
- URL do endpoint de busca (ex.: `?s=`, `/buscar?q=`, etc.)
- Padrão CSS/regex de cada card de produto
- Onde está o preço (classe, formato)
- Onde está o link (anchor)
- Onde está a imagem

Anotar em comentário no topo do parser.

- [ ] **Step 11.2: Implementar parser HTML por regex**

Template (ajustar à estrutura real do site):
```ts
import { extractPriceBRL } from "./extract-price.ts";
import type { NormalizedResult, ParserFn } from "./types.ts";

export const searchLideranca: ParserFn = async (query, signal) => {
  // TODO: confirmar URL real após investigação
  const url = `https://www.liderancaxcmg.com.br/?s=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html",
    },
  });
  if (!res.ok) return [{ source: "lideranca", rank: 0, error: `http_${res.status}` }];
  const html = await res.text();

  // Cada produto está em um bloco; ajustar regex à estrutura real
  // Exemplo placeholder — adaptar:
  const cardRegex = /<article[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  const cards = [...html.matchAll(cardRegex)];
  if (cards.length === 0) return [{ source: "lideranca", rank: 0, error: "no_results" }];

  const results: NormalizedResult[] = [];
  for (let i = 0; i < Math.min(cards.length, 5); i++) {
    const card = cards[i][1];
    const titleM = card.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || card.match(/<a[^>]*title="([^"]+)"/i);
    const linkM = card.match(/href="([^"]+)"/i);
    const imgM = card.match(/<img[^>]*src="([^"]+)"/i);
    const price = extractPriceBRL(card);
    results.push({
      source: "lideranca",
      rank: i,
      title: titleM ? stripTags(titleM[1]).trim() : undefined,
      url: linkM ? absolutize(linkM[1], url) : undefined,
      image_url: imgM ? imgM[1] : undefined,
      price_brl: price,
    });
  }
  if (results.every((r) => r.price_brl == null)) {
    return [{ source: "lideranca", rank: 0, error: "parse_error" }];
  }
  return results;
};

function stripTags(s: string) { return s.replace(/<[^>]+>/g, ""); }
function absolutize(href: string, base: string) {
  try { return new URL(href, base).toString(); } catch { return href; }
}
```

- [ ] **Step 11.3: Registrar e redeploy**

```ts
// index.ts
import { searchLideranca } from "./parsers/lideranca.ts";
const SOURCES = { ..., lideranca: searchLideranca, ... };
```
Run: `npx supabase functions deploy search-external-prices`

- [ ] **Step 11.4: Smoke test com termo real**

Chamar com `{ part_id, query: "<peça XCMG real>", sources: ["lideranca"] }`. Esperado: até 5 resultados ou `parse_error` (caso seletores precisem de ajuste). Ajustar regex iterativamente.

---

## Task 12: Parser — Macromaq

**Files:**
- Create: `asiapecas/supabase/functions/search-external-prices/parsers/macromaq.ts`
- Modify: `asiapecas/supabase/functions/search-external-prices/index.ts`

- [ ] **Step 12.1: Investigar estrutura HTML do site**

Mesma rotina da Task 11.1 — coletar URL de busca, regex de cards.

- [ ] **Step 12.2: Implementar `macromaq.ts` (cópia adaptada de `lideranca.ts`)**

- [ ] **Step 12.3: Registrar + deploy + smoke test**

---

## Task 13: Parser — Extra Máquinas

**Files:**
- Create: `asiapecas/supabase/functions/search-external-prices/parsers/extramaquinas.ts`
- Modify: `asiapecas/supabase/functions/search-external-prices/index.ts`

- [ ] **Step 13.1: Investigar estrutura HTML do site**

- [ ] **Step 13.2: Implementar parser**

- [ ] **Step 13.3: Registrar + deploy + smoke test**

---

## Task 14: Verificação ponta-a-ponta

- [ ] **Step 14.1: Buscar uma peça com termo que retorna resultado nas 4 fontes**

Pelo UI: aba Comparar Preços → buscar peça → clicar Comparar → buscar.
Esperado: 4 cards com resultados ou erros explícitos. Histórico(1).

- [ ] **Step 14.2: Validar persistência**

No Supabase SQL editor:
```sql
select count(*) from price_lookups;
select source, count(*), count(price_brl) as com_preco
from price_lookup_results group by source;
```

- [ ] **Step 14.3: Validar "Salvar como custo"**

No dialog, clicar 💾 em um item de ML. Verificar via UI que `parts.estimated_price` mudou (recarregar tabela).

- [ ] **Step 14.4: Validar exclusão de lookup do histórico**

Aba Histórico → 🗑️ em uma linha → confirmar que sumiu e que `price_lookup_results` correspondentes foram apagadas (cascade).

- [ ] **Step 14.5: Validar que ao menos 2 dos 3 parsers HTML retornam preços reais**

Se algum parser retornar consistentemente `parse_error`, ajustar regex na próxima sessão. Documentar quais fontes precisam de mais carinho.

---

## Notes para o executor

- **Sem git commits no repo** — projeto não está sob versionamento aqui. Pular passos de `git add/commit`.
- **TDD onde faz sentido** — função pura `extractPriceBRL` (Task 10). Resto é integração/UI, smoke-test manual.
- **Edge function precisa de variáveis de ambiente** — `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem (usadas por `confirm-sale`).
- **Fragilidade dos parsers HTML** — esperado quebrarem com o tempo. Erro fica visível no UI ("⚠ erro ao ler página"), o que sinaliza necessidade de manutenção sem derrubar as outras fontes.
- **Ordem importa**: Tasks 1-9 dão a feature funcionando com Mercado Livre. Tasks 11-13 vão sendo adicionadas conforme a investigação dos sites for sendo feita — cada uma é um incremento independente.
- **YAGNI mantido**: nada de gráfico de evolução, alertas, comparação automática com `estimated_price`, ou regiões além de MLB.
