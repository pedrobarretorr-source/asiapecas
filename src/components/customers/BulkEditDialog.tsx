import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SEGMENTS = ["mineração", "construção", "logística", "energia", "agronegócio", "geral"];
const STATUSES = ["ativo", "prospect", "dormente", "sem_contato"];
const KEEP = "__keep__";

export type BulkEditValues = {
  segment?: string;
  relationship_status?: string;
  state?: string;
  city?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  onSubmit: (values: BulkEditValues) => void;
  busy?: boolean;
};

export function BulkEditDialog({ open, onOpenChange, count, onSubmit, busy }: Props) {
  const [segment, setSegment] = useState<string>(KEEP);
  const [status, setStatus] = useState<string>(KEEP);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const submit = () => {
    const values: BulkEditValues = {};
    if (segment !== KEEP) values.segment = segment;
    if (status !== KEEP) values.relationship_status = status;
    if (state.trim()) values.state = state.trim().toUpperCase();
    if (city.trim()) values.city = city.trim();
    if (Object.keys(values).length === 0) {
      onOpenChange(false);
      return;
    }
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {count} cliente{count > 1 ? "s" : ""} em lote</DialogTitle>
          <DialogDescription>Apenas os campos preenchidos serão aplicados. Deixe em "manter" o que não deseja alterar.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Segmento</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP}>— manter atual —</SelectItem>
                  {SEGMENTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP}>— manter atual —</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>UF</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="ex: SP" maxLength={2} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="ex: Macapá" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Aplicando..." : "Aplicar a todos"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
