import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageCircle } from "lucide-react";
import { formatWhatsAppLink, defaultGreeting } from "@/lib/whatsapp";

type Props = {
  phone?: string | null;
  name?: string | null;
  message?: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost";
  showLabel?: boolean;
  className?: string;
  stopPropagation?: boolean;
};

export function WhatsAppButton({
  phone, name, message, size = "icon", variant = "ghost", showLabel = false, className, stopPropagation = true,
}: Props) {
  const url = formatWhatsAppLink(phone, message ?? defaultGreeting(name));
  const disabled = !url;

  const button = (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled}
      className={className}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      }}
      aria-label={disabled ? "Sem telefone" : "Abrir WhatsApp"}
    >
      <MessageCircle className={`h-4 w-4 ${disabled ? "text-muted-foreground" : "text-emerald-600"}`} />
      {showLabel && <span className="ml-2">WhatsApp</span>}
    </Button>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{button}</span>
        </TooltipTrigger>
        <TooltipContent>{disabled ? "Sem telefone cadastrado" : "Abrir conversa no WhatsApp"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
