// Extrai o primeiro valor R$ de um texto/HTML.
// Aceita "R$ 1.234,56", "R$1234,56", "R$ 1234". Retorna em BRL como number.
export function extractPriceBRL(text: string): number | undefined {
  const m = text.match(/R\$\s*([\d.]+,\d{2}|\d{1,3}(?:\.\d{3})+|\d+)/);
  if (!m) return undefined;
  const raw = m[1];
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/\./g, "");
  const n = parseFloat(normalized);
  return isNaN(n) ? undefined : n;
}
