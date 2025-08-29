import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { CumulativeSpendChart } from "@/components/charts/cumulative-spend-chart";
import { BurnDonut } from "@/components/charts/burn-donut";
import { formatCurrency, formatHours, getHealthColor } from "@/lib/formatters";
import { calculateClientMetrics } from "@/lib/metrics";
import { ArrowLeft, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function ClientDetailPage() {
  const [, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const clientId = params?.id;

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
      <div className="min-h-screen bg-background">
        <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="container mx-auto px-6 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Skeleton className="h-64 w-full" />
              </div>
              <div>
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!data?.client) {
    return (
      <div className="min-h-screen bg-background">
        <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="container mx-auto px-6 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Client not found</p>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/")}
              className="mt-4"
            >
              Back to Dashboard
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const { client, teamMembers, recentTimeEntries, burnSnapshots } = data;

  const metrics = calculateClientMetrics(
    burnSnapshots.reduce((sum: number, snapshot: any) => Math.max(sum, snapshot.spendToDateCents), 0),
    client.monthlyRetainerAmountCents
  );

  // Generate chart data from burn snapshots
  const chartData = burnSnapshots.map((snapshot: any, index: number) => ({
    date: snapshot.date,
    actualSpend: snapshot.spendToDateCents,
    idealSpend: snapshot.targetSpendToDateCents,
    dayOfMonth: index + 1
  }));

  return (
    <div className="min-h-screen bg-background" data-testid="page-client-detail">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/")}
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-client-name">
                {client.name}
              </h1>
              <p className="text-muted-foreground" data-testid="text-page-client-info">
                {client.accountManager} • {formatCurrency(client.monthlyRetainerAmountCents)}/month
              </p>
            </div>
          </div>
          <Badge className={getHealthColor(metrics.health)} data-testid="badge-page-client-health">
            {metrics.health.replace('_', ' ')}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-page-overview">Overview</TabsTrigger>
            <TabsTrigger value="departments" data-testid="tab-page-departments">Departments</TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-page-team">Team</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-page-history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Cumulative Spend vs Ideal Target</h3>
                  <CumulativeSpendChart data={chartData} className="h-64" />
                </Card>
              </div>
              <div>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Burn Rate</h3>
                  <div className="relative h-64">
                    <BurnDonut burnPercentage={metrics.burnPctMTD} className="h-full" />
                  </div>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Time Entries</h3>
                <div className="space-y-3" data-testid="section-recent-entries">
                  {recentTimeEntries.slice(0, 5).map((entry: any) => (
                    <div key={entry.id} className="flex justify-between items-start p-3 bg-muted/20 rounded-lg">
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
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Variance Analysis</h3>
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/20 rounded-lg border">
                      <p className="text-sm text-muted-foreground">MTD Hours</p>
                      <p className="text-xl font-bold text-foreground">
                        {burnSnapshots.reduce((sum: number, s: any) => Math.max(sum, s.hoursToDate), 0).toFixed(1)}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        vs target
                      </div>
                    </div>
                    <div className="p-4 bg-muted/20 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Avg Hourly Rate</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(client.hourlyBlendedRateCents || 8500)}
                      </p>
                      <p className="text-xs text-muted-foreground">Blended rate</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="departments" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Department Performance</h3>
              <div className="space-y-4" data-testid="section-departments">
                {departmentData?.departmentData?.length > 0 ? (
                  departmentData.departmentData.map((dept: any) => (
                    <div key={dept.departmentId} className="flex justify-between items-center p-4 bg-muted/20 rounded-lg">
                      <div>
                        <h4 className="font-medium">{dept.departmentName}</h4>
                        <p className="text-sm text-muted-foreground">{dept.memberCount} members</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatHours(dept.hours)}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(dept.spendCents)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No department data available
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Team Roster</h3>
              <div className="grid gap-4" data-testid="section-team">
                {teamMembers?.length > 0 ? (
                  teamMembers.map((member: any) => (
                    <div key={member.id} className="flex justify-between items-center p-4 bg-muted/20 rounded-lg">
                      <div>
                        <h4 className="font-medium">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      <Badge variant="secondary">Team Member</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No team members assigned
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Historical Performance</h3>
              <div className="space-y-4" data-testid="section-history">
                {historyData?.monthlySummaries?.length > 0 ? (
                  historyData.monthlySummaries.map((summary: any) => (
                    <div key={`${summary.year}-${summary.month}`} className="flex justify-between items-center p-4 bg-muted/20 rounded-lg">
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
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No historical data available
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
