import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["hsl(45, 100%, 50%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

interface Props {
  data: { name: string; quantidade: number; units?: number; value?: number }[];
}

export function StockByTimeChart({ data }: Props) {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="quantidade">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
