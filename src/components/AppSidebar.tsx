import {
  LayoutDashboard,
  Package,
  Users,
  MessageSquare,
  ShoppingCart,
  Settings,
  TrendingUp,
  Truck,
  Search,
  ClipboardList,
  Radar,
  FileBarChart,
  FileText,
  LogOut,
  GraduationCap,
  Tags,
  Sparkles,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import asiaLogo from "@/assets/LOGO-ATUALIZADO.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { routes } from "@/lib/routes";

const mainItems = [
  { title: "Dashboard", url: routes.app, icon: LayoutDashboard },
  { title: "Catálogo", url: routes.catalog, icon: Package },
  { title: "Categorias", url: routes.categories, icon: Tags },
  { title: "Estoque", url: routes.stock, icon: TrendingUp },
];

const crmItems = [
  { title: "Clientes", url: routes.customers, icon: Users },
  { title: "Vendas", url: routes.sales, icon: ShoppingCart },
  { title: "Novo Pedido", url: routes.newOrder, icon: ClipboardList },
  { title: "Prospecção", url: routes.prospection, icon: Radar },
  { title: "Pós-Venda", url: routes.afterSales, icon: Truck },
];

const toolItems = [
  { title: "Pesquisa de Mercado", url: routes.marketResearch, icon: Search },
  { title: "Relatório Executivo", url: routes.report, icon: FileBarChart },
  { title: "Site Comercial", url: routes.home, icon: FileText },
  { title: "Vitrine (Admin)", url: routes.adminVitrine, icon: Sparkles },
  { title: "Treinamento", url: routes.training, icon: GraduationCap },
  { title: "IA Assistente", url: routes.assistant, icon: MessageSquare },
  { title: "Configurações", url: routes.settings, icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate(routes.login, { replace: true });
  };

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === routes.app}
            className="hover:bg-sidebar-accent/50 transition-colors"
            activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
          >
            <item.icon className="mr-2 h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          <img src={asiaLogo} alt="Ásia Peças & Máquinas" className="h-9 w-auto rounded-lg shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-display font-bold text-sm text-sidebar-foreground truncate">
                Ásia Peças & Máquinas
              </p>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">
                Peças & Máquinas
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Comercial
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(crmItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Ferramentas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(toolItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 mr-2 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </Button>
        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/30">
            v1.0 · Fase 1
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
