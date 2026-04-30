import { AppLayout } from "@/components/AppLayout";
import { CatalogContent } from "@/components/catalog/CatalogContent";
import { ReportsTab } from "@/components/catalog/reports/ReportsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Package } from "lucide-react";

const CatalogPage = () => (
  <AppLayout>
    <Tabs defaultValue="catalog" className="p-4">
      <TabsList className="mb-2">
        <TabsTrigger value="catalog" className="gap-1">
          <Package className="h-4 w-4" /> Catálogo
        </TabsTrigger>
        <TabsTrigger value="reports" className="gap-1">
          <BarChart3 className="h-4 w-4" /> Relatórios
        </TabsTrigger>
      </TabsList>
      <TabsContent value="catalog" className="m-0">
        <CatalogContent />
      </TabsContent>
      <TabsContent value="reports" className="m-0 p-2">
        <ReportsTab />
      </TabsContent>
    </Tabs>
  </AppLayout>
);

export default CatalogPage;
