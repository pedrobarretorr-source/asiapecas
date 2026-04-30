import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowRight } from "lucide-react";

type Props = {
  id: string;
  title: string;
  icon?: ReactNode;
  description?: string;
  children: ReactNode;
  /** Optional content shown when user clicks "Ver tudo" — rendered inside a side Sheet. */
  fullView?: ReactNode;
  fullViewTitle?: string;
  rightSlot?: ReactNode;
};

export function Customer360Section({ id, title, icon, description, children, fullView, fullViewTitle, rightSlot }: Props) {
  return (
    <section id={id} className="scroll-mt-32 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="flex gap-2 items-center">
          {rightSlot}
          {fullView && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  Ver tudo <ArrowRight className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{fullViewTitle || title}</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{fullView}</div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
      <Card><CardContent className="p-4">{children}</CardContent></Card>
    </section>
  );
}
