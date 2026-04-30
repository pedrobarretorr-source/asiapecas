import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { formatCompact } from "@/hooks/use-parts";

interface Props {
  data: { name: string; quantidade: number; units: number; value: number }[];
}

export function ManufacturerChart({ data }: Props) {
  // Clean up manufacturer names for display
  const chartData = data.map((d) => {
    const label = d.name.includes("-") ? d.name.split("-").pop()?.trim() ?? d.name : d.name;
    return { ...d, label, valueM: d.value / 1_000_000 };
  }).sort((a, b) => b.value - a.value).slice(0, 10);

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `R$ ${v.toFixed(0)}M`}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            width={110}
          />
          <Tooltip
            formatter={(value: number) => [formatCompact(value * 1_000_000), "Valor"]}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
          />
          <Bar dataKey="valueM" fill="hsl(45, 100%, 50%)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
