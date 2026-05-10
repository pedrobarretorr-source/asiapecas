# Gerador de Propostas PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o download de HTML por geração de PDF direto no browser via `@react-pdf/renderer`, com layout profissional, numeração sequencial `ASIA-2026-XXXX`, formulário responsivo e envio via WhatsApp.

**Architecture:** Novo `src/lib/generate-proposal-pdf.tsx` monta um `<Document>` React PDF e exporta `downloadProposalPDF()` com import dinâmico do renderer. O hook `use-proposal-number.ts` confirma o número atomicamente via RPC Supabase **antes** de gerar o PDF (garantindo que o número impresso no documento seja o número real). O formulário existente (`ProposalHtmlGeneratorTab.tsx`) é atualizado para usar os novos fluxos e layout responsivo.

**Tech Stack:** React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase + `@react-pdf/renderer` + Vitest

**Spec:** `docs/superpowers/specs/2026-05-07-gerador-propostas-pdf-design.md`

---

## File Map

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/migrations/20260507120000_proposal_counters.sql` |
| Criar | `src/lib/logo.ts` |
| Criar | `src/hooks/use-proposal-number.ts` |
| Criar | `src/lib/generate-proposal-pdf.tsx` |
| Criar | `src/test/use-proposal-number.test.ts` |
| Renomear | `src/lib/generate-proposal-pdf.ts` → `src/lib/generate-sale-pdf.ts` |
| Modificar | `src/components/sales/ProposalCustomizeDialog.tsx` (atualizar import) |
| Modificar | `src/lib/generate-proposal-html.ts` (adicionar `unit`, `seller`, `validityText`) |
| Modificar | `src/components/sales/ProposalHtmlGeneratorTab.tsx` (formulário + PDF + responsive) |
| Modificar | `src/pages/SalesPage.tsx` (renomear tab) |
| Baixar | `public/fonts/Roboto-Regular.ttf` + `public/fonts/Roboto-Bold.ttf` |

> `ProposalConfigTab.tsx` — sem impacto: não usa `generateProposalHTML` diretamente.

---

## Task 1: Migration Supabase — proposal_counters

**Files:**
- Create: `supabase/migrations/20260507120000_proposal_counters.sql`
- Modify: `src/integrations/supabase/types.ts`

- [ ] **Step 1.1: Criar arquivo de migration**

```sql
-- supabase/migrations/20260507120000_proposal_counters.sql

create table if not exists proposal_counters (
  year        integer primary key,
  last_number integer not null default 0
);

alter table proposal_counters enable row level security;

create policy "Authenticated users can read proposal_counters"
  on proposal_counters for select
  to authenticated using (true);

create policy "Authenticated users can insert proposal_counters"
  on proposal_counters for insert
  to authenticated with check (true);

create policy "Authenticated users can update proposal_counters"
  on proposal_counters for update
  to authenticated using (true) with check (true);

-- Sem policy de DELETE — protege a integridade do contador

create or replace function next_proposal_number(p_year integer)
returns integer
language plpgsql
security definer
as $$
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

- [ ] **Step 1.2: Aplicar migration no Supabase**

Acesse o dashboard Supabase → SQL Editor → cole e execute o conteúdo do arquivo acima.

Ou via CLI (se configurado):
```bash
supabase db push
```

- [ ] **Step 1.3: Atualizar tipos gerados em src/integrations/supabase/types.ts**

Localizar o bloco `proposal_settings` (por volta da linha 711) e inserir o bloco abaixo **imediatamente antes** dele (entre `pricing_settings` e `proposal_settings`):

```typescript
      proposal_counters: {
        Row: {
          year: number
          last_number: number
        }
        Insert: {
          year: number
          last_number?: number
        }
        Update: {
          year?: number
          last_number?: number
        }
        Relationships: []
      }
```

Localizar a seção `Functions` no arquivo (buscar por `Functions:`) e adicionar dentro do objeto:

```typescript
        next_proposal_number: {
          Args: { p_year: number }
          Returns: number
        }
```

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/20260507120000_proposal_counters.sql src/integrations/supabase/types.ts
git commit -m "feat: add proposal_counters table and next_proposal_number RPC"
```

---

## Task 2: Extrair logo.ts e renomear generate-proposal-pdf.ts

**Files:**
- Create: `src/lib/logo.ts`
- Rename: `src/lib/generate-proposal-pdf.ts` → `src/lib/generate-sale-pdf.ts`
- Modify: `src/components/sales/ProposalCustomizeDialog.tsx`
- Modify: `src/components/sales/ProposalHtmlGeneratorTab.tsx` (só o import de logo)

- [ ] **Step 2.1: Criar src/lib/logo.ts**

A implementação real usa Vite asset import. Copiar exatamente da função atual em `src/lib/generate-proposal-pdf.ts` (linhas 280–294):

```typescript
// src/lib/logo.ts
export async function loadLogoAsBase64(): Promise<string | undefined> {
  try {
    const logoModule = await import("@/assets/LOGO-ATUALIZADO.png");
    const url = logoModule.default;
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 2.2: Renomear generate-proposal-pdf.ts → generate-sale-pdf.ts**

```bash
mv src/lib/generate-proposal-pdf.ts src/lib/generate-sale-pdf.ts
```

Abrir `src/lib/generate-sale-pdf.ts` e remover a função `loadLogoAsBase64` (linhas 280–294) — ela agora vive em `logo.ts`.

- [ ] **Step 2.3: Atualizar ProposalCustomizeDialog.tsx**

Localizar:
```typescript
import { generateProposalPDF, loadLogoAsBase64 } from "@/lib/generate-proposal-pdf";
```

Substituir por:
```typescript
import { generateProposalPDF } from "@/lib/generate-sale-pdf";
import { loadLogoAsBase64 } from "@/lib/logo";
```

- [ ] **Step 2.4: Atualizar ProposalHtmlGeneratorTab.tsx (só o import de logo)**

Localizar:
```typescript
import { loadLogoAsBase64 } from "@/lib/generate-proposal-pdf";
```

Substituir por:
```typescript
import { loadLogoAsBase64 } from "@/lib/logo";
```

- [ ] **Step 2.5: Verificar build**

```bash
npm run build 2>&1 | head -40
```

Esperado: sem erros relacionados aos imports alterados.

- [ ] **Step 2.6: Commit**

```bash
git add src/lib/logo.ts src/lib/generate-sale-pdf.ts src/components/sales/ProposalCustomizeDialog.tsx src/components/sales/ProposalHtmlGeneratorTab.tsx
git commit -m "refactor: extract loadLogoAsBase64 to logo.ts, rename to generate-sale-pdf"
```

---

## Task 3: Instalar dependência e baixar fontes

**Files:**
- Install: `@react-pdf/renderer`
- Download: `public/fonts/Roboto-Regular.ttf`, `public/fonts/Roboto-Bold.ttf`

- [ ] **Step 3.1: Instalar @react-pdf/renderer**

```bash
npm install @react-pdf/renderer
```

Verificar que foi adicionado ao `package.json`.

- [ ] **Step 3.2: Baixar fontes Roboto estáticas**

Usar os arquivos estáticos (não variable font) para que bold e regular renderizem corretamente no PDF:

```bash
mkdir -p public/fonts
curl -L "https://github.com/google/fonts/raw/refs/heads/main/apache/roboto/static/Roboto-Regular.ttf" -o public/fonts/Roboto-Regular.ttf
curl -L "https://github.com/google/fonts/raw/refs/heads/main/apache/roboto/static/Roboto-Bold.ttf" -o public/fonts/Roboto-Bold.ttf
```

> Alternativa: baixar manualmente de https://fonts.google.com/specimen/Roboto os arquivos estáticos `Roboto-Regular.ttf` e `Roboto-Bold.ttf` e colocar em `public/fonts/`.

- [ ] **Step 3.3: Verificar arquivos**

```bash
ls -lh public/fonts/
```

Esperado: dois arquivos `.ttf` distintos, cada um > 100 KB.

- [ ] **Step 3.4: Commit**

```bash
git add package.json package-lock.json public/fonts/
git commit -m "chore: install @react-pdf/renderer and add Roboto static fonts"
```

---

## Task 4: Hook use-proposal-number

**Files:**
- Create: `src/hooks/use-proposal-number.ts`
- Create: `src/test/use-proposal-number.test.ts`

- [ ] **Step 4.1: Escrever o teste primeiro**

```typescript
// src/test/use-proposal-number.test.ts
import { describe, it, expect } from "vitest";
import { formatProposalNumber } from "@/hooks/use-proposal-number";

describe("formatProposalNumber", () => {
  it("formata número com padding de 4 dígitos", () => {
    expect(formatProposalNumber(2026, 4)).toBe("ASIA-2026-0004");
  });

  it("formata número 1", () => {
    expect(formatProposalNumber(2026, 1)).toBe("ASIA-2026-0001");
  });

  it("não trunca números acima de 9999", () => {
    expect(formatProposalNumber(2026, 10000)).toBe("ASIA-2026-10000");
  });
});
```

- [ ] **Step 4.2: Rodar teste para confirmar que falha**

```bash
npx vitest run src/test/use-proposal-number.test.ts
```

Esperado: FAIL — module not found ou symbol not defined.

- [ ] **Step 4.3: Criar src/hooks/use-proposal-number.ts**

```typescript
// src/hooks/use-proposal-number.ts
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function formatProposalNumber(year: number, n: number): string {
  return `ASIA-${year}-${String(n).padStart(4, "0")}`;
}

export function useProposalNumber() {
  const year = new Date().getFullYear();
  const [suggestedNumber, setSuggestedNumber] = useState(() =>
    formatProposalNumber(year, 1)
  );

  useEffect(() => {
    supabase
      .from("proposal_counters")
      .select("last_number")
      .eq("year", year)
      .maybeSingle()
      .then(({ data }) => {
        const next = (data?.last_number ?? 0) + 1;
        setSuggestedNumber(formatProposalNumber(year, next));
      });
  }, [year]);

  async function confirmNumber(): Promise<string> {
    const { data, error } = await supabase.rpc("next_proposal_number", {
      p_year: year,
    });
    if (error) throw error;
    const confirmed = formatProposalNumber(year, data as number);
    setSuggestedNumber(formatProposalNumber(year, (data as number) + 1));
    return confirmed;
  }

  return { suggestedNumber, confirmNumber };
}
```

- [ ] **Step 4.4: Rodar teste para confirmar que passa**

```bash
npx vitest run src/test/use-proposal-number.test.ts
```

Esperado: PASS — 3 testes passando.

- [ ] **Step 4.5: Commit**

```bash
git add src/hooks/use-proposal-number.ts src/test/use-proposal-number.test.ts
git commit -m "feat: add use-proposal-number hook with atomic Supabase RPC"
```

---

## Task 5: Criar generate-proposal-pdf.tsx

**Files:**
- Create: `src/lib/generate-proposal-pdf.tsx`

Import dinâmico mantém ~500 KB do renderer fora do bundle principal. Roboto é registrada para suportar ã, ç, ê, á etc.

- [ ] **Step 5.1: Criar src/lib/generate-proposal-pdf.tsx**

```typescript
// src/lib/generate-proposal-pdf.tsx
import type { ProposalHtmlCompany as ProposalPdfCompany } from "./generate-proposal-html";
import type { ProposalHtmlCustomer as ProposalPdfCustomer } from "./generate-proposal-html";

export type { ProposalPdfCompany, ProposalPdfCustomer };

export type ProposalPdfItem = {
  material: string;
  description: string;
  unit: string;
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
  validityText?: string;
  observations?: string;
  seller?: ProposalPdfSeller;
  logoBase64?: string;
};

const DEFAULT_COMPANY: ProposalPdfCompany = {
  name: "Ásia Peças & Máquinas",
  cnpj: "XX.XXX.XXX/XXXX-XX",
  address: "Belo Horizonte - MG",
  phone: "(31) 98733-4504",
  email: "contato@asiapecas.com.br",
};

const C = {
  black:   "#0A0A0A",
  gold:    "#FBAE09",
  text:    "#1A1A1A",
  muted:   "#6B6B6B",
  white:   "#FFFFFF",
  rowAlt:  "#FAFAFA",
  border:  "#E5E5E5",
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function downloadProposalPDF(input: ProposalPdfInput): Promise<void> {
  const { Document, Page, Text, View, Image, StyleSheet, Font, pdf } =
    await import("@react-pdf/renderer");

  Font.register({
    family: "Roboto",
    fonts: [
      { src: "/fonts/Roboto-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/Roboto-Bold.ttf",    fontWeight: 700 },
    ],
  });

  const company = input.company ?? DEFAULT_COMPANY;
  const validityText =
    input.validityText ??
    "Essa proposta tem validade de 7 dias a partir da data de recebimento.";

  const styles = StyleSheet.create({
    page:            { fontFamily: "Roboto", fontSize: 9, color: C.text, backgroundColor: C.white },
    header:          { backgroundColor: C.black, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 3, borderBottomColor: C.gold },
    headerLeft:      { flexDirection: "row", alignItems: "center", gap: 12 },
    logo:            { width: 52, height: 40, objectFit: "contain" },
    headerCompanyName: { fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 2 },
    headerCompanySub:  { fontSize: 7.5, color: "#AAAAAA" },
    headerRight:     { alignItems: "flex-end" },
    headerType:      { fontSize: 7, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 },
    headerNumber:    { fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 2 },
    headerDate:      { fontSize: 8, color: "#BBBBBB" },
    body:            { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
    sectionLabel:    { fontSize: 7, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 12 },
    clientBox:       { borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 10 },
    clientRow:       { flexDirection: "row", gap: 12, marginBottom: 4 },
    clientField:     { flex: 1 },
    clientFieldLabel:{ fontSize: 6.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
    clientFieldValue:{ fontSize: 8.5, fontWeight: 700 },
    table:           { borderWidth: 1, borderColor: C.border, borderRadius: 4, overflow: "hidden", marginTop: 8 },
    tableHead:       { flexDirection: "row", backgroundColor: C.black, paddingVertical: 6, paddingHorizontal: 8 },
    tableHeadCell:   { color: C.white, fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
    tableRow:        { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: C.border },
    tableRowAlt:     { backgroundColor: C.rowAlt },
    tableCell:       { fontSize: 8.5 },
    colCodigo:       { width: "18%" },
    colDescricao:    { flex: 1 },
    colUn:           { width: "8%", textAlign: "center" },
    colQtd:          { width: "8%", textAlign: "center" },
    colTotal:        { width: "18%", textAlign: "right" },
    totalBox:        { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
    totalInner:      { borderWidth: 1, borderColor: C.gold, borderRadius: 4, overflow: "hidden", minWidth: 200 },
    totalRow:        { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.gold },
    totalLabel:      { fontSize: 10, fontWeight: 700 },
    totalValue:      { fontSize: 10, fontWeight: 700 },
    validityBox:     { marginTop: 14, borderLeftWidth: 3, borderLeftColor: C.gold, paddingLeft: 8, paddingVertical: 4 },
    validityText:    { fontSize: 8.5, color: C.muted },
    obsText:         { fontSize: 8.5, color: C.muted, marginTop: 4 },
    footer:          { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, paddingHorizontal: 24, paddingBottom: 12, marginTop: "auto" },
    footerSeller:    { fontSize: 8, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 2 },
    footerText:      { fontSize: 7.5, color: C.muted, textAlign: "center" },
  });

  const subtotal = input.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  const ProposalDoc = (
    <Document title={`Cotação ${input.proposalNumber}`} author={company.name}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {input.logoBase64 ? <Image src={input.logoBase64} style={styles.logo} /> : null}
            <View>
              <Text style={styles.headerCompanyName}>{company.name}</Text>
              <Text style={styles.headerCompanySub}>{company.phone} · {company.email}</Text>
              {company.cnpj ? <Text style={styles.headerCompanySub}>CNPJ: {company.cnpj}</Text> : null}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerType}>Cotação de Peças</Text>
            <Text style={styles.headerNumber}>{input.proposalNumber}</Text>
            <Text style={styles.headerDate}>Data: {input.proposalDate}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Cliente */}
          <Text style={styles.sectionLabel}>Dados do cliente</Text>
          <View style={styles.clientBox}>
            <View style={styles.clientRow}>
              <View style={styles.clientField}>
                <Text style={styles.clientFieldLabel}>Cliente</Text>
                <Text style={styles.clientFieldValue}>{input.customer.name}</Text>
              </View>
              {input.customer.company ? (
                <View style={styles.clientField}>
                  <Text style={styles.clientFieldLabel}>Empresa</Text>
                  <Text style={styles.clientFieldValue}>{input.customer.company}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.clientRow}>
              {input.customer.document ? (
                <View style={styles.clientField}>
                  <Text style={styles.clientFieldLabel}>CNPJ / CPF</Text>
                  <Text style={styles.clientFieldValue}>{input.customer.document}</Text>
                </View>
              ) : null}
              {input.customer.phone ? (
                <View style={styles.clientField}>
                  <Text style={styles.clientFieldLabel}>Telefone</Text>
                  <Text style={styles.clientFieldValue}>{input.customer.phone}</Text>
                </View>
              ) : null}
              {input.customer.email ? (
                <View style={styles.clientField}>
                  <Text style={styles.clientFieldLabel}>E-mail</Text>
                  <Text style={styles.clientFieldValue}>{input.customer.email}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Itens */}
          <Text style={styles.sectionLabel}>Itens da cotação</Text>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.colCodigo]}>Código</Text>
              <Text style={[styles.tableHeadCell, styles.colDescricao]}>Descrição</Text>
              <Text style={[styles.tableHeadCell, styles.colUn]}>UN</Text>
              <Text style={[styles.tableHeadCell, styles.colQtd]}>Qtd</Text>
              <Text style={[styles.tableHeadCell, styles.colTotal]}>Total</Text>
            </View>
            {input.items.map((item, i) => (
              <View key={item.material + i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, styles.colCodigo]}>{item.material}</Text>
                <Text style={[styles.tableCell, styles.colDescricao]}>{item.description}</Text>
                <Text style={[styles.tableCell, styles.colUn]}>{item.unit || "UN"}</Text>
                <Text style={[styles.tableCell, styles.colQtd]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.colTotal]}>{money(item.quantity * item.unitPrice)}</Text>
              </View>
            ))}
          </View>

          {/* Total */}
          <View style={styles.totalBox}>
            <View style={styles.totalInner}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{money(subtotal)}</Text>
              </View>
            </View>
          </View>

          {/* Validade */}
          <View style={styles.validityBox}>
            <Text style={styles.validityText}>{validityText}</Text>
            {input.observations ? <Text style={styles.obsText}>{input.observations}</Text> : null}
          </View>
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          {input.seller ? (
            <Text style={styles.footerSeller}>{input.seller.name} · {input.seller.role}</Text>
          ) : null}
          <Text style={styles.footerText}>
            {company.name} · {company.address} · {company.phone}
          </Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(ProposalDoc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cotacao_${input.proposalNumber}_${input.customer.name.replace(/\s+/g, "_").slice(0, 40)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // revokeObjectURL after a delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
```

- [ ] **Step 5.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros em `generate-proposal-pdf.tsx`.

- [ ] **Step 5.3: Commit**

```bash
git add src/lib/generate-proposal-pdf.tsx
git commit -m "feat: add generate-proposal-pdf with @react-pdf/renderer and Roboto fonts"
```

---

## Task 6: Atualizar generate-proposal-html.ts

**Files:**
- Modify: `src/lib/generate-proposal-html.ts`

- [ ] **Step 6.1: Estender ProposalHtmlItem com unit**

Localizar:
```typescript
export type ProposalHtmlItem = {
  material: string;
  description: string;
  quantity: number;
  unitPrice: number;
};
```

Substituir por:
```typescript
export type ProposalHtmlItem = {
  material: string;
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
};
```

- [ ] **Step 6.2: Atualizar ProposalHtmlInput**

Localizar `ProposalHtmlInput` e:
- Remover `paymentTerms?: string`
- Remover `warrantyText?: string`
- Adicionar `validityText?: string`
- Adicionar `seller?: { name: string; role: string }`

- [ ] **Step 6.3: Atualizar generateProposalHTML**

Dentro da função, localizar onde `paymentTerms` e `warrantyText` são desestruturados/usados e substituir pela nova lógica:

```typescript
const validityText = input.validityText ?? "Essa proposta tem validade de 7 dias a partir da data de recebimento.";
const seller = input.seller;
```

Localizar a seção `.terms` no template HTML (4 cards: pagamento, entrega, garantia, observações) e substituir por:

```html
<div class="validity-block">
  <p>${multiline(validityText)}</p>
  ${input.observations ? `<p class="obs">${multiline(input.observations)}</p>` : ""}
</div>
```

No rodapé (`<footer>`), adicionar o vendedor:

```html
${seller ? `<p class="seller">${text(seller.name)} &middot; ${text(seller.role)}</p>` : ""}
```

- [ ] **Step 6.4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "generate-proposal-html"
```

Esperado: sem erros.

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/generate-proposal-html.ts
git commit -m "feat: extend ProposalHtmlInput with unit, seller, validityText; remove paymentTerms/warrantyText"
```

---

## Task 7: Atualizar ProposalHtmlGeneratorTab.tsx

**Files:**
- Modify: `src/components/sales/ProposalHtmlGeneratorTab.tsx`

- [ ] **Step 7.1: Atualizar imports**

Substituir o bloco de imports atual por:

```typescript
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllCustomers } from "@/hooks/use-customers";
import { applySellPrice, usePricingSettings } from "@/hooks/use-pricing";
import { useProposalSettings } from "@/hooks/use-proposal-settings";
import { useProposalNumber } from "@/hooks/use-proposal-number";
import { supabase } from "@/integrations/supabase/client";
import { loadLogoAsBase64 } from "@/lib/logo";
import { generateProposalHTML, type ProposalHtmlCustomer, type ProposalHtmlItem } from "@/lib/generate-proposal-html";
import { downloadProposalPDF, type ProposalPdfInput } from "@/lib/generate-proposal-pdf";
import { formatWhatsAppLink } from "@/lib/whatsapp";
import { Copy, Download, Loader2, MessageCircle, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
```

- [ ] **Step 7.2: Atualizar tipos**

Adicionar `unit` ao `BuilderItem`:

```typescript
type BuilderItem = ProposalHtmlItem & {
  id: string;
  partId: string;
  stock: number;
  costPrice: number;
  machineModel: string | null;
  unit: string;
};
```

Adicionar `unit` ao `SearchPart`:

```typescript
type SearchPart = {
  id: string;
  material: string;
  description: string;
  estimated_price: number;
  stock: number;
  machine_model: string | null;
  unit: string | null;
};
```

- [ ] **Step 7.3: Atualizar estados — remover obsoletos, adicionar novos**

Remover os estados: `validity`, `paymentTerms`, `warrantyText`, `deliveryTerms`.

Manter: `proposalNumber` (mas agora inicializado como `""` e preenchido pelo hook), `proposalDate`, `observations`.

Adicionar:

```typescript
const { suggestedNumber, confirmNumber } = useProposalNumber();
const [sellerName, setSellerName] = useState("Pedro Henrique");
const [sellerRole, setSellerRole] = useState("Consultor Comercial");
const [isGenerating, setIsGenerating] = useState(false);
```

Substituir a inicialização de `proposalNumber`:

```typescript
const [proposalNumber, setProposalNumber] = useState("");

useEffect(() => {
  if (!proposalNumber) setProposalNumber(suggestedNumber);
}, [suggestedNumber]);
```

Atualizar o `useEffect` que carrega settings (remover `setValidity`, `setDeliveryTerms`, `setWarrantyText`):

```typescript
useEffect(() => {
  if (!settings) return;
  setObservations(settings.default_observations);
}, [settings]);
```

- [ ] **Step 7.4: Atualizar searchParts para incluir unit**

Na query do Supabase:
```typescript
.select("id,material,description,estimated_price,stock,machine_model,unit")
```

> Se a coluna `unit` não existir na tabela `parts`, remover do select e usar `"UN"` fixo.

- [ ] **Step 7.5: Atualizar addPart para incluir unit**

```typescript
return [...current, {
  id: createItemId(),
  partId: part.id,
  material: part.material,
  description: part.description,
  unit: part.unit || "UN",
  quantity: 1,
  unitPrice: applySellPrice(Number(part.estimated_price || 0), markup),
  costPrice: Number(part.estimated_price || 0),
  stock: part.stock,
  machineModel: part.machine_model,
}];
```

- [ ] **Step 7.6: Atualizar buildQuoteMessage — remover deliveryTerms**

Localizar a função `buildQuoteMessage` e:
- Remover `deliveryTerms` dos parâmetros
- Remover a linha `if (params.deliveryTerms.trim()) lines.push(...)`
- Substituir a última linha da mensagem:

```typescript
// antes: "A cotacao em HTML esta pronta para envio/anexo."
// depois: "O PDF da cotacao ja foi baixado e esta pronto para envio."
```

Atualizar o `useMemo` que chama `buildQuoteMessage` para não passar `deliveryTerms`.

- [ ] **Step 7.7: Atualizar o useMemo de proposalHtml**

Localizar o `useMemo` que chama `generateProposalHTML` e atualizar para passar os novos campos e remover os obsoletos:

```typescript
const proposalHtml = useMemo(() => {
  if (!readyToGenerate) return "";
  return generateProposalHTML({
    company,
    customer,
    items,
    proposalNumber,
    proposalDate,
    validityText: settings
      ? `Essa proposta tem validade de ${settings.default_validity_days} dias a partir da data de recebimento.`
      : undefined,
    observations,
    seller: sellerName ? { name: sellerName, role: sellerRole } : undefined,
    logoBase64,
  });
}, [readyToGenerate, company, customer, items, proposalNumber, proposalDate, settings, observations, sellerName, sellerRole, logoBase64]);
```

- [ ] **Step 7.8: Remover variáveis e funções mortas**

Remover (se existirem após as alterações acima):
- `filename` (usava `getProposalHtmlFilename`)
- `handleDownload` (baixava HTML)
- `handleOpen` (abria HTML em nova aba)
- `handleCopy` (copiava HTML para clipboard)

- [ ] **Step 7.9: Implementar handleDownloadPDF**

```typescript
const buildPdfInput = (): ProposalPdfInput => ({
  company,
  customer,
  items: items.map((it) => ({
    material: it.material,
    description: it.description,
    unit: it.unit || "UN",
    quantity: it.quantity,
    unitPrice: it.unitPrice,
  })),
  proposalNumber,
  proposalDate,
  validityText: settings
    ? `Essa proposta tem validade de ${settings.default_validity_days} dias a partir da data de recebimento.`
    : undefined,
  observations,
  seller: sellerName ? { name: sellerName, role: sellerRole } : undefined,
  logoBase64,
});

const handleDownloadPDF = async () => {
  if (!readyToGenerate || isGenerating) return;
  setIsGenerating(true);
  try {
    // Confirmar número ANTES de gerar o PDF para garantir que o número impresso é o real
    const confirmedNumber = await confirmNumber();
    setProposalNumber(confirmedNumber);
    await downloadProposalPDF({ ...buildPdfInput(), proposalNumber: confirmedNumber });
    toast.success("PDF gerado com sucesso");
  } catch (err) {
    toast.error(`Erro ao gerar PDF: ${err instanceof Error ? err.message : "erro desconhecido"}`);
  } finally {
    setIsGenerating(false);
  }
};
```

- [ ] **Step 7.10: Implementar handleWhatsApp**

```typescript
const handleWhatsApp = async () => {
  if (!readyToGenerate || isGenerating) return;
  setIsGenerating(true);
  try {
    const confirmedNumber = await confirmNumber();
    setProposalNumber(confirmedNumber);
    await downloadProposalPDF({ ...buildPdfInput(), proposalNumber: confirmedNumber });
    // Usar confirmedNumber diretamente: quoteMessage memo ainda está com o número antigo
    // pois setProposalNumber é assíncrono (batch do React) e ainda não re-avaliou
    const freshMessage = buildQuoteMessage({
      customer,
      items,
      proposalNumber: confirmedNumber,
      validity: settings
        ? `${settings.default_validity_days} dias`
        : "7 dias",
      total,
    });
    const url = formatWhatsAppLink(customer.phone, freshMessage);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.error("Informe um telefone valido para enviar pelo WhatsApp");
  } catch (err) {
    toast.error(`Erro ao gerar PDF: ${err instanceof Error ? err.message : "erro desconhecido"}`);
  } finally {
    setIsGenerating(false);
  }
};
```

- [ ] **Step 7.11: Atualizar campos do formulário**

**Adicionar campos Vendedor/Cargo** no Card do cabeçalho, ao lado de Data:

```tsx
<div>
  <Label>Vendedor</Label>
  <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} />
</div>
<div>
  <Label>Cargo</Label>
  <Input value={sellerRole} onChange={(e) => setSellerRole(e.target.value)} />
</div>
```

**Remover Card de condições** (pagamento, entrega, garantia) — manter apenas o campo de Observações no próprio Card de itens ou em um Card simples.

**Adicionar coluna UN na tabela de itens** (desktop):

No `<TableHead>`, após "Produto do banco":
```tsx
<TableHead className="w-20 text-center">UN</TableHead>
```

No `<TableRow>` de cada item:
```tsx
<TableCell>
  <Input
    value={item.unit || "UN"}
    onChange={(e) => updateItem(item.id, "unit" as keyof ProposalHtmlItem, e.target.value)}
    className="h-8 w-16 text-center"
  />
</TableCell>
```

- [ ] **Step 7.12: Adicionar mobile cards para itens**

Envolver a tabela em `hidden md:block` e adicionar bloco de cards para mobile:

```tsx
{/* Desktop */}
<div className="hidden md:block overflow-x-auto">
  {/* tabela existente */}
</div>

{/* Mobile */}
<div className="md:hidden space-y-2">
  {items.map((item) => (
    <div key={item.id} className="rounded-md border p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs font-medium">{item.material}</p>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          {item.machineModel && (
            <p className="text-[11px] text-muted-foreground">Modelo: {item.machineModel}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="w-16">
          <Label className="text-xs">UN</Label>
          <Input
            value={item.unit || "UN"}
            onChange={(e) => updateItem(item.id, "unit" as keyof ProposalHtmlItem, e.target.value)}
            className="h-7 text-center text-xs"
          />
        </div>
        <div className="w-20">
          <Label className="text-xs">Qtd</Label>
          <Input
            type="number" min={1} value={item.quantity}
            onChange={(e) => updateItem(item.id, "quantity", Math.max(1, Number(e.target.value) || 1))}
            className="h-7 text-center text-xs"
          />
        </div>
        <div className="flex-1 min-w-[100px]">
          <Label className="text-xs">Valor unit.</Label>
          <Input
            type="number" min={0} step={0.01} value={item.unitPrice}
            onChange={(e) => updateItem(item.id, "unitPrice", Math.max(0, Number(e.target.value) || 0))}
            className="h-7 text-xs"
          />
        </div>
      </div>
      <p className="text-right font-mono text-sm font-medium text-primary">
        {formatMoney(item.quantity * item.unitPrice)}
      </p>
    </div>
  ))}
</div>
```

- [ ] **Step 7.13: Atualizar botões do painel direito**

Substituir todos os botões de ação por:

```tsx
<Button
  variant="outline" size="sm"
  onClick={handleCopyMessage}
  disabled={!readyToGenerate || isGenerating}
  className="gap-2"
>
  <Copy className="h-4 w-4" /> Mensagem
</Button>
<Button
  variant="outline" size="sm"
  onClick={handleWhatsApp}
  disabled={!readyToGenerate || isGenerating}
  className="gap-2"
>
  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
  WhatsApp
</Button>
<Button
  size="sm"
  onClick={handleDownloadPDF}
  disabled={!readyToGenerate || isGenerating}
  className="gap-2"
>
  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
  Baixar PDF
</Button>
```

- [ ] **Step 7.14: Verificar TypeScript e build**

```bash
npx tsc --noEmit 2>&1 | head -40
npm run build 2>&1 | tail -10
```

Esperado: sem erros de tipo. Build passa.

- [ ] **Step 7.15: Commit**

```bash
git add src/components/sales/ProposalHtmlGeneratorTab.tsx
git commit -m "feat: update proposal generator — PDF download, seller fields, responsive items"
```

---

## Task 8: Renomear tab em SalesPage.tsx

**Files:**
- Modify: `src/pages/SalesPage.tsx`

- [ ] **Step 8.1: Renomear a tab e atualizar ícone**

Localizar:
```tsx
<TabsTrigger value="gerador-html" className="gap-1">
  <FileCode2 className="h-4 w-4" /> Gerador HTML
</TabsTrigger>
```

Substituir por:
```tsx
<TabsTrigger value="gerador-html" className="gap-1">
  <FileText className="h-4 w-4" /> Gerador de Proposta
</TabsTrigger>
```

No import do lucide-react, substituir `FileCode2` por `FileText` (ou adicionar `FileText` se `FileCode2` for usado em outro lugar).

- [ ] **Step 8.2: Commit**

```bash
git add src/pages/SalesPage.tsx
git commit -m "feat: rename Gerador HTML tab to Gerador de Proposta"
```

---

## Task 9: Teste manual e deploy

- [ ] **Step 9.1: Iniciar servidor de desenvolvimento**

```bash
npm run dev
```

- [ ] **Step 9.2: Testar fluxo completo**

1. Acessar `/vendas` → tab "Gerador de Proposta"
2. Preencher cliente (selecionar do banco ou digitar)
3. Preencher Vendedor e Cargo
4. Buscar e adicionar 2+ peças
5. Conferir preview HTML no painel direito (atualização em tempo real)
6. Clicar "Baixar PDF" — aguardar spinner → PDF deve baixar
7. Abrir PDF: verificar header preto, logo, número `ASIA-XXXX-XXXX`, tabela com código/UN/qtd/total, texto de validade, rodapé com vendedor
8. Verificar que o número da proposta no campo foi atualizado para o número real confirmado
9. Clicar "WhatsApp" — PDF deve baixar e WhatsApp Web deve abrir com mensagem
10. Redimensionar para mobile (Chrome DevTools) — itens devem aparecer como cards

- [ ] **Step 9.3: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: todos os testes passando (incluindo `use-proposal-number.test.ts`).

- [ ] **Step 9.4: Push e deploy**

```bash
git push origin master
```

O Vercel detecta o push e faz deploy automaticamente em ~2 minutos.
