import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Eye, Zap, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type Lang, tr } from "./translations";

interface QuotePartCardProps {
  part: {
    id: string;
    material: string;
    description: string;
    machine_model: string | null;
    stock: number;
    manufacturer: string | null;
    estimated_price?: number | null;
    image_url?: string | null;
    subcategory?: string | null;
    attributes?: Record<string, any> | null;
  };
  inCart: boolean;
  /** Kept for API compat with existing callers. No longer rendered. */
  hasAiData?: boolean;
  aiPreview?: string | null;
  onAdd: () => void;
  onViewDetail: () => void;
  lang: Lang;
}

export default function QuotePartCard({ part, inCart, onAdd, onViewDetail, lang }: QuotePartCardProps) {
  const navigate = useNavigate();
  const isReadyToShip = part.stock > 10;
  const isLastUnits = part.stock >= 1 && part.stock <= 5;

  const goToDetail = () => navigate(`/cotacao/p/${encodeURIComponent(part.material)}`);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd();
  };
  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetail();
  };

  return (
    <Card
      onClick={goToDetail}
      className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border overflow-hidden flex flex-col ${
        inCart ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"
      }`}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Image */}
        <div className="relative aspect-[3/2] bg-muted/40 overflow-hidden">
          {part.image_url ? (
            <img
              src={part.image_url}
              alt={part.description}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-secondary/5 to-primary/5">
              <span className="text-5xl font-bold font-['Space_Grotesk'] text-primary/30 select-none">XCMG</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mt-1">peça original</span>
            </div>
          )}

          {/* Quick view button on hover */}
          <button
            onClick={handleQuickView}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 text-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow flex items-center justify-center hover:bg-background"
            aria-label={tr("part.details", lang)}
            title={tr("part.details", lang)}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          {/* Brand · model chip */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-secondary-foreground/80">{part.manufacturer || "XCMG"}</span>
            {part.machine_model && (
              <>
                <span>·</span>
                <span className="truncate">{part.machine_model}</span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-sm font-medium text-foreground line-clamp-2 min-h-[2.5rem] leading-snug">
            {part.description}
          </p>

          {/* Attribute chips (medida/tipo) */}
          {part.attributes && Object.keys(part.attributes).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(part.attributes).slice(0, 2).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide">
                  {String(v)}
                </span>
              ))}
            </div>
          )}

          {/* Code */}
          <p className="font-mono text-[10px] text-muted-foreground/80">#{part.material}</p>

          {/* Stock status */}
          <div className="min-h-[20px]">
            {isReadyToShip ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <Zap className="h-3 w-3" /> {tr("part.readyToShip", lang)}
              </span>
            ) : isLastUnits ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                <AlertTriangle className="h-3 w-3" /> {tr("part.lastUnits", lang)}
              </span>
            ) : part.stock > 0 ? (
              <span className="text-[11px] text-muted-foreground">
                {part.stock} {tr("part.units", lang)}
              </span>
            ) : (
              <span className="text-[11px] text-destructive">{tr("part.unavailable", lang)}</span>
            )}
          </div>

          {/* Action */}
          <Button
            size="sm"
            className="w-full gap-1.5 mt-auto"
            onClick={handleAdd}
            disabled={inCart || part.stock <= 0}
            variant={inCart ? "secondary" : "default"}
          >
            <ShoppingCart className="h-4 w-4" />
            {inCart ? tr("part.added", lang) : tr("part.quote", lang)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
