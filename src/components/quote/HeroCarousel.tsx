import heroBackgroundDesktop from "@/assets/hero2.png";
import heroBackgroundMobile from "@/assets/HERO-MOBILE.png";
import { type Lang } from "./translations";

const HERO_CATEGORIES = [
  { label: "Pneus", href: "/cotacao?partCategory=Pneus#catalogo", icon: "/icones/ICONE-PNEUS.svg" },
  { label: "Motores", href: "/cotacao?partCategory=Motor%20e%20Componentes#catalogo", icon: "/icones/ICONE-MOTORES.svg" },
  { label: "Filtros", href: "/cotacao?partCategory=Filtros#catalogo", icon: "/icones/Icone-Filtros.svg" },
  { label: "Hidráulico", href: "/cotacao?partCategory=Sistema%20Hidráulico#catalogo", icon: "/icones/icone-hidraulico.svg" },
  { label: "Elétrico", href: "/cotacao?partCategory=Sistema%20Elétrico#catalogo", icon: "/icones/ICONE-EL%C3%89TRICO.svg" },
  { label: "Outros", href: "/cotacao#catalogo", icon: "/icones/icone-outros.svg" },
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
