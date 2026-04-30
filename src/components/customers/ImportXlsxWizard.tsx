import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useImportCustomers, usePreviewImport, type PreviewResult } from "@/hooks/use-customers";
import { customerDedupKey, normalizeCnpj } from "@/lib/normalize";
import { ImportReviewStep, type Decision } from "./ImportReviewStep";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; existingKeys: Set<string> };

type Parsed = {
  customers: Array<Record<string, unknown>>;
  brasim: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  equipment: Array<Record<string, unknown>>;
  fileName: string;
};

const HEADER_ROW = 4; // 0-indexed: row 5 in spreadsheet

function rowsFromSheet(ws: XLSX.WorkSheet) {
  const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  if (json.length <= HEADER_ROW) return { headers: [] as string[], rows: [] as unknown[][] };
  const headers = (json[HEADER_ROW] as unknown[]).map((h) => String(h || "").trim());
  const rows = json.slice(HEADER_ROW + 1).filter((r) => Array.isArray(r) && r.some((c) => c !== null && c !== ""));
  return { headers, rows };
}

function pick(headers: string[], row: unknown[], names: string[]): unknown {
  for (const name of names) {
    const idx = headers.findIndex((h) => h.toUpperCase() === name.toUpperCase());
    if (idx >= 0 && row[idx] !== null && row[idx] !== undefined && row[idx] !== "") return row[idx];
  }
  return null;
}

function excelDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString();
  }
  const s = String(v).trim();
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const yy = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return new Date(Date.UTC(yy, Number(m[2]) - 1, Number(m[1]))).toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseWorkbook(file: File): Promise<Parsed> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const wb = XLSX.read(e.target!.result, { type: "binary" });
        const customers: Array<Record<string, unknown>> = [];
        const brasim: Array<Record<string, unknown>> = [];
        const invoices: Array<Record<string, unknown>> = [];
        const equipment: Array<Record<string, unknown>> = [];

        // CLIENTES — CRM
        const crmName = wb.SheetNames.find((n) => n.toUpperCase().includes("CRM"));
        if (crmName) {
          const { headers, rows } = rowsFromSheet(wb.Sheets[crmName]);
          for (const row of rows) {
            const name = pick(headers, row, ["CLIENTE"]);
            if (!name) continue;
            const modelo = pick(headers, row, ["MODELO"]);
            customers.push({
              name: String(name).trim(),
              cnpj_cpf: pick(headers, row, ["CNPJ"]),
              state: pick(headers, row, ["UF"]),
              city: pick(headers, row, ["CIDADE"]),
              phone: pick(headers, row, ["TELEFONE"]),
              email: pick(headers, row, ["E-MAIL", "EMAIL"]),
              address: pick(headers, row, ["ENDEREÇO", "ENDERECO"]),
              notes: [
                pick(headers, row, ["OBSERVAÇÕES", "OBSERVACOES"]),
                pick(headers, row, ["CARGO"]) ? `Cargo: ${pick(headers, row, ["CARGO"])}` : null,
                pick(headers, row, ["TIPO RELAÇÃO", "TIPO RELACAO"]) ? `Relação: ${pick(headers, row, ["TIPO RELAÇÃO", "TIPO RELACAO"])}` : null,
                pick(headers, row, ["PRÓX. AÇÃO", "PROX. ACAO"]) ? `Próx. ação: ${pick(headers, row, ["PRÓX. AÇÃO", "PROX. ACAO"])}` : null,
              ].filter(Boolean).join(" | ") || null,
              interest_models: modelo ? [String(modelo).trim()] : null,
              relationship_status: String(pick(headers, row, ["STATUS"]) || "").toLowerCase().includes("ativo") ? "ativo" : "prospect",
              last_visit_at: excelDate(pick(headers, row, ["VISITADO"])),
              last_proposal_at: excelDate(pick(headers, row, ["PROPOSTA"])),
              source: "xlsx_import",
            });
          }
        }

        // BRASIM 2025
        const bName = wb.SheetNames.find((n) => n.toUpperCase().includes("BRASIM"));
        if (bName) {
          const { headers, rows } = rowsFromSheet(wb.Sheets[bName]);
          for (const row of rows) {
            const name = pick(headers, row, ["CLIENTE"]);
            if (!name) continue;
            brasim.push({
              name: String(name).trim(),
              state: pick(headers, row, ["UF"]),
              city: pick(headers, row, ["CIDADE"]),
              phone: pick(headers, row, ["TELEFONE"]),
              segment: String(pick(headers, row, ["SETOR/MINÉRIO", "SETOR/MINERIO", "SETOR"]) || "geral").toLowerCase().includes("miner") ? "mineração" : "geral",
              notes: [
                pick(headers, row, ["TIPO"]) ? `Tipo: ${pick(headers, row, ["TIPO"])}` : null,
                pick(headers, row, ["PORTE"]) ? `Porte: ${pick(headers, row, ["PORTE"])}` : null,
                pick(headers, row, ["CONTATO"]) ? `Contato: ${pick(headers, row, ["CONTATO"])}` : null,
                pick(headers, row, ["DATA"]) ? `Data evento: ${pick(headers, row, ["DATA"])}` : null,
              ].filter(Boolean).join(" | ") || "BRASIM 2025",
            });
          }
        }

        // FATURAMENTO SAP
        const sName = wb.SheetNames.find((n) => n.toUpperCase().includes("SAP"));
        if (sName) {
          const { headers, rows } = rowsFromSheet(wb.Sheets[sName]);
          for (const row of rows) {
            const customer_name = pick(headers, row, ["CLIENTE"]);
            if (!customer_name) continue;
            invoices.push({
              customer_name: String(customer_name).trim(),
              document_number: pick(headers, row, ["DOC. FATURAMENTO", "DOC FATURAMENTO"]),
              payment_terms: pick(headers, row, ["COND. PAGAMENTO", "COND PAGAMENTO"]),
              payer_name: pick(headers, row, ["NOME PAGADOR"]),
              invoice_date: excelDate(pick(headers, row, ["DATA FATURAMENTO"]))?.slice(0, 10) || null,
              total_value: Number(pick(headers, row, ["VALOR C/ IMPOSTOS"])) || 0,
            });
          }
        }

        // EQUIPAMENTOS VENDIDOS
        const eName = wb.SheetNames.find((n) => n.toUpperCase().includes("EQUIPAMENTO"));
        if (eName) {
          const { headers, rows } = rowsFromSheet(wb.Sheets[eName]);
          for (const row of rows) {
            const customer_name = pick(headers, row, ["CLIENTE"]);
            if (!customer_name) continue;
            equipment.push({
              customer_name: String(customer_name).trim(),
              model: pick(headers, row, ["MODELO"]),
              serial_number: pick(headers, row, ["NR. DE SÉRIE", "NR DE SERIE", "SERIE"]),
              order_form: pick(headers, row, ["ORDER FORM"]),
              delivery_location: pick(headers, row, ["LOCAL ENTREGA"]),
              purchase_year: Number(pick(headers, row, ["ANO"])) || null,
              sale_value: Number(pick(headers, row, ["VALOR C/ IMP.", "VALOR C/ IMP", "VALOR C/IMP."])) || null,
              notes: pick(headers, row, ["OBSERVAÇÃO", "OBSERVACAO"]),
            });
          }
        }

        resolve({ customers, brasim, invoices, equipment, fileName: file.name });
      } catch (err) {
        reject(err);
      }
    };
    r.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    r.readAsBinaryString(file);
  });
}

export function ImportXlsxWizard({ open, onOpenChange, existingKeys }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<PreviewResult[] | null>(null);
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const importMut = useImportCustomers();
  const previewMut = usePreviewImport();

  const handleFile = async (file: File) => {
    try {
      const data = await parseWorkbook(file);
      setParsed(data);
      setStep(2);
    } catch (e) {
      toast.error("Erro ao ler planilha: " + (e as Error).message);
    }
  };

  const stats = useMemo(() => {
    if (!parsed) return null;
    const all = [...parsed.customers, ...parsed.brasim];
    let news = 0, dupes = 0;
    for (const c of all) {
      const k = customerDedupKey({
        cnpj_cpf: c.cnpj_cpf as string | null,
        email: c.email as string | null,
        name: c.name as string | null,
        city: c.city as string | null,
      });
      if (existingKeys.has(k)) dupes++;
      else news++;
    }
    return { news, dupes, total: all.length };
  }, [parsed, existingKeys]);

  const handleImport = async () => {
    if (!parsed) return;
    setProgress(20);
    try {
      const res = await importMut.mutateAsync({
        file_name: parsed.fileName,
        customers: parsed.customers,
        equipment: parsed.equipment,
        invoices: parsed.invoices,
        brasim_leads: parsed.brasim,
        update_existing: updateExisting,
      });
      setProgress(100);
      toast.success(
        `${res.inserted} novos, ${res.updated} atualizados, ${res.equipment_inserted} equipamentos, ${res.invoices_inserted} NFs`,
      );
      setTimeout(() => {
        onOpenChange(false);
        setStep(1);
        setParsed(null);
        setProgress(0);
      }, 800);
    } catch (e) {
      setProgress(0);
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar planilha de clientes</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="py-8">
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-12 cursor-pointer hover:bg-muted/50 transition">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Clique para escolher um arquivo .xlsx</p>
                <p className="text-sm text-muted-foreground mt-1">Detecta automaticamente abas: CLIENTES, BRASIM, SAP, EQUIPAMENTOS</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>
        )}

        {step === 2 && parsed && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase">Clientes CRM</p>
                <p className="text-2xl font-bold">{parsed.customers.length}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase">BRASIM 2025</p>
                <p className="text-2xl font-bold">{parsed.brasim.length}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase">NFs SAP</p>
                <p className="text-2xl font-bold">{parsed.invoices.length}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase">Equipamentos</p>
                <p className="text-2xl font-bold">{parsed.equipment.length}</p>
              </CardContent></Card>
            </div>

            {stats && (
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex gap-4">
                    <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> {stats.news} novos</Badge>
                    <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> {stats.dupes} já existem</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="update" checked={updateExisting} onCheckedChange={setUpdateExisting} />
                    <Label htmlFor="update" className="text-sm">Atualizar existentes</Label>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="max-h-64 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.customers.slice(0, 10).map((c, i) => {
                    const k = customerDedupKey({
                      cnpj_cpf: c.cnpj_cpf as string | null,
                      email: c.email as string | null,
                      name: c.name as string | null,
                      city: c.city as string | null,
                    });
                    const exists = existingKeys.has(k);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{String(c.name)}</TableCell>
                        <TableCell className="font-mono text-xs">{normalizeCnpj(c.cnpj_cpf as string) || "—"}</TableCell>
                        <TableCell>{String(c.state || "—")}</TableCell>
                        <TableCell>{(c.interest_models as string[])?.[0] || "—"}</TableCell>
                        <TableCell>
                          {exists ? <Badge variant="secondary">existe</Badge> : <Badge>novo</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-8 space-y-4">
            <p className="text-center text-sm text-muted-foreground">Importando dados…</p>
            <Progress value={progress} />
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => { setStep(1); setParsed(null); }}>Voltar</Button>
              <Button
                onClick={() => { setStep(3); handleImport(); }}
                disabled={importMut.isPending}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar {stats?.total || 0} registros
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
