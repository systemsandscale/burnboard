import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Grid3X3, Table } from "lucide-react";

interface FiltersProps {
  accountManager: string;
  onAccountManagerChange: (value: string) => void;
  healthStatus: string;
  onHealthStatusChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  viewMode: "cards" | "table";
  onViewModeChange: (mode: "cards" | "table") => void;
  departments?: Array<{ id: string; name: string }>;
}

export function Filters({
  accountManager,
  onAccountManagerChange,
  healthStatus,
  onHealthStatusChange,
  department,
  onDepartmentChange,
  viewMode,
  onViewModeChange,
  departments = []
}: FiltersProps) {
  const accountManagers = ["Sarah Johnson", "Mike Chen", "Emma Davis"];
  const healthOptions = ["Over Budget", "On Track", "Under Budget"];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6" data-testid="filters">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={accountManager} onValueChange={onAccountManagerChange}>
          <SelectTrigger className="w-48" data-testid="select-account-manager">
            <SelectValue placeholder="All Account Managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Account Managers</SelectItem>
            {accountManagers.map((am) => (
              <SelectItem key={am} value={am}>{am}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={healthStatus} onValueChange={onHealthStatusChange}>
          <SelectTrigger className="w-48" data-testid="select-health-status">
            <SelectValue placeholder="All Health Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health Status</SelectItem>
            <SelectItem value="OVER">Over Budget</SelectItem>
            <SelectItem value="ON_TRACK">On Track</SelectItem>
            <SelectItem value="UNDER">Under Budget</SelectItem>
          </SelectContent>
        </Select>

        <Select value={department} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-48" data-testid="select-department">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === "cards" ? "default" : "outline"}
          onClick={() => onViewModeChange("cards")}
          data-testid="button-view-cards"
        >
          <Grid3X3 className="mr-2 h-4 w-4" />
          Cards
        </Button>
        <Button
          variant={viewMode === "table" ? "default" : "outline"}
          onClick={() => onViewModeChange("table")}
          data-testid="button-view-table"
        >
          <Table className="mr-2 h-4 w-4" />
          Table
        </Button>
      </div>
    </div>
  );
}
