import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import CatalogPage from "./pages/CatalogPage";
import CategoriesPage from "./pages/CategoriesPage";
import StockPage from "./pages/StockPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import SalesPage from "./pages/SalesPage";
import AfterSalesPage from "./pages/AfterSalesPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import MarketResearchPage from "./pages/MarketResearchPage";
import AssistantPage from "./pages/AssistantPage";
import NewOrderPage from "./pages/NewOrderPage";
import ProspectionPage from "./pages/ProspectionPage";
import ReportPage from "./pages/ReportPage";
import HomePage from "./pages/HomePage";
import QuotePage from "./pages/QuotePage";
import PartDetailPublicPage from "./pages/PartDetailPublicPage";
import CategoryPublicPage from "./pages/CategoryPublicPage";
import ModelPublicPage from "./pages/ModelPublicPage";
import CategoriesIndexPage from "./pages/CategoriesIndexPage";
import ModelsIndexPage from "./pages/ModelsIndexPage";
import AdminVitrinePage from "./pages/AdminVitrinePage";
import TrainingPage from "./pages/TrainingPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { captureUtm } from "@/lib/utm";
import { initAnalytics } from "@/lib/analytics";
import { routes } from "@/lib/routes";

const queryClient = new QueryClient();

const LegacyAppRedirect = ({ to }: { to: string }) => <Navigate to={to} replace />;

const LegacyCustomerDetailRedirect = () => {
  const { id } = useParams();
  return <Navigate to={id ? routes.customerDetail(id) : routes.customers} replace />;
};

const App = () => {
  useEffect(() => { captureUtm(); initAnalytics(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/cotacao" element={<QuotePage />} />
                <Route path="/cotacao/categorias" element={<CategoriesIndexPage />} />
                <Route path="/cotacao/modelos" element={<ModelsIndexPage />} />
                <Route path="/cotacao/c/:slug" element={<CategoryPublicPage />} />
                <Route path="/cotacao/m/:slug" element={<ModelPublicPage />} />
                <Route path="/cotacao/p/:material" element={<PartDetailPublicPage />} />
                <Route path={routes.login} element={<LoginPage />} />
                <Route path={routes.resetPassword} element={<ResetPasswordPage />} />

                {/* Protected routes */}
                <Route path={routes.app} element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path={routes.adminVitrine} element={<ProtectedRoute><AdminVitrinePage /></ProtectedRoute>} />
                <Route path={routes.catalog} element={<ProtectedRoute><CatalogPage /></ProtectedRoute>} />
                <Route path={routes.categories} element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
                <Route path={routes.stock} element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
                <Route path={routes.customers} element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
                <Route path="/app/clientes/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
                <Route path={routes.sales} element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
                <Route path={routes.afterSales} element={<ProtectedRoute><AfterSalesPage /></ProtectedRoute>} />
                <Route path={routes.newOrder} element={<ProtectedRoute><NewOrderPage /></ProtectedRoute>} />
                <Route path={routes.prospection} element={<ProtectedRoute><ProspectionPage /></ProtectedRoute>} />
                <Route path={routes.marketResearch} element={<ProtectedRoute><MarketResearchPage /></ProtectedRoute>} />
                <Route path={routes.assistant} element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />
                <Route path={routes.report} element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
                <Route path={routes.training} element={<ProtectedRoute><TrainingPage /></ProtectedRoute>} />
                <Route path={routes.settings} element={<ProtectedRoute><ComingSoonPage title="Configurações" /></ProtectedRoute>} />

                {/* Legacy internal routes */}
                <Route path="/admin/vitrine" element={<LegacyAppRedirect to={routes.adminVitrine} />} />
                <Route path="/catalogo" element={<LegacyAppRedirect to={routes.catalog} />} />
                <Route path="/catalogo/categorias" element={<LegacyAppRedirect to={routes.categories} />} />
                <Route path="/estoque" element={<LegacyAppRedirect to={routes.stock} />} />
                <Route path="/clientes" element={<LegacyAppRedirect to={routes.customers} />} />
                <Route path="/clientes/:id" element={<LegacyCustomerDetailRedirect />} />
                <Route path="/vendas" element={<LegacyAppRedirect to={routes.sales} />} />
                <Route path="/pos-venda" element={<LegacyAppRedirect to={routes.afterSales} />} />
                <Route path="/pedidos/novo" element={<LegacyAppRedirect to={routes.newOrder} />} />
                <Route path="/prospeccao" element={<LegacyAppRedirect to={routes.prospection} />} />
                <Route path="/pesquisa-mercado" element={<LegacyAppRedirect to={routes.marketResearch} />} />
                <Route path="/assistente" element={<LegacyAppRedirect to={routes.assistant} />} />
                <Route path="/relatorio" element={<LegacyAppRedirect to={routes.report} />} />
                <Route path="/treinamento" element={<LegacyAppRedirect to={routes.training} />} />
                <Route path="/configuracoes" element={<LegacyAppRedirect to={routes.settings} />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
