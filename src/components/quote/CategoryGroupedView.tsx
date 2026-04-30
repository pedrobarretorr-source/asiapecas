import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";
import { SUBCATEGORY_ICONS } from "@/lib/subcategory-rules";
import QuotePartCard from "./QuotePartCard";
import { type Lang, tr } from "./translations";

interface Props {
  lang: Lang;
  cartMaterials: Set<string>;
  onAddToCart: (part: any) => void;
  onViewDetail: (part: any) => void;
  onSelectSubcategory: (sub: string) => void;
  onSelectAttribute: (sub: string, attrKey: string, attrValue: string) => void;
}

type GroupRow = {
  subcategory: string;
  count: number;
  total_stock: number;
  attributes: Record<string, Record<string, number>>;
  preview: any[];
};

export default function CategoryGroupedView({
  lang,
  cartMaterials,
  onAddToCart,
  onViewDetail,
  onSelectSubcategory,
  onSelectAttribute,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["category-grouped-view"],
    queryFn: async () => {
      // Pull aggregate of all parts with subcategory & stock
      const { data: agg } = await supabase
        .from("parts")
        .select("id, material, description, machine_model, stock, manufacturer, estimated_price, image_url, subcategory, attributes")
        .gt("stock", 0)
        .not("subcategory", "is", null)
        .order("stock", { ascending: false })
        .limit(3000);

      const groups = new Map<string, GroupRow>();
      for (const p of agg ?? []) {
        const sub = p.subcategory as string;
        if (!groups.has(sub)) {
          groups.set(sub, { subcategory: sub, count: 0, total_stock: 0, attributes: {}, preview: [] });
        }
        const g = groups.get(sub)!;
        g.count += 1;
        g.total_stock += p.stock ?? 0;
        if (g.preview.length < 4) g.preview.push(p);
        const attrs = (p.attributes ?? {}) as Record<string, any>;
        for (const [k, v] of Object.entries(attrs)) {
          const sv = String(v);
          if (!sv || sv.length > 32) continue;
          if (!g.attributes[k]) g.attributes[k] = {};
          g.attributes[k][sv] = (g.attributes[k][sv] ?? 0) + 1;
        }
      }
      return Array.from(groups.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-64" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-72 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const seeAll = lang === "en" ? "See all" : lang === "es" ? "Ver todos" : "Ver todos";
  const skusLbl = lang === "en" ? "SKUs" : lang === "es" ? "SKUs" : "SKUs";
  const unitsLbl = lang === "en" ? "units" : lang === "es" ? "unidades" : "unidades";

  return (
    <div className="space-y-12">
      {data?.map((g) => {
        // Top 4 most frequent attribute values across all attribute keys
        const attrChips: Array<{ key: string; value: string; count: number }> = [];
        for (const [k, vals] of Object.entries(g.attributes)) {
          for (const [v, c] of Object.entries(vals)) attrChips.push({ key: k, value: v, count: c });
        }
        attrChips.sort((a, b) => b.count - a.count);
        const topChips = attrChips.slice(0, 8);

        return (
          <section key={g.subcategory} className="space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => onSelectSubcategory(g.subcategory)}
                className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
              >
                <span className="text-3xl">{SUBCATEGORY_ICONS[g.subcategory] ?? "📦"}</span>
                <div>
                  <h3 className="font-bold text-lg text-foreground font-['Space_Grotesk'] leading-tight">
                    {g.subcategory}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {g.count.toLocaleString("pt-BR")} {skusLbl} · {g.total_stock.toLocaleString("pt-BR")} {unitsLbl}
                  </p>
                </div>
              </button>
              <Button variant="ghost" size="sm" onClick={() => onSelectSubcategory(g.subcategory)} className="gap-1 text-primary hover:text-primary">
                {seeAll} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Attribute chips */}
            {topChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {topChips.map((chip) => (
                  <button
                    key={`${chip.key}:${chip.value}`}
                    onClick={() => onSelectAttribute(g.subcategory, chip.key, chip.value)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground border text-xs font-medium transition-colors"
                  >
                    <span className="uppercase tracking-wide">{chip.value}</span>
                    <span className="opacity-60 text-[10px]">({chip.count})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Preview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {g.preview.map((part) => (
                <QuotePartCard
                  key={part.id}
                  part={part}
                  inCart={cartMaterials.has(part.material)}
                  onAdd={() => onAddToCart(part)}
                  onViewDetail={() => onViewDetail(part)}
                  lang={lang}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
