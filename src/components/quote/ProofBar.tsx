import { Building2, Clock3, Globe2, PackageCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Lang, tr } from "./translations";
import { useCountUp, useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";

interface ProofBarProps {
  lang: Lang;
}

function Counter({ target, suffix, prefix }: { target: number; suffix?: string; prefix?: string }) {
  const { ref, value } = useCountUp(target);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

export default function ProofBar({ lang }: ProofBarProps) {
  const { data: stats } = useQuery({
    queryKey: ["proof-bar-total"],
    queryFn: async () => {
      const res = await supabase.from("parts").select("id", { count: "exact", head: true });
      return { total: res.count || 0 };
    },
    staleTime: 60_000,
  });

  const partsTotal = stats?.total ?? 0;
  const partsDisplay = partsTotal > 0 ? partsTotal : 1200;

  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  const items = [
    {
      Icon: Clock3,
      value: <span>24h</span>,
      label: tr("proof.response", lang),
    },
    {
      Icon: Globe2,
      value: <Counter target={3} />,
      label: tr("proof.countries", lang),
    },
    {
      Icon: PackageCheck,
      value: (
        <>
          <Counter target={partsDisplay} />+
        </>
      ),
      label: tr("proof.parts", lang),
    },
    {
      Icon: Building2,
      value: <span>B2B</span>,
      label: tr("proof.b2b", lang),
    },
  ];

  return (
    <section className="relative bg-black text-white border-y border-white/10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary)/0.6)] to-transparent" />
      <div
        ref={ref}
        className={`max-w-7xl mx-auto px-6 py-10 md:py-12 grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10 ap-reveal ${visible ? "is-visible" : ""}`}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-4 md:border-r md:border-white/10 md:last:border-r-0 md:pr-6 last:pr-0"
          >
            <span className="h-10 w-10 rounded-xl bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
              <item.Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-['Space_Grotesk'] text-3xl md:text-4xl font-bold leading-none text-[hsl(var(--primary))]">
                {item.value}
              </p>
              <p className="mt-2 text-xs md:text-sm text-white/65 leading-snug">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
