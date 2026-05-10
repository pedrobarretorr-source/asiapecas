# Busca de Preços Externos por Peça — Design

**Data:** 2026-05-10
**Contexto:** asiapecas (peças para máquinas pesadas — XCMG, etc.)

## Objetivo

A partir da página de estoque (`/app/estoque`), permitir que o usuário selecione uma peça e dispare uma busca de preços por código (`material`, ~OEM) e nome (`description`) em fontes públicas, mostrando os resultados em um modal e persistindo cada busca para histórico.

**Foco:** descobrir **preço de compra/fornecedor** (objetivo B), com Mercado Livre incluído como referência adicional.

## Fontes

| Fonte | Tipo | Confiabilidade | Notas |
|---|---|---|---|
| Mercado Livre | API pública JSON (`api.mercadolibre.com/sites/MLB/search`) | Alta | Sem auth, sem chave, retorna preço/título/link/vendedor/condição |
| liderancaxcmg.com.br | Scraping HTML | Frágil | Distribuidor XCMG |
| macromaq.com.br | Scraping HTML | Frágil | Revenda de máquinas pesadas |
| extramaquinas.com | Scraping HTML | Frágil | Marketplace de equipamentos |

## Arquitetura

```
[StockPage] ──click──> [PriceLookupDialog]
                          │
                          ├── usePriceLookup (TanStack Query)
                          │     │
                          │     └─ supabase.functions.invoke('search-external-prices')
                          │
                          └── usePriceLookupHistory (TanStack Query)
                                │
                                └─ select from price_lookups + price_lookup_results

                  ┌────────────────────────────────────┐
                  │  Edge Function:                    │
                  │  search-external-prices             │
                  │                                    │
                  │  parsers/                          │
                  │    ├── mercadolivre.ts (API)       │
                  │    ├── lideranca.ts    (HTML)      │
                  │    ├── macromaq.ts     (HTML)      │
                  │    └── extramaquinas.ts(HTML)      │
                  │                                    │
                  │  Promise.allSettled (timeout 12s)  │
                  │  → normaliza → grava no DB         │
                  └────────────────────────────────────┘
```

## Schema

### Tabela `price_lookups`

```sql
create table price_lookups (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_price_lookups_part on price_lookups(part_id, created_at desc);
```

### Tabela `price_lookup_results`

```sql
create table price_lookup_results (
  id uuid primary key default gen_random_uuid(),
  lookup_id uuid not null references price_lookups(id) on delete cascade,
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
create index idx_price_lookup_results_lookup on price_lookup_results(lookup_id);
```

### RLS

- Authenticated users podem `select`/`insert` em ambas (mesma política que outras tabelas internas do app).

## Edge Function: `search-external-prices`

**Endpoint:** `POST /functions/v1/search-external-prices`

**Request:**
```ts
{
  part_id: string;
  query: string;        // default = parts.material
  sources?: Array<'mercadolivre' | 'lideranca' | 'macromaq' | 'extramaquinas'>;
}
```

**Response:**
```ts
{
  lookup_id: string;
  created_at: string;
  results: Array<{
    source: string;
    rank: number;
    title?: string;
    price_brl?: number;
    url?: string;
    seller?: string;
    image_url?: string;
    in_stock?: boolean;
    error?: string;
  }>;
}
```

**Comportamento:**
1. Lê `part_id` para verificar existência (autorização indireta via RLS).
2. Executa em paralelo `Promise.allSettled([...sourcesSelecionadas])`. Cada parser tem `AbortSignal.timeout(12_000)`.
3. Normaliza resultados: top 5 por fonte, ordenados por `price_brl asc`.
4. Insere `price_lookups` (1 row) + `price_lookup_results` (N rows). Inclui rows com `error` quando a fonte falha (zero `price_brl`, mas com mensagem).
5. Retorna o lookup completo para o cliente.

### Parsers

Cada parser exporta `searchSource(query: string): Promise<NormalizedResult[]>`:

- **mercadolivre.ts:** chama `https://api.mercadolibre.com/sites/MLB/search?q=${q}&limit=10` e mapeia `{ title, price, permalink, seller, thumbnail, available_quantity }`.
- **lideranca.ts / macromaq.ts / extramaquinas.ts:** `fetch` na URL de busca do site (ex.: `https://www.macromaq.com.br/?s=${q}`), parseia HTML com expressões regex direcionadas (sem dependências pesadas — Deno não tem cheerio nativo). Extrai blocos de produto: título, preço (regex `R\$\s*[\d.,]+`), URL absoluta, imagem.
- Erros padronizados: `'timeout' | 'http_<status>' | 'no_results' | 'parse_error'`.

User-Agent realista, sem retries.

## UI

### `/app/estoque`

- Adicionar botão/ícone (lucide `Search` ou `LineChart`) na coluna de ações da tabela de peças.
- Tooltip: "Comparar preços externos".
- Clique → abre `PriceLookupDialog` com `part` selecionado.

### `PriceLookupDialog` (`asiapecas/src/components/stock/PriceLookupDialog.tsx`)

Estrutura:
- `DialogContent` com `max-w-4xl max-h-[90vh] flex flex-col` (mesmo padrão dos outros dialogs).
- Header: peça selecionada (`material` + `description`).
- `Tabs`: **"Buscar agora"** | **"Histórico"**.

#### Aba "Buscar agora"

- Input pré-preenchido com `material` (editável).
- Checkboxes de fontes (todas marcadas por default).
- Botão "Buscar" — dispara `usePriceLookup.mutate()`.
- Enquanto busca: 4 cards-skeleton (um por fonte selecionada).
- Após busca: 4 cards (Mercado Livre / Liderança / Macromaq / Extramaquinas), cada um:
  - Cabeçalho com status: ✓ "12 resultados" / ✗ "timeout" / ⚠ "preço não encontrado".
  - Lista até 5 itens com preço, título, vendedor (quando disponível), link "Abrir no site".
  - Botão "Salvar como custo" em cada item → atualiza `parts.estimated_price`.

#### Aba "Histórico"

- Lista cronológica das buscas passadas (de `price_lookups`).
- Cada linha: data, nº de resultados, preço mínimo encontrado em ML.
- Clique → expande mostrando todos os resultados daquela busca.
- Botão "Excluir" para limpar lookups antigos (cascade limpa results).

## Hooks (`asiapecas/src/hooks/use-price-lookup.ts`)

```ts
usePriceLookup()         // mutation: dispara edge function
usePriceLookupHistory(part_id)  // query: histórico da peça
useDeletePriceLookup()   // mutation: deleta um lookup
```

## Tratamento de erro

| Cenário | Comportamento |
|---|---|
| Edge function 500 | Toast "Erro ao buscar preços". Sem persistência. |
| Fonte timeout/HTTP error | Row criada com `error: "timeout"` ou `"http_403"`. UI mostra ⚠. |
| Parser não acha preço | Row criada com `error: "parse_error"`. UI mostra "site mudou — avisar dev". |
| Sem resultados | Row com `error: "no_results"`. UI mostra "nada encontrado". |

## Riscos

1. **Scraping quebra** quando os sites mudam HTML. Mitigação: parsers isolados por arquivo + erro fica visível no UI sem derrubar os outros.
2. **Bot blocking** (Cloudflare, rate-limit). Mitigação: User-Agent comum, sem retries, 1 request/busca. Se um site bloquear sistematicamente, plugar serviço pago (ScrapingBee) só pra ele.
3. **LGPD/ToS**: scraping de preços públicos é zona cinza. Não armazenamos conteúdo proprietário, só preço + link.
4. **Custo**: zero (Mercado Livre gratuito; edge function gratuita até 500k invocations/mês).

## Plano de entrega (ordem)

1. Migration: tabelas `price_lookups` + `price_lookup_results` + RLS.
2. Edge function `search-external-prices` com **só Mercado Livre** ponta-a-ponta.
3. Hooks `usePriceLookup` + `usePriceLookupHistory`.
4. `PriceLookupDialog` com aba "Buscar agora" funcionando para ML.
5. Plugar dialog em `StockPage`.
6. Aba "Histórico".
7. Adicionar parsers: lideranca → macromaq → extramaquinas (um por vez, validando manualmente).
8. Botão "Salvar como custo".

## Não-objetivos (YAGNI)

- Gráfico de evolução temporal (deixar para fase 2 quando houver dados).
- Alertas de preço (notificações).
- Comparação automática com `parts.estimated_price` (margem visual fica no UI, não no banco).
- Múltiplas regiões/idiomas no Mercado Livre (só MLB-Brasil).
- Carrinho de compras / order placement nos fornecedores.
