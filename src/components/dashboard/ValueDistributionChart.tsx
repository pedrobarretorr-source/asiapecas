import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCompact } from "@/hooks/use-parts";

interface Props {
  data: { name: string; quantidade: number; units: number; value: number }[];
}

export function ValueDistributionChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.name,
    valor: d.value / 1_000_000,
    unidades: d.units / 1_000,
  }));

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `R$ ${v}M`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}k un.`}
          />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
            formatter={(value: number, name: string) => {
              if (name === "valor") return [`R$ ${value.toFixed(1)}M`, "Valor"];
              return [`${(value * 1000).toLocaleString("pt-BR")} un.`, "Unidades"];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="valor" name="Valor (R$ M)" fill="hsl(45, 100%, 50%)" radius={[6, 6, 0, 0]} />
          <Bar yAxisId="right" dataKey="unidades" name="Unidades (mil)" fill="hsl(200, 80%, 50%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
