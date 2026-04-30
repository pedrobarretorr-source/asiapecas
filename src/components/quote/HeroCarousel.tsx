import heroBackgroundDesktop from "@/assets/hero2.png";
import heroBackgroundMobile from "@/assets/HERO-MOBILE.png";
import iconPneus from "@/assets/icones/ICONE-PNEUS.svg";
import iconMotores from "@/assets/icones/ICONE-MOTORES.svg";
import iconFiltros from "@/assets/icones/Icone-Filtros.svg";
import iconHidraulico from "@/assets/icones/icone-hidraulico.svg";
import iconEletrico from "@/assets/icones/ICONE-ELÉTRICO.svg";
import iconOutros from "@/assets/icones/icone-outros.svg";
import { type Lang } from "./translations";

const HERO_CATEGORIES = [
  { label: "Pneus", href: "/cotacao?partCategory=Pneus#catalogo", icon: iconPneus },
  { label: "Motores", href: "/cotacao?partCategory=Motor%20e%20Componentes#catalogo", icon: iconMotores },
  { label: "Filtros", href: "/cotacao?partCategory=Filtros#catalogo", icon: iconFiltros },
  { label: "Hidráulico", href: "/cotacao?partCategory=Sistema%20Hidráulico#catalogo", icon: iconHidraulico },
  { label: "Elétrico", href: "/cotacao?partCategory=Sistema%20Elétrico#catalogo", icon: iconEletrico },
  { label: "Outros", href: "/cotacao#catalogo", icon: iconOutros },
];

export default function HeroCarousel({ fallback }: { lang: Lang; fallback: React.ReactNode }) {
  return (
    <section className="relative overflow-visible border-b bg-[#09151b] text-secondary-foreground">
      <div className="hero-stage relative isolate">
        <div className="absolute inset-0">
          <picture>
            <source media="(min-width: 768px)" srcSet={heroBackgroundDesktop} />
            <img
              src={heroBackgroundMobile}
              alt=""
              className="hero-stage-image h-full w-full object-cover object-center"
              loading="eager"
              decoding="async"
            />
          </picture>
          <div className="hero-stage-overlay absolute inset-0" />
          <div className="hero-stage-sheen absolute inset-0" />
        </div>

        <div className="relative h-full">{fallback}</div>

        <div className="hero-categories-wrap absolute z-30">
          <div className="hero-categories">
            {HERO_CATEGORIES.map((category) => (
              <a
                key={category.href}
                href={category.href}
                className="hero-category-card"
                aria-label={category.label}
                title={category.label}
              >
                <span className="hero-category-icon-shell" aria-hidden="true">
                  <img
                    src={category.icon}
                    alt={category.label}
                    className="hero-category-icon"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="hero-category-label">{category.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
