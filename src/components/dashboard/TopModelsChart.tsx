import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL } from "@/hooks/use-parts";

interface Props {
  data: { name: string; quantidade: number; units: number; value: number }[];
}

export function TopModelsChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    valueM: d.value / 1_000_000,
  }));

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `R$ ${v.toFixed(1)}M`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            width={95}
          />
          <Tooltip
            formatter={(value: number) => [formatBRL(value * 1_000_000), "Valor"]}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
          />
          <Bar dataKey="valueM" fill="hsl(200, 80%, 50%)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
