import * as XLSX from "xlsx";
import { fmtBRL } from "./subcategory-rules";
import type { CatalogIntelligence, SubcategoryPart } from "@/hooks/use-catalog-intelligence";

function autosize(ws: XLSX.WorkSheet) {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const widths: { wch: number }[] = [];
  for (let C = range.s.c; C <= range.e.c; C++) {
    let max = 8;
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v != null) {
        const v = String(cell.v);
        if (v.length > max) max = Math.min(50, v.length + 2);
      }
    }
    widths.push({ wch: max });
  }
  (ws as any)["!cols"] = widths;
}

export function exportIntelligenceXlsx(intel: CatalogIntelligence, fileName: string) {
  const wb = XLSX.utils.book_new();

  // Aba 1 — Resumo
  const resumo = [
    ["Relatório de Inteligência de Catálogo"],
    ["Gerado em", new Date(intel.generatedAt).toLocaleString("pt-BR")],
    [],
    ["Total SKUs", intel.overall.totalSkus],
    ["Total Unidades", intel.overall.totalUnits],
    ["Valor Total em Estoque", fmtBRL(intel.overall.totalValue)],
    ["SKUs Classificados", intel.overall.classifiedSkus],
    ["SKUs Sem Subcategoria", intel.overall.unclassifiedSkus],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(resumo);
  autosize(ws1);
  XLSX.utils.book_append_sheet(wb, ws1, "Resumo");

  // Aba 2 — Por Subcategoria
  const sub = [
    ["Subcategoria", "SKUs", "Unidades", "Valor (R$)", "Preço Médio", "Valor Parado +2a", "SKUs Parados", "Top Modelos"],
    ...intel.bySubcategory.map((s) => [
      s.subcategory,
      s.skus,
      s.units,
      Number(s.value.toFixed(2)),
      Number(s.avg_price.toFixed(2)),
      Number(s.stale_value.toFixed(2)),
      s.stale_skus,
      (s.top_models ?? []).map((m) => `${m.model} (${m.cnt})`).join(" · "),
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(sub);
  autosize(ws2);
  XLSX.utils.book_append_sheet(wb, ws2, "Por Subcategoria");

  // Aba 3 — Subcategoria × Modelo
  const cross = [
    ["Subcategoria", "Modelo", "SKUs", "Unidades", "Valor (R$)", "Valor Parado (R$)"],
    ...intel.subcategoryByModel.map((r) => [
      r.subcategory,
      r.model,
      r.skus,
      r.units,
      Number(r.value.toFixed(2)),
      Number(r.stale_value.toFixed(2)),
    ]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(cross);
  autosize(ws3);
  XLSX.utils.book_append_sheet(wb, ws3, "Subcategoria x Modelo");

  XLSX.writeFile(wb, fileName);
}

export function exportPartsXlsx(parts: SubcategoryPart[], fileName: string, sheetName = "Peças") {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["Código", "Descrição", "Fabricante", "Modelo", "Subcategoria", "Atributos", "Estoque", "Preço Unit. (R$)", "Valor Total (R$)", "Tempo em estoque"],
    ...parts.map((p) => [
      p.material,
      p.description,
      p.manufacturer ?? "",
      p.machine_model ?? "",
      p.subcategory ?? "",
      p.attributes ? Object.entries(p.attributes).map(([k, v]) => `${k}: ${v}`).join("; ") : "",
      p.stock,
      Number(p.estimated_price.toFixed(2)),
      Number((p.stock * p.estimated_price).toFixed(2)),
      p.last_entry_time ?? "",
    ]),
  ];
  const totalIdx = rows.length + 1;
  rows.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    { f: `SUM(G2:G${totalIdx - 1})` } as any,
    "",
    { f: `SUM(I2:I${totalIdx - 1})` } as any,
    "",
  ] as any);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  (ws as any)["!freeze"] = { xSplit: 0, ySplit: 1 };
  autosize(ws);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName);
}
