import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuoteRequests, useConvertQuoteToSale, type QuoteRequest } from "@/hooks/use-quote-requests";
import { ArrowRightLeft, Eye, Mail, Phone, Building, Search } from "lucide-react";
import { useState, useMemo } from "react";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "outline" },
  convertido: { label: "Convertido", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

const STATUS_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "convertido", label: "Convertido" },
  { value: "cancelado", label: "Cancelado" },
];

export default function QuoteRequestsTab() {
  const { data: quotes = [], isLoading } = useQuoteRequests();
  const convertMut = useConvertQuoteToSale();
  const [detail, setDetail] = useState<QuoteRequest | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      const matchesStatus = statusFilter === "todos" || q.status === statusFilter;
      const s = search.toLowerCase();
      const matchesSearch = !s || [q.customer_name, q.company, q.email].some(f => f?.toLowerCase().includes(s));
      return matchesStatus && matchesSearch;
    });
  }, [quotes, search, statusFilter]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, empresa ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map(sf => (
            <Button
              key={sf.value}
              size="sm"
              variant={statusFilter === sf.value ? "default" : "outline"}
              onClick={() => setStatusFilter(sf.value)}
            >
              {sf.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filteredQuotes.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {quotes.length === 0 ? "Nenhuma cotação recebida" : "Nenhum resultado para o filtro aplicado"}
                </TableCell></TableRow>
              ) : filteredQuotes.map(q => {
                const items = Array.isArray(q.items) ? q.items : [];
                return (
                  <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetail(q)}>
                    <TableCell>{new Date(q.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{q.customer_name}</TableCell>
                    <TableCell>{q.company || "—"}</TableCell>
                    <TableCell>{items.length} itens</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[q.status]?.variant || "outline"}>
                        {STATUS_BADGE[q.status]?.label || q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => setDetail(q)}><Eye className="h-4 w-4" /></Button>
                        {q.status === "pendente" && (
                          <Button size="sm" variant="default" className="gap-1" disabled={convertMut.isPending} onClick={() => convertMut.mutate(q)}>
                            <ArrowRightLeft className="h-3 w-3" /> Converter
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes da Cotação</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{detail.customer_name}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={STATUS_BADGE[detail.status]?.variant || "outline"} className="mt-1">
                    {STATUS_BADGE[detail.status]?.label || detail.status}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {detail.company && <span className="flex items-center gap-1 text-muted-foreground"><Building className="h-3 w-3" />{detail.company}</span>}
                {detail.email && <span className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{detail.email}</span>}
                {detail.phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{detail.phone}</span>}
              </div>
              {detail.notes && <p className="text-sm bg-muted/50 rounded-lg p-3"><span className="text-muted-foreground">Obs: </span>{detail.notes}</p>}
              <div>
                <p className="text-sm font-medium mb-2">Itens ({(Array.isArray(detail.items) ? detail.items : []).length})</p>
                <div className="space-y-1">
                  {(Array.isArray(detail.items) ? detail.items : []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between bg-muted/30 rounded px-3 py-2 text-sm">
                      <span className="font-mono">{item.material}</span>
                      <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              {detail.status === "pendente" && (
                <Button className="w-full gap-2" disabled={convertMut.isPending} onClick={() => { convertMut.mutate(detail); setDetail(null); }}>
                  <ArrowRightLeft className="h-4 w-4" /> Converter em Orçamento
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
