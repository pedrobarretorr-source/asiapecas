import { ClipboardList, Search, Send } from "lucide-react";
import { type Lang, tr } from "./translations";
import { useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";

interface HowItWorksProps {
  lang: Lang;
}

export default function HowItWorks({ lang }: HowItWorksProps) {
  const header = useRevealOnScroll<HTMLDivElement>();

  const steps = [
    { Icon: Search, title: tr("how.step1.title", lang), desc: tr("how.step1.desc", lang) },
    { Icon: ClipboardList, title: tr("how.step2.title", lang), desc: tr("how.step2.desc", lang) },
    { Icon: Send, title: tr("how.step3.title", lang), desc: tr("how.step3.desc", lang) },
  ];

  return (
    <section id="como-funciona" className="relative bg-background py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <div
          ref={header.ref}
          className={`max-w-3xl ap-reveal ${header.visible ? "is-visible" : ""}`}
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--primary))]">
            <span className="h-px w-8 bg-[hsl(var(--primary))]" />
            {tr("how.eyebrow", lang)}
          </span>
          <h2 className="mt-5 font-['Space_Grotesk'] font-bold tracking-tight text-3xl md:text-5xl leading-[1.05] text-foreground">
            {tr("how.title", lang)}
          </h2>
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            {tr("how.subtitle", lang)}
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-[42px] left-[10%] right-[10%] h-px">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-[hsl(var(--primary)/0.5)] to-transparent" />
          </div>

          <div className="grid gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <StepCard key={step.title} index={i} Icon={step.Icon} title={step.title} desc={step.desc} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  index,
  Icon,
  title,
  desc,
}: {
  index: number;
  Icon: typeof Search;
  title: string;
  desc: string;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const delayClass = `ap-reveal-delay-${index + 1}`;
  return (
    <div
      ref={ref}
      className={`relative text-center md:text-left ap-reveal ${delayClass} ${visible ? "is-visible" : ""}`}
    >
      <div className="relative mx-auto md:mx-0 inline-block">
        <span className="relative z-10 inline-flex h-[84px] w-[84px] items-center justify-center rounded-2xl bg-foreground text-background border-2 border-[hsl(var(--primary))]">
          <Icon className="h-8 w-8 text-[hsl(var(--primary))]" />
        </span>
        <span className="absolute -top-2 -right-2 z-20 h-8 w-8 rounded-full bg-[hsl(var(--primary))] text-black font-['Space_Grotesk'] font-bold text-sm flex items-center justify-center shadow-lg">
          {index + 1}
        </span>
      </div>
      <h3 className="mt-6 font-['Space_Grotesk'] font-bold text-xl text-foreground">{title}</h3>
      <p className="mt-3 text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-sm mx-auto md:mx-0">
        {desc}
      </p>
    </div>
  );
}
