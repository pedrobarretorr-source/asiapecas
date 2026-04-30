import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LifeBuoy, Plus } from "lucide-react";
import { toast } from "sonner";

type Ticket = { id: string; type: string; status: string; priority: string; description: string; resolution: string | null; created_at: string };

const TYPES = ["suporte", "garantia", "reclamacao", "manutencao"];
const PRIORITIES = ["baixa", "media", "alta", "urgente"];
const STATUSES = ["aberto", "em andamento", "resolvido", "cancelado"];

export function CustomerAfterSalesTab({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "suporte", priority: "media", description: "" });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["customer-after-sales", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("after_sales")
        .select("id,type,status,priority,description,resolution,created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Ticket[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data: lastSale } = await supabase.from("sales").select("id").eq("customer_id", customerId).order("sale_date", { ascending: false }).limit(1).maybeSingle();
      const { error } = await supabase.from("after_sales").insert({
        customer_id: customerId,
        sale_id: lastSale?.id || null,
        type: form.type, priority: form.priority, description: form.description, status: "aberto",
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-after-sales", customerId] });
      toast.success("Chamado aberto");
      setOpen(false);
      setForm({ type: "suporte", priority: "media", description: "" });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: { status: string; resolved_at?: string } = { status };
      if (status === "resolvido") patch.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("after_sales").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-after-sales", customerId] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Abrir chamado</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Prior.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Aberto em</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : tickets.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                <LifeBuoy className="h-8 w-8 mx-auto mb-2 opacity-40" /> Nenhum chamado pós-venda
              </TableCell></TableRow>
            ) : tickets.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="capitalize">{t.type}</TableCell>
                <TableCell>
                  <Badge variant={t.priority === "urgente" || t.priority === "alta" ? "destructive" : "secondary"} className="capitalize">{t.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v })}>
                    <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="max-w-md truncate text-sm">{t.description}</TableCell>
                <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir chamado pós-venda</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.description.trim() || createMut.isPending}>Abrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
