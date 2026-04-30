export const APP_BASE = "/app";

export function appRoute(path = ""): string {
  if (!path || path === "/") return APP_BASE;
  return `${APP_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export const routes = {
  home: "/",
  quote: "/cotacao",
  login: "/login",
  resetPassword: "/reset-password",
  app: appRoute(),
  adminVitrine: appRoute("/admin/vitrine"),
  catalog: appRoute("/catalogo"),
  categories: appRoute("/catalogo/categorias"),
  stock: appRoute("/estoque"),
  customers: appRoute("/clientes"),
  customerDetail: (id: string) => appRoute(`/clientes/${id}`),
  sales: appRoute("/vendas"),
  afterSales: appRoute("/pos-venda"),
  newOrder: appRoute("/pedidos/novo"),
  newOrderForCustomer: (customerId: string) => appRoute(`/pedidos/novo?customer_id=${customerId}`),
  prospection: appRoute("/prospeccao"),
  marketResearch: appRoute("/pesquisa-mercado"),
  assistant: appRoute("/assistente"),
  report: appRoute("/relatorio"),
  training: appRoute("/treinamento"),
  settings: appRoute("/configuracoes"),
};
