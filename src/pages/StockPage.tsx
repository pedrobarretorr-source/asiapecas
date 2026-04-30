import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useStockAnalytics } from "@/hooks/use-stock-analytics";
import { ExecutiveOverview } from "@/components/stock/ExecutiveOverview";
import { CategoryDeepDive } from "@/components/stock/CategoryDeepDive";
import { StockBCGMatrix } from "@/components/stock/StockBCGMatrix";
import { SubcategorizeAITab } from "@/components/stock/SubcategorizeAITab";
import { TimeRiskAnalysis } from "@/components/stock/TimeRiskAnalysis";
import { DataHealthTab } from "@/components/stock/DataHealthTab";

const StockPage = () => {
  const { data, isLoading, error } = useStockAnalytics();
  const [tab, setTab] = useState("overview");
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Análise de Estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo inteligente · diagnóstico em tempo real · {data ? data.kpis.totalSkus.toLocaleString("pt-BR") : "—"} SKUs
          </p>
        </div>

        {isLoading && (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
            Erro ao carregar análise: {(error as any)?.message ?? "desconhecido"}
          </div>
        )}

        {data && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto flex-wrap">
              <TabsTrigger value="overview">Visão Executiva</TabsTrigger>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="bcg">Matriz BCG</TabsTrigger>
              <TabsTrigger value="ai">Subcategorizar</TabsTrigger>
              <TabsTrigger value="risk">Tempo & Risco</TabsTrigger>
              <TabsTrigger value="health">Saúde dos Dados</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <ExecutiveOverview
                data={data}
                onCategoryClick={(c) => {
                  setDrillCategory(c);
                  setTab("categories");
                }}
              />
            </TabsContent>

            <TabsContent value="categories" className="mt-4">
              <CategoryDeepDive data={data} initialCategory={drillCategory} onClose={() => setDrillCategory(null)} />
            </TabsContent>

            <TabsContent value="bcg" className="mt-4">
              <StockBCGMatrix data={data} />
            </TabsContent>

            <TabsContent value="ai" className="mt-4">
              <SubcategorizeAITab />
            </TabsContent>

            <TabsContent value="risk" className="mt-4">
              <TimeRiskAnalysis data={data} />
            </TabsContent>

            <TabsContent value="health" className="mt-4">
              <DataHealthTab data={data} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default StockPage;
