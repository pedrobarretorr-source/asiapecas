import { AppLayout } from "@/components/AppLayout";
import { useDashboardStats, formatBRL, formatCompact } from "@/hooks/use-parts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, DollarSign, TrendingUp, Globe, Users, ShoppingCart,
  Headphones, Target, AlertTriangle, ArrowRight, Layers, Clock,
  FileSpreadsheet,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";

const COLORS = [
  "hsl(45, 100%, 50%)",
  "hsl(220, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(0, 70%, 55%)",
  "hsl(280, 60%, 55%)",
];

const PIPELINE_STEPS = [
  { label: "Prospecção IA", icon: Target, desc: "GPT-5.2 busca empresas por região e segmento" },
  { label: "Prospect", icon: Users, desc: "Perfil qualificado com score e peças recomendadas" },
  { label: "Cliente", icon: Users, desc: "Convertido para base de clientes ativa" },
  { label: "Orçamento", icon: FileSpreadsheet, desc: "Pedido gerado com itens do catálogo" },
  { label: "Venda", icon: ShoppingCart, desc: "Confirmada, estoque debitado automaticamente" },
  { label: "Pós-Venda", icon: Headphones, desc: "Suporte, garantia e acompanhamento" },
];

export default function ReportPage() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-96" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!stats) return null;

  const stalePercent = stats.totalValue > 0 ? ((stats.staleValue / stats.totalValue) * 100).toFixed(1) : "0";
  const turnover = stats.totalValue > 0 ? ((stats.totalSalesValue / stats.totalValue) * 100).toFixed(1) : "0";

  const salesMonthData = (stats.salesByMonth || []).reverse().map((s) => ({
    month: s.month.slice(5),
    value: s.value,
    count: s.count,
  }));

  return (
    <AppLayout>
      <div className="p-6 space-y-10 max-w-6xl mx-auto">
        {/* ===== SLIDE 1 — VISÃO GERAL ===== */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-lg">LL</span>
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Lopes & Lopes — Distribuidor XCMG
              </h1>
              <p className="text-sm text-muted-foreground">
                Relatório Executivo · Plano de Negócios Integrado
              </p>
            </div>
          </div>

          <Card className="border-none shadow-sm bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-6">
              <p className="text-sm text-foreground leading-relaxed">
                A <strong>Lopes & Lopes</strong> é distribuidora autorizada de peças XCMG para
                equipamentos de <strong>Mineração</strong>, <strong>Linha Amarela</strong>,{" "}
                <strong>Perfuratriz</strong>, <strong>Caminhão Elétrico</strong> e{" "}
                <strong>Guindaste</strong>. Atuação em <strong>Brasil</strong> (todos os estados),{" "}
                <strong>Venezuela</strong> e <strong>Guiana</strong>.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Materiais Únicos", value: stats.totalParts.toLocaleString("pt-BR"), icon: Package },
              { label: "Unidades em Estoque", value: stats.totalStock.toLocaleString("pt-BR"), icon: Layers },
              { label: "Valor Total", value: formatCompact(stats.totalValue), icon: DollarSign },
              { label: "Giro de Estoque", value: `${turnover}%`, icon: TrendingUp },
            ].map((k) => (
              <Card key={k.label} className="border-none shadow-sm">
                <CardContent className="p-4 text-center">
                  <k.icon className="h-6 w-6 mx-auto text-primary mb-2" />
                  <p className="text-xl font-display font-bold text-foreground">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">
                    {k.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ===== SLIDE 2 — 20k vs 15k ===== */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Consolidação do Inventário
          </h2>

          <Card className="border-primary/20 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-display font-bold text-foreground">20.436</p>
                  <p className="text-xs text-muted-foreground mt-1">Linhas na planilha original</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ArrowRight className="h-8 w-8 text-primary" />
                  <p className="text-xs text-muted-foreground text-center">
                    Mesmo material aparece em múltiplas linhas (modelos, filiais, lotes)
                  </p>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-3xl font-display font-bold text-primary">
                    {stats.totalParts.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Materiais únicos no banco</p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">Por que a diferença?</strong> A planilha original
                  contém <strong>20.436 registros</strong>. Muitos materiais aparecem mais de uma vez —
                  por exemplo, quando a mesma peça atende múltiplos modelos de máquina, está em filiais
                  diferentes, ou foi registrada em lotes separados.
                </p>
                <p>
                  Ao consolidar por <strong>código de material</strong>, os estoques são somados e
                  restam <strong>~{stats.totalParts.toLocaleString("pt-BR")} materiais únicos</strong>,
                  totalizando <strong>{stats.totalStock.toLocaleString("pt-BR")} unidades</strong> e{" "}
                  <strong>{formatCompact(stats.totalValue)}</strong> em valor.
                </p>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-muted-foreground">Exemplo</th>
                      <th className="text-right p-2 text-muted-foreground">Linhas Planilha</th>
                      <th className="text-right p-2 text-muted-foreground">Estoque Consolidado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-mono">860132921</td>
                      <td className="text-right p-2">3x (386+380+348)</td>
                      <td className="text-right p-2 font-bold">1.114</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">272102015</td>
                      <td className="text-right p-2">2x (45+20)</td>
                      <td className="text-right p-2 font-bold">65</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">453101366</td>
                      <td className="text-right p-2">2x (279+204)</td>
                      <td className="text-right p-2 font-bold">483</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ===== SLIDE 3 — CATEGORIAS ===== */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground">Análise por Categoria</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.byCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {stats.byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-muted-foreground">Categoria</th>
                      <th className="text-right p-2 text-muted-foreground">Peças</th>
                      <th className="text-right p-2 text-muted-foreground">Unidades</th>
                      <th className="text-right p-2 text-muted-foreground">Valor</th>
                      <th className="text-right p-2 text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byCategory.map((cat, i) => (
                      <tr key={cat.name} className="border-b">
                        <td className="p-2 flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          {cat.name}
                        </td>
                        <td className="text-right p-2">{cat.quantidade.toLocaleString("pt-BR")}</td>
                        <td className="text-right p-2">{cat.units.toLocaleString("pt-BR")}</td>
                        <td className="text-right p-2 font-medium">{formatCompact(cat.value)}</td>
                        <td className="text-right p-2">
                          <Badge variant="outline">
                            {((cat.value / stats.totalValue) * 100).toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ===== SLIDE 4 — TEMPO DE ESTOQUE ===== */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Análise por Tempo de Estoque
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(stats.byTime || []).map((t) => (
              <Card key={t.name} className="border-none shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground uppercase">{t.name}</p>
                  <p className="text-xl font-display font-bold mt-1">
                    {t.quantidade.toLocaleString("pt-BR")} peças
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t.units.toLocaleString("pt-BR")} un · {formatCompact(t.value)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-destructive/20 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-display font-bold text-foreground">
                    Capital Parado (&gt;2 Anos): {formatCompact(stats.staleValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Representa <strong>{stalePercent}%</strong> do valor total em estoque.{" "}
                    {stats.staleUnits.toLocaleString("pt-BR")} unidades em{" "}
                    {stats.staleStock.toLocaleString("pt-BR")} materiais parados há mais de 2 anos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ===== SLIDE 5 — PIPELINE DE VENDAS ===== */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Estrutura Comercial — Pipeline Integrado
          </h2>

          <div className="flex flex-wrap gap-2 items-center justify-center">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs font-medium mt-1 text-foreground">{step.label}</p>
                  <p className="text-[9px] text-muted-foreground max-w-[100px]">{step.desc}</p>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Clientes", value: stats.totalCustomers, icon: Users },
              { label: "Vendas", value: `${stats.totalSales} (${formatCompact(stats.totalSalesValue)})`, icon: ShoppingCart },
              { label: "Tickets", value: stats.openTickets, icon: Headphones },
              { label: "Prospects", value: `${stats.hotProspects} quentes / ${stats.totalProspects}`, icon: Target },
            ].map((k) => (
              <Card key={k.label} className="border-none shadow-sm">
                <CardContent className="p-4 text-center">
                  <k.icon className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-lg font-display font-bold text-foreground">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{k.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {salesMonthData.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">Vendas por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={salesMonthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ===== SLIDE 6 — EXPANSÃO INTERNACIONAL ===== */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Expansão Internacional
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { country: "🇧🇷 Brasil", desc: "Todos os 26 estados + DF. Base principal de operações." },
              { country: "🇻🇪 Venezuela", desc: "Mercado em crescimento para equipamentos de mineração e construção." },
              { country: "🇬🇾 Guiana", desc: "Setor de mineração em rápida expansão. Oportunidade estratégica." },
            ].map((c) => (
              <Card key={c.country} className="border-none shadow-sm">
                <CardContent className="p-5">
                  <p className="text-lg font-display font-bold">{c.country}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ===== SLIDE 7 — PLANO DE AÇÃO ===== */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground">Plano de Ação</h2>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 space-y-3">
              {[
                "Liquidar estoque parado >2 anos com campanhas de preço agressivo (meta: reduzir " + stalePercent + "% → 15%)",
                "Prospecção IA ativa em Venezuela e Guiana — gerar 50+ prospects qualificados por mês",
                "Catalogar 100% das peças com pesquisa IA (especificações, compatibilidade e similares)",
                "Detectar e mesclar peças duplicadas — " + stats.duplicateCount + " potenciais duplicados identificados",
                "Integrar pós-venda com rastreio de satisfação e recompra automática",
                "Dashboard de KPIs em tempo real para tomada de decisão estratégica",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">
            Lopes & Lopes — XCMG Peças · Relatório gerado em tempo real · v1.0
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
