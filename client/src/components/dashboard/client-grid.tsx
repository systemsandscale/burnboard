import { ClientCard } from "./client-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import type { ClientWithMetrics } from "@shared/schema";

interface ClientGridProps {
  clients: ClientWithMetrics[];
  isLoading?: boolean;
  onClientSelect?: (clientId: string) => void;
}

export function ClientGrid({ clients, isLoading, onClientSelect }: ClientGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8" data-testid="client-grid-loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-2 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12" data-testid="empty-state-clients">
        <p className="text-muted-foreground">No clients found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8" data-testid="client-grid">
      {clients.map((client) => (
        <ClientCard 
          key={client.id} 
          client={client}
          onSelect={onClientSelect}
        />
      ))}
    </div>
  );
}
