export type ProposalHtmlCompany = {
  name: string;
  cnpj?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ProposalHtmlCustomer = {
  name: string;
  company?: string | null;
  document?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ProposalHtmlItem = {
  material: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type ProposalHtmlInput = {
  company?: ProposalHtmlCompany;
  customer: ProposalHtmlCustomer;
  items: ProposalHtmlItem[];
  proposalNumber?: string;
  proposalDate?: string;
  validity?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  warrantyText?: string;
  observations?: string;
  logoBase64?: string;
};

const DEFAULT_COMPANY: ProposalHtmlCompany = {
  name: "Asia Pecas & Maquinas",
  cnpj: "XX.XXX.XXX/XXXX-XX",
  address: "Macapa - AP",
  phone: "+55 95 97400-9289",
  email: "contato@asiapecas.com.br",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function money(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function text(value: string | number | null | undefined, fallback = "-") {
  const normalized = String(value ?? "").trim();
  return escapeHtml(normalized || fallback);
}

function multiline(value: string | null | undefined, fallback = "-") {
  return text(value, fallback).replace(/\r?\n/g, "<br>");
}

function formatProposalDate(value: string | null | undefined) {
  if (!value) return new Date().toLocaleDateString("pt-BR");
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return text(value);
  return date.toLocaleDateString("pt-BR");
}

function sanitizeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function getProposalHtmlFilename(input: Pick<ProposalHtmlInput, "proposalNumber" | "customer">) {
  const number = sanitizeFilePart(input.proposalNumber || "cotacao");
  const customer = sanitizeFilePart(input.customer.name || "cliente");
  return `cotacao_${number}_${customer}.html`;
}

export function generateProposalHTML(input: ProposalHtmlInput) {
  const company = input.company || DEFAULT_COMPANY;
  const proposalNumber = input.proposalNumber || `PROP-${new Date().getFullYear()}`;
  const proposalDate = formatProposalDate(input.proposalDate);
  const validity = input.validity || "15 dias";
  const deliveryTerms = input.deliveryTerms || "A combinar";
  const paymentTerms = input.paymentTerms || "A combinar";
  const warrantyText = input.warrantyText || "Garantia contra defeitos de fabricacao conforme politica comercial.";
  const observations = input.observations || "Frete, impostos e disponibilidade sujeitos a confirmacao no fechamento.";
  const items = input.items.filter((item) => item.quantity > 0);
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const rows = items.map((item, index) => {
    const total = item.quantity * item.unitPrice;
    return `
      <tr>
        <td class="idx">${String(index + 1).padStart(2, "0")}</td>
        <td>
          <strong>${text(item.material)}</strong>
          <span>${text(item.description)}</span>
        </td>
        <td class="qty">${text(item.quantity)}</td>
        <td class="money">${text(money(item.unitPrice))}</td>
        <td class="money strong">${text(money(total))}</td>
      </tr>
    `;
  }).join("");

  const logo = input.logoBase64
    ? `<img src="${escapeHtml(input.logoBase64)}" alt="${text(company.name)}">`
    : `<div class="logo-fallback">AP</div>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cotacao ${text(proposalNumber)} - ${text(input.customer.name)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #181b20;
      --muted: #667085;
      --line: #d8dde7;
      --panel: #f6f8fb;
      --gold: #caa43b;
      --gold-soft: #f7edc8;
      --dark: #252a32;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: #e9edf3;
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      line-height: 1.45;
    }

    .proposal {
      width: 210mm;
      min-height: 297mm;
      margin: 24px auto;
      background: #fff;
      box-shadow: 0 18px 55px rgba(18, 24, 38, 0.18);
      overflow: hidden;
    }

    .accent { height: 8px; background: var(--gold); }

    header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 28px;
      padding: 26px 34px 22px;
      border-bottom: 1px solid var(--line);
    }

    .brand {
      display: flex;
      gap: 16px;
      align-items: center;
      min-width: 0;
    }

    .brand img {
      width: 70px;
      max-height: 56px;
      object-fit: contain;
    }

    .logo-fallback {
      width: 58px;
      height: 58px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: var(--dark);
      color: var(--gold);
      font-weight: 800;
      letter-spacing: 1px;
    }

    h1, h2, h3, p { margin: 0; }

    .brand h1 {
      font-size: 22px;
      letter-spacing: 0;
      line-height: 1.05;
    }

    .brand p, .proposal-meta p, .muted { color: var(--muted); }

    .proposal-meta {
      min-width: 190px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: var(--panel);
    }

    .proposal-meta strong {
      display: block;
      font-size: 17px;
      margin-bottom: 6px;
    }

    .content { padding: 28px 34px 34px; }

    .title-block {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 18px;
      margin-bottom: 24px;
    }

    .hero {
      background: var(--dark);
      color: #fff;
      border-radius: 8px;
      padding: 22px;
    }

    .hero .kicker {
      color: var(--gold);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }

    .hero h2 {
      font-size: 28px;
      letter-spacing: 0;
      line-height: 1.05;
      margin-bottom: 10px;
    }

    .summary {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      padding: 7px 0;
      border-bottom: 1px solid #edf0f5;
    }

    .summary-row:last-child { border-bottom: 0; }
    .summary-row strong { text-align: right; }

    .section-title {
      color: var(--gold);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 20px 0 10px;
    }

    .client-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    .field label {
      display: block;
      color: var(--muted);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 3px;
    }

    .field strong {
      display: block;
      overflow-wrap: anywhere;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }

    thead th {
      background: var(--dark);
      color: #fff;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 10px 9px;
      text-align: left;
    }

    tbody td {
      border-top: 1px solid var(--line);
      padding: 10px 9px;
      vertical-align: top;
    }

    tbody tr:nth-child(even) td { background: #faf7ee; }
    td span { display: block; color: var(--muted); margin-top: 2px; }
    .idx, .qty { text-align: center; width: 58px; }
    .money { text-align: right; white-space: nowrap; }
    .strong { font-weight: 800; }

    .total-box {
      width: 280px;
      margin-left: auto;
      margin-top: 14px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--gold);
    }

    .total-box div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 13px;
    }

    .total-box .grand {
      background: var(--gold);
      color: #161616;
      font-size: 18px;
      font-weight: 800;
    }

    .terms {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .term {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 13px;
      min-height: 92px;
    }

    .term h3 {
      color: var(--gold);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 7px;
    }

    .signature {
      margin-top: 36px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
    }

    .signature-line {
      border-top: 1px solid var(--muted);
      padding-top: 8px;
      color: var(--muted);
    }

    footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 11px;
      text-align: center;
    }

    @page { size: A4; margin: 12mm; }

    @media print {
      body { background: #fff; }
      .proposal {
        width: auto;
        min-height: auto;
        margin: 0;
        box-shadow: none;
      }
      header, .content { padding-left: 0; padding-right: 0; }
      .accent { margin-left: -12mm; margin-right: -12mm; }
    }

    @media (max-width: 820px) {
      .proposal { width: 100%; margin: 0; min-height: 0; }
      header, .title-block, .client-grid, .terms, .signature {
        grid-template-columns: 1fr;
      }
      header, .content { padding: 20px; }
      .total-box { width: 100%; }
    }
  </style>
</head>
<body>
  <main class="proposal">
    <div class="accent"></div>
    <header>
      <section class="brand">
        ${logo}
        <div>
          <h1>${text(company.name)}</h1>
          <p>${text(company.address)}<br>${text(company.phone)} | ${text(company.email)}<br>CNPJ: ${text(company.cnpj)}</p>
        </div>
      </section>
      <aside class="proposal-meta">
        <strong>${text(proposalNumber)}</strong>
        <p>Data: ${text(proposalDate)}</p>
        <p>Validade: ${text(validity)}</p>
      </aside>
    </header>

    <section class="content">
      <div class="title-block">
        <div class="hero">
          <p class="kicker">Cotacao comercial</p>
          <h2>Cotacao de pecas e componentes</h2>
          <p>Condicoes comerciais preparadas para ${text(input.customer.name)}.</p>
        </div>
        <div class="summary">
          <div class="summary-row"><span>Itens</span><strong>${text(items.length)}</strong></div>
          <div class="summary-row"><span>Quantidade total</span><strong>${text(itemCount)}</strong></div>
          <div class="summary-row"><span>Valor total</span><strong>${text(money(subtotal))}</strong></div>
        </div>
      </div>

      <h3 class="section-title">Dados do cliente</h3>
      <div class="client-grid">
        <div class="field"><label>Cliente</label><strong>${text(input.customer.name)}</strong></div>
        <div class="field"><label>Empresa</label><strong>${text(input.customer.company)}</strong></div>
        <div class="field"><label>Documento</label><strong>${text(input.customer.document)}</strong></div>
        <div class="field"><label>Contato</label><strong>${text(input.customer.phone)} | ${text(input.customer.email)}</strong></div>
        <div class="field" style="grid-column: 1 / -1;"><label>Endereco</label><strong>${text(input.customer.address)}</strong></div>
      </div>

      <h3 class="section-title">Itens da cotacao</h3>
      <table>
        <thead>
          <tr>
            <th class="idx">Item</th>
            <th>Material e descricao</th>
            <th class="qty">Qtd</th>
            <th class="money">Valor unit.</th>
            <th class="money">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="5" class="muted">Nenhum item informado.</td></tr>`}
        </tbody>
      </table>

      <div class="total-box">
        <div><span>Subtotal</span><strong>${text(money(subtotal))}</strong></div>
        <div class="grand"><span>Total</span><strong>${text(money(subtotal))}</strong></div>
      </div>

      <h3 class="section-title">Condicoes comerciais</h3>
      <div class="terms">
        <div class="term"><h3>Pagamento</h3><p>${multiline(paymentTerms)}</p></div>
        <div class="term"><h3>Entrega</h3><p>${multiline(deliveryTerms)}</p></div>
        <div class="term"><h3>Garantia</h3><p>${multiline(warrantyText)}</p></div>
        <div class="term"><h3>Observacoes</h3><p>${multiline(observations)}</p></div>
      </div>

      <div class="signature">
        <div class="signature-line">
          <strong>${text(company.name)}</strong><br>
          Comercial
        </div>
        <div class="signature-line">
          <strong>${text(input.customer.name)}</strong><br>
          Aceite da cotacao
        </div>
      </div>

      <footer>
        ${text(company.name)} | ${text(company.phone)} | ${text(company.email)}
      </footer>
    </section>
  </main>
</body>
</html>`;
}

export function downloadProposalHTML(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function openProposalHTML(html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return !!win;
}
