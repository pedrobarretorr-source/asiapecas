import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

export type PreviewMatch = {
  customer_id: string;
  name: string;
  score: number;
  reason: string;
  existing: { cnpj_cpf: string | null; email: string | null; phone: string | null; city: string | null; state: string | null; company: string | null };
};
export type PreviewResult = {
  row_index: number;
  status: "new" | "match" | "ambiguous";
  matches: PreviewMatch[];
};
export type Decision = { row_index: number; action: "create" | "merge" | "ignore"; target_id?: string };

type Props = {
  rows: Array<Record<string, unknown>>;
  preview: PreviewResult[];
  initialDecisions?: Decision[];
  onConfirm: (decisions: Decision[]) => void;
  onBack: () => void;
  isLoading?: boolean;
};

export function ImportReviewStep({ rows, preview, initialDecisions, onConfirm, onBack, isLoading }: Props) {
  const [decisions, setDecisions] = useState<Map<number, Decision>>(() => {
    const m = new Map<number, Decision>();
    if (initialDecisions) for (const d of initialDecisions) m.set(d.row_index, d);
    else for (const p of preview) {
      if (p.status === "new") m.set(p.row_index, { row_index: p.row_index, action: "create" });
      else if (p.status === "match") m.set(p.row_index, { row_index: p.row_index, action: "merge", target_id: p.matches[0].customer_id });
      else m.set(p.row_index, { row_index: p.row_index, action: "ignore" });
    }
    return m;
  });
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const stats = useMemo(() => {
    let c = 0, m = 0, i = 0;
    for (const d of decisions.values()) {
      if (d.action === "create") c++;
      else if (d.action === "merge") m++;
      else i++;
    }
    return { c, m, i };
  }, [decisions]);

  const setDecision = (row_index: number, d: Partial<Decision>) => {
    setDecisions((prev) => {
      const n = new Map(prev);
      const cur = n.get(row_index) || { row_index, action: "create" };
      n.set(row_index, { ...cur, ...d } as Decision);
      return n;
    });
  };

  const toggle = (i: number) => setExpanded((s) => {
    const n = new Set(s);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  const groups = useMemo(() => {
    const g = { new: [] as PreviewResult[], match: [] as PreviewResult[], ambiguous: [] as PreviewResult[] };
    for (const p of preview) g[p.status].push(p);
    return g;
  }, [preview]);

  const acceptAllMatches = () => {
    setDecisions((prev) => {
      const n = new Map(prev);
      for (const p of preview) if (p.status === "match" && p.matches[0]) n.set(p.row_index, { row_index: p.row_index, action: "merge", target_id: p.matches[0].customer_id });
      return n;
    });
  };
  const ignoreAllAmbiguous = () => {
    setDecisions((prev) => {
      const n = new Map(prev);
      for (const p of preview) if (p.status === "ambiguous") n.set(p.row_index, { row_index: p.row_index, action: "ignore" });
      return n;
    });
  };

  const renderGroup = (label: string, items: PreviewResult[], icon: React.ReactNode, color: string) => (
    <div className="border rounded-md">
      <div className={`px-3 py-2 flex items-center gap-2 text-sm font-medium ${color}`}>
        {icon} {label} ({items.length})
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Nome (planilha)</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Decisão</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => {
            const row = rows[p.row_index] || {};
            const dec = decisions.get(p.row_index)!;
            const isExp = expanded.has(p.row_index);
            return (
              <>
                <TableRow key={p.row_index}>
                  <TableCell>
                    {p.matches.length > 0 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggle(p.row_index)}>
                        {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{String(row.name || "—")}</TableCell>
                  <TableCell className="text-xs">{[row.city, row.state].filter(Boolean).join("/") || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{String(row.cnpj_cpf || "—")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant={dec.action === "create" ? "default" : "outline"} className="h-7 text-xs"
                        onClick={() => setDecision(p.row_index, { action: "create", target_id: undefined })}>Criar novo</Button>
                      {p.matches.length > 0 && (
                        <Button size="sm" variant={dec.action === "merge" ? "default" : "outline"} className="h-7 text-xs"
                          onClick={() => setDecision(p.row_index, { action: "merge", target_id: dec.target_id || p.matches[0].customer_id })}>
                          Mesclar
                        </Button>
                      )}
                      <Button size="sm" variant={dec.action === "ignore" ? "default" : "outline"} className="h-7 text-xs"
                        onClick={() => setDecision(p.row_index, { action: "ignore", target_id: undefined })}>Ignorar</Button>
                    </div>
                  </TableCell>
                </TableRow>
                {isExp && p.matches.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/30 p-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Candidatos a mesclar:</p>
                        {p.matches.map((m) => {
                          const selected = dec.action === "merge" && dec.target_id === m.customer_id;
                          return (
                            <div key={m.customer_id} className={`p-2 rounded border cursor-pointer ${selected ? "border-primary bg-primary/5" : "border-border"}`}
                              onClick={() => setDecision(p.row_index, { action: "merge", target_id: m.customer_id })}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">{m.name}</p>
                                  <p className="text-xs text-muted-foreground">{m.reason}</p>
                                </div>
                                <Badge variant={m.score >= 90 ? "default" : "secondary"}>Score {m.score}</Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 mt-2 text-xs">
                                <Field label="CNPJ" sheet={row.cnpj_cpf as string} existing={m.existing.cnpj_cpf} />
                                <Field label="Email" sheet={row.email as string} existing={m.existing.email} />
                                <Field label="Telefone" sheet={row.phone as string} existing={m.existing.phone} />
                                <Field label="Cidade" sheet={row.city as string} existing={m.existing.city} />
                                <Field label="UF" sheet={row.state as string} existing={m.existing.state} />
                                <Field label="Empresa" sheet={row.company as string} existing={m.existing.company} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> {stats.c} criar</Badge>
            <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" /> {stats.m} mesclar</Badge>
            <Badge variant="outline">{stats.i} ignorar</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={acceptAllMatches}>Aceitar matches únicos</Button>
            <Button size="sm" variant="outline" onClick={ignoreAllAmbiguous}>Ignorar ambíguos</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ambiguous">
        <TabsList>
          <TabsTrigger value="ambiguous" className="gap-1"><AlertCircle className="h-3 w-3 text-destructive" /> Ambíguos ({groups.ambiguous.length})</TabsTrigger>
          <TabsTrigger value="match" className="gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" /> Match único ({groups.match.length})</TabsTrigger>
          <TabsTrigger value="new" className="gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> Novos ({groups.new.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="ambiguous" className="max-h-[55vh] overflow-auto">
          {groups.ambiguous.length === 0 ? <p className="text-sm text-muted-foreground p-4">Sem ambiguidades 🎉</p> : renderGroup("Ambíguos — múltiplos candidatos", groups.ambiguous, <AlertCircle className="h-4 w-4" />, "bg-destructive/10 text-destructive")}
        </TabsContent>
        <TabsContent value="match" className="max-h-[55vh] overflow-auto">
          {groups.match.length === 0 ? <p className="text-sm text-muted-foreground p-4">Sem matches.</p> : renderGroup("Match único", groups.match, <AlertTriangle className="h-4 w-4" />, "bg-amber-500/10 text-amber-700 dark:text-amber-400")}
        </TabsContent>
        <TabsContent value="new" className="max-h-[55vh] overflow-auto">
          {groups.new.length === 0 ? <p className="text-sm text-muted-foreground p-4">Nada novo.</p> : renderGroup("Novos clientes", groups.new, <CheckCircle2 className="h-4 w-4" />, "bg-green-500/10 text-green-700 dark:text-green-400")}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={() => onConfirm(Array.from(decisions.values()))} disabled={isLoading}>
          {isLoading ? "Importando…" : `Confirmar — ${stats.c} criar / ${stats.m} mesclar / ${stats.i} ignorar`}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, sheet, existing }: { label: string; sheet?: string | null; existing?: string | null }) {
  const conflict = sheet && existing && String(sheet).trim() && String(existing).trim() && String(sheet).trim() !== String(existing).trim();
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      {conflict ? (
        <span><span className="line-through opacity-60">{existing}</span> <span className="text-primary font-medium">→ {sheet}</span></span>
      ) : (
        <span>{sheet || existing || "—"}</span>
      )}
    </div>
  );
}
