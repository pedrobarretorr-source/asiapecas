import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircle } from "lucide-react";
import { type Lang } from "./translations";

const FAQ_COPY: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    specialist: string;
    items: { q: string; a: string }[];
  }
> = {
  pt: {
    title: "Dúvidas antes de cotar",
    subtitle: "Respostas diretas para quem compra peça de máquina pesada com urgência e precisa reduzir risco.",
    specialist: "Falar com especialista",
    items: [
      {
        q: "O catálogo já confirma estoque e preço final?",
        a: "O catálogo organiza a consulta por categoria. A confirmação de estoque, preço, prazo, frete e condição de pagamento acontece na cotação assistida.",
      },
      {
        q: "Posso enviar código, foto ou lista de peças?",
        a: "Sim. Código, modelo da máquina, foto da peça, quantidade e cidade de entrega ajudam o time comercial a validar compatibilidade e responder mais rápido.",
      },
      {
        q: "Vocês atendem empresas fora de Belo Horizonte?",
        a: "Sim. A operação parte de Belo Horizonte e atende demandas nacionais com composição de frete e prazo conforme disponibilidade e destino.",
      },
      {
        q: "Existe condição especial para compra recorrente?",
        a: "Compras B2B, frotas, oficinas, obras e revendas podem negociar condição comercial conforme volume, recorrência e forma de pagamento.",
      },
      {
        q: "A equipe valida compatibilidade da peça?",
        a: "A validação depende das informações enviadas. Quanto mais contexto técnico você fornecer, maior a precisão da cotação e menor o risco de erro.",
      },
      {
        q: "A garantia é tratada na cotação?",
        a: "Sim. A proposta pode considerar orientação de aplicação, política de garantia, disponibilidade e alternativas compatíveis quando houver necessidade.",
      },
    ],
  },
  en: {
    title: "Questions before quoting",
    subtitle: "Direct answers for buyers who need heavy equipment parts quickly and want to reduce purchasing risk.",
    specialist: "Talk to a specialist",
    items: [
      {
        q: "Does the catalog confirm stock and final price?",
        a: "The catalog organizes consultation by category. Stock, price, lead time, freight and payment terms are confirmed through assisted quoting.",
      },
      {
        q: "Can I send a code, photo or parts list?",
        a: "Yes. Code, machine model, part photo, quantity and delivery city help the commercial team validate compatibility and reply faster.",
      },
      {
        q: "Do you serve companies outside Belo Horizonte?",
        a: "Yes. Operations are based in Belo Horizonte and serve national demands with freight and lead-time composition according to availability and destination.",
      },
      {
        q: "Are there special terms for recurring purchases?",
        a: "B2B purchases, fleets, workshops, jobsites and resellers can negotiate commercial terms according to volume, recurrence and payment method.",
      },
      {
        q: "Does the team validate part compatibility?",
        a: "Validation depends on the information sent. The more technical context you provide, the more precise the quote and the lower the error risk.",
      },
      {
        q: "Is warranty handled in the quote?",
        a: "Yes. The proposal can consider application guidance, warranty policy, availability and compatible alternatives when needed.",
      },
    ],
  },
  es: {
    title: "Dudas antes de cotizar",
    subtitle: "Respuestas directas para quien compra repuestos de equipos pesados con urgencia y necesita reducir riesgo.",
    specialist: "Hablar con especialista",
    items: [
      {
        q: "¿El catálogo confirma stock y precio final?",
        a: "El catálogo organiza la consulta por categoría. La confirmación de stock, precio, plazo, flete y condición de pago ocurre en la cotización asistida.",
      },
      {
        q: "¿Puedo enviar código, foto o lista de piezas?",
        a: "Sí. Código, modelo de máquina, foto de la pieza, cantidad y ciudad de entrega ayudan al equipo comercial a validar compatibilidad y responder más rápido.",
      },
      {
        q: "¿Atienden empresas fuera de Belo Horizonte?",
        a: "Sí. La operación parte de Belo Horizonte y atiende demandas nacionales con composición de flete y plazo según disponibilidad y destino.",
      },
      {
        q: "¿Existe condición especial para compra recurrente?",
        a: "Compras B2B, flotas, talleres, obras y reventas pueden negociar condición comercial según volumen, recurrencia y forma de pago.",
      },
      {
        q: "¿El equipo valida compatibilidad de la pieza?",
        a: "La validación depende de la información enviada. Cuanto más contexto técnico aporte, mayor será la precisión de la cotización y menor el riesgo de error.",
      },
      {
        q: "¿La garantía se trata en la cotización?",
        a: "Sí. La propuesta puede considerar orientación de aplicación, política de garantía, disponibilidad y alternativas compatibles cuando sea necesario.",
      },
    ],
  },
};

export default function QuoteFAQ({ lang }: { lang: Lang }) {
  const copy = FAQ_COPY[lang];

  return (
    <section className="bg-muted/30 public-section">
      <div className="public-shell-narrow space-y-8">
        <div className="space-y-2 text-center">
          <h2 className="font-['Space_Grotesk'] text-3xl font-bold text-foreground">{copy.title}</h2>
          <p className="text-muted-foreground">{copy.subtitle}</p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {copy.items.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index + 1}`} className="rounded-lg border bg-card px-4">
              <AccordionTrigger className="text-left text-sm font-medium">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center">
          <a
            href="https://wa.me/5595974009289?text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20um%20especialista%20XCMG"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[hsl(142,71%,45%)] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" />
            {copy.specialist}
          </a>
        </div>
      </div>
    </section>
  );
}
