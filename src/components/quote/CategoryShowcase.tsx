import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SUBCATEGORY_ICONS } from "@/lib/subcategory-rules";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Truck, MessageCircle, FileCheck } from "lucide-react";
import { type Lang } from "./translations";

interface Props {
  lang: Lang;
  onSubcategoryClick: (sub: string) => void;
}

const TRUST = {
  pt: [
    { icon: FileCheck, label: "Nota fiscal emitida" },
    { icon: Truck, label: "Entrega nacional" },
    { icon: MessageCircle, label: "Cotação via WhatsApp" },
    { icon: ShieldCheck, label: "Garantia 3 meses" },
  ],
  en: [
    { icon: FileCheck, label: "Invoice issued" },
    { icon: Truck, label: "Nationwide delivery" },
    { icon: MessageCircle, label: "Quote via WhatsApp" },
    { icon: ShieldCheck, label: "3-month warranty" },
  ],
  es: [
    { icon: FileCheck, label: "Factura emitida" },
    { icon: Truck, label: "Envío nacional" },
    { icon: MessageCircle, label: "Cotización vía WhatsApp" },
    { icon: ShieldCheck, label: "Garantía 3 meses" },
  ],
};

export default function CategoryShowcase({ lang, onSubcategoryClick }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["category-showcase"],
    queryFn: async () => {
      const { data: parts } = await supabase
        .from("parts")
        .select("subcategory, manufacturer")
        .gt("stock", 0)
        .not("subcategory", "is", null)
        .limit(10000);

      const subCount = new Map<string, number>();
      const mfrCount = new Map<string, number>();
      for (const p of parts ?? []) {
        if (p.subcategory) subCount.set(p.subcategory, (subCount.get(p.subcategory) ?? 0) + 1);
        if (p.manufacturer) mfrCount.set(p.manufacturer, (mfrCount.get(p.manufacturer) ?? 0) + 1);
      }
      const topSubs = Array.from(subCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([sub, cnt]) => ({ sub, cnt }));
      const topMfrs = Array.from(mfrCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([m]) => m);
      return { topSubs, topMfrs };
    },
    staleTime: 5 * 60 * 1000,
  });

  const heading = lang === "en" ? "Parts you'll find here" : lang === "es" ? "Repuestos que encuentras aquí" : "Peças que você encontra aqui";
  const partsLabel = lang === "en" ? "items" : lang === "es" ? "piezas" : "itens";
  const mfrHeading = lang === "en" ? "Compatible brands" : lang === "es" ? "Marcas compatibles" : "Marcas compatíveis";

  return (
    <section className="bg-background border-y">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Trust strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TRUST[lang].map((t) => (
            <div key={t.label} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                <t.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-foreground">{t.label}</span>
            </div>
          ))}
        </div>

        {/* Subcategory tiles */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-['Space_Grotesk'] text-foreground mb-4">
            {heading}
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {data?.topSubs.map(({ sub, cnt }) => (
                <button
                  key={sub}
                  onClick={() => onSubcategoryClick(sub)}
                  className="group relative bg-card hover:bg-primary hover:text-primary-foreground border rounded-xl p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="text-3xl mb-1.5">{SUBCATEGORY_ICONS[sub] ?? "📦"}</div>
                  <p className="text-sm font-semibold leading-tight line-clamp-2">{sub}</p>
                  <p className="text-[11px] opacity-70 mt-1">{cnt.toLocaleString("pt-BR")} {partsLabel}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Compatible manufacturers strip */}
        {data && data.topMfrs.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{mfrHeading}</p>
            <div className="flex flex-wrap gap-2">
              {data.topMfrs.map((m) => (
                <div key={m} className="px-3 py-1.5 bg-muted/60 rounded-full text-xs font-semibold text-secondary-foreground/80 border">
                  {m}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
