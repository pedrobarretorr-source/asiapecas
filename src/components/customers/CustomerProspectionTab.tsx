import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Target, Trophy } from "lucide-react";
import { toast } from "sonner";

type ProspectRow = { id: string; score: number; status: string; ai_summary: string | null; matched_parts: string[] | null; segment: string | null; created_at: string; notes: string | null };

export function CustomerProspectionTab({ customerId }: { customerId: string }) {
  const qc = useQueryClient();

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["customer-prospects", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("id,score,status,ai_summary,matched_parts,segment,created_at,notes")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ProspectRow[];
    },
  });

  const reEnrich = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("prospect-from-customer", { body: { customer_ids: [customerId] } });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-prospects", customerId] });
      toast.success("Prospecção atualizada");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const promote = useMutation({
    mutationFn: async (prospectId: string) => {
      await supabase.from("prospects").update({ status: "convertido" }).eq("id", prospectId);
      await supabase.from("customers").update({ relationship_status: "ativo" }).eq("id", customerId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-prospects", customerId] });
      qc.invalidateQueries({ queryKey: ["customer", customerId] });
      toast.success("Cliente promovido a ativo");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => reEnrich.mutate()} disabled={reEnrich.isPending} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${reEnrich.isPending ? "animate-spin" : ""}`} /> {reEnrich.isPending ? "Pesquisando…" : "Pesquisar"}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : prospects.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma informação de prospecção carregada ainda.</p>
          <p className="text-xs mt-1">Clique em "Pesquisar" para buscar oportunidades para este cliente.</p>
        </CardContent></Card>
      ) : (
        prospects.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant={p.score >= 70 ? "default" : "secondary"} className="gap-1">
                    <Trophy className="h-3 w-3" /> Score {p.score}
                  </Badge>
                  <Badge variant="outline" className="capitalize">{p.status}</Badge>
                  {p.segment && <Badge variant="outline" className="capitalize">{p.segment}</Badge>}
                </div>
                <div className="flex gap-2">
                  {p.status !== "convertido" && (
                    <Button size="sm" variant="default" onClick={() => promote.mutate(p.id)} disabled={promote.isPending}>
                      Promover a cliente ativo
                    </Button>
                  )}
                </div>
              </div>
              {p.ai_summary && <p className="text-sm whitespace-pre-wrap">{p.ai_summary}</p>}
              {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
              {p.matched_parts && p.matched_parts.length > 0 && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Peças sugeridas</p>
                  <div className="flex flex-wrap gap-1">
                    {p.matched_parts.map((m, i) => <Badge key={i} variant="secondary" className="font-mono text-xs">{m}</Badge>)}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Criado em {new Date(p.created_at).toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
