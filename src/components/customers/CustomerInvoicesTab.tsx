import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useCustomerInvoices, useUpsertInvoice, useDeleteInvoice, type CustomerInvoice } from "@/hooks/use-customers";

type FormState = {
  id?: string;
  document_number: string;
  invoice_date: string;
  payer_name: string;
  payment_terms: string;
  total_value: string;
};

const empty: FormState = { document_number: "", invoice_date: "", payer_name: "", payment_terms: "", total_value: "" };

export function CustomerInvoicesTab({ customerId }: { customerId: string }) {
  const { data = [], isLoading } = useCustomerInvoices(customerId);
  const upsertMut = useUpsertInvoice();
  const deleteMut = useDeleteInvoice();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (i: CustomerInvoice) => {
    setForm({
      id: i.id,
      document_number: i.document_number || "",
      invoice_date: i.invoice_date || "",
      payer_name: i.payer_name || "",
      payment_terms: i.payment_terms || "",
      total_value: String(i.total_value || ""),
    });
    setOpen(true);
  };

  const save = () => {
    upsertMut.mutate({
      id: form.id,
      customer_id: customerId,
      document_number: form.document_number || null,
      invoice_date: form.invoice_date || null,
      payer_name: form.payer_name || null,
      payment_terms: form.payment_terms || null,
      total_value: Number(form.total_value) || 0,
    }, { onSuccess: () => setOpen(false) });
  };

  const total = data.reduce((s, i) => s + i.total_value, 0);
  const avg = data.length ? total / data.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Notas fiscais SAP</h3>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Adicionar NF</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Total NFs</p>
          <p className="text-xl font-bold">{data.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Total faturado</p>
          <p className="text-xl font-bold">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Ticket médio</p>
          <p className="text-xl font-bold">R$ {avg.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground p-6">Carregando…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground p-6">Nenhuma nota fiscal SAP para este cliente.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Pagador</TableHead>
              <TableHead>Cond. Pagto</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.document_number || "—"}</TableCell>
                <TableCell>{i.invoice_date ? new Date(i.invoice_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell className="text-sm">{i.payer_name || "—"}</TableCell>
                <TableCell className="text-sm">{i.payment_terms || "—"}</TableCell>
                <TableCell className="text-right font-medium">R$ {i.total_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Editar NF" : "Nova NF"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nº documento</Label><Input value={form.document_number} onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))} /></div>
              <div><Label>Data</Label><Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
            </div>
            <div><Label>Pagador</Label><Input value={form.payer_name} onChange={e => setForm(f => ({ ...f, payer_name: e.target.value }))} /></div>
            <div><Label>Condição de pagamento</Label><Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} /></div>
            <div><Label>Valor total (R$) *</Label><Input type="number" step="0.01" value={form.total_value} onChange={e => setForm(f => ({ ...f, total_value: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={upsertMut.isPending || !form.total_value}>{upsertMut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota fiscal?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMut.mutate({ id: deleteId, customer_id: customerId }, { onSuccess: () => setDeleteId(null) })}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
