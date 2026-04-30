import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useCustomerEquipment, useUpsertEquipment, useDeleteEquipment, type CustomerEquipment } from "@/hooks/use-customers";

type FormState = {
  id?: string;
  model: string;
  serial_number: string;
  order_form: string;
  delivery_location: string;
  purchase_year: string;
  sale_value: string;
  notes: string;
};

const empty: FormState = { model: "", serial_number: "", order_form: "", delivery_location: "", purchase_year: "", sale_value: "", notes: "" };

export function CustomerEquipmentTab({ customerId }: { customerId: string }) {
  const { data = [], isLoading } = useCustomerEquipment(customerId);
  const upsertMut = useUpsertEquipment();
  const deleteMut = useDeleteEquipment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (e: CustomerEquipment) => {
    setForm({
      id: e.id,
      model: e.model || "",
      serial_number: e.serial_number || "",
      order_form: e.order_form || "",
      delivery_location: e.delivery_location || "",
      purchase_year: e.purchase_year ? String(e.purchase_year) : "",
      sale_value: e.sale_value ? String(e.sale_value) : "",
      notes: e.notes || "",
    });
    setOpen(true);
  };

  const save = () => {
    upsertMut.mutate({
      id: form.id,
      customer_id: customerId,
      model: form.model || null,
      serial_number: form.serial_number || null,
      order_form: form.order_form || null,
      delivery_location: form.delivery_location || null,
      purchase_year: form.purchase_year ? Number(form.purchase_year) : null,
      sale_value: form.sale_value ? Number(form.sale_value) : null,
      notes: form.notes || null,
    }, { onSuccess: () => setOpen(false) });
  };

  const total = data.reduce((s, e) => s + (e.sale_value || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data.length} equipamento(s) · Total histórico: <strong>R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground p-6">Carregando…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground p-6">Nenhum equipamento registrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Série</TableHead>
              <TableHead>Order Form</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Local entrega</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.model || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{e.serial_number || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{e.order_form || "—"}</TableCell>
                <TableCell>{e.purchase_year || "—"}</TableCell>
                <TableCell className="text-sm">{e.delivery_location || "—"}</TableCell>
                <TableCell className="text-right">{e.sale_value ? `R$ ${e.sale_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Modelo</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
              <div><Label>Nº de série</Label><Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Order Form</Label><Input value={form.order_form} onChange={e => setForm(f => ({ ...f, order_form: e.target.value }))} /></div>
              <div><Label>Ano</Label><Input type="number" value={form.purchase_year} onChange={e => setForm(f => ({ ...f, purchase_year: e.target.value }))} /></div>
            </div>
            <div><Label>Local entrega</Label><Input value={form.delivery_location} onChange={e => setForm(f => ({ ...f, delivery_location: e.target.value }))} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.sale_value} onChange={e => setForm(f => ({ ...f, sale_value: e.target.value }))} /></div>
            <div><Label>Observações</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={upsertMut.isPending}>{upsertMut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipamento?</AlertDialogTitle>
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
