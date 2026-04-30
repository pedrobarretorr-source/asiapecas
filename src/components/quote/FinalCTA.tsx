import { ArrowRight, Building2 } from "lucide-react";
import { type Lang, tr } from "./translations";
import { useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";

interface FinalCTAProps {
  lang: Lang;
  onBrowseCatalog: () => void;
  onOpenB2B: () => void;
}

export default function FinalCTA({ lang, onBrowseCatalog, onOpenB2B }: FinalCTAProps) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <section className="relative bg-black text-white overflow-hidden ap-grain">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[820px] rounded-full bg-[hsl(var(--primary)/0.18)] blur-[120px]" />
      <div className="relative h-1 ap-stripe opacity-80" />

      <div
        ref={ref}
        className={`relative max-w-5xl mx-auto px-6 py-24 md:py-32 text-center ap-reveal ${visible ? "is-visible" : ""}`}
      >
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(var(--primary))]">
          <span className="h-px w-8 bg-[hsl(var(--primary))]" />
          {tr("final.eyebrow", lang)}
          <span className="h-px w-8 bg-[hsl(var(--primary))]" />
        </span>
        <h2 className="mt-6 font-['Space_Grotesk'] font-bold tracking-tight text-4xl md:text-6xl lg:text-[4.5rem] leading-[1.02]">
          {tr("final.title", lang)}
        </h2>
        <p className="mt-6 text-base md:text-lg text-white/65 max-w-2xl mx-auto leading-relaxed">
          {tr("final.subtitle", lang)}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onBrowseCatalog}
            className="ap-cta inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-black px-7 py-4 text-sm md:text-base font-semibold hover:brightness-105 transition"
          >
            {tr("final.primary", lang)}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenB2B}
            className="ap-cta inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-4 text-sm md:text-base font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <Building2 className="h-4 w-4" />
            {tr("final.secondary", lang)}
          </button>
        </div>
      </div>
      <div className="relative h-1 ap-stripe opacity-80" />
    </section>
  );
}
