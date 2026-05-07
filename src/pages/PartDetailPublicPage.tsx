import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import B2BLeadDialog from "@/components/quote/B2BLeadDialog";
import PublicHeader from "@/components/quote/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { type Lang } from "@/components/quote/translations";
import { SEO, productLd, breadcrumbLd, organizationLd } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ShoppingCart, Package, ShieldCheck, MessageCircle, Tag } from "lucide-react";
import { useCartSession } from "@/hooks/use-cart-session";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { PUBLIC_WHATSAPP_URL } from "@/lib/whatsapp";
import { useEffect } from "react";

export default function PartDetailPublicPage() {
  const { material } = useParams<{ material: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("pt");
  const [b2bOpen, setB2bOpen] = useState(false);
  const { addToCart } = useCartSession();

  const { data: part, isLoading } = useQuery({
    queryKey: ["public-part", material],
    enabled: !!material,
    queryFn: async () => {
      const { data } = await supabase.from("parts")
        .select("id, material, description, manufacturer, machine_model, stock, estimated_price, image_url, part_category, compatible_models")
        .eq("material", material!)
        .maybeSingle();
      return data;
    },
  });

  const { data: ai } = useQuery({
    queryKey: ["public-part-ai", part?.id],
    enabled: !!part?.id,
    queryFn: async () => {
      const { data } = await supabase.from("ai_compatibility_results")
        .select("technical_description, compatible_machines, technical_specs, related_parts, maintenance_tips")
        .eq("part_id", part!.id).maybeSingle();
      return data;
    },
  });

  const { data: hasPromo } = useQuery({
    queryKey: ["public-part-promo", part?.id],
    enabled: !!part?.id,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { count } = await supabase
        .from("part_promotions")
        .select("id", { count: "exact", head: true })
        .eq("part_id", part!.id)
        .eq("active", true)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`);
      return (count ?? 0) > 0;
    },
  });

  useEffect(() => { if (part) track.viewItem(part); }, [part]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  if (!part) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Peça não encontrada.</p>
        <Link to="/cotacao"><Button>Voltar ao catálogo</Button></Link>
      </div>
    );
  }

  const handleAdd = () => {
    addToCart(part);
    track.addToCart(part);
    toast.success("Adicionado à cotação");
  };

  return (
    <>
      <SEO
        title={`${part.description} (${part.material}) | XCMG | Ásia Peças`}
        description={`Peça XCMG ${part.material}. ${part.description}. ${part.machine_model ? `Compatível com ${part.machine_model}. ` : ""}Estoque ${part.stock > 0 ? "disponível" : "sob consulta"}. Cotação rápida.`}
        canonical={`/cotacao/p/${encodeURIComponent(part.material)}`}
        image={part.image_url || undefined}
        type="product"
        jsonLd={[organizationLd(), productLd(part), breadcrumbLd([
          { name: "Início", url: "/" },
          { name: "Catálogo", url: "/cotacao" },
          { name: part.description, url: `/cotacao/p/${encodeURIComponent(part.material)}` },
        ])]}
      />

      <div className="min-h-screen bg-background">
        <PublicHeader lang={lang} onLangChange={setLang} onOpenB2B={() => setB2bOpen(true)} />

        <div className="max-w-5xl mx-auto px-6 py-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-6">
            <ol className="flex gap-1">
              <li><Link to="/" className="hover:text-primary">Início</Link></li>
              <li>/</li>
              <li><Link to="/cotacao" className="hover:text-primary">Catálogo</Link></li>
              <li>/</li>
              <li className="text-foreground line-clamp-1">{part.description}</li>
            </ol>
          </nav>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded-xl overflow-hidden flex items-center justify-center">
              {part.image_url ? (
                <img src={part.image_url} alt={part.description} className="w-full h-full object-cover" />
              ) : (
                <div className="text-muted-foreground/20 text-7xl font-bold font-['Space_Grotesk']">XCMG</div>
              )}
            </div>

            <div className="space-y-4">
              <Badge className="bg-primary text-primary-foreground font-mono">{part.material}</Badge>
              <h1 className="text-2xl md:text-3xl font-bold font-['Space_Grotesk']">{part.description}</h1>

              <div className="flex flex-wrap gap-2">
                {hasPromo && (
                  <Badge className="bg-red-500 text-white border-0 inline-flex items-center gap-1">
                    <Tag className="h-3 w-3" /> EM PROMOÇÃO
                  </Badge>
                )}
                {part.manufacturer && <Badge variant="outline">{part.manufacturer}</Badge>}
                {part.machine_model && <Badge variant="outline"><Package className="h-3 w-3 mr-1" />{part.machine_model}</Badge>}
                {part.stock > 10 ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><ShieldCheck className="h-3 w-3 mr-1" />Pronta entrega</Badge>
                ) : part.stock > 0 ? (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Últimas {part.stock} unidades</Badge>
                ) : (
                  <Badge variant="destructive">Sob consulta</Badge>
                )}
              </div>

              {ai?.technical_description && (
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Especificações técnicas</p>
                  <p className="text-sm text-foreground/80">{ai.technical_description}</p>
                </div>
              )}

              {!!ai?.compatible_machines?.length && (
                <div>
                  <p className="text-xs font-semibold mb-2">Compatível com</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ai.compatible_machines.slice(0, 12).map((m: string) => <Badge key={m} variant="secondary">{m}</Badge>)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button size="lg" className="gap-2" onClick={handleAdd} disabled={part.stock <= 0}>
                  <ShoppingCart className="h-5 w-5" /> Adicionar à cotação
                </Button>
                <a href={PUBLIC_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="w-full gap-2 border-[hsl(142,71%,45%)] text-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,45%)]/10">
                    <MessageCircle className="h-5 w-5" /> WhatsApp
                  </Button>
                </a>
              </div>

              <Link to="/cotacao" className="text-xs text-primary hover:underline inline-block pt-2">← Ver mais peças no catálogo</Link>
            </div>
          </div>
        </div>
      </div>

      <B2BLeadDialog lang={lang} open={b2bOpen} onOpenChange={setB2bOpen} />
    </>
  );
}
