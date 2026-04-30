import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, DollarSign, AlertTriangle, TrendingUp, Cpu, Users, ShoppingCart, Headphones, Target, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboardStats, formatBRL, formatCompact } from "@/hooks/use-parts";
import { StockByCategoryChart } from "./StockByCategoryChart";
import { StockByTimeChart } from "./StockByTimeChart";
import { ManufacturerChart } from "./ManufacturerChart";
import { TopModelsChart } from "./TopModelsChart";
import { ValueDistributionChart } from "./ValueDistributionChart";
import { CategoryPartsChart } from "./CategoryPartsChart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { routes } from "@/lib/routes";

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const stalePercent = stats.totalValue > 0 ? ((stats.staleValue / stats.totalValue) * 100).toFixed(1) : "0";
  const turnover = stats.totalValue > 0 ? ((stats.totalSalesValue / stats.totalValue) * 100).toFixed(1) : "0";

  const kpis = [
    { label: "Total SKUs", value: stats.totalParts.toLocaleString("pt-BR"), subtitle: `${stats.totalStock.toLocaleString("pt-BR")} un · de 20.436 linhas consolidadas`, icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { label: "Valor do Estoque", value: formatCompact(stats.totalValue), subtitle: `Preço médio: ${formatBRL(stats.avgPrice)}`, icon: DollarSign, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Capital Parado (>2a)", value: formatCompact(stats.staleValue), subtitle: `${stalePercent}% do total`, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Estoque Crítico", value: stats.lowStockHighValue.toString(), subtitle: "Baixo estoque + alto valor", icon: Cpu, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  const integrationCards = [
    { label: "Clientes", value: stats.totalCustomers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", link: routes.customers },
    { label: "Vendas", value: stats.totalSales, subtitle: formatCompact(stats.totalSalesValue), icon: ShoppingCart, color: "text-emerald-500", bg: "bg-emerald-500/10", link: routes.sales },
    { label: "Tickets Abertos", value: stats.openTickets, icon: Headphones, color: "text-orange-500", bg: "bg-orange-500/10", link: routes.afterSales },
    { label: "Prospects Quentes", value: stats.hotProspects, subtitle: `de ${stats.totalProspects} total`, icon: Target, color: "text-purple-500", bg: "bg-purple-500/10", link: routes.prospection },
  ];

  const salesMonthData = (stats.salesByMonth || []).reverse().map(s => ({
    month: s.month.slice(5),
    value: s.value,
    count: s.count,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard de Gestão</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão integrada — Ásia Peças & Máquinas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{kpi.label}</p>
                  <p className="text-xl font-display font-bold mt-1 text-foreground">{kpi.value}</p>
                  {kpi.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{kpi.subtitle}</p>}
                </div>
                <div className={`h-10 w-10 rounded-lg ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {integrationCards.map((card) => (
          <Card key={card.label} className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(card.link)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{card.label}</p>
                  <p className="text-xl font-display font-bold mt-1 text-foreground">{card.value}</p>
                  {card.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>}
                </div>
                <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase">Giro de Estoque</p>
            <p className="text-xl font-display font-bold mt-1">{turnover}%</p>
            <p className="text-xs text-muted-foreground">Vendido / Valor em estoque</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase">Nunca Vendidas</p>
            <p className="text-xl font-display font-bold mt-1">{stats.neverSoldCount.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">Peças sem nenhuma venda</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm cursor-pointer hover:shadow-md" onClick={() => navigate(routes.stock)}>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Copy className="h-3 w-3" /> Potenciais Duplicados</p>
            <p className="text-xl font-display font-bold mt-1">{stats.duplicateCount}</p>
            <p className="text-xs text-muted-foreground">Descrições idênticas, códigos diferentes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="manufacturers">Fabricantes</TabsTrigger>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="font-display text-base">Peças por Categoria</CardTitle></CardHeader>
              <CardContent><StockByCategoryChart data={stats.byCategory} /></CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="font-display text-base">Tempo de Estoque</CardTitle></CardHeader>
              <CardContent><StockByTimeChart data={stats.byTime} /></CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="font-display text-base">Distribuição de Valor por Categoria</CardTitle></CardHeader>
              <CardContent><ValueDistributionChart data={stats.byCategory} /></CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="font-display text-base">Estoque por Categoria de Peça</CardTitle></CardHeader>
              <CardContent><CategoryPartsChart /></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6 mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="font-display text-base">Vendas por Mês</CardTitle></CardHeader>
            <CardContent>
              {salesMonthData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda registrada</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={salesMonthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} labelFormatter={(l) => `Mês: ${l}`} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="font-display text-base">Vendas Recentes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats.recentSales || []).map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(routes.sales)}>
                      <TableCell className="font-mono text-xs">#{s.order_number}</TableCell>
                      <TableCell>{s.customer_name || "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(s.sale_date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatBRL(s.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="font-display text-base">Análise por Categoria</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Categoria</TableHead><TableHead className="text-right">Peças</TableHead>
                  <TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {stats.byCategory.map((cat) => (
                    <TableRow key={cat.name}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-right">{cat.quantidade.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">{cat.units.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-medium">{formatCompact(cat.value)}</TableCell>
                      <TableCell className="text-right"><Badge variant="outline">{((cat.value / stats.totalValue) * 100).toFixed(1)}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manufacturers" className="mt-4 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="font-display text-base">Valor por Fabricante</CardTitle></CardHeader>
            <CardContent><ManufacturerChart data={stats.byManufacturer} /></CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="font-display text-base">Detalhamento</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Fabricante</TableHead><TableHead className="text-right">Peças</TableHead>
                  <TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {stats.byManufacturer.map((m) => (
                    <TableRow key={m.name}>
                      <TableCell className="font-medium text-xs">{m.name}</TableCell>
                      <TableCell className="text-right">{m.quantidade.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">{m.units.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-medium">{formatCompact(m.value)}</TableCell>
                      <TableCell className="text-right"><Badge variant="outline">{((m.value / stats.totalValue) * 100).toFixed(1)}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="mt-4 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="font-display text-base">Top 15 Modelos por Valor</CardTitle></CardHeader>
            <CardContent><TopModelsChart data={stats.topModels} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-6">
          <Card className="border-destructive/30 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="font-display text-base">Estoque Crítico</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stats.lowStockHighValue} peças com menos de 5 un. e valor &gt; R$ 50k</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Código</TableHead><TableHead>Descrição</TableHead><TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Estoque</TableHead><TableHead className="text-right">Preço</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {stats.criticalParts?.map((p) => (
                    <TableRow key={p.material}>
                      <TableCell className="font-mono text-xs">{p.material}</TableCell>
                      <TableCell className="text-xs max-w-[250px] truncate">{p.description}</TableCell>
                      <TableCell className="text-xs">{p.machine_model}</TableCell>
                      <TableCell className="text-right"><Badge variant="destructive">{p.stock}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatBRL(p.estimated_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Estoque Parado (&gt;2 Anos)</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{stats.staleStock.toLocaleString("pt-BR")} peças · {formatCompact(stats.staleValue)}</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Código</TableHead><TableHead>Descrição</TableHead><TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Estoque</TableHead><TableHead className="text-right">Valor Total</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {stats.staleParts?.map((p) => (
                    <TableRow key={p.material}>
                      <TableCell className="font-mono text-xs">{p.material}</TableCell>
                      <TableCell className="text-xs max-w-[250px] truncate">{p.description}</TableCell>
                      <TableCell className="text-xs">{p.machine_model}</TableCell>
                      <TableCell className="text-right">{p.stock.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-medium text-orange-500">{formatBRL(p.total_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
