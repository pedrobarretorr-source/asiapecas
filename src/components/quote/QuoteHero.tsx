import { type Lang } from "./translations";

interface QuoteHeroProps {
  onBrowseCatalog: () => void;
  onOpenB2B: () => void;
  onCategoryClick?: (key: string) => void;
  activeCategory?: string | null;
  onPartCategoryClick?: (key: string) => void;
  activePartCategory?: string | null;
  lang: Lang;
}

export default function QuoteHero({
  onBrowseCatalog,
  onOpenB2B: _onOpenB2B,
  onCategoryClick: _onCategoryClick,
  activeCategory: _activeCategory,
  onPartCategoryClick: _onPartCategoryClick,
  activePartCategory: _activePartCategory,
  lang: _lang,
}: QuoteHeroProps) {
  return (
    <section className="relative h-full overflow-visible text-white ap-grain">
      <div className="pointer-events-none absolute inset-0 select-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 520px at 18% 28%, rgba(255,255,255,0.16) 0%, rgba(11,25,32,0.18) 34%, rgba(11,25,32,0.30) 68%, rgba(11,25,32,0.42) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.03)_26%,rgba(7,17,22,0.06)_52%,rgba(7,17,22,0.16)_100%)]" />
        <div className="absolute -top-32 right-0 h-[420px] w-[420px] rounded-full bg-white/8 blur-[140px]" />
        <div className="absolute top-1/2 -left-24 h-[320px] w-[320px] rounded-full bg-[hsl(var(--primary)/0.08)] blur-[120px]" />
      </div>

      <div className="hero-stripe" />

      <div className="hero-content-shell pointer-events-none relative z-20 flex h-full max-w-5xl flex-col justify-start py-7 md:py-10 lg:py-12">
        <div className="hero-copy-zone pointer-events-auto max-w-md pt-1 md:pt-[1%] lg:pt-0">
          <div className="hero-copy-card max-w-md">
            <div className="inline-flex items-center rounded-full border border-primary/45 px-3 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-primary">
              Peças e máquinas
            </div>

            <div className="mt-4">
              <h1 className="font-['Space_Grotesk'] text-[1.95rem] font-bold leading-[1.02] text-white sm:text-4xl">
                Cotação comercial para revendas, frotas ou reposição.
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/72 md:text-[0.95rem]">
                Atendimento ágil para peças, componentes e equipamentos com suporte direto da equipe comercial.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
              <button
                type="button"
                onClick={onBrowseCatalog}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_16px_32px_-18px_rgba(245,180,0,0.9)] transition hover:brightness-105 sm:w-auto"
              >
                Solicitar Cotação Revenda
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-stripe" />
    </section>
  );
}
