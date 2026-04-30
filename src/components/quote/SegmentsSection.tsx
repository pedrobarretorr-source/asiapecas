import { ArrowUpRight, Container, Drill, Pickaxe, Truck, Wrench } from "lucide-react";
import { type Lang, tr } from "./translations";
import { useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";

interface SegmentsSectionProps {
  lang: Lang;
  onBrowseCatalog: () => void;
}

export default function SegmentsSection({ lang, onBrowseCatalog }: SegmentsSectionProps) {
  const header = useRevealOnScroll<HTMLDivElement>();

  const segments = [
    { Icon: Pickaxe, title: tr("seg.mining.title", lang), desc: tr("seg.mining.desc", lang), badge: "01" },
    { Icon: Wrench, title: tr("seg.yellow.title", lang), desc: tr("seg.yellow.desc", lang), badge: "02" },
    { Icon: Drill, title: tr("seg.drilling.title", lang), desc: tr("seg.drilling.desc", lang), badge: "03" },
    { Icon: Container, title: tr("seg.lifting.title", lang), desc: tr("seg.lifting.desc", lang), badge: "04" },
    { Icon: Truck, title: tr("seg.truck.title", lang), desc: tr("seg.truck.desc", lang), badge: "05" },
  ];

  return (
    <section id="segmentos" className="relative bg-[#0A0A0A] text-white py-20 md:py-28 ap-grain">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 0.18) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.18) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6">
        <div
          ref={header.ref}
          className={`flex flex-col md:flex-row md:items-end md:justify-between gap-6 ap-reveal ${header.visible ? "is-visible" : ""}`}
        >
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--primary))]">
              <span className="h-px w-8 bg-[hsl(var(--primary))]" />
              {tr("seg.eyebrow", lang)}
            </span>
            <h2 className="mt-5 font-['Space_Grotesk'] font-bold tracking-tight text-3xl md:text-5xl leading-[1.05]">
              {tr("seg.title", lang)}
            </h2>
          </div>
          <button
            onClick={onBrowseCatalog}
            className="ap-cta self-start inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            {lang === "en" ? "See all parts" : lang === "es" ? "Ver todo el catálogo" : "Ver catálogo completo"}
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((seg, i) => (
            <SegmentCard key={seg.title} index={i} {...seg} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SegmentCard({
  index,
  Icon,
  title,
  desc,
  badge,
}: {
  index: number;
  Icon: typeof Pickaxe;
  title: string;
  desc: string;
  badge: string;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const delayClass = `ap-reveal-delay-${Math.min(index + 1, 5)}`;
  return (
    <article
      ref={ref}
      className={`ap-card-dark ap-reveal ${delayClass} ${visible ? "is-visible" : ""} p-7 relative overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-[hsl(var(--primary)/0.18)] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-center justify-between">
        <span className="inline-flex h-12 w-12 rounded-xl bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))] items-center justify-center">
          <Icon className="h-6 w-6" />
        </span>
        <span className="font-['Space_Grotesk'] text-xs font-semibold tracking-[0.2em] text-white/30">
          {badge}
        </span>
      </div>
      <h3 className="mt-6 font-['Space_Grotesk'] font-bold text-xl text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/60 leading-relaxed">{desc}</p>
      <div className="mt-5 h-px w-full bg-gradient-to-r from-[hsl(var(--primary)/0.4)] via-white/10 to-transparent" />
    </article>
  );
}
