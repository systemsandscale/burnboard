import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface CumulativeSpendChartProps {
  data: Array<{
    date: string;
    actualSpend: number;
    idealSpend: number;
    dayOfMonth: number;
  }>;
  className?: string;
}

export function CumulativeSpendChart({ data, className }: CumulativeSpendChartProps) {
  return (
    <div className={className} data-testid="cumulative-spend-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="dayOfMonth" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip 
            labelFormatter={(label) => `Day ${label}`}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === "actualSpend" ? "Actual Spend" : "Ideal Target"
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)"
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="actualSpend"
            stroke="hsl(var(--chart-1))"
            strokeWidth={3}
            name="Actual Spend"
            dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 0, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="idealSpend"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="4 4"
            name="Ideal Target"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
