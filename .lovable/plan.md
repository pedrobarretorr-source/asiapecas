

# Plano de correções: testes feitos, problemas reais encontrados

Testei o sistema como usuário/admin e cruzei com o banco. **Cinco coisas que você pediu não foram concluídas** apesar dos planos aprovados. Aqui está o estado real e o que vou consertar.

## Diagnóstico real (não chute)

| Pedido seu | Estado real hoje | Evidência |
|---|---|---|
| Esconder preço no portal público | **Ainda aparece** (`R$ X,XX`) | `QuotePartCard.tsx` linha 49 lê `estimated_price` e renderiza |
| Banners + promoções com aviso | **Zero banners, zero promoções ativas no banco** | `vitrine_banners` ativos = 0, `part_promotions` ativas = 0 |
| IA de clientes funcionando | **Funcionou só em 1 dos 6 últimos** (Anglo, Andrade Gutierrez, Alya, Ágilis, ADS = `sources: []`) | `enrichment_data->sources` vazio; sem campo `telemetry.rounds_executed` (código novo nunca rodou) |
| Centralizar 4 telas em "Inteligência" | **Hub não existe** | `src/pages/IntelligencePage.tsx` ausente, `src/components/intelligence/` ausente, sidebar idêntica |
| Classificação determinística (pneus, filtros, todas as 25+ subcategorias) | **Migrações criadas mas nunca executadas** — pneus continuam com `00R25`, `2980-20`, `12R22`; Fixadores/Vedações/Sensores com **0 atributos** preenchidos; cobertura travada em **62.5%** (5.741 SKUs sem subcategoria) | `parts.attributes` ainda corrompido; `classify_parts_v4()` não foi invocada |

## O que vou fazer (ordem de prioridade)

### 1. Esconder preço do portal público (15 min)
- `QuotePartCard.tsx` e `QuotePartDetail.tsx`: condicionar bloco de preço ao `useAuth().user`. Se anônimo → mostra "Solicitar cotação" + selo de promoção (sem valor).
- `PartDetailPublicPage.tsx`: idem. Selo "Em promoção" aparece se houver `part_promotions.active=true` no SKU, mas **sem** mostrar `promo_price`.
- Vendedor logado continua vendo tudo (preço, margem, custo).

### 2. Executar a classificação determinística que já está no banco (10 min)
A função `classify_parts_v4()` existe mas nunca foi rodada. Vou:
- `SELECT cleanup_bad_attributes();` para zerar `00R25`, `2980-20` etc.
- `SELECT classify_parts_v4(false);` (full re-run, lê da `subcategory_taxonomy` com 32 linhas já populadas).
- Validar: pneus só em formato canônico (`26.5R25`, `17.5-25`); Filtros/Rolamentos/Sensores/Vedações/Fixadores com atributos extraídos; cobertura ≥ 95%.
- Se `subcategory_taxonomy` estiver com regex de pneus ainda solta (deixou passar `00R25`), endurecer o pattern: `\m\d{2}\.?\d?R\d{2}\M` com lookbehind por espaço/início, e adicionar `negative_terms` (`câmara`, `protetor`).

### 3. Construir o hub `/inteligencia` de verdade (45 min)
As RPCs `get_intelligence_view` e `get_drilldown` já existem no banco. Falta a UI:
- `src/pages/IntelligencePage.tsx` — header com KPIs + semáforo 🟢🟡🔴, filtros únicos (chips), tabs `[Galeria][Tabela][Modelo×Sub][BCG][Saúde][Apresentação]`.
- `src/components/intelligence/SmartSearchBar.tsx` — chama `search_parts` RPC (já existe), tokens visuais (`código:6205`, `medida:26.5R25`), atalho `/`.
- `src/components/intelligence/SubcategoryGallery.tsx` — cards com chips clicáveis dos atributos (vem de `gallery[].chips`).
- `src/components/intelligence/DrilldownDrawer.tsx` — usa `get_drilldown` que já agrega `compatible_models` + `customer_equipment`.
- `src/components/intelligence/ExecutivePresentation.tsx` — mesma renderização do `export-pdf-report.ts` mas alimentada pelo dataset filtrado atual.
- `App.tsx`: rota `/inteligencia`; `/categorias`, `/estoque`, `/relatorio` viram `<Navigate to="/inteligencia">`.
- `AppSidebar.tsx`: 4 itens colapsam em 1 ("Inteligência").
- `CatalogPage.tsx`: remove tab "Relatórios".

### 4. Banners e promoções com fluxo visível (30 min)
- `AdminVitrinePage.tsx`: aba **"Banners"** com lista, criar/editar (image_url, title, subtitle, cta, datas, lang), preview ao vivo, badge "🟢 Ativo agora" / "⏸ Programado" / "🔴 Inativo".
- Aba **"Promoções"** (não existia): listar `part_promotions` com busca de SKU, criar com data/hora, ativar/pausar.
- `QuotePage.tsx`/portal público: faixa fixa no topo "🔥 X promoções ativas — fale com vendas" quando houver `part_promotions.active=true`. Sem mostrar preço promocional, só selo.
- `HeroCarousel.tsx`: mostrar empty state com link para criar banner se admin logado e não houver banner ativo.

### 5. Diagnosticar por que o enriquecimento de IA continua vazio (20 min)
O fix anterior (rounds 1+2, sanitização, `search_override`) está no código mas **não está rodando** — os 5 enriquecimentos pós-fix não têm `telemetry.rounds_executed`. Possíveis causas:
- Função não foi redeployada após o último edit, ou
- Deploy quebrou em build, ou
- O frontend não está enviando `search_override` quando o usuário clica reverificar e silenciosamente cai no path antigo.

Vou: (a) checar `supabase--edge_function_logs enrich-customer` por erro de build; (b) `supabase--curl_edge_functions` direto na função com `{customer_id, search_override:"Anglo American"}` para confirmar que aceita e responde; (c) corrigir o que aparecer (provavelmente redeploy) e refazer o teste com 3 clientes da lista vazia.

### 6. Verificar a saúde dos dados via aba Saúde (já vem grátis com #3)
O semáforo 🟡 "Atributos preenchidos" vai mostrar imediatamente:
- Filtros: 81% têm atributo (bom)
- Rolamentos: 41% (médio — taxonomia precisa mais sinônimos)
- Fixadores/Vedações/Sensores/Cabine/Eixos: 0% (regex de atributo está faltando ou não bate)

Onde estiver vermelho, abre drawer com SKUs e botão "adicionar sinônimo à taxonomia" → grava em `subcategory_taxonomy.synonyms_pt[]` → próximo `classify_parts_v4` cobre.

## Arquivos afetados

**Frontend novos**: 
`IntelligencePage.tsx`, `intelligence/SmartSearchBar.tsx`, `intelligence/SubcategoryGallery.tsx`, `intelligence/HealthSemaphore.tsx`, `intelligence/UnifiedFilters.tsx`, `intelligence/DrilldownDrawer.tsx`, `intelligence/ExecutivePresentation.tsx`, `intelligence/AttributeChips.tsx`, `admin/PromotionsManager.tsx`, `admin/BannersManager.tsx`, `hooks/use-intelligence.ts`, `hooks/use-smart-search.ts`.

**Frontend editados**: 
`QuotePartCard.tsx`, `QuotePartDetail.tsx`, `PartDetailPublicPage.tsx` (esconder preço para anônimo), `QuotePage.tsx` (faixa de promoção), `App.tsx` (rotas), `AppSidebar.tsx` (colapsar), `CatalogPage.tsx` (sem tab Relatórios), `AdminVitrinePage.tsx` (abas Banners + Promoções), `HeroCarousel.tsx` (empty state).

**Backend/SQL** (operações, não migrações novas):
- `cleanup_bad_attributes()` + `classify_parts_v4(false)` rodados via migração one-shot.
- Endurecer regex de pneus em `subcategory_taxonomy` se necessário (UPDATE numa linha).
- `enrich-customer` redeploy + verificação de logs.

**Removidos** (após /inteligencia validado):
`src/pages/StockPage.tsx`, `src/pages/CategoriesPage.tsx`, `src/pages/ReportPage.tsx`, `catalog/reports/ReportsTab.tsx`.

## Critérios de aceitação (eu mesmo testo no fim)

1. Abrir `/cotacao` em janela anônima → **nenhum R$ visível**, só "Solicitar cotação" e selo de promoção.
2. `SELECT count(*) FROM parts WHERE subcategory IS NULL` → ≤ 5% do total.
3. `SELECT distinct attributes->>'medida' FROM parts WHERE subcategory='Pneus'` → só `26.5R25`, `17.5-25`, `14.00R24` e similares.
4. Sidebar tem **"Inteligência"** no lugar de Categorias+Estoque+Relatório.
5. Em `/inteligencia`: filtro `Subcat=Pneus` → card mostra chip `26.5R25 (X SKUs · R$ Y)` clicável → drawer com lista + máquinas compatíveis. **3 cliques.**
6. Buscar `"6205 rolam"` na SmartSearchBar → rolamentos 6205 no topo em < 1s.
7. Admin Vitrine → criar banner com imagem → portal público mostra; criar promoção → selo aparece sem preço.
8. Reverificar Anglo American com `search_override="Anglo American"` → `enrichment_data.sources` com ≥ 2 URLs e `telemetry.rounds_executed=2`.

