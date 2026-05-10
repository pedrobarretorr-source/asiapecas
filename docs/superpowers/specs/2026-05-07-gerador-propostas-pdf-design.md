# Gerador de Propostas PDF — Design Spec
**Data:** 2026-05-07  
**Status:** Aprovado

---

## Objetivo

Substituir o fluxo atual (baixar HTML → imprimir no browser) por um botão único que gera um PDF profissional diretamente no browser, com layout padronizado, numeração sequencial e envio via WhatsApp.

---

## Escopo

### O que muda
- Geração de PDF com `@react-pdf/renderer` substituindo o HTML para download
- Layout do PDF mescla o design-system Python (header preto, amarelo `#FBAE09`) com o gerador HTML existente
- Formulário de itens simplificado: Código · Descrição · UN · Qtd · Valor Unit.
- Numeração sequencial `ASIA-2026-XXXX` via Supabase RPC atômica
- Campos de vendedor (nome, cargo) adicionados ao formulário
- Remoção dos campos de pagamento, entrega e garantia do PDF (mantidos na aba Config para o fluxo HTML legado)
- Validade como texto fixo construído a partir de `default_validity_days` da tabela `proposal_settings` (ex: "Essa proposta tem validade de 7 dias a partir da data de recebimento.")
- Layout responsivo do formulário (mobile: itens em card, desktop: tabela)
- Preview no painel direito continua usando o HTML (`<iframe srcDoc>`) — apenas o download usa PDF

### O que não muda
- Busca de peças no catálogo Supabase
- Seleção de cliente cadastrado
- Campo de observações
- Fluxo WhatsApp: baixa PDF + abre WhatsApp Web com mensagem de texto
- Colunas `default_delivery_terms`, `default_warranty_text`, `default_observations` na tabela `proposal_settings` (usadas pela aba Config/HTML legado)

---

## Arquitetura

### Novos arquivos

#### `src/lib/logo.ts`
Move `loadLogoAsBase64` do atual `generate-proposal-pdf.ts` para cá.  
Evita quebra de importação quando o arquivo PDF for reescrito.

#### `src/lib/generate-proposal-pdf.tsx`
Substitui o atual `generate-proposal-pdf.ts`.  
Exporta `downloadProposalPDF(input: ProposalPdfInput): Promise<void>`.  
Importa `@react-pdf/renderer` de forma **dinâmica** (`await import(...)`) para manter o renderer fora do bundle principal.  
Registra fonte Roboto (subset Latin-1 + Latin Extended, cobre todos os caracteres portugueses) via `Font.register()` antes de renderizar.  
Fluxo interno: gerar blob → disparar download (o `confirmNumber()` é chamado pelo componente, não por esta função).

#### `src/hooks/use-proposal-number.ts`
Expõe `nextNumber: string` (número sugerido, não garantido) e `confirmNumber(): Promise<void>`.  
`nextNumber` é derivado localmente de `(last_number + 1)` lido na montagem — serve apenas como sugestão visual.  
`confirmNumber()` chama a RPC `next_proposal_number(year)` que faz o incremento atômico e retorna o número real confirmado; o componente atualiza o campo com o valor retornado.

### Arquivos modificados

#### `src/lib/generate-proposal-html.ts`
- Estende `ProposalHtmlItem` com `unit?: string` (padrão `"UN"`)
- Adiciona `seller?: { name: string; role: string }` e `validityText?: string` a `ProposalHtmlInput`
- Remove `paymentTerms` e `warrantyText` de `ProposalHtmlInput` (mantidos apenas no fluxo HTML legado via settings)
- Atualiza o HTML gerado para refletir o novo layout (validade em texto, rodapé com vendedor)

#### `src/components/sales/ProposalHtmlGeneratorTab.tsx`
- Atualiza import de `loadLogoAsBase64` para `@/lib/logo`
- Adiciona campos Vendedor (nome, cargo) no cabeçalho do formulário
- Remove campos pagamento, entrega, garantia do formulário
- Adiciona campo UN na tabela de itens
- Botão "Baixar HTML" → "Baixar PDF" (chama `downloadProposalPDF` → depois `confirmNumber`)
- Botão WhatsApp: chama `downloadProposalPDF` → `confirmNumber` → `window.open(whatsappUrl)`
- Botão "Baixar PDF" mostra spinner e fica desabilitado enquanto `isGenerating === true`
- Preview do painel direito continua usando `<iframe srcDoc={proposalHtml}>`
- Layout responsivo: tabela de itens vira cards em mobile

#### `src/pages/SalesPage.tsx`
- Renomeia tab "Gerador HTML" → "Gerador de Proposta"

### Schema Supabase

```sql
-- Nova tabela
create table proposal_counters (
  year        integer primary key,
  last_number integer not null default 0
);

-- RPC atômica (evita número duplicado entre abas simultâneas)
create or replace function next_proposal_number(p_year integer)
returns integer language plpgsql as $$
declare
  v_next integer;
begin
  insert into proposal_counters (year, last_number)
    values (p_year, 1)
  on conflict (year)
    do update set last_number = proposal_counters.last_number + 1
  returning last_number into v_next;
  return v_next;
end;
$$;
```

RLS: apenas usuários autenticados podem ler `proposal_counters`.  
Após aplicar a migration, rodar `supabase gen types --local > src/integrations/supabase/types.ts` para atualizar os tipos gerados.

---

## Tipos de dados

```typescript
// Reusa os tipos existentes de generate-proposal-html.ts
import type { ProposalHtmlCompany as ProposalPdfCompany } from "./generate-proposal-html";
import type { ProposalHtmlCustomer as ProposalPdfCustomer } from "./generate-proposal-html";
export type { ProposalPdfCompany, ProposalPdfCustomer };

export type ProposalPdfItem = {
  material: string;      // código da peça
  description: string;
  unit: string;          // UN, PC, KIT... (padrão "UN")
  quantity: number;
  unitPrice: number;
};

export type ProposalPdfSeller = {
  name: string;
  role: string;
};

export type ProposalPdfInput = {
  company?: ProposalPdfCompany;
  customer: ProposalPdfCustomer;
  items: ProposalPdfItem[];
  proposalNumber: string;
  proposalDate: string;
  validityText?: string;  // construído no componente: `Essa proposta tem validade de ${days} dias a partir da data de recebimento.`
  observations?: string;
  seller?: ProposalPdfSeller;
  logoBase64?: string;
};
```

---

## Layout do PDF (A4)

```
┌─────────────────────────────────────────┐
│ HEADER #0A0A0A                          │
│  [Logo]  Cotação de Peças               │
│          Nº ASIA-2026-0004              │
│          Data: 07/05/2026               │
├─────────────────────────────────────────┤
│ Cliente: Razão Social                   │
│ CNPJ · Contato · Telefone · Email       │
├────────┬─────────────────┬────┬────┬────┤
│ Código │ Descrição       │ UN │Qtd │Tot │
├────────┼─────────────────┼────┼────┼────┤
│  ...   │ ...             │ UN │  2 │R$X │
├─────────────────────────────────────────┤
│                     Total: R$ XX.XXX,XX │
├─────────────────────────────────────────┤
│ Essa proposta tem validade de 7 dias a  │
│ partir da data de recebimento.          │
│ [Observações se houver]                 │
├─────────────────────────────────────────┤
│ RODAPÉ                                  │
│  Pedro Henrique · Consultor Comercial   │
│  Ásia Peças & Máquinas · (31) 98733-4504│
└─────────────────────────────────────────┘
```

**Cores:**
- Header / thead da tabela: `#0A0A0A`
- Acento / linha total / borda header: `#FBAE09`
- Texto principal: `#1A1A1A`
- Texto secundário: `#6B6B6B`

**Fonte:** Roboto (registrada via `Font.register` — cobre todos os caracteres portugueses: ã, ç, ê, á, etc.)

---

## Fluxo de numeração sequencial

1. Na montagem do componente, `useProposalNumber` lê `proposal_counters` para o ano atual e exibe `ASIA-{year}-{(last_number+1).padStart(4,'0')}` como sugestão (campo editável)
2. Usuário pode editar manualmente o campo de número
3. Ao clicar "Baixar PDF" ou "WhatsApp":
   a. Gera o blob PDF
   b. Dispara o download
   c. Chama `confirmNumber()` → RPC `next_proposal_number(year)` → atualiza o campo com o número real retornado
4. Se o usuário fechar sem baixar, o número não é consumido

> **Nota:** há uma janela de tempo entre o passo 1 (sugestão) e o passo 3c (confirmação). O número exibido antes do download é uma estimativa — o número real (confirmado atomicamente) é mostrado após o download e reflete o valor definitivo do PDF gerado.

---

## Fluxo WhatsApp

1. Usuário clica "WhatsApp"
2. Sistema gera o blob PDF e dispara o download
3. Sistema chama `confirmNumber()` e atualiza o campo com o número confirmado
4. Abre WhatsApp Web com mensagem de texto pré-preenchida:

```
Olá [nome], segue a cotação ASIA-2026-0004.

Itens:
- 2x 1.142.186 - Filtro hidráulico: R$ 1.060,00
- ...

Total: R$ X.XXX,XX
Validade: 7 dias a partir do recebimento.
```

5. Vendedor anexa o PDF (que já foi baixado automaticamente) no WhatsApp

---

## Responsividade do formulário

**Desktop (≥768px):** tabela horizontal com colunas Código · Descrição · UN · Qtd · Valor Unit. · Ações  
**Mobile (<768px):** cada item vira um card:
```
┌──────────────────────────┐
│ 1.142.186                │
│ Filtro hidráulico        │
│ UN  Qtd: [2]  R$ [530]  │
│                   [×]    │
└──────────────────────────┘
```

---

## Dependências a instalar

```
@react-pdf/renderer
```

Importado dinamicamente dentro de `downloadProposalPDF()` para manter o renderer (~500 KB gzip) fora do bundle principal:

```ts
const { pdf } = await import("@react-pdf/renderer");
```

---

## O que NÃO está no escopo

- Salvar propostas no banco (histórico)
- Envio automático por email
- Assinatura digital
- Remoção das colunas legadas (`default_delivery_terms`, `default_warranty_text`) da tabela `proposal_settings`
