import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineProps {
  data: Array<{ date: number; actual: number; ideal: number }>;
  height?: number;
}

export function Sparkline({ data, height = 40 }: SparklineProps) {
  return (
    <div className="w-full bg-gradient-to-r from-chart-2 to-chart-1 rounded opacity-20 relative overflow-hidden" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line 
            type="monotone" 
            dataKey="actual" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={2}
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="ideal" 
            stroke="hsl(var(--muted-foreground))" 
            strokeWidth={1}
            strokeDasharray="2 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
