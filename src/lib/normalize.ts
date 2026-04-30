// Normalization utilities for deduplication & matching

export function normalizeCnpj(value?: string | null): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length !== 11 && digits.length !== 14) return null;
  return digits;
}

export function formatCnpj(value?: string | null): string | null {
  const d = normalizeCnpj(value);
  if (!d) return value || null;
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

export function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed.includes("@")) return null;
  return trimmed;
}

// Brazilian corporate suffixes & noise tokens that should be stripped before name comparison
const COMPANY_SUFFIXES = new Set([
  "ltda", "ltd", "me", "epp", "eireli", "sa", "s/a", "s.a", "sas",
  "cia", "cias", "company", "comp", "co", "inc", "corp", "corporation",
  "filial", "matriz", "grupo", "group", "holding", "holdings",
  "comercio", "comercial", "industria", "industrial", "industrias",
  "servicos", "servico", "ltdame", "ltdaepp",
  // Acronyms/words that often appear and add noise
  "construcoes", "construcao", "construtora",
  "mineracao", "mineracoes", "mineradora",
  "transportes", "transporte", "logistica",
  "engenharia", "tecnologia",
  "do", "da", "de", "dos", "das", "e", "&",
]);

function basicSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyName(value?: string | null): string {
  if (!value) return "";
  return basicSlug(String(value)).replace(/\s+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Canonicalize a company/customer name for fuzzy deduplication:
 * - removes accents, punctuation, lowercases
 * - drops Brazilian corporate suffixes (LTDA, EPP, ME, S/A, EIRELI, ...)
 * - drops common noise tokens (do/da/de, comercio, industria, ...)
 * - collapses whitespace
 *
 * Examples:
 *   "Construtora Santa Maria LTDA"     -> "santamaria"
 *   "CONSTRUTORA SANTA MARIA EIRELI EPP" -> "santamaria"
 *   "Bemisa Holding S.A."              -> "bemisa"
 */
export function canonicalCompanyName(value?: string | null): string {
  if (!value) return "";
  const slug = basicSlug(String(value));
  if (!slug) return "";
  const tokens = slug.split(" ").filter((t) => t && !COMPANY_SUFFIXES.has(t));
  // After stripping suffixes, drop very short noise (single letters)
  const cleaned = tokens.filter((t) => t.length > 1);
  return (cleaned.length > 0 ? cleaned : tokens).join("");
}

export function customerDedupKey(c: {
  cnpj_cpf?: string | null;
  email?: string | null;
  name?: string | null;
  city?: string | null;
}): string {
  const cnpj = normalizeCnpj(c.cnpj_cpf);
  if (cnpj) return `cnpj:${cnpj}`;
  const email = normalizeEmail(c.email);
  if (email) return `email:${email}`;
  const canon = canonicalCompanyName(c.name);
  const cityCanon = canonicalCompanyName(c.city);
  return `name:${canon}|${cityCanon}`;
}

// Jaro-Winkler similarity 0..1
export function jaroWinkler(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const m1 = s1.length, m2 = s2.length;
  const matchDist = Math.max(0, Math.floor(Math.max(m1, m2) / 2) - 1);
  const a1 = new Array(m1).fill(false);
  const a2 = new Array(m2).fill(false);
  let matches = 0;
  for (let i = 0; i < m1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, m2);
    for (let j = start; j < end; j++) {
      if (a2[j] || s1[i] !== s2[j]) continue;
      a1[i] = true; a2[j] = true; matches++; break;
    }
  }
  if (!matches) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < m1; i++) {
    if (!a1[i]) continue;
    while (!a2[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  t /= 2;
  const jaro = (matches / m1 + matches / m2 + (matches - t) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, m1, m2); i++) { if (s1[i] === s2[i]) prefix++; else break; }
  return jaro + prefix * 0.1 * (1 - jaro);
}
