import { useState } from "react";
import { Link } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import HeroCarousel from "@/components/quote/HeroCarousel";
import QuoteHero from "@/components/quote/QuoteHero";
import B2BLeadDialog from "@/components/quote/B2BLeadDialog";
import ConsentBanner from "@/components/quote/ConsentBanner";
import QuoteFAQ from "@/components/quote/QuoteFAQ";
import QuoteFooter from "@/components/quote/QuoteFooter";
import QuoteRequestFormSection from "@/components/quote/QuoteRequestFormSection";
import PartnersStrip from "@/components/quote/PartnersStrip";
import PublicHeader from "@/components/quote/PublicHeader";
import WhatsAppFloatingButton from "@/components/quote/WhatsAppFloatingButton";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Headset,
  SearchCheck,
  ShieldCheck,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { type Lang } from "@/components/quote/translations";
import { SEO, organizationLd } from "@/lib/seo";
import { PUBLIC_WHATSAPP_URL } from "@/lib/whatsapp";

type Metric = {
  icon: LucideIcon;
  title: string;
  desc: string;
  cta: string;
  href: string;
};

type IconCard = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

const PAGE_COPY: Record<
  Lang,
  {
    seoTitle: string;
    seoDescription: string;
    metrics: Metric[];
    commerceEyebrow: string;
    commerceTitle: string;
    commerceDesc: string;
    commerceNote: string;
    promiseTitle: string;
    promiseItems: string[];
    pillarsEyebrow: string;
    pillarsTitle: string;
    pillarsDesc: string;
    categoriesEyebrow: string;
    categoriesTitle: string;
    categoriesDesc: string;
    categoriesCta: string;
    b2bTitle: string;
    b2bDesc: string;
    b2bCta: string;
    catalogCta: string;
    flowEyebrow: string;
    flowTitle: string;
    flowDesc: string;
    flowNote: string;
    closingTitle: string;
    closingDesc: string;
  }
> = {
  pt: {
    seoTitle: "Peças para máquinas pesadas com cotação rápida | Ásia Peças & Máquinas",
    seoDescription:
      "E-commerce B2B de peças para linha amarela e máquinas pesadas. Catálogo por categoria, cotação assistida, envio nacional, pagamento facilitado e suporte técnico.",
    metrics: [
      {
        icon: Truck,
        title: "Frete express!",
        desc: "Despacho nacional com apoio comercial para alinhar prazo, frete e prioridade quando a máquina não pode parar.",
        cta: "Consultar prazo",
        href: "/#contato",
      },
      {
        icon: Building2,
        title: "Melhores condições",
        desc: "Atendimento preparado para recorrência, volume e negociação B2B com margem, previsibilidade e continuidade de compra.",
        cta: "Negociar condição",
        href: "/#contato",
      },
      {
        icon: CreditCard,
        title: "Formas de pagamento",
        desc: "Condições comerciais sob análise para empresas, frotas, oficinas e compras de reposição com maior volume.",
        cta: "Ver opções",
        href: "/#contato",
      },
      {
        icon: ShieldCheck,
        title: "Garantia e procedência",
        desc: "Itens novos, com procedência e suporte para validar aplicação antes da compra, reduzindo erro de pedido e retrabalho.",
        cta: "Cotar com garantia",
        href: "/#contato",
      },
    ],
    commerceEyebrow: "Compra técnica, sem fricção",
    commerceTitle: "Peça certa, prazo claro e negociação assistida para sua operação não parar.",
    commerceDesc:
      "A página inicial agora funciona como uma vitrine comercial para quem compra peça de máquina pesada com urgência, recorrência e necessidade de compatibilidade. O fluxo conduz do benefício ao catálogo, e do catálogo para uma cotação com contexto técnico.",
    commerceNote:
      "Catálogo para consulta rápida, time comercial para validar aplicação, frete, prazo, garantia e melhor condição de pagamento.",
    promiseTitle: "O que uma compra precisa resolver",
    promiseItems: [
      "Encontrar a categoria correta sem depender de navegação complexa.",
      "Validar compatibilidade antes de fechar pedido ou orçamento.",
      "Comparar disponibilidade, prazo e frete com clareza.",
      "Negociar pagamento para compra corporativa ou recorrente.",
    ],
    pillarsEyebrow: "Diferenciais do e-commerce",
    pillarsTitle: "Uma experiência de compra feita para manutenção, campo e suprimentos.",
    pillarsDesc:
      "Empresas do segmento vendem disponibilidade, confiança e velocidade. A estrutura da home destaca esses pontos com linguagem direta e espaço visual para tomada de decisão.",
    categoriesEyebrow: "Cotação sem retrabalho",
    categoriesTitle: "Envie contexto técnico e receba uma proposta mais precisa.",
    categoriesDesc:
      "Quando o pedido vem com código, modelo, fotos e cidade de entrega, o time reduz ida e volta e acelera prazo, frete e validação da peça.",
    categoriesCta: "Enviar dados",
    b2bTitle: "Compra recorrente para frota, obra, oficina ou revenda.",
    b2bDesc:
      "Centralize demandas, envie listas de itens e negocie condições para abastecimento contínuo com suporte comercial.",
    b2bCta: "Falar com consultor",
    catalogCta: "Abrir catálogo",
    flowEyebrow: "Fluxo de compra",
    flowTitle: "Da busca à entrega, cada etapa precisa ser objetiva.",
    flowDesc:
      "A jornada prioriza o que o comprador profissional precisa: achar a peça, validar aplicação, receber condição comercial e acompanhar o envio.",
    flowNote:
      "Se você já tem código, modelo de máquina, foto da peça ou lista de compra, envie tudo no formulário para acelerar a resposta.",
    closingTitle: "Estoque, prazo, pagamento e garantia tratados no mesmo atendimento.",
    closingDesc:
      "A cotação final pode considerar disponibilidade, substituições compatíveis, frete, condição de pagamento e orientação técnica para reduzir erro de compra.",
  },
  en: {
    seoTitle: "Heavy equipment parts with assisted quoting | Asia Parts & Machines",
    seoDescription:
      "B2B e-commerce experience for yellow line and heavy equipment parts. Category catalog, assisted quoting, nationwide shipping, payment terms and technical support.",
    metrics: [
      {
        icon: Truck,
        title: "Fast delivery across Brazil",
        desc: "Nationwide dispatch with commercial support to align lead time, freight and priority when equipment cannot stop.",
        cta: "Check lead time",
        href: "/#contato",
      },
      {
        icon: Building2,
        title: "Special terms for resellers",
        desc: "Service prepared for recurring demand, volume and B2B negotiation with margin, predictability and supply continuity.",
        cta: "Negotiate terms",
        href: "/#contato",
      },
      {
        icon: CreditCard,
        title: "Flexible payment",
        desc: "Commercial conditions under analysis for companies, fleets, workshops and higher-volume replacement purchases.",
        cta: "View options",
        href: "/#contato",
      },
      {
        icon: ShieldCheck,
        title: "New parts with warranty",
        desc: "New items with traceability and support to validate application before purchase, reducing order errors and rework.",
        cta: "Quote with warranty",
        href: "/#contato",
      },
    ],
    commerceEyebrow: "Technical purchase, low friction",
    commerceTitle: "The right part, clear lead time and assisted negotiation to keep operations moving.",
    commerceDesc:
      "The homepage now works as a commercial storefront for buyers who need heavy equipment parts with urgency, recurring demand and compatibility checks. The flow leads from benefit to catalog, and from catalog to contextual quoting.",
    commerceNote:
      "Fast catalog consultation, commercial support for application validation, freight, lead time, warranty and payment terms.",
    promiseTitle: "What the purchase must solve",
    promiseItems: [
      "Find the right category without complex navigation.",
      "Validate compatibility before closing a request or order.",
      "Compare availability, lead time and freight clearly.",
      "Negotiate payment terms for corporate or recurring purchases.",
    ],
    pillarsEyebrow: "E-commerce advantages",
    pillarsTitle: "A buying experience designed for maintenance, field teams and procurement.",
    pillarsDesc:
      "Companies in this segment sell availability, trust and speed. The homepage structure highlights these points with direct copy and visual space for decision making.",
    categoriesEyebrow: "Quote without rework",
    categoriesTitle: "Send technical context and receive a more accurate proposal.",
    categoriesDesc:
      "When the request includes code, model, photos and delivery city, the team reduces back-and-forth and speeds up lead time, freight and part validation.",
    categoriesCta: "Send details",
    b2bTitle: "Recurring purchasing for fleets, jobsites, workshops or resellers.",
    b2bDesc:
      "Centralize demand, send item lists and negotiate terms for continuous supply with commercial support.",
    b2bCta: "Talk to a consultant",
    catalogCta: "Open catalog",
    flowEyebrow: "Buying flow",
    flowTitle: "From search to delivery, every step must be objective.",
    flowDesc:
      "The journey prioritizes what professional buyers need: find the part, validate application, receive commercial terms and follow shipment.",
    flowNote:
      "If you already have a code, machine model, part photo or purchase list, send it through the form to speed up the response.",
    closingTitle: "Stock, lead time, payment and warranty handled in one service flow.",
    closingDesc:
      "The final quote can consider availability, compatible replacements, freight, payment terms and technical guidance to reduce purchasing errors.",
  },
  es: {
    seoTitle: "Repuestos para equipos pesados con cotización asistida | Asia Peças & Máquinas",
    seoDescription:
      "Experiencia e-commerce B2B para repuestos de línea amarilla y equipos pesados. Catálogo por categoría, cotización asistida, envío nacional, pago facilitado y soporte técnico.",
    metrics: [
      {
        icon: Truck,
        title: "Entrega rápida en todo Brasil",
        desc: "Despacho nacional con apoyo comercial para alinear plazo, flete y prioridad cuando la máquina no puede parar.",
        cta: "Consultar plazo",
        href: "/#contato",
      },
      {
        icon: Building2,
        title: "Condiciones especiales para reventas",
        desc: "Atención preparada para recurrencia, volumen y negociación B2B con margen, previsibilidad y continuidad de compra.",
        cta: "Negociar condición",
        href: "/#contato",
      },
      {
        icon: CreditCard,
        title: "Pago facilitado",
        desc: "Condiciones comerciales bajo análisis para empresas, flotas, talleres y compras de reposición con mayor volumen.",
        cta: "Ver opciones",
        href: "/#contato",
      },
      {
        icon: ShieldCheck,
        title: "Piezas nuevas con garantía",
        desc: "Ítems nuevos, con procedencia y soporte para validar aplicación antes de la compra, reduciendo errores y retrabajo.",
        cta: "Cotizar con garantía",
        href: "/#contato",
      },
    ],
    commerceEyebrow: "Compra técnica, sin fricción",
    commerceTitle: "La pieza correcta, plazo claro y negociación asistida para que la operación no pare.",
    commerceDesc:
      "La página inicial funciona como una vitrina comercial para quien compra repuestos de equipos pesados con urgencia, recurrencia y necesidad de compatibilidad. El flujo lleva del beneficio al catálogo, y del catálogo a una cotización con contexto técnico.",
    commerceNote:
      "Catálogo para consulta rápida, equipo comercial para validar aplicación, flete, plazo, garantía y mejor condición de pago.",
    promiseTitle: "Lo que la compra debe resolver",
    promiseItems: [
      "Encontrar la categoría correcta sin navegación compleja.",
      "Validar compatibilidad antes de cerrar pedido o presupuesto.",
      "Comparar disponibilidad, plazo y flete con claridad.",
      "Negociar pago para compra corporativa o recurrente.",
    ],
    pillarsEyebrow: "Diferenciales del e-commerce",
    pillarsTitle: "Una experiencia de compra hecha para mantenimiento, campo y suministros.",
    pillarsDesc:
      "Empresas del segmento venden disponibilidad, confianza y velocidad. La estructura destaca esos puntos con lenguaje directo y espacio visual para decisión.",
    categoriesEyebrow: "Cotización sin retrabajo",
    categoriesTitle: "Envíe contexto técnico y reciba una propuesta más precisa.",
    categoriesDesc:
      "Cuando el pedido llega con código, modelo, fotos y ciudad de entrega, el equipo reduce ida y vuelta y acelera plazo, flete y validación de la pieza.",
    categoriesCta: "Enviar datos",
    b2bTitle: "Compra recurrente para flota, obra, taller o reventa.",
    b2bDesc:
      "Centralice demandas, envíe listas de ítems y negocie condiciones para abastecimiento continuo con soporte comercial.",
    b2bCta: "Hablar con consultor",
    catalogCta: "Abrir catálogo",
    flowEyebrow: "Flujo de compra",
    flowTitle: "De la búsqueda a la entrega, cada etapa debe ser objetiva.",
    flowDesc:
      "El recorrido prioriza lo que el comprador profesional necesita: encontrar la pieza, validar aplicación, recibir condición comercial y seguir el envío.",
    flowNote:
      "Si ya tiene código, modelo de máquina, foto de la pieza o lista de compra, envíe todo en el formulario para acelerar la respuesta.",
    closingTitle: "Stock, plazo, pago y garantía tratados en la misma atención.",
    closingDesc:
      "La cotización final puede considerar disponibilidad, sustituciones compatibles, flete, condición de pago y orientación técnica para reducir errores de compra.",
  },
};

const PILLARS: Record<Lang, IconCard[]> = {
  pt: [
    {
      icon: Warehouse,
      title: "Estoque mais completo para linha amarela",
      desc: "Peças de giro, filtros, conjuntos hidráulicos, motor, pneus, material elétrico e itens sob consulta para manutenção pesada.",
    },
    {
      icon: Truck,
      title: "Entrega rápida com rota nacional",
      desc: "Atendimento a partir de Belo Horizonte com composição de frete e prazo para obras, oficinas, frotas e operações remotas.",
    },
    {
      icon: CreditCard,
      title: "Pagamento facilitado para empresa",
      desc: "Condição comercial sob análise para compras recorrentes, listas de reposição e demandas com maior volume.",
    },
    {
      icon: ShieldCheck,
      title: "Garantia e suporte antes da compra",
      desc: "Validação de compatibilidade e orientação técnica para reduzir erro de pedido, retrabalho e máquina parada.",
    },
  ],
  en: [
    {
      icon: Warehouse,
      title: "Broad stock for yellow line equipment",
      desc: "Fast-moving parts, filters, hydraulic assemblies, engine, tires, electrical items and on-demand heavy maintenance parts.",
    },
    {
      icon: Truck,
      title: "Fast delivery with nationwide routing",
      desc: "Service from Belo Horizonte with freight and lead-time composition for jobsites, workshops, fleets and remote operations.",
    },
    {
      icon: CreditCard,
      title: "Flexible payment for companies",
      desc: "Commercial terms under analysis for recurring purchases, replenishment lists and higher-volume demands.",
    },
    {
      icon: ShieldCheck,
      title: "Warranty and support before purchase",
      desc: "Compatibility validation and technical guidance to reduce wrong orders, rework and machine downtime.",
    },
  ],
  es: [
    {
      icon: Warehouse,
      title: "Stock más completo para línea amarilla",
      desc: "Piezas de giro, filtros, conjuntos hidráulicos, motor, neumáticos, material eléctrico e ítems bajo consulta.",
    },
    {
      icon: Truck,
      title: "Entrega rápida con ruta nacional",
      desc: "Atención desde Belo Horizonte con composición de flete y plazo para obras, talleres, flotas y operaciones remotas.",
    },
    {
      icon: CreditCard,
      title: "Pago facilitado para empresa",
      desc: "Condición comercial bajo análisis para compras recurrentes, listas de reposición y demandas de mayor volumen.",
    },
    {
      icon: ShieldCheck,
      title: "Garantía y soporte antes de comprar",
      desc: "Validación de compatibilidad y orientación técnica para reducir error de pedido, retrabajo y máquina parada.",
    },
  ],
};

const QUOTE_REQUIREMENTS: Record<Lang, IconCard[]> = {
  pt: [
    {
      icon: ClipboardCheck,
      title: "Código, OEM ou foto da peça",
      desc: "Se tiver etiqueta, número de material ou foto da peça instalada, envie junto para acelerar a identificação.",
    },
    {
      icon: SearchCheck,
      title: "Modelo da máquina e aplicação",
      desc: "Informe modelo, série quando possível, frente de trabalho e sintomas da falha para validar compatibilidade.",
    },
    {
      icon: Truck,
      title: "Cidade de entrega e urgência",
      desc: "Com destino e prazo desejado, o time já compõe frete, disponibilidade e alternativas para reduzir parada.",
    },
  ],
  en: [
    {
      icon: ClipboardCheck,
      title: "Part code, OEM or photo",
      desc: "If you have a tag, material number or installed-part photo, send it to speed up identification.",
    },
    {
      icon: SearchCheck,
      title: "Machine model and application",
      desc: "Share the model, serial data when available, job context and failure symptoms to validate compatibility.",
    },
    {
      icon: Truck,
      title: "Delivery city and urgency",
      desc: "With destination and desired timing, the team can align freight, availability and alternatives to reduce downtime.",
    },
  ],
  es: [
    {
      icon: ClipboardCheck,
      title: "Código, OEM o foto de la pieza",
      desc: "Si tiene etiqueta, número de material o foto de la pieza instalada, envíelo para acelerar la identificación.",
    },
    {
      icon: SearchCheck,
      title: "Modelo de máquina y aplicación",
      desc: "Informe modelo, serie cuando sea posible, frente de trabajo y síntomas de falla para validar compatibilidad.",
    },
    {
      icon: Truck,
      title: "Ciudad de entrega y urgencia",
      desc: "Con destino y plazo deseado, el equipo compone flete, disponibilidad y alternativas para reducir parada.",
    },
  ],
};

const QUOTE_ASSURANCE: Record<Lang, string[]> = {
  pt: [
    "Validação antes da proposta",
    "Alternativas compatíveis quando houver",
    "Condição alinhada ao volume",
    "Garantia e procedência no atendimento",
  ],
  en: [
    "Validation before proposal",
    "Compatible alternatives when available",
    "Terms aligned with volume",
    "Warranty and origin in the same flow",
  ],
  es: [
    "Validación antes de la propuesta",
    "Alternativas compatibles cuando existan",
    "Condición alineada al volumen",
    "Garantía y procedencia en la atención",
  ],
};

const BUYING_FLOW: Record<Lang, IconCard[]> = {
  pt: [
    {
      icon: SearchCheck,
      title: "Consulte no catálogo",
      desc: "Entre pela categoria certa e use a busca para localizar família, aplicação ou peça específica.",
    },
    {
      icon: ClipboardCheck,
      title: "Envie o contexto",
      desc: "Inclua código, modelo da máquina, quantidade, cidade de entrega, urgência e fotos se necessário.",
    },
    {
      icon: BadgeCheck,
      title: "Valide a aplicação",
      desc: "O atendimento confere compatibilidade, substituições possíveis e disponibilidade antes da cotação final.",
    },
    {
      icon: Truck,
      title: "Feche prazo e frete",
      desc: "A proposta considera envio, condição comercial, pagamento e acompanhamento pós-venda.",
    },
  ],
  en: [
    {
      icon: SearchCheck,
      title: "Browse the catalog",
      desc: "Enter through the right category and use search to locate family, application or specific part.",
    },
    {
      icon: ClipboardCheck,
      title: "Send the context",
      desc: "Include code, machine model, quantity, delivery city, urgency and photos when needed.",
    },
    {
      icon: BadgeCheck,
      title: "Validate application",
      desc: "The team checks compatibility, possible replacements and availability before the final quote.",
    },
    {
      icon: Truck,
      title: "Confirm freight and lead time",
      desc: "The proposal considers shipping, commercial terms, payment and after-sales follow-up.",
    },
  ],
  es: [
    {
      icon: SearchCheck,
      title: "Consulte el catálogo",
      desc: "Entre por la categoría correcta y use la búsqueda para localizar familia, aplicación o pieza específica.",
    },
    {
      icon: ClipboardCheck,
      title: "Envíe el contexto",
      desc: "Incluya código, modelo de máquina, cantidad, ciudad de entrega, urgencia y fotos si es necesario.",
    },
    {
      icon: BadgeCheck,
      title: "Valide la aplicación",
      desc: "El equipo confirma compatibilidad, sustituciones posibles y disponibilidad antes de la cotización final.",
    },
    {
      icon: Truck,
      title: "Cierre plazo y flete",
      desc: "La propuesta considera envío, condición comercial, pago y seguimiento posventa.",
    },
  ],
};

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("pt");
  const [b2bOpen, setB2bOpen] = useState(false);
  const copy = PAGE_COPY[lang];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Sonner />

      <PublicHeader lang={lang} onLangChange={setLang} onOpenB2B={() => setB2bOpen(true)} whatsappUrl={PUBLIC_WHATSAPP_URL} />

      <SEO
        title={copy.seoTitle}
        description={copy.seoDescription}
        canonical="/"
        lang={lang}
        jsonLd={organizationLd()}
      />

      <HeroCarousel
        lang={lang}
        fallback={
          <QuoteHero
            onCategoryClick={() => undefined}
            activeCategory={null}
            onBrowseCatalog={() => {
              window.location.assign("/cotacao");
            }}
            onOpenB2B={() => setB2bOpen(true)}
            onPartCategoryClick={() => undefined}
            activePartCategory={null}
            lang={lang}
          />
        }
      />

      <section className="border-b border-white/10 bg-[#07090b] public-section-tight">
        <div className="public-shell-wide">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {copy.metrics.map((item) => (
              <article
                key={item.title}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(145deg,rgba(20,24,27,0.96),rgba(5,7,9,0.98))] p-5 text-white shadow-[0_24px_60px_-42px_rgba(0,0,0,0.95)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/55 hover:shadow-[0_30px_80px_-46px_rgba(245,180,0,0.55)]"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-primary/80" />
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/12 blur-2xl transition-opacity group-hover:opacity-90" />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary text-primary-foreground shadow-[0_12px_30px_-16px_rgba(245,180,0,0.95)]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-['Space_Grotesk'] text-lg font-bold leading-tight text-white">{item.title}</h3>
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-white/68">{item.desc}</p>
                  <a
                    href={item.href}
                    className="mt-5 inline-flex w-fit items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground transition-transform hover:translate-x-0.5 hover:brightness-105"
                  >
                    {item.cta}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="empresa" className="border-b bg-card public-section">
        <div className="public-shell-wide grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{copy.commerceEyebrow}</p>
            <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              {copy.commerceTitle}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">{copy.commerceDesc}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/cotacao"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {copy.catalogCta}
              </Link>
              <button
                onClick={() => setB2bOpen(true)}
                className="inline-flex items-center justify-center rounded-lg border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {copy.b2bCta}
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-5 shadow-sm md:p-6">
            <div className="flex items-center gap-3 border-b pb-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_8px_22px_-12px_rgba(245,180,0,0.5)]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-['Space_Grotesk'] text-xl font-bold text-foreground">{copy.promiseTitle}</p>
                <p className="text-sm text-muted-foreground">{copy.commerceNote}</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {copy.promiseItems.map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <p className="text-sm leading-relaxed text-foreground/85">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-background public-section">
        <div className="public-shell-wide">
          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{copy.pillarsEyebrow}</p>
              <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {copy.pillarsTitle}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{copy.pillarsDesc}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {PILLARS[lang].map((item) => (
                <article key={item.title} className="rounded-lg border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_8px_22px_-12px_rgba(245,180,0,0.5)]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="atuacao" className="border-b bg-card public-section">
        <div className="public-shell-wide space-y-6">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="rounded-2xl border bg-background p-6 shadow-sm md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{copy.categoriesEyebrow}</p>
              <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {copy.categoriesTitle}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{copy.categoriesDesc}</p>
              <a
                href="#contato"
                className="mt-7 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                {copy.categoriesCta}
              </a>
            </div>

            <div className="grid gap-4">
              {QUOTE_REQUIREMENTS[lang].map((item) => (
                <article
                  key={item.title}
                  className="group grid gap-4 rounded-2xl border bg-background p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md sm:grid-cols-[auto_1fr]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_8px_22px_-12px_rgba(245,180,0,0.5)]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {QUOTE_ASSURANCE[lang].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border bg-background p-4 text-sm font-semibold text-foreground shadow-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b bg-foreground text-background public-section-tight">
        <div className="public-shell flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Building2 className="h-4 w-4" />
              B2B
            </div>
            <h2 className="font-['Space_Grotesk'] text-2xl font-bold md:text-3xl">{copy.b2bTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-background/70 md:text-base">{copy.b2bDesc}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <button
              onClick={() => setB2bOpen(true)}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {copy.b2bCta}
            </button>
            <Link
              to="/cotacao"
              className="inline-flex items-center justify-center rounded-lg border border-background/20 px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-background/10"
            >
              {copy.catalogCta}
            </Link>
          </div>
        </div>
      </section>

      <section id="atendimento" className="border-b bg-background public-section">
        <div className="public-shell-wide">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{copy.flowEyebrow}</p>
            <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {copy.flowTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{copy.flowDesc}</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {BUYING_FLOW[lang].map((step, index) => (
              <article key={step.title} className="relative rounded-lg border bg-card p-5 shadow-sm">
                <span className="absolute right-5 top-5 font-['Space_Grotesk'] text-3xl font-bold text-muted-foreground/20">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_8px_22px_-12px_rgba(245,180,0,0.5)]">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-lg border bg-card p-5 text-center shadow-sm">
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground">{copy.flowNote}</p>
          </div>
        </div>
      </section>

      <section className="border-b bg-card public-section-tight">
        <div className="public-shell grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_8px_22px_-12px_rgba(245,180,0,0.5)]">
              <Headset className="h-5 w-5" />
            </div>
            <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-foreground md:text-3xl">{copy.closingTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{copy.closingDesc}</p>
          </div>
          <a
            href="#contato"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {lang === "en" ? "Request a quote" : lang === "es" ? "Solicitar cotización" : "Solicitar cotação"}
          </a>
        </div>
      </section>

      <section id="contato" className="scroll-mt-28">
        <QuoteRequestFormSection lang={lang} />
      </section>

      <div id="faq">
        <QuoteFAQ lang={lang} />
      </div>
      <PartnersStrip lang={lang} />
      <QuoteFooter lang={lang} />

      <B2BLeadDialog lang={lang} open={b2bOpen} onOpenChange={setB2bOpen} />
      <ConsentBanner lang={lang} />

      <WhatsAppFloatingButton href={PUBLIC_WHATSAPP_URL} />
    </div>
  );
}
