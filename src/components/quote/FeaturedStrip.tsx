import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Sparkles } from "lucide-react";
import { type Lang, tr } from "./translations";
import { Button } from "@/components/ui/button";

interface Featured {
  id: string;
  badge_label: string | null;
  badge_color: string | null;
  part: {
    id: string; material: string; description: string; manufacturer: string | null;
    machine_model: string | null; stock: number; image_url: string | null;
  };
}

export default function FeaturedStrip({ lang, onAddToCart }: { lang: Lang; onAddToCart: (p: any) => void }) {
  const { data } = useQuery({
    queryKey: ["vitrine-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vitrine_featured_parts")
        .select("id, badge_label, badge_color, part:parts(id, material, description, manufacturer, machine_model, stock, image_url)")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .limit(12);
      return (data || []).filter((d: any) => d.part) as unknown as Featured[];
    },
    staleTime: 60_000,
  });

  if (!data || data.length === 0) return null;

  const title = lang === "en" ? "Featured parts" : lang === "es" ? "Repuestos destacados" : "Peças em destaque";

  return (
    <section className="bg-card border-b">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> {title}
            </h2>
            <p className="text-sm text-muted-foreground">{lang === "en" ? "Selected by our team" : lang === "es" ? "Seleccionado por nuestro equipo" : "Selecionados pela nossa equipe"}</p>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
          {data.map(({ id, badge_label, part }) => (
            <div key={id} className="flex-shrink-0 w-[260px] snap-start bg-background rounded-xl border hover:border-primary/40 hover:shadow-lg transition-all overflow-hidden">
              <Link to={`/cotacao/p/${encodeURIComponent(part.material)}`} className="block">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {part.image_url ? (
                    <img src={part.image_url} alt={part.description} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-4xl font-bold font-['Space_Grotesk']">XCMG</div>
                  )}
                  {badge_label && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">{badge_label}</Badge>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="font-mono text-[10px] text-primary font-semibold">{part.material}</p>
                  <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem] text-foreground">{part.description}</p>
                  <p className="text-xs text-muted-foreground">{part.machine_model || "—"}</p>
                </div>
              </Link>
              <div className="px-3 pb-3">
                <Button size="sm" className="w-full gap-1.5" onClick={() => onAddToCart(part)} disabled={part.stock <= 0}>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {tr("part.quote", lang)}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
