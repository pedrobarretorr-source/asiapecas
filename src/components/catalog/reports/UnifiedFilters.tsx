import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles } from "lucide-react";

export type GroupKey = "subcategory" | "model" | "manufacturer";

export interface UnifiedFiltersState {
  search: string;
  subcategory: string;
  model: string;
  manufacturer: string;
  staleOnly: boolean;
  groupBy: GroupKey;
}

export const DEFAULT_FILTERS: UnifiedFiltersState = {
  search: "",
  subcategory: "all",
  model: "all",
  manufacturer: "all",
  staleOnly: false,
  groupBy: "subcategory",
};

interface Props {
  state: UnifiedFiltersState;
  onChange: (next: UnifiedFiltersState) => void;
  subcategories: string[];
  models: string[];
  manufacturers: string[];
  onAIRefine?: () => void;
  aiBusy?: boolean;
}

export function UnifiedFilters({ state, onChange, subcategories, models, manufacturers, onAIRefine, aiBusy }: Props) {
  const set = <K extends keyof UnifiedFiltersState>(k: K, v: UnifiedFiltersState[K]) =>
    onChange({ ...state, [k]: v });

  const activeCount = [
    state.subcategory !== "all",
    state.model !== "all",
    state.manufacturer !== "all",
    state.staleOnly,
    state.search.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b py-3 -mx-2 px-2">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
        <div className="col-span-2 md:col-span-2">
          <label className="text-[10px] uppercase text-muted-foreground tracking-wide">Buscar</label>
          <Input
            value={state.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Filtro, pneu 26.5R25, modelo..."
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground tracking-wide">Subcategoria</label>
          <Select value={state.subcategory} onValueChange={(v) => set("subcategory", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Todas</SelectItem>
              {subcategories.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground tracking-wide">Modelo</label>
          <Select value={state.model} onValueChange={(v) => set("model", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Todos</SelectItem>
              {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground tracking-wide">Fabricante</label>
          <Select value={state.manufacturer} onValueChange={(v) => set("manufacturer", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Todos</SelectItem>
              {manufacturers.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground tracking-wide">Agrupar por</label>
          <Select value={state.groupBy} onValueChange={(v) => set("groupBy", v as GroupKey)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="subcategory">Subcategoria</SelectItem>
              <SelectItem value="model">Modelo</SelectItem>
              <SelectItem value="manufacturer">Fabricante</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <Button
          size="sm"
          variant={state.staleOnly ? "default" : "outline"}
          className="h-7 text-xs"
          onClick={() => set("staleOnly", !state.staleOnly)}
        >
          {state.staleOnly ? "✓ " : ""}Capital parado +2a
        </Button>
        {activeCount > 0 && (
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive"
            onClick={() => onChange(DEFAULT_FILTERS)}>
            <X className="h-3 w-3" /> Limpar ({activeCount})
          </Button>
        )}
        {onAIRefine && (
          <Button
            size="sm"
            variant="default"
            className="ml-auto h-7 text-xs gap-1"
            onClick={onAIRefine}
            disabled={aiBusy}
          >
            <Sparkles className="h-3 w-3" />
            {aiBusy ? "Classificando..." : "Refinar com IA (500)"}
          </Button>
        )}
        {state.subcategory !== "all" && <Badge variant="secondary" className="text-[10px]">{state.subcategory}</Badge>}
        {state.model !== "all" && <Badge variant="secondary" className="text-[10px]">{state.model}</Badge>}
        {state.manufacturer !== "all" && <Badge variant="secondary" className="text-[10px]">{state.manufacturer}</Badge>}
      </div>
    </div>
  );
}
