import { Sparkles, MessageCircle } from "lucide-react";
import { useHasActivePromotions } from "@/hooks/use-active-promotions";
import { type Lang } from "./translations";

interface Props {
  lang: Lang;
  whatsapp?: string;
}

export default function PromoBanner({ lang, whatsapp = "5595974009289" }: Props) {
  const hasPromo = useHasActivePromotions();
  if (!hasPromo) return null;

  const msg =
    lang === "en"
      ? "Active promotions — talk to our team for special conditions"
      : lang === "es"
      ? "Promociones activas — hable con nuestro equipo para condiciones especiales"
      : "Promoções ativas — fale com nosso time para condições especiais";

  const cta = lang === "en" ? "Talk on WhatsApp" : lang === "es" ? "Hablar por WhatsApp" : "Falar no WhatsApp";

  const wppText = encodeURIComponent(
    lang === "en"
      ? "Hello, I'd like to know about active promotions."
      : lang === "es"
      ? "Hola, me gustaría conocer las promociones activas."
      : "Olá, gostaria de saber sobre as promoções ativas."
  );

  return (
    <div className="bg-primary text-primary-foreground border-b border-primary-foreground/10">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-center gap-3 text-sm">
        <span className="inline-flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4" />
          {msg}
        </span>
        <a
          href={`https://wa.me/${whatsapp}?text=${wppText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity px-3 py-1 rounded-full text-xs font-semibold"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {cta}
        </a>
      </div>
    </div>
  );
}
