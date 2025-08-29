import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { SummaryStats } from "@/components/dashboard/summary-stats";
import { AnalyticsSummary } from "@/components/dashboard/analytics-summary";
import { Filters } from "@/components/dashboard/filters";
import { ClientGrid } from "@/components/dashboard/client-grid";
import { ClientTable } from "@/components/dashboard/client-table";
import { ClientDetail } from "@/components/client-detail/client-detail";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [accountManager, setAccountManager] = useState("all");
  const [healthStatus, setHealthStatus] = useState("all");
  const [department, setDepartment] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Fetch dashboard summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/dashboard/summary"]
  });

  // Fetch dashboard analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/dashboard/analytics"]
  });

  // Fetch clients with filters
  const queryParams = new URLSearchParams({
    status: "ACTIVE",
    ...(accountManager && accountManager !== "all" && { am: accountManager }),
    ...(healthStatus && healthStatus !== "all" && { health: healthStatus }),
    ...(department && department !== "all" && { dept: department }),
    ...(searchQuery && { search: searchQuery })
  });
  
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: [`/api/clients?${queryParams.toString()}`]
  });

  // Fetch departments for filter
  const { data: departmentsData } = useQuery({
    queryKey: ["/api/departments"]
  });

  const clients = (clientsData as any)?.clients || [];
  const departments = (departmentsData as any)?.departments || [];

  return (
    <div className="min-h-screen bg-background" data-testid="page-dashboard">
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <main className="container mx-auto px-6 py-8">
        <SummaryStats 
          data={summaryData as any}
          isLoading={summaryLoading}
        />

        <AnalyticsSummary 
          data={analyticsData as any}
          isLoading={analyticsLoading}
        />
        
        <Filters
          accountManager={accountManager}
          onAccountManagerChange={setAccountManager}
          healthStatus={healthStatus}
          onHealthStatusChange={setHealthStatus}
          department={department}
          onDepartmentChange={setDepartment}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          departments={departments}
        />
        
        {viewMode === "cards" ? (
          <ClientGrid 
            clients={clients}
            isLoading={clientsLoading}
          />
        ) : (
          <ClientTable
            clients={clients}
            isLoading={clientsLoading}
            onClientSelect={setSelectedClientId}
          />
        )}
      </main>

      {selectedClientId && (
        <ClientDetail
          clientId={selectedClientId}
          onClose={() => setSelectedClientId(null)}
        />
      )}
    </div>
  );
}
