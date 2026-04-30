import { useMemo, useState } from "react";
import type { SubcategoryByModelRow } from "@/hooks/use-catalog-intelligence";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtBRL } from "@/lib/subcategory-rules";

interface Props {
  data: SubcategoryByModelRow[];
  onCell: (sub: string, model: string) => void;
}

export function SubcategoryMachineMatrix({ data, onCell }: Props) {
  const [search, setSearch] = useState("");

  const { subs, models, cells, max } = useMemo(() => {
    const subs = Array.from(new Set(data.map((d) => d.subcategory))).sort();
    const models = Array.from(new Set(data.map((d) => d.model))).sort();
    const cells = new Map<string, SubcategoryByModelRow>();
    let max = 0;
    for (const r of data) {
      cells.set(`${r.subcategory}|||${r.model}`, r);
      if (r.value > max) max = r.value;
    }
    return { subs, models, cells, max };
  }, [data]);

  const fSubs = subs.filter((s) => s.toLowerCase().includes(search.toLowerCase()));
  const fModels = models.slice(0, 25); // limita largura

  function cellColor(value: number, stale: number) {
    if (value === 0) return "bg-muted/20";
    const intensity = Math.min(1, value / Math.max(1, max));
    const stalePct = stale / value;
    if (stalePct > 0.5) {
      // vermelho
      return `bg-destructive/${Math.round(intensity * 50) + 10}`;
    }
    return `bg-primary/${Math.round(intensity * 60) + 10}`;
  }

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <Input
          placeholder="Filtrar subcategoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="overflow-auto max-h-[70vh] border rounded">
          <table className="text-[11px]">
            <thead className="sticky top-0 bg-background z-10">
              <tr>
                <th className="sticky left-0 bg-background border-r px-2 py-1 text-left font-semibold">Subcategoria \ Modelo</th>
                {fModels.map((m) => (
                  <th key={m} className="px-1.5 py-1 text-left font-semibold whitespace-nowrap border-r min-w-[80px]">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fSubs.map((s) => (
                <tr key={s}>
                  <td className="sticky left-0 bg-background border-r px-2 py-1 font-medium whitespace-nowrap">{s}</td>
                  {fModels.map((m) => {
                    const c = cells.get(`${s}|||${m}`);
                    if (!c || c.value === 0) {
                      return <td key={m} className="border-r border-b bg-muted/10 px-1 py-1">—</td>;
                    }
                    return (
                      <td
                        key={m}
                        className={`border-r border-b px-1.5 py-1 cursor-pointer hover:ring-1 hover:ring-primary ${cellColor(c.value, c.stale_value)}`}
                        onClick={() => onCell(s, m)}
                        title={`${c.skus} SKUs · ${fmtBRL(c.value)}${c.stale_value > 0 ? ` · ${fmtBRL(c.stale_value)} parado` : ""}`}
                      >
                        <div className="font-bold">{c.skus}</div>
                        <div className="text-[9px] opacity-80">{fmtBRL(c.value)}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Cada célula mostra SKUs e valor. Cor mais intensa = mais valor concentrado. Vermelho = mais de 50% parado +2 anos. Click abre lista detalhada.
        </p>
      </CardContent>
    </Card>
  );
}
