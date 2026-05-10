import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSales, useUpdateSaleStatus, useDeleteSale, type Sale } from "@/hooks/use-sales";
import { Plus, Pencil, Trash2, ClipboardList, Settings, FileCode2 } from "lucide-react";
import QuoteRequestsTab from "@/components/quote/QuoteRequestsTab";
import ProposalCustomizeDialog from "@/components/sales/ProposalCustomizeDialog";
import ProposalConfigTab from "@/components/sales/ProposalConfigTab";
import ProposalHtmlGeneratorTab from "@/components/sales/ProposalHtmlGeneratorTab";
import SaleEditDialog from "@/components/sales/SaleEditDialog";
import { routes } from "@/lib/routes";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  orcamento: { label: "Orçamento", variant: "outline" },
  confirmado: { label: "Confirmado", variant: "default" },
  faturado: { label: "Faturado", variant: "secondary" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export default function SalesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("todos");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [proposalSale, setProposalSale] = useState<Sale | null>(null);
  const { data: sales = [], isLoading } = useSales(statusFilter);
  const updateStatus = useUpdateSaleStatus();
  const deleteMut = useDeleteSale();

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMut.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  };

  const totalMonth = sales.reduce((s, v) => s + v.total_amount, 0);
  const avgTicket = sales.length ? totalMonth / sales.length : 0;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Vendas</h1>
          <Button onClick={() => navigate(routes.newOrder)}><Plus className="h-4 w-4 mr-2" />Novo Pedido</Button>
        </div>

        <Tabs defaultValue="vendas">
          <TabsList>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="cotacoes" className="gap-1">
              <ClipboardList className="h-4 w-4" /> Cotações Recebidas
            </TabsTrigger>
            <TabsTrigger value="gerador-html" className="gap-1">
              <FileCode2 className="h-4 w-4" /> Gerador HTML
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1">
              <Settings className="h-4 w-4" /> Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendas" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Vendas</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{sales.length}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Valor Total</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-primary">R$ {totalMonth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ticket Médio</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">R$ {avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Orçamentos</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{sales.filter(s => s.status === "orcamento").length}</p></CardContent></Card>
            </div>

            <div className="flex gap-2">
              {["todos", "orcamento", "confirmado", "faturado", "cancelado"].map(s => (
                <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} className="capitalize">
                  {s === "todos" ? "Todos" : STATUS_MAP[s]?.label || s}
                </Button>
              ))}
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : sales.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada</TableCell></TableRow>
                    ) : sales.map(sale => (
                      <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailSale(sale)}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {(sale as any).order_number ? `#${(sale as any).order_number}` : sale.id.slice(0, 6)}
                        </TableCell>
                        <TableCell>{new Date(sale.sale_date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="font-medium">{sale.customers?.name || "—"}</TableCell>
                        <TableCell>{sale.sale_items?.length || 0} itens</TableCell>
                        <TableCell className="font-mono">R$ {sale.total_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[sale.status]?.variant || "outline"}>
                            {STATUS_MAP[sale.status]?.label || sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => setDetailSale(sale)} title={sale.status === "orcamento" ? "Editar cotação" : "Ver detalhes"}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Select value={sale.status} onValueChange={v => updateStatus.mutate({ id: sale.id, status: v })}>
                              <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(sale.id)}>
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
          </TabsContent>

          <TabsContent value="cotacoes" className="mt-4">
            <QuoteRequestsTab />
          </TabsContent>

          <TabsContent value="gerador-html" className="mt-4">
            <ProposalHtmlGeneratorTab />
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <ProposalConfigTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sale Edit / Detail Dialog */}
      <SaleEditDialog
        sale={detailSale}
        open={!!detailSale}
        onOpenChange={(o) => !o && setDetailSale(null)}
        onGenerateProposal={(s) => { setDetailSale(null); setProposalSale(s); }}
      />

      {/* Proposal Customize Dialog */}
      <ProposalCustomizeDialog
        sale={proposalSale}
        open={!!proposalSale}
        onOpenChange={(o) => !o && setProposalSale(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
