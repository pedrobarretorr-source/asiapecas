import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Bookmark, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { UnifiedFiltersState } from "./UnifiedFilters";

interface Template {
  id: string;
  name: string;
  config: UnifiedFiltersState;
}

interface Props {
  current: UnifiedFiltersState;
  onLoad: (s: UnifiedFiltersState) => void;
}

export function SavedViews({ current, onLoad }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("catalog_report_templates")
      .select("id,name,config")
      .order("created_at", { ascending: false });
    setTemplates((data ?? []) as unknown as Template[]);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!name.trim()) { toast.error("Dê um nome à visualização"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("catalog_report_templates").insert({
      name: name.trim(),
      config: current as never,
      created_by: u.user?.id ?? null,
      is_shared: true,
    } as never);
    if (error) { toast.error(error.message); return; }
    toast.success("Visualização salva");
    setName(""); setOpen(false); load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("catalog_report_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground mr-1">Visualizações:</span>
      {templates.length === 0 && <span className="text-xs text-muted-foreground italic">nenhuma salva</span>}
      {templates.map((t) => (
        <div key={t.id} className="group inline-flex items-center gap-1 bg-muted rounded-full pl-2 pr-1 py-0.5">
          <button className="text-xs font-medium" onClick={() => onLoad(t.config)}>{t.name}</button>
          <button
            onClick={() => remove(t.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-0.5"
            title="Remover"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 ml-auto">
            <Plus className="h-3 w-3" /> Salvar atual
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Salvar visualização</DialogTitle></DialogHeader>
          <Input placeholder="ex.: Pneus parados +2 anos" value={name} onChange={(e) => setName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
