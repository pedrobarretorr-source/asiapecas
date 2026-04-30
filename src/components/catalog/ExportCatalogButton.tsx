import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function ExportCatalogButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch all parts (paginated to avoid 1000 limit)
      let allParts: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("parts")
          .select("material, description, stock, estimated_price, machine_model, manufacturer, last_entry_time, compatible_models, is_mineracao, is_linha_amarela, is_perfuratriz, is_caminhao_eletrico, is_guindaste")
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order("material");
        if (error) throw error;
        if (!data || data.length === 0) break;
        allParts = allParts.concat(data);
        if (data.length < pageSize) break;
        page++;
      }

      // Fetch AI results
      let allAI: any[] = [];
      page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("ai_compatibility_results" as any)
          .select("material, compatible_machines, technical_description, researched_at")
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) break; // table might not exist yet
        if (!data || data.length === 0) break;
        allAI = allAI.concat(data);
        if (data.length < pageSize) break;
        page++;
      }

      const aiMap = new Map(allAI.map((a: any) => [a.material, a]));

      // Build rows
      const rows = allParts.map((p) => {
        const cats = [];
        if (p.is_mineracao) cats.push("Mineração");
        if (p.is_linha_amarela) cats.push("Linha Amarela");
        if (p.is_perfuratriz) cats.push("Perfuratriz");
        if (p.is_caminhao_eletrico) cats.push("Caminhão Elétrico");
        if (p.is_guindaste) cats.push("Guindaste");

        const ai = aiMap.get(p.material);

        return {
          "Material": p.material,
          "Descrição": p.description,
          "Estoque": p.stock,
          "Preço Estimado": p.estimated_price,
          "Modelo Máquina": p.machine_model || "",
          "Fabricante": p.manufacturer || "",
          "Categorias": cats.join(", "),
          "Tempo Entrada": p.last_entry_time || "",
          "Modelos Compatíveis": (p.compatible_models || []).join(", "),
          "Máquinas Compatíveis (IA)": ai ? (ai.compatible_machines || []).join(", ") : "",
          "Descrição Técnica (IA)": ai?.technical_description || "",
          "Data Pesquisa IA": ai?.researched_at ? new Date(ai.researched_at).toLocaleDateString("pt-BR") : "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Catálogo");

      // Auto-width columns
      const colWidths = Object.keys(rows[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws["!cols"] = colWidths;

      XLSX.writeFile(wb, `Catalogo_Lopes_Lopes_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`Exportadas ${rows.length} peças`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao exportar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
      Exportar Catálogo
    </Button>
  );
}
