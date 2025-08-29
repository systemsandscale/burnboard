import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Users, DollarSign } from "lucide-react";
import type { DashboardAnalytics } from "@shared/schema";

interface AnalyticsSummaryProps {
  data?: DashboardAnalytics;
  isLoading?: boolean;
}

export function AnalyticsSummary({ data, isLoading }: AnalyticsSummaryProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 mb-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-32 mb-2"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-6 mb-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">No analytics data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 mb-8" data-testid="analytics-summary">
      {/* Lost Revenue Alert */}
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
            Lost Revenue This Month
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300" data-testid="text-lost-revenue">
            {formatCurrency(data.totalLostRevenueCents)}
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            From overserving clients (Hourly Rate: {formatCurrency(data.hourlyRateCents)})
          </p>
        </CardContent>
      </Card>

      {/* Top Overserving Clients */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Top 5 Overserving Clients (3 Month Avg)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topOverservingClients.length > 0 ? (
              data.topOverservingClients.map((client, index) => (
                <div 
                  key={client.clientId} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  data-testid={`overserving-client-${index}`}
                >
                  <div>
                    <p className="font-medium" data-testid="text-client-name">
                      {client.clientName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {client.accountManager}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="mb-1">
                      {formatCurrency(client.averageOverservingCents)}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatHours(client.averageOverservingHours)} avg
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No overserving clients found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Overserving Employees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Top 5 Overserving Team Members (3 Month Avg)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topOverservingEmployees.length > 0 ? (
              data.topOverservingEmployees.map((employee, index) => (
                <div 
                  key={employee.memberId} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  data-testid={`overserving-employee-${index}`}
                >
                  <div>
                    <p className="font-medium" data-testid="text-employee-name">
                      {employee.memberName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {employee.department}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      {formatCurrency(employee.averageOverservingCents)}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatHours(employee.averageOverservingHours)} avg
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No overserving employees found
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}