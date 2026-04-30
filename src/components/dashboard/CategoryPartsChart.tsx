import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCompact } from "@/hooks/use-parts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "hsl(45, 100%, 50%)",
  "hsl(210, 80%, 55%)",
  "hsl(150, 70%, 45%)",
  "hsl(280, 70%, 60%)",
  "hsl(20, 90%, 55%)",
  "hsl(180, 60%, 50%)",
  "hsl(340, 75%, 55%)",
  "hsl(60, 80%, 50%)",
  "hsl(260, 60%, 60%)",
  "hsl(0, 70%, 55%)",
  "hsl(120, 50%, 50%)",
];

export function CategoryPartsChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["parts-by-category"],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("part_category, stock, estimated_price");
      if (error) throw error;
      const map = new Map<string, { name: string; value: number; count: number }>();
      (data ?? []).forEach((p: any) => {
        const key = p.part_category || "Sem categoria";
        const cur = map.get(key) || { name: key, value: 0, count: 0 };
        cur.value += Number(p.stock || 0) * Number(p.estimated_price || 0);
        cur.count += 1;
        map.set(key, cur);
      });
      return Array.from(map.values()).sort((a, b) => b.value - a.value);
    },
  });

  if (isLoading) return <Skeleton className="h-[280px] w-full" />;
  if (!data || data.length === 0)
    return <p className="text-sm text-muted-foreground text-center py-8">Sem dados de categoria.</p>;

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="40%"
            cy="50%"
            outerRadius={90}
            innerRadius={45}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => formatCompact(v)}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
