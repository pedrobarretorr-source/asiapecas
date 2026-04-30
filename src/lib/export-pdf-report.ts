import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtBRL } from "./subcategory-rules";
import type { CatalogIntelligence } from "@/hooks/use-catalog-intelligence";

export function exportExecutivePdf(intel: CatalogIntelligence, fileName: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Capa
  doc.setFillColor(255, 196, 0);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ÁSIA PEÇAS & MÁQUINAS", 40, 50);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Executivo de Catálogo", 40, 75);
  doc.setFontSize(10);
  doc.text(`Gerado em ${new Date(intel.generatedAt).toLocaleString("pt-BR")}`, 40, 95);

  // KPIs
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Visão Geral", 40, 150);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const kpis: [string, string][] = [
    ["Total de SKUs", intel.overall.totalSkus.toLocaleString("pt-BR")],
    ["Total de Unidades", intel.overall.totalUnits.toLocaleString("pt-BR")],
    ["Valor Total em Estoque", fmtBRL(intel.overall.totalValue)],
    ["SKUs Classificados", `${intel.overall.classifiedSkus} (${((intel.overall.classifiedSkus / Math.max(1, intel.overall.totalSkus)) * 100).toFixed(0)}%)`],
    ["SKUs Sem Subcategoria", intel.overall.unclassifiedSkus.toLocaleString("pt-BR")],
  ];
  autoTable(doc, {
    startY: 165,
    head: [["Indicador", "Valor"]],
    body: kpis,
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 10 },
  });

  // Top 15 subcategorias por valor
  const topByValue = [...intel.bySubcategory]
    .filter((s) => s.subcategory !== "(não classificado)")
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Top 15 Subcategorias por Valor em Estoque", 40, (doc as any).lastAutoTable.finalY + 30);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 40,
    head: [["Subcategoria", "SKUs", "Unidades", "Valor", "Parado +2a"]],
    body: topByValue.map((s) => [
      s.subcategory,
      s.skus,
      s.units,
      fmtBRL(s.value),
      fmtBRL(s.stale_value),
    ]),
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 9 },
  });

  // Top alertas de capital parado
  const topStale = [...intel.bySubcategory]
    .filter((s) => s.stale_value > 0)
    .sort((a, b) => b.stale_value - a.stale_value)
    .slice(0, 10);
  if (topStale.length > 0) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Capital Parado por Subcategoria (> 2 anos)", 40, 50);
    autoTable(doc, {
      startY: 65,
      head: [["Subcategoria", "SKUs Parados", "Valor Parado", "% do Total Parado"]],
      body: topStale.map((s) => [
        s.subcategory,
        s.stale_skus,
        fmtBRL(s.stale_value),
        `${((s.stale_value / topStale.reduce((a, b) => a + b.stale_value, 0)) * 100).toFixed(1)}%`,
      ]),
      headStyles: { fillColor: [200, 30, 30] },
      styles: { fontSize: 9 },
    });
  }

  // Rodapé em todas as páginas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Ásia Peças & Máquinas · Relatório gerado pela plataforma · Página ${i}/${pages}`,
      40,
      doc.internal.pageSize.getHeight() - 20,
    );
  }

  doc.save(fileName);
}
