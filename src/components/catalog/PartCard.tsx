import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Package, ArrowRight, ShoppingCart, Brain, TrendingUp } from "lucide-react";
import { type Part, formatBRL, getActiveCategories } from "@/hooks/use-parts";
import { useCart } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHasMarketResearch } from "@/hooks/use-auto-market-research";
import { toast } from "sonner";

interface PartCardProps {
  part: Part;
  onClick: () => void;
}

export function PartCard({ part, onClick }: PartCardProps) {
  const categories = getActiveCategories(part);
  const isStale = part.last_entry_time === "mais de 2 anos";
  const { addItem } = useCart();

  // Check if AI research exists
  const { data: hasAI } = useQuery({
    queryKey: ["ai-exists", part.material],
    queryFn: async () => {
      const { count } = await supabase
        .from("ai_compatibility_results")
        .select("id", { count: "exact", head: true })
        .eq("material", part.material);
      return (count ?? 0) > 0;
    },
    staleTime: 600_000,
  });

  const { data: hasResearch } = useHasMarketResearch(part.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      part_id: part.id,
      material: part.material,
      description: part.description,
      unit_price: part.estimated_price,
      stock: part.stock,
    });
    toast.success("Adicionado ao pedido");
  };

  return (
    <Card
      className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
      onClick={onClick}
    >
      {isStale && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-destructive" />
      )}
      <div className="absolute top-2 right-2 flex gap-1">
        {hasResearch && (
          <Badge variant="secondary" className="text-[10px] gap-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> Pesquisado
          </Badge>
        )}
        {hasAI && (
          <Badge variant="default" className="text-[10px] bg-primary/90 gap-0.5">
            <Brain className="h-2.5 w-2.5" /> IA
          </Badge>
        )}
        {part.compatible_models && part.compatible_models.length > 1 && (
          <Badge variant="secondary" className="text-[10px] bg-info/10 text-info border-info/20">
            +{part.compatible_models.length} modelos
          </Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground font-mono">{part.material}</p>
            <p className="text-sm font-medium text-foreground leading-tight mt-0.5 line-clamp-2">{part.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <Badge key={cat} variant="outline" className="text-[10px] py-0">{cat}</Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Modelo</p>
            <p className="font-medium text-foreground truncate">{part.machine_model}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Estoque</p>
            <p className="font-medium text-foreground">{part.stock.toLocaleString("pt-BR")}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="font-display font-bold text-sm text-foreground">{formatBRL(part.estimated_price)}</p>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddToCart}>
                  <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adicionar ao Pedido</TooltipContent>
            </Tooltip>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
