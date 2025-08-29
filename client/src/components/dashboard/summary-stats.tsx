import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import { Users, CheckCircle, DollarSign, BarChart } from "lucide-react";

interface SummaryStatsProps {
  data?: {
    activeClients: number;
    onTrackPercentage: number;
    totalRetainerCents: number;
    mtdSpendCents: number;
  };
  isLoading?: boolean;
}

export function SummaryStats({ data, isLoading }: SummaryStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="w-12 h-12 rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      title: "Active Clients",
      value: data.activeClients.toString(),
      icon: Users,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      testId: "stat-active-clients"
    },
    {
      title: "On Track",
      value: `${data.onTrackPercentage}%`,
      icon: CheckCircle,
      bgColor: "bg-green-500/10",
      iconColor: "text-green-500",
      testId: "stat-on-track"
    },
    {
      title: "Total Retainer",
      value: formatCurrency(data.totalRetainerCents),
      icon: DollarSign,
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500",
      testId: "stat-total-retainer"
    },
    {
      title: "MTD Spend",
      value: formatCurrency(data.mtdSpendCents),
      icon: BarChart,
      bgColor: "bg-orange-500/10",
      iconColor: "text-orange-500",
      testId: "stat-mtd-spend"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="summary-stats">
      {stats.map((stat) => (
        <Card key={stat.title} className="p-6" data-testid={stat.testId}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
              <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
