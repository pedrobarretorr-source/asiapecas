import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Plus } from "lucide-react";
import { routes } from "@/lib/routes";

type SaleRow = { id: string; order_number: number; sale_date: string; status: string; total_amount: number; payment_terms: string | null };

export function CustomerSalesTab({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["customer-sales", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, order_number, sale_date, status, total_amount, payment_terms")
        .eq("customer_id", customerId)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return (data || []) as SaleRow[];
    },
  });

  const valid = sales.filter((s) => s.status !== "cancelado");
  const total = valid.reduce((s, x) => s + Number(x.total_amount || 0), 0);
  const ticket = valid.length ? total / valid.length : 0;
  const last = valid[0]?.sale_date;
  const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Pedidos" value={String(valid.length)} />
        <Kpi label="Total comprado" value={`R$ ${total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Kpi label="Ticket médio" value={`R$ ${ticket.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Kpi label="Último pedido" value={daysSince !== null ? `${daysSince}d atrás` : "—"} />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => navigate(routes.newOrderForCustomer(customerId))} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Pedido
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : sales.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhum pedido registrado
                </TableCell></TableRow>
              ) : sales.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(routes.sales)}>
                  <TableCell className="font-mono text-xs">#{s.order_number}</TableCell>
                  <TableCell className="text-sm">{new Date(s.sale_date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge variant={s.status === "confirmado" ? "default" : s.status === "cancelado" ? "destructive" : "secondary"} className="capitalize">{s.status}</Badge></TableCell>
                  <TableCell className="text-sm">{s.payment_terms || "—"}</TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(s.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </CardContent></Card>
  );
}
