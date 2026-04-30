import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useImportCatalog } from "@/hooks/use-stock-imports";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ParsedRow {
  material: string;
  description: string;
  estimated_price?: number;
  stock?: number;
  machine_model?: string;
  manufacturer?: string;
  supplier?: string;
  last_entry_time?: string;
  is_mineracao?: boolean;
  is_linha_amarela?: boolean;
  is_perfuratriz?: boolean;
  is_caminhao_eletrico?: boolean;
  is_guindaste?: boolean;
}

export function ImportCatalogDialog({ open, onClose }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Estoque Principal");
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportCatalog();

  const reset = () => {
    setStep("upload");
    setRows([]);
    setFileName("");
    setSourceLabel("Estoque Principal");
    setResult(null);
  };

  const parseBool = (val: any): boolean => {
    if (!val) return false;
    if (typeof val === "boolean") return val;
    const s = String(val).toLowerCase().trim();
    return s === "true" || s === "1" || s === "sim" || s === "yes" || s === "x";
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let parsed: ParsedRow[] = [];

        if (file.name.endsWith(".json")) {
          parsed = JSON.parse(data as string);
        } else {
          const wb = XLSX.read(data, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<any>(sheet);

          // Normalize keys: trim whitespace and accents from header names
          const normalizeRow = (row: any) => {
            const normalized: any = {};
            for (const key of Object.keys(row)) {
              normalized[key.trim()] = row[key];
            }
            return normalized;
          };

          parsed = json.map((raw: any) => {
            const row = normalizeRow(raw);
            return {
              material: String(row.material || row.Material || row.codigo || row.MATERIAL || "").trim(),
              description: String(row.description || row.Description || row.descricao || row.Descrição || row.DESCRICAO || row.DESCRIÇÃO || row["Texto breve material"] || "").trim(),
              estimated_price: parseFloat(row.estimated_price || row.preco || row.Preço || row.PRECO || row.price || row.valor_estimado || row.VALOR_ESTIMADO || row["Preço Estimado Dealer com impostos"] || 0) || 0,
              stock: parseInt(row.stock || row.estoque || row.Estoque || row.ESTOQUE || row.qty || row.Saldo || 0) || 0,
              machine_model: String(row.machine_model || row.modelo || row.Modelo || row.MODELO || row["Modelo de máquina"] || "").trim() || undefined,
              manufacturer: String(row.manufacturer || row.fabricante || row.Fabricante || row.FABRICANTE || "").trim() || undefined,
              supplier: String(row.supplier || row.fornecedor || row.Fornecedor || row.FORNECEDOR || row["Nome 1"] || "").trim() || undefined,
              last_entry_time: String(row.last_entry_time || row.tempo_entrada || row.TEMPO_ENTRADA || row["Tempo de ùltima entrada"] || row["Tempo de última entrada"] || "").trim() || undefined,
              is_mineracao: parseBool(row.is_mineracao || row.mineracao || row.MINERACAO || row.Mineração || row["Mineração"]),
              is_linha_amarela: parseBool(row.is_linha_amarela || row.linha_amarela || row.LINHA_AMARELA || row["Linha amarela"]),
              is_perfuratriz: parseBool(row.is_perfuratriz || row.perfuratriz || row.PERFURATRIZ || row.Perfuratriz),
              is_caminhao_eletrico: parseBool(row.is_caminhao_eletrico || row.caminhao_eletrico || row.CAMINHAO_ELETRICO || row["Caminhão Eletrico"]),
              is_guindaste: parseBool(row.is_guindaste || row.guindaste || row.GUINDASTE || row.Guindaste),
            };
          }).filter(r => r.material && r.description);
        }

        if (parsed.length === 0) {
          toast.error("Nenhuma linha válida. Certifique-se que o arquivo tem colunas 'material' e 'description'.");
          return;
        }

        setRows(parsed);
        setStep("preview");
      } catch {
        toast.error("Erro ao ler arquivo. Verifique o formato.");
      }
    };

    if (file.name.endsWith(".json")) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    setStep("importing");
    try {
      const data = await importMutation.mutateAsync({
        items: rows,
        file_name: fileName,
        source_label: sourceLabel,
      });
      setResult(data);
      setStep("done");
      toast.success("Importação concluída!");
    } catch (err: any) {
      toast.error("Erro na importação: " + (err.message || "erro desconhecido"));
      setStep("preview");
    }
  };

  const totalStock = rows.reduce((s, r) => s + (r.stock || 0), 0);
  const totalValue = rows.reduce((s, r) => s + (r.stock || 0) * (r.estimated_price || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setTimeout(reset, 300); } }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Importar Planilha</DialogTitle>
          <DialogDescription>Importe peças via planilha (.csv, .xlsx) ou .json — processamento instantâneo</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div>
              <Label>Fonte / Filial</Label>
              <Input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="Ex: Filial Pouso Alegre, Estoque Central" />
            </div>
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Arraste ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">.csv, .xlsx, .xls, .json</p>
              <input ref={fileRef} type="file" className="hidden" accept=".csv,.xlsx,.xls,.json" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge variant="secondary">{fileName}</Badge>
              <div className="flex gap-3 text-sm text-muted-foreground">
                <span>{rows.length.toLocaleString("pt-BR")} linhas</span>
                <span>{totalStock.toLocaleString("pt-BR")} unidades</span>
                <span>R$ {(totalValue / 1_000_000).toFixed(1)}M</span>
              </div>
            </div>
            <div className="max-h-48 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.material}</TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]">{r.description}</TableCell>
                      <TableCell className="text-xs text-right">{r.estimated_price?.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right">{r.stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 10 && <p className="text-xs text-muted-foreground text-center py-2">...e mais {rows.length - 10} linhas</p>}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleImport} className="flex-1">
                Importar {rows.length.toLocaleString("pt-BR")} linhas
              </Button>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-center text-sm text-muted-foreground">Processando {rows.length.toLocaleString("pt-BR")} linhas no servidor...</p>
            <Progress value={50} className="h-2 animate-pulse" />
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4 py-4">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <div className="text-center space-y-1">
              <p className="font-medium">Importação concluída!</p>
              <p className="text-sm text-muted-foreground">
                {result.inserted || 0} inseridas · {result.updated || 0} atualizadas · {result.unique_materials || 0} materiais únicos
              </p>
              <p className="text-sm text-muted-foreground">
                {(result.total_stock || 0).toLocaleString("pt-BR")} unidades · R$ {((result.total_value || 0) / 1_000_000).toFixed(1)}M
              </p>
              {result.errors > 0 && (
                <p className="text-sm text-destructive flex items-center justify-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> {result.errors} erro(s)
                </p>
              )}
            </div>
            <Button onClick={() => { onClose(); setTimeout(reset, 300); }} className="w-full">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
