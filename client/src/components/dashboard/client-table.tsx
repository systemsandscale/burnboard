import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown, Eye } from "lucide-react";
import type { ClientWithMetrics } from "@shared/schema";

interface ClientTableProps {
  clients: ClientWithMetrics[];
  isLoading?: boolean;
  onClientSelect?: (clientId: string) => void;
}

type SortField = "name" | "burnPctMTD" | "mtdSpendCents" | "varianceCents" | "accountManager";
type SortDirection = "asc" | "desc";

export function ClientTable({ clients, isLoading, onClientSelect }: ClientTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getHealthBadge = (health: "OVER" | "ON_TRACK" | "UNDER") => {
    const variants = {
      OVER: "destructive",
      ON_TRACK: "default", 
      UNDER: "secondary"
    } as const;
    
    const labels = {
      OVER: "Over Budget",
      ON_TRACK: "On Track",
      UNDER: "Under Budget"
    };

    return (
      <Badge variant={variants[health]} data-testid={`badge-health-${health.toLowerCase()}`}>
        {labels[health]}
      </Badge>
    );
  };

  const sortedClients = [...clients].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  if (isLoading) {
    return (
      <Card className="p-6" data-testid="client-table-loading">
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card className="p-6" data-testid="empty-state-clients-table">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No clients found matching your criteria.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="client-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("name")}
                className="h-auto p-0 font-semibold text-left justify-start"
                data-testid="sort-name"
              >
                Client Name
                {getSortIcon("name")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("accountManager")}
                className="h-auto p-0 font-semibold text-left justify-start"
                data-testid="sort-account-manager"
              >
                Account Manager
                {getSortIcon("accountManager")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("burnPctMTD")}
                className="h-auto p-0 font-semibold text-left justify-start"
                data-testid="sort-burn-rate"
              >
                Burn Rate
                {getSortIcon("burnPctMTD")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("mtdSpendCents")}
                className="h-auto p-0 font-semibold text-left justify-start"
                data-testid="sort-mtd-spend"
              >
                MTD Spend
                {getSortIcon("mtdSpendCents")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("varianceCents")}
                className="h-auto p-0 font-semibold text-left justify-start"
                data-testid="sort-variance"
              >
                Variance
                {getSortIcon("varianceCents")}
              </Button>
            </TableHead>
            <TableHead>Health Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedClients.map((client) => (
            <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
              <TableCell className="font-medium" data-testid={`text-client-name-${client.id}`}>
                {client.name}
              </TableCell>
              <TableCell data-testid={`text-account-manager-${client.id}`}>
                {client.accountManager}
              </TableCell>
              <TableCell data-testid={`text-burn-rate-${client.id}`}>
                {formatPercentage(client.burnPctMTD)}
              </TableCell>
              <TableCell data-testid={`text-mtd-spend-${client.id}`}>
                {formatCurrency(client.mtdSpendCents)}
              </TableCell>
              <TableCell data-testid={`text-variance-${client.id}`}>
                <span className={client.varianceCents >= 0 ? "text-red-600" : "text-green-600"}>
                  {formatCurrency(Math.abs(client.varianceCents))}
                  {client.varianceCents >= 0 ? " over" : " under"}
                </span>
              </TableCell>
              <TableCell data-testid={`health-status-${client.id}`}>
                {getHealthBadge(client.health)}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onClientSelect?.(client.id)}
                  data-testid={`button-view-client-${client.id}`}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}