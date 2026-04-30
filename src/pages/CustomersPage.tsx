import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useCustomers, useCustomersStats, useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
  useEnrichCustomer, useProspectFromCustomer, useBulkUpdateCustomers, useBulkDeleteCustomers,
  type Customer, type CustomerInsert,
} from "@/hooks/use-customers";
import { Plus, Search, Trash2, Pencil, Upload, Sparkles, Eye, Target } from "lucide-react";
import { ImportXlsxWizard } from "@/components/customers/ImportXlsxWizard";
import { customerDedupKey } from "@/lib/normalize";
import { WhatsAppButton } from "@/components/customers/WhatsAppButton";
import { BulkActionsBar } from "@/components/customers/BulkActionsBar";
import { BulkEditDialog, type BulkEditValues } from "@/components/customers/BulkEditDialog";
import { CustomerPagination } from "@/components/customers/CustomerPagination";
import { downloadCsv, todayStamp } from "@/lib/export-csv";
import { formatWhatsAppLink, defaultGreeting } from "@/lib/whatsapp";
import { toast } from "sonner";
import { routes } from "@/lib/routes";

const SEGMENTS = ["mineração", "construção", "logística", "energia", "agronegócio", "geral"];
const STATUSES = ["ativo", "prospect", "dormente", "sem_contato"];

const emptyCustomer: CustomerInsert = {
  name: "", company: null, cnpj_cpf: null, email: null, phone: null,
  address: null, city: null, state: null, segment: "geral", notes: null,
};

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-synced state
  const search = searchParams.get("q") || "";
  const stateFilter = searchParams.get("uf") || "all";
  const segmentFilter = searchParams.get("seg") || "all";
  const enrichmentFilter = searchParams.get("ia") || "all";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.max(10, Number(searchParams.get("size") || "25"));

  const updateParams = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all") next.delete(k);
      else next.set(k, String(v));
    }
    setSearchParams(next, { replace: true });
  };

  // Local search input (debounced into URL)
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  useEffect(() => {
    if (debouncedSearch !== search) updateParams({ q: debouncedSearch || null, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerInsert>(emptyCustomer);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkWaOpen, setBulkWaOpen] = useState(false);
  const [bulkWaMessage, setBulkWaMessage] = useState("Olá {nome}, sou da Ásia Peças & Máquinas. Posso ajudar?");

  const { data: result, isLoading, isFetching } = useCustomers({
    search, state: stateFilter, segment: segmentFilter, enrichment: enrichmentFilter, page, pageSize,
  });
  const customers = result?.rows ?? [];
  const total = result?.total ?? 0;

  const stats = useCustomersStats();
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const deleteMut = useDeleteCustomer();
  const enrichMut = useEnrichCustomer();
  const prospectMut = useProspectFromCustomer();
  const bulkUpdateMut = useBulkUpdateCustomers();
  const bulkDeleteMut = useBulkDeleteCustomers();

  // Reset selection when page/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [page, pageSize, search, stateFilter, segmentFilter, enrichmentFilter]);

  const isEmptyCustomer = (c: Customer) => !c.email && !c.phone && !c.cnpj_cpf;

  const allChecked = customers.length > 0 && customers.every((c) => selectedIds.has(c.id));
  const someChecked = !allChecked && customers.some((c) => selectedIds.has(c.id));
  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) customers.forEach((c) => next.delete(c.id));
      else customers.forEach((c) => next.add(c.id));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const existingKeys = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) set.add(customerDedupKey(c));
    return set;
  }, [customers]);

  const openCreate = () => { setEditingId(null); setForm(emptyCustomer); setOpen(true); };
  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({ name: c.name, company: c.company, cnpj_cpf: c.cnpj_cpf, email: c.email, phone: c.phone, address: c.address, city: c.city, state: c.state, segment: c.segment, notes: c.notes });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name?.trim()) return;
    if (editingId) {
      updateMut.mutate({ id: editingId, ...form }, { onSuccess: () => { setOpen(false); setEditingId(null); } });
    } else {
      createMut.mutate(form, { onSuccess: () => { setOpen(false); setForm(emptyCustomer); } });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMut.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  };

  const selectedCustomers = useMemo(() => customers.filter((c) => selectedIds.has(c.id)), [customers, selectedIds]);

  const handleBulkEdit = (values: BulkEditValues) => {
    const ids = Array.from(selectedIds);
    bulkUpdateMut.mutate({ ids, patch: values }, {
      onSuccess: () => { setBulkEditOpen(false); setSelectedIds(new Set()); },
    });
  };

  const handleBulkDelete = () => {
    bulkDeleteMut.mutate(Array.from(selectedIds), {
      onSuccess: () => { setBulkDeleteOpen(false); setSelectedIds(new Set()); },
    });
  };

  const handleBulkEnrich = async () => {
    const ids = Array.from(selectedIds).slice(0, 25);
    toast.info(`Carregando informações de ${ids.length} cliente(s)…`);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try { await enrichMut.mutateAsync(id); ok++; } catch { fail++; }
    }
    toast.success(`${ok} concluído(s), ${fail} falha(s)`);
  };

  const handleBulkProspect = () => {
    const ids = Array.from(selectedIds).slice(0, 50);
    prospectMut.mutate(ids);
  };

  const handleBulkExport = () => {
    downloadCsv(`clientes_${todayStamp()}.csv`, selectedCustomers, [
      { header: "Nome", value: (c) => c.name },
      { header: "Empresa", value: (c) => c.company || "" },
      { header: "CNPJ/CPF", value: (c) => c.cnpj_cpf || "" },
      { header: "Telefone", value: (c) => c.phone || "" },
      { header: "Email", value: (c) => c.email || "" },
      { header: "UF", value: (c) => c.state || "" },
      { header: "Cidade", value: (c) => c.city || "" },
      { header: "Segmento", value: (c) => c.segment || "" },
      { header: "Status", value: (c) => c.relationship_status || "" },
      { header: "Faturado", value: (c) => Number(c.total_invoiced || 0) },
    ]);
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl font-bold text-foreground">CRM - Clientes</h1>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importar XLSX
            </Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Clientes</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.data?.total.toLocaleString("pt-BR") ?? "—"}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Com informações carregadas</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-primary">{stats.data?.enriched.toLocaleString("pt-BR") ?? "—"}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Faturado total</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold">R$ {(stats.data?.totalInvoiced ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Estados cobertos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.data?.statesCount ?? "—"}</p></CardContent></Card>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, empresa ou CNPJ..." className="pl-10" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <Select value={stateFilter} onValueChange={(v) => updateParams({ uf: v, page: 1 })}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="UF" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas UFs</SelectItem>
              {(stats.data?.states || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={segmentFilter} onValueChange={(v) => updateParams({ seg: v, page: 1 })}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos segmentos</SelectItem>
              {SEGMENTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={enrichmentFilter} onValueChange={(v) => updateParams({ ia: v, page: 1 })}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Informações" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="enriched">✓ Com informações</SelectItem>
              <SelectItem value="pending">⏳ Pendentes</SelectItem>
              <SelectItem value="empty">📭 Vazios</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <BulkActionsBar
          count={selectedIds.size}
          busy={bulkUpdateMut.isPending || bulkDeleteMut.isPending || enrichMut.isPending || prospectMut.isPending}
          onClear={() => setSelectedIds(new Set())}
          onEdit={() => setBulkEditOpen(true)}
          onDelete={() => setBulkDeleteOpen(true)}
          onEnrich={handleBulkEnrich}
          onProspect={handleBulkProspect}
          onExport={handleBulkExport}
          onWhatsApp={() => setBulkWaOpen(true)}
        />

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allChecked ? true : someChecked ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>UF / Cidade</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Faturado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : customers.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</TableCell></TableRow>
                ) : customers.map((c) => {
                  const checked = selectedIds.has(c.id);
                  return (
                    <TableRow key={c.id} className="cursor-pointer" data-state={checked ? "selected" : undefined} onClick={() => navigate(routes.customerDetail(c.id))}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleOne(c.id)} aria-label={`Selecionar ${c.name}`} />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {c.name}
                          {isEmptyCustomer(c) && <Badge variant="destructive" className="text-[10px] px-1">📭</Badge>}
                        </div>
                        {c.company && <p className="text-xs text-muted-foreground truncate max-w-xs">{c.company}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{[c.state, c.city].filter(Boolean).join(" / ") || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.cnpj_cpf || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{c.segment || "geral"}</Badge></TableCell>
                      <TableCell className="text-sm">{c.total_invoiced ? `R$ ${(c.total_invoiced as number).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"}</TableCell>
                      <TableCell>
                        {c.enrichment_status === "enriched" ? (
                          <Badge className="gap-1">✓ Carregado</Badge>
                        ) : c.enrichment_status === "failed" ? (
                          <Badge variant="destructive">falhou</Badge>
                        ) : (
                          <Badge variant="outline">⏳</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <WhatsAppButton phone={c.phone} name={c.name} />
                          <Button variant="ghost" size="icon" onClick={() => navigate(routes.customerDetail(c.id))} title="Ver detalhe">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => enrichMut.mutate(c.id)} disabled={enrichMut.isPending} title="Carregar informações">
                            <Sparkles className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <CustomerPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={(p) => updateParams({ page: Math.min(Math.max(1, p), totalPages) })}
              onPageSizeChange={(s) => updateParams({ size: s, page: 1 })}
            />
            {isFetching && !isLoading && <div className="px-3 pb-2 text-xs text-muted-foreground">Atualizando…</div>}
          </CardContent>
        </Card>
      </div>

      <ImportXlsxWizard open={importOpen} onOpenChange={setImportOpen} existingKeys={existingKeys} />

      {/* Single create/edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome *</Label><Input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Empresa</Label><Input value={form.company || ""} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value || null }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>CNPJ/CPF</Label><Input value={form.cnpj_cpf || ""} onChange={(e) => setForm((f) => ({ ...f, cnpj_cpf: e.target.value || null }))} /></div>
              <div><Label>Segmento</Label>
                <Select value={form.segment || "geral"} onValueChange={(v) => setForm((f) => ({ ...f, segment: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEGMENTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Telefone</Label><Input value={form.phone || ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value || null }))} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value || null }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Cidade</Label><Input value={form.city || ""} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value || null }))} /></div>
              <div><Label>Estado</Label><Input value={form.state || ""} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value || null }))} /></div>
              <div><Label>Status</Label>
                <Select value={form.relationship_status || "prospect"} onValueChange={(v) => setForm((f) => ({ ...f, relationship_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Endereço</Label><Input value={form.address || ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value || null }))} /></div>
            <div><Label>Observações</Label><Textarea value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk edit */}
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        count={selectedIds.size}
        onSubmit={handleBulkEdit}
        busy={bulkUpdateMut.isPending}
      />

      {/* Bulk delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} cliente(s)?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Equipamentos, NFs e prospects associados podem ficar órfãos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleteMut.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleteMut.isPending ? "Excluindo..." : "Excluir todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk WhatsApp */}
      <Dialog open={bulkWaOpen} onOpenChange={setBulkWaOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>WhatsApp em lote — {selectedIds.size} cliente(s)</DialogTitle>
            <DialogDescription>
              Edite a mensagem padrão. Use <code className="text-xs">{"{nome}"}</code> para o primeiro nome. Clique em "Abrir" para iniciar a conversa de cada cliente individualmente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea rows={3} value={bulkWaMessage} onChange={(e) => setBulkWaMessage(e.target.value)} />
            <div className="border rounded-md max-h-80 overflow-y-auto divide-y">
              {selectedCustomers.map((c) => {
                const first = (c.name || "").split(/\s+/)[0] || "";
                const msg = bulkWaMessage.replace(/\{nome\}/gi, first) || defaultGreeting(c.name);
                const url = formatWhatsAppLink(c.phone, msg);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone || "Sem telefone"}</p>
                    </div>
                    <Button size="sm" variant={url ? "default" : "outline"} disabled={!url} onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}>
                      Abrir
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkWaOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
