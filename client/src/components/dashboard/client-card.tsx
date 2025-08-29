import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkline } from "@/components/charts/sparkline";
import { formatCurrency, formatVariance, getHealthColor } from "@/lib/formatters";
import type { ClientWithMetrics } from "@shared/schema";
import { useLocation } from "wouter";

interface ClientCardProps {
  client: ClientWithMetrics;
}

export function ClientCard({ client }: ClientCardProps) {
  const [, setLocation] = useLocation();
  const variance = formatVariance(client.varianceCents, client.variancePct);
  const burnPercentage = Math.min(client.burnPctMTD * 100, 100);

  const handleClick = () => {
    setLocation(`/clients/${client.id}`);
  };

  // Generate mock sparkline data for visualization
  const sparklineData = Array.from({ length: 20 }, (_, i) => ({
    date: i,
    actual: (client.mtdSpendCents / 20) * (i + 1) + Math.random() * 1000 - 500,
    ideal: (client.idealTargetSpendToDateCents / 20) * (i + 1)
  }));

  return (
    <Card 
      className="p-6 hover:shadow-lg transition-shadow cursor-pointer" 
      onClick={handleClick}
      data-testid={`card-client-${client.id}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1" data-testid="text-client-name">
            {client.name}
          </h3>
          <p className="text-sm text-muted-foreground" data-testid="text-account-manager">
            {client.accountManager}
          </p>
        </div>
        <Badge 
          className={getHealthColor(client.health)}
          data-testid="badge-health-status"
        >
          {client.health.replace('_', ' ')}
        </Badge>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">MTD Spend</span>
          <span className="font-medium" data-testid="text-mtd-spend">
            {formatCurrency(client.mtdSpendCents)} / {formatCurrency(client.monthlyRetainerAmountCents)}
          </span>
        </div>
        <Progress 
          value={burnPercentage} 
          className="h-2"
          data-testid="progress-burn-rate"
        />
      </div>

      <div className="mb-4">
        <Sparkline 
          data={sparklineData} 
          height={40}
          data-testid="sparkline-client"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Ideal Target</p>
          <p className="font-medium text-foreground" data-testid="text-ideal-target">
            {formatCurrency(client.idealTargetSpendToDateCents)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Variance</p>
          <p className={`font-medium ${variance.color}`} data-testid="text-variance">
            {variance.text}
          </p>
        </div>
      </div>
    </Card>
  );
}
