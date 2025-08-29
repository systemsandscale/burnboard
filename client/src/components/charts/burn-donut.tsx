import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

interface BurnDonutProps {
  burnPercentage: number;
  className?: string;
}

export function BurnDonut({ burnPercentage, className }: BurnDonutProps) {
  const data = [
    { name: "Burned", value: Math.min(burnPercentage * 100, 100) },
    { name: "Remaining", value: Math.max(100 - (burnPercentage * 100), 0) }
  ];

  const COLORS = {
    Burned: "hsl(var(--chart-1))",
    Remaining: "hsl(var(--muted))"
  };

  return (
    <div className={className} data-testid="burn-donut-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {Math.round(burnPercentage * 100)}%
          </div>
          <div className="text-sm text-muted-foreground">Burned</div>
        </div>
      </div>
    </div>
  );
}
