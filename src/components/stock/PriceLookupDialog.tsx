import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search } from "lucide-react";
import { usePriceLookup, usePriceLookupHistory, type LookupResult } from "@/hooks/use-price-lookup";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PriceLookupResults from "./PriceLookupResults";
import PriceLookupHistory from "./PriceLookupHistory";

export type PartLite = { id: string; material: string; description: string };

export default function PriceLookupDialog({
  part,
  open,
  onOpenChange,
}: {
  part: PartLite | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const lookup = usePriceLookup();
  const { data: history = [] } = usePriceLookupHistory(part?.id || null);
  const [query, setQuery] = useState("");
  const [currentResults, setCurrentResults] = useState<LookupResult[]>([]);

  useEffect(() => {
    if (part) {
      setQuery(part.material);
      setCurrentResults([]);
    }
  }, [part]);

  if (!part) return null;

  const handleSearch = () => {
    if (!query.trim()) return;
    lookup.mutate(
      { part_id: part.id, query: query.trim() },
      { onSuccess: (data) => setCurrentResults(data.results) }
    );
  };

  const saveAsCost = async (price: number) => {
    const { error } = await supabase.from("parts").update({ estimated_price: price }).eq("id", part.id);
    if (error) toast.error("Erro ao salvar custo: " + error.message);
    else toast.success(`Custo atualizado para R$ ${price.toLocaleString("pt-BR")}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Comparar Preços — <span className="font-mono">{part.material}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{part.description}</p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-2 -mr-2">
          <Tabs defaultValue="search">
            <TabsList>
              <TabsTrigger value="search">Buscar agora</TabsTrigger>
              <TabsTrigger value="history">Histórico ({history.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-4 space-y-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Termo de busca</Label>
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="OEM ou nome" />
                </div>
                <Button onClick={handleSearch} disabled={lookup.isPending} className="gap-2">
                  {lookup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Buscar
                </Button>
              </div>

              {lookup.isPending && (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border rounded p-3 animate-pulse h-32 bg-muted/30" />
                  ))}
                </div>
              )}

              {!lookup.isPending && currentResults.length > 0 && (
                <PriceLookupResults results={currentResults} onSaveAsCost={saveAsCost} />
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <PriceLookupHistory lookups={history} partId={part.id} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
