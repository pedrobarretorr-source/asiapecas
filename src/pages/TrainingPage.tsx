import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package, ShoppingCart, Users, Wrench, CheckCircle2, XCircle,
  HardHat, Mountain, Drill, Construction, Truck, BarChart3, TrendingDown,
  AlertTriangle, FileText, Radar, MessageSquare, Search, ClipboardList,
  Globe, Award, Lightbulb, Target,
} from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "asia-training-progress";

type CheckItem = { id: string; label: string };
type QuizQuestion = { q: string; options: string[]; correct: number };

interface TabData {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  sections: { title: string; icon: React.ElementType; description: string; tips: string[] }[];
  checklist: CheckItem[];
  quiz: QuizQuestion[];
}

const TABS: TabData[] = [
  {
    key: "estoque",
    label: "Conhecimento do Estoque",
    icon: Package,
    color: "text-primary",
    sections: [
      {
        title: "Categorias de Peças",
        icon: HardHat,
        description: "Nosso estoque é organizado em 5 categorias principais que refletem as linhas de equipamentos XCMG.",
        tips: [
          "🏗️ Linha Amarela — Escavadeiras, carregadeiras, retroescavadeiras (maior volume do estoque)",
          "⛏️ Mineração — Peças para equipamentos de grande porte usados em mineração",
          "🔩 Perfuratriz — Componentes de perfuratrizes rotativas e esteiras",
          "🏗️ Guindaste — Guindastes telescópicos e sobre esteiras XCMG",
          "⚡ Caminhão Elétrico — Linha de caminhões elétricos XCMG (tendência crescente)",
        ],
      },
      {
        title: "Métricas Importantes",
        icon: BarChart3,
        description: "Entenda os indicadores que usamos para gerenciar o estoque de forma eficiente.",
        tips: [
          "📊 Giro de Estoque — Quantas vezes um item é vendido/reposto em um período",
          "💰 Capital Parado — Valor total de peças sem movimentação (meta: reduzir continuamente)",
          "🔴 Estoque Crítico — Peças com menos de 5 unidades e alta demanda",
          "📈 Cobertura de Estoque — Tempo que o estoque atual cobre a demanda projetada",
        ],
      },
      {
        title: "Peças Paradas (+2 anos)",
        icon: TrendingDown,
        description: "Peças sem movimentação há mais de 2 anos representam capital imobilizado. Ações recomendadas:",
        tips: [
          "🔍 Verificar compatibilidade com modelos mais novos via pesquisa IA",
          "💡 Oferecer em promoções específicas para clientes do segmento",
          "🌎 Buscar demanda em mercados internacionais (Venezuela, Guiana)",
          "📋 Registrar no relatório executivo para tomada de decisão",
        ],
      },
    ],
    checklist: [
      { id: "est-1", label: "Entendi as 5 categorias de peças" },
      { id: "est-2", label: "Sei interpretar giro de estoque e capital parado" },
      { id: "est-3", label: "Sei como agir sobre peças paradas há +2 anos" },
      { id: "est-4", label: "Consigo navegar o módulo de Estoque no sistema" },
    ],
    quiz: [
      {
        q: "Qual categoria inclui escavadeiras e carregadeiras?",
        options: ["Mineração", "Linha Amarela", "Perfuratriz", "Guindaste"],
        correct: 1,
      },
      {
        q: "O que significa 'capital parado' no estoque?",
        options: ["Peças em trânsito", "Valor de peças sem movimentação", "Peças reservadas", "Peças em garantia"],
        correct: 1,
      },
      {
        q: "Qual a ação recomendada para peças sem venda há +2 anos?",
        options: ["Descartar imediatamente", "Verificar compatibilidade via IA e buscar mercados", "Aumentar o preço", "Mover para outro armazém"],
        correct: 1,
      },
    ],
  },
  {
    key: "vendas",
    label: "Processo de Vendas",
    icon: ShoppingCart,
    color: "text-green-500",
    sections: [
      {
        title: "Fluxo de Vendas",
        icon: ClipboardList,
        description: "O processo de venda segue um fluxo estruturado para garantir controle e rastreabilidade.",
        tips: [
          "1️⃣ Cotação — Cliente busca peças no portal ou envia lista",
          "2️⃣ Orçamento — Equipe analisa disponibilidade e prepara proposta",
          "3️⃣ Pedido — Cliente aprova e confirma o pedido",
          "4️⃣ Faturamento — Emissão de nota fiscal e cobrança",
          "5️⃣ Entrega — Logística e rastreamento até o cliente",
        ],
      },
      {
        title: "Portal do Cliente",
        icon: Globe,
        description: "O portal /cotacao é nossa vitrine digital. Incentive os clientes a usar!",
        tips: [
          "🔗 Link público: compartilhe com clientes sem necessidade de login",
          "🔍 Busca inteligente por código, descrição ou modelo de máquina",
          "🛒 Carrinho de cotação: cliente monta lista e envia com dados de contato",
          "🤖 Assistente IA: responde dúvidas técnicas em tempo real",
          "🌐 Disponível em PT, EN e ES para clientes internacionais",
        ],
      },
      {
        title: "Conversão de Prospects",
        icon: Target,
        description: "Transforme prospects em clientes com abordagem consultiva.",
        tips: [
          "📊 Use o módulo de Prospecção para encontrar empresas do segmento",
          "📧 Envie o link do portal personalizado com peças relevantes",
          "📞 Follow-up em até 48h após cotação recebida",
          "💡 Ofereça informações técnicas da IA como diferencial competitivo",
        ],
      },
    ],
    checklist: [
      { id: "ven-1", label: "Conheço todas as etapas do fluxo de vendas" },
      { id: "ven-2", label: "Sei como funciona o portal do cliente" },
      { id: "ven-3", label: "Entendo como converter prospects em clientes" },
      { id: "ven-4", label: "Sei registrar uma venda no sistema" },
    ],
    quiz: [
      {
        q: "Qual a primeira etapa do fluxo de vendas?",
        options: ["Faturamento", "Pedido", "Cotação", "Entrega"],
        correct: 2,
      },
      {
        q: "O portal do cliente requer login?",
        options: ["Sim, sempre", "Não, é público", "Apenas para cotações", "Apenas para peças IA"],
        correct: 1,
      },
      {
        q: "Em quanto tempo devemos fazer follow-up após cotação?",
        options: ["1 semana", "48 horas", "30 dias", "Não é necessário"],
        correct: 1,
      },
    ],
  },
  {
    key: "atendimento",
    label: "Atendimento ao Cliente",
    icon: Users,
    color: "text-blue-500",
    sections: [
      {
        title: "Regiões Atendidas",
        icon: Globe,
        description: "A Ásia Peças & Máquinas atende três mercados principais com necessidades distintas.",
        tips: [
          "🇧🇷 Brasil — Principal mercado. Foco em mineração e construção civil",
          "🇻🇪 Venezuela — Demanda crescente por peças de reposição. Atenção à logística",
          "🇬🇾 Guiana — Mercado emergente com projetos de infraestrutura e mineração",
        ],
      },
      {
        title: "Segmentos de Atuação",
        icon: HardHat,
        description: "Conhecer os segmentos ajuda a oferecer soluções mais assertivas.",
        tips: [
          "⛏️ Mineração — Grandes volumes, peças de desgaste frequente, urgência alta",
          "🏗️ Construção Civil — Variedade de equipamentos, manutenção preventiva",
          "🛤️ Infraestrutura — Projetos governamentais, licitações, prazos rígidos",
          "🏭 Industrial — Guindastes e empilhadeiras em plantas industriais",
        ],
      },
      {
        title: "Pós-Venda e Fidelização",
        icon: Award,
        description: "O pós-venda é fundamental para a retenção de clientes.",
        tips: [
          "✅ Registrar todas as ocorrências no módulo de Pós-Venda",
          "📞 Contato proativo após 30 dias da entrega",
          "🔄 Oferecer peças complementares baseadas no histórico",
          "⭐ Clientes satisfeitos geram indicações — nosso melhor canal",
        ],
      },
    ],
    checklist: [
      { id: "ate-1", label: "Conheço os 3 mercados que atendemos" },
      { id: "ate-2", label: "Entendo os segmentos e suas necessidades" },
      { id: "ate-3", label: "Sei usar o módulo de Pós-Venda" },
      { id: "ate-4", label: "Conheço as práticas de fidelização" },
    ],
    quiz: [
      {
        q: "Quais são os 3 países atendidos pela Ásia Peças?",
        options: ["Brasil, Argentina, Chile", "Brasil, Venezuela, Guiana", "Brasil, Colômbia, Peru", "Brasil, Paraguai, Uruguai"],
        correct: 1,
      },
      {
        q: "Qual segmento tem maior urgência em peças de reposição?",
        options: ["Construção Civil", "Industrial", "Mineração", "Infraestrutura"],
        correct: 2,
      },
      {
        q: "Em quanto tempo fazer contato proativo pós-entrega?",
        options: ["1 semana", "30 dias", "6 meses", "Não é necessário"],
        correct: 1,
      },
    ],
  },
  {
    key: "ferramentas",
    label: "Ferramentas do Sistema",
    icon: Wrench,
    color: "text-orange-500",
    sections: [
      {
        title: "Módulos Principais",
        icon: BarChart3,
        description: "Conheça cada módulo do sistema para maximizar sua produtividade.",
        tips: [
          "📊 Dashboard — Visão geral de vendas, estoque e indicadores-chave",
          "📦 Catálogo — Todas as peças com pesquisa IA, filtros avançados",
          "📈 Estoque — Importações, controle de entrada/saída, alertas",
          "👥 Clientes — CRM completo com histórico de compras",
          "💰 Vendas — Registro e acompanhamento de pedidos",
        ],
      },
      {
        title: "Ferramentas Avançadas",
        icon: Lightbulb,
        description: "Recursos inteligentes que diferenciam nosso sistema.",
        tips: [
          "🔍 Pesquisa de Mercado — Compare preços com concorrentes",
          "🎯 Prospecção — Encontre novos clientes por região e segmento",
          "🤖 IA Assistente — Pergunte qualquer coisa sobre o estoque",
          "📋 Relatório Executivo — Relatórios com insights automatizados",
          "🌐 Portal do Cliente — Catálogo público para autoatendimento",
        ],
      },
      {
        title: "Dicas de Produtividade",
        icon: Search,
        description: "Aproveite ao máximo cada ferramenta do sistema.",
        tips: [
          "⌨️ Use a busca no catálogo com código exato para resultados instantâneos",
          "🏷️ Filtre por categoria para encontrar peças relacionadas",
          "🤖 Pesquisa IA em lote: selecione várias peças e pesquise de uma vez",
          "📊 Exporte dados do estoque em Excel para análises externas",
          "📱 O portal do cliente funciona perfeitamente no celular",
        ],
      },
    ],
    checklist: [
      { id: "fer-1", label: "Naveguei por todos os módulos do sistema" },
      { id: "fer-2", label: "Sei usar a pesquisa IA no catálogo" },
      { id: "fer-3", label: "Conheço o módulo de Prospecção" },
      { id: "fer-4", label: "Sei gerar relatórios executivos" },
    ],
    quiz: [
      {
        q: "Qual módulo mostra visão geral de vendas e indicadores?",
        options: ["Catálogo", "Dashboard", "Estoque", "Relatório"],
        correct: 1,
      },
      {
        q: "Como pesquisar informações técnicas de várias peças ao mesmo tempo?",
        options: ["Uma por uma no Google", "Pesquisa IA em lote no catálogo", "Ligar para a XCMG", "Não é possível"],
        correct: 1,
      },
      {
        q: "Qual ferramenta ajuda a encontrar novos clientes por região?",
        options: ["Dashboard", "Catálogo", "Prospecção", "Pós-Venda"],
        correct: 2,
      },
    ],
  },
];

function getProgress(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveProgress(p: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export default function TrainingPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>(getProgress);
  const [quizState, setQuizState] = useState<Record<string, { selected: number | null; submitted: boolean }>>({});

  useEffect(() => { saveProgress(checked); }, [checked]);

  const totalItems = TABS.reduce((s, t) => s + t.checklist.length, 0);
  const doneItems = Object.values(checked).filter(Boolean).length;
  const overallPercent = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  const toggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  const handleQuizSelect = (tabKey: string, qIdx: number, optIdx: number) => {
    const key = `${tabKey}-${qIdx}`;
    if (quizState[key]?.submitted) return;
    setQuizState(prev => ({ ...prev, [key]: { selected: optIdx, submitted: false } }));
  };

  const handleQuizSubmit = (tabKey: string, qIdx: number, correct: number) => {
    const key = `${tabKey}-${qIdx}`;
    const sel = quizState[key]?.selected;
    if (sel === null || sel === undefined) return;
    setQuizState(prev => ({ ...prev, [key]: { selected: sel, submitted: true } }));
    if (sel === correct) toast.success("Resposta correta! 🎉");
    else toast.error("Resposta incorreta. Tente revisar o conteúdo.");
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-foreground">
            Treinamento da Equipe
          </h1>
          <p className="text-muted-foreground text-sm">
            Capacitação sobre estoque, vendas e ferramentas da Ásia Peças & Máquinas
          </p>
        </div>

        {/* Overall progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Progresso Geral</span>
              <Badge variant={overallPercent === 100 ? "default" : "secondary"}>
                {doneItems}/{totalItems} concluídos
              </Badge>
            </div>
            <Progress value={overallPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">{overallPercent}% completo</p>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="estoque" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto gap-1">
            {TABS.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs gap-1 py-2">
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map(tab => {
            const tabChecked = tab.checklist.filter(c => checked[c.id]).length;
            const tabPercent = tab.checklist.length ? Math.round((tabChecked / tab.checklist.length) * 100) : 0;

            return (
              <TabsContent key={tab.key} value={tab.key} className="space-y-6">
                {/* Tab progress */}
                <div className="flex items-center gap-3">
                  <Progress value={tabPercent} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{tabPercent}%</span>
                </div>

                {/* Sections */}
                <div className="grid gap-4">
                  {tab.sections.map((sec, i) => (
                    <Card key={i} className="border-l-4" style={{ borderLeftColor: `hsl(var(--primary))` }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <sec.icon className={`h-5 w-5 ${tab.color}`} />
                          {sec.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{sec.description}</p>
                        <ul className="space-y-1.5">
                          {sec.tips.map((tip, j) => (
                            <li key={j} className="text-sm text-foreground/80 pl-1">{tip}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Checklist */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Checklist de Aprendizado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tab.checklist.map(item => (
                      <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                        <Checkbox
                          checked={!!checked[item.id]}
                          onCheckedChange={() => toggle(item.id)}
                        />
                        <span className={`text-sm transition-colors ${checked[item.id] ? "text-muted-foreground line-through" : "text-foreground group-hover:text-primary"}`}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </CardContent>
                </Card>

                {/* Quiz */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      Quiz Rápido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {tab.quiz.map((question, qIdx) => {
                      const key = `${tab.key}-${qIdx}`;
                      const state = quizState[key] || { selected: null, submitted: false };

                      return (
                        <div key={qIdx} className="space-y-3">
                          <p className="text-sm font-medium text-foreground">{qIdx + 1}. {question.q}</p>
                          <div className="grid gap-2">
                            {question.options.map((opt, oIdx) => {
                              let cls = "border rounded-lg px-4 py-2.5 text-sm text-left transition-colors cursor-pointer ";
                              if (state.submitted) {
                                if (oIdx === question.correct) cls += "bg-green-500/10 border-green-500 text-green-700";
                                else if (oIdx === state.selected) cls += "bg-destructive/10 border-destructive text-destructive";
                                else cls += "border-border text-muted-foreground";
                              } else {
                                cls += oIdx === state.selected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:border-primary/50 text-foreground";
                              }
                              return (
                                <button key={oIdx} className={cls} onClick={() => handleQuizSelect(tab.key, qIdx, oIdx)}>
                                  {opt}
                                  {state.submitted && oIdx === question.correct && <CheckCircle2 className="inline h-4 w-4 ml-2" />}
                                  {state.submitted && oIdx === state.selected && oIdx !== question.correct && <XCircle className="inline h-4 w-4 ml-2" />}
                                </button>
                              );
                            })}
                          </div>
                          {!state.submitted && (
                            <Button size="sm" onClick={() => handleQuizSubmit(tab.key, qIdx, question.correct)} disabled={state.selected === null}>
                              Verificar
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </AppLayout>
  );
}
