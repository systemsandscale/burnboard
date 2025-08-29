import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CumulativeSpendChart } from "@/components/charts/cumulative-spend-chart";
import { BurnDonut } from "@/components/charts/burn-donut";
import { formatCurrency, formatHours, getHealthColor } from "@/lib/formatters";
import { idealTargetSpendToDate, calculateClientMetrics } from "@/lib/metrics";
import { X, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import type { Client, TeamMember, TimeEntry, BurnSnapshot } from "@shared/schema";

interface ClientDetailProps {
  clientId: string;
  onClose: () => void;
}

export function ClientDetail({ clientId, onClose }: ClientDetailProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId
  });

  const { data: historyData } = useQuery({
    queryKey: ["/api/clients", clientId, "history"],
    enabled: !!clientId
  });

  const { data: departmentData } = useQuery({
    queryKey: ["/api/clients", clientId, "time-by-dept"],
    enabled: !!clientId
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg border border-border w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.client) {
    return null;
  }

  const { client, teamMembers, recentTimeEntries, burnSnapshots } = data as {
    client: Client;
    teamMembers: TeamMember[];
    recentTimeEntries: TimeEntry[];
    burnSnapshots: BurnSnapshot[];
  };

  const metrics = calculateClientMetrics(
    burnSnapshots.reduce((sum, snapshot) => Math.max(sum, snapshot.spendToDateCents), 0),
    client.monthlyRetainerAmountCents
  );

  // Generate chart data from burn snapshots
  const chartData = burnSnapshots.map((snapshot, index) => ({
    date: snapshot.date,
    actualSpend: snapshot.spendToDateCents,
    idealSpend: snapshot.targetSpendToDateCents,
    dayOfMonth: index + 1
  }));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="modal-client-detail">
      <div className="bg-card rounded-lg border border-border w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="text-client-detail-name">
                {client.name}
              </h2>
              <p className="text-muted-foreground" data-testid="text-client-detail-info">
                {client.accountManager} • {formatCurrency(client.monthlyRetainerAmountCents)}/month • Started {new Date(client.startDate).toLocaleDateString()}
              </p>
            </div>
            <Badge className={getHealthColor(metrics.health)} data-testid="badge-client-health">
              {metrics.health.replace('_', ' ')}
            </Badge>
          </div>
          <Button variant="ghost" onClick={onClose} data-testid="button-close-modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="h-full">
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6">
              <TabsTrigger value="overview" className="py-4" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="departments" className="py-4" data-testid="tab-departments">Departments</TabsTrigger>
              <TabsTrigger value="team" className="py-4" data-testid="tab-team">Team</TabsTrigger>
              <TabsTrigger value="history" className="py-4" data-testid="tab-history">History</TabsTrigger>
            </nav>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Cumulative Spend vs Ideal Target</h3>
                  <CumulativeSpendChart data={chartData} className="h-64" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Burn Rate</h3>
                  <div className="relative h-64">
                    <BurnDonut burnPercentage={metrics.burnPctMTD} className="h-full" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Recent Time Entries</h3>
                  <Card className="divide-y" data-testid="recent-time-entries">
                    {recentTimeEntries.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Time Entry</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(entry.start).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatHours(entry.hours)}</p>
                            <p className="text-sm text-muted-foreground">{formatCurrency(entry.costCents)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Variance Analysis</h3>
                  <div className="space-y-4">
                    <Card className={`p-4 ${
                      metrics.health === "ON_TRACK" ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" :
                      metrics.health === "OVER" ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800" :
                      "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {metrics.health === "ON_TRACK" ? (
                          <CheckCircle className="text-green-600 h-5 w-5" />
                        ) : (
                          <AlertTriangle className={`h-5 w-5 ${
                            metrics.health === "OVER" ? "text-red-600" : "text-yellow-600"
                          }`} />
                        )}
                        <span className="font-medium">
                          {metrics.health === "ON_TRACK" ? "On Track Performance" :
                           metrics.health === "OVER" ? "Over Budget Alert" : "Under Budget Warning"}
                        </span>
                      </div>
                      <p className="text-sm">
                        {metrics.health === "ON_TRACK" 
                          ? "Spending is within the healthy range (90-110% of ideal target)."
                          : metrics.health === "OVER"
                          ? "Spending has exceeded the ideal target by more than 10%."
                          : "Spending is significantly below the ideal target."
                        }
                      </p>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">MTD Hours</p>
                        <p className="text-xl font-bold text-foreground">
                          {burnSnapshots.reduce((sum, s) => Math.max(sum, s.hoursToDate), 0).toFixed(1)}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          vs target
                        </div>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Avg Hourly Rate</p>
                        <p className="text-xl font-bold text-foreground">
                          {formatCurrency(client.hourlyBlendedRateCents || 8500)}
                        </p>
                        <p className="text-xs text-muted-foreground">Blended rate</p>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="departments" className="mt-0">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Department Performance</h3>
                {departmentData?.departmentData?.map((dept: any) => (
                  <Card key={dept.departmentId} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{dept.departmentName}</h4>
                        <p className="text-sm text-muted-foreground">{dept.memberCount} members</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatHours(dept.hours)}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(dept.spendCents)}</p>
                      </div>
                    </div>
                  </Card>
                )) || (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No department data available</p>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-0">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Team Roster</h3>
                <div className="grid gap-4">
                  {teamMembers.map((member) => (
                    <Card key={member.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{member.name}</h4>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">
                            {/* Department name would be joined from departmentId */}
                            Team Member
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Historical Performance</h3>
                {historyData?.monthlySummaries?.map((summary: any) => (
                  <Card key={`${summary.year}-${summary.month}`} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">
                          {new Date(summary.year, summary.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h4>
                        <p className="text-sm text-muted-foreground">{formatHours(summary.totalHours)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(summary.totalSpendCents)}</p>
                        <p className={`text-sm ${summary.varianceCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {summary.varianceCents >= 0 ? '+' : ''}{formatCurrency(Math.abs(summary.varianceCents))}
                        </p>
                      </div>
                    </div>
                  </Card>
                )) || (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No historical data available</p>
                  </Card>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
