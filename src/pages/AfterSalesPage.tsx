import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAfterSales, useCreateAfterSale, useUpdateAfterSale, type AfterSale } from "@/hooks/use-after-sales";
import { useAllCustomers } from "@/hooks/use-customers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

const TYPES = ["garantia", "devolução", "reclamação", "suporte"];
const PRIORITIES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  baixa: { label: "Baixa", variant: "outline" },
  media: { label: "Média", variant: "secondary" },
  alta: { label: "Alta", variant: "default" },
  urgente: { label: "Urgente", variant: "destructive" },
};
const STATUSES: Record<string, string> = {
  aberto: "Aberto",
  "em andamento": "Em Andamento",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

export default function AfterSalesPage() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTicket, setEditTicket] = useState<AfterSale | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: tickets = [], isLoading } = useAfterSales(statusFilter);
  const { data: customers = [] } = useAllCustomers();
  const createMut = useCreateAfterSale();
  const updateMut = useUpdateAfterSale();

  // Create form
  const [customerId, setCustomerId] = useState("");
  const [type, setType] = useState("suporte");
  const [priority, setPriority] = useState("media");
  const [description, setDescription] = useState("");

  // Edit form
  const [editResolution, setEditResolution] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editType, setEditType] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleCreate = () => {
    if (!customerId || !description.trim()) return;
    createMut.mutate(
      { customer_id: customerId, type, priority, description },
      { onSuccess: () => { setCreateOpen(false); setCustomerId(""); setDescription(""); setType("suporte"); setPriority("media"); } }
    );
  };

  const openEdit = (t: AfterSale) => {
    setEditTicket(t);
    setEditResolution(t.resolution || "");
    setEditPriority(t.priority);
    setEditType(t.type);
    setEditDescription(t.description);
  };

  const handleEdit = () => {
    if (!editTicket) return;
    updateMut.mutate({
      id: editTicket.id,
      resolution: editResolution || null,
      priority: editPriority,
      type: editType,
      description: editDescription,
    }, { onSuccess: () => setEditTicket(null) });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("after_sales").delete().eq("id", deleteId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Ticket removido");
    setDeleteId(null);
    // Refetch handled by react-query stale
    window.location.reload();
  };

  const openCount = tickets.filter(t => t.status === "aberto" || t.status === "em andamento").length;
  const resolvedCount = tickets.filter(t => t.status === "resolvido" || t.status === "fechado").length;
  const byType = tickets.reduce<Record<string, number>>((acc, t) => { acc[t.type] = (acc[t.type] || 0) + 1; return acc; }, {});

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Pós-Venda</h1>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Ticket</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tickets Abertos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-destructive">{openCount}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Resolvidos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-primary">{resolvedCount}</p></CardContent></Card>
          {Object.entries(byType).slice(0, 2).map(([t, c]) => (
            <Card key={t}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground capitalize">{t}</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{c}</p></CardContent></Card>
          ))}
        </div>

        <div className="flex gap-2">
          {["todos", "aberto", "em andamento", "resolvido", "fechado"].map(s => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} className="capitalize">
              {s === "todos" ? "Todos" : STATUSES[s] || s}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : tickets.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum ticket encontrado</TableCell></TableRow>
                ) : tickets.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{t.customers?.name || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{t.type}</Badge></TableCell>
                    <TableCell><Badge variant={PRIORITIES[t.priority]?.variant || "outline"}>{PRIORITIES[t.priority]?.label || t.priority}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.description}</TableCell>
                    <TableCell>
                      <Select value={t.status} onValueChange={v => updateMut.mutate({ id: t.id, status: v, resolved_at: v === "resolvido" || v === "fechado" ? new Date().toISOString() : null })}>
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Ticket</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Cliente *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição *</Label><Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || !customerId || !description.trim()}>
              {createMut.isPending ? "Salvando..." : "Criar Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTicket} onOpenChange={(o) => !o && setEditTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Ticket</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Prioridade</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Textarea rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} /></div>
            <div><Label>Resolução</Label><Textarea rows={3} value={editResolution} onChange={e => setEditResolution(e.target.value)} placeholder="Descreva como o problema foi resolvido..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTicket(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={updateMut.isPending}>{updateMut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este ticket? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
