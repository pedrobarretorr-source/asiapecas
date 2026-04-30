import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tags, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Suggestion {
  id: string;
  material: string;
  description: string;
  currentCategory: string;
  suggestedSubcategory: string;
  confidence: number;
  reasoning?: string;
}

export function SubcategorizeAITab() {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("subcategorize-parts", {
        body: { mode: "preview", limit: 50 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const sug = (data?.suggestions || []) as Suggestion[];
      setSuggestions(sug);
      // pré-seleciona alta confiança
      setSelected(new Set(sug.filter((s) => s.confidence >= 0.7).map((s) => s.id)));
      toast.success(`${sug.length} sugestões geradas`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar sugestões");
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    const updates = suggestions
      .filter((s) => selected.has(s.id))
      .map((s) => ({ id: s.id, subcategory: s.suggestedSubcategory }));
    if (updates.length === 0) {
      toast.info("Nenhuma sugestão selecionada");
      return;
    }
    setApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("subcategorize-parts", {
        body: { mode: "apply", updates },
      });
      if (error) throw error;
      toast.success(`${(data as any)?.updated ?? updates.length} peças reclassificadas`);
      setSuggestions((prev) => prev.filter((s) => !selected.has(s.id)));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["stock-analytics"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setApplying(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === suggestions.length ? new Set() : new Set(suggestions.map((s) => s.id)),
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-primary" />
            Reclassificação de Acessórios
          </span>
          <div className="flex gap-2">
            <Button onClick={fetchSuggestions} disabled={loading} size="sm">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Tags className="mr-2 h-4 w-4" />}
              Gerar sugestões (50)
            </Button>
            {suggestions.length > 0 && (
              <Button onClick={apply} disabled={applying || selected.size === 0} variant="default" size="sm">
                {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aplicar {selected.size}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            Clique em "Gerar sugestões" para receber subcategorias propostas para 50 peças genéricas.
          </p>
        )}
        {suggestions.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs">
              <Checkbox
                checked={selected.size === suggestions.length}
                onCheckedChange={toggleAll}
              />
              <span>Selecionar todas ({suggestions.length})</span>
            </div>
            <div className="max-h-[600px] space-y-2 overflow-y-auto pr-2">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="flex gap-3 rounded border p-3 text-xs hover:bg-muted/30"
                >
                  <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.description}</div>
                    <div className="mt-1 text-muted-foreground">{s.material}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{s.currentCategory}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge>{s.suggestedSubcategory}</Badge>
                      <Badge
                        variant={s.confidence >= 0.7 ? "default" : s.confidence >= 0.5 ? "secondary" : "outline"}
                      >
                        {(s.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    {s.reasoning && <div className="mt-1 text-muted-foreground italic">{s.reasoning}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
