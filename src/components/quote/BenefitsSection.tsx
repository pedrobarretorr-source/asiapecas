import { Clock3, Headset, PackageCheck, ShieldCheck } from "lucide-react";
import { type Lang, tr } from "./translations";
import { useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";

interface BenefitsSectionProps {
  lang: Lang;
}

export default function BenefitsSection({ lang }: BenefitsSectionProps) {
  const header = useRevealOnScroll<HTMLDivElement>();

  const benefits = [
    { Icon: PackageCheck, title: tr("why.b1.title", lang), desc: tr("why.b1.desc", lang) },
    { Icon: Clock3, title: tr("why.b2.title", lang), desc: tr("why.b2.desc", lang) },
    { Icon: ShieldCheck, title: tr("why.b3.title", lang), desc: tr("why.b3.desc", lang) },
    { Icon: Headset, title: tr("why.b4.title", lang), desc: tr("why.b4.desc", lang) },
  ];

  return (
    <section id="vantagens" className="relative bg-background py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={header.ref}
          className={`max-w-3xl ap-reveal ${header.visible ? "is-visible" : ""}`}
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--primary))]">
            <span className="h-px w-8 bg-[hsl(var(--primary))]" />
            {tr("why.eyebrow", lang)}
          </span>
          <h2 className="mt-5 font-['Space_Grotesk'] font-bold tracking-tight text-3xl md:text-5xl leading-[1.05] text-foreground">
            {tr("why.title", lang)}
          </h2>
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            {tr("why.subtitle", lang)}
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map((b, i) => {
            const Card = BenefitCard;
            return <Card key={b.title} index={i} Icon={b.Icon} title={b.title} desc={b.desc} />;
          })}
        </div>
      </div>
    </section>
  );
}

function BenefitCard({
  index,
  Icon,
  title,
  desc,
}: {
  index: number;
  Icon: typeof ShieldCheck;
  title: string;
  desc: string;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const delayClass = `ap-reveal-delay-${Math.min(index + 1, 5)}`;
  return (
    <article
      ref={ref}
      className={`ap-card ap-reveal ${delayClass} ${visible ? "is-visible" : ""} p-6 group relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-[hsl(var(--primary)/0.08)] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="inline-flex h-12 w-12 rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] items-center justify-center">
        <Icon className="h-6 w-6" />
      </span>
      <div className="mt-5 flex items-baseline gap-3">
        <span className="font-['Space_Grotesk'] text-sm font-semibold text-[hsl(var(--primary))]">
          0{index + 1}
        </span>
        <h3 className="font-semibold text-foreground text-lg leading-snug">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </article>
  );
}
