import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { toast } = useToast();
  const [hourlyRate, setHourlyRate] = useState("");

  // Fetch current hourly rate setting
  const { data: hourlyRateData } = useQuery({
    queryKey: ["/api/settings/hourly_rate"],
    enabled: open
  });

  // Set the form value when data loads
  useState(() => {
    if ((hourlyRateData as any)?.setting?.value) {
      setHourlyRate((hourlyRateData as any).setting.value);
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, valueType }: { key: string; value: string; valueType?: string }) => {
      const response = await apiRequest("POST", "/api/settings", {
        key,
        value,
        valueType: valueType || "string"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
      console.error("Settings update error:", error);
    }
  });

  const handleSave = () => {
    if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid hourly rate greater than 0.",
        variant: "destructive",
      });
      return;
    }

    updateSettingMutation.mutate({
      key: "hourly_rate",
      value: hourlyRate,
      valueType: "number"
    });
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? "$0.00" : `$${num.toFixed(2)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="settings-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your BurnBoard settings and preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Hourly Rate Setting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Billing & Revenue
              </CardTitle>
              <CardDescription>
                Set your standard hourly rate for calculating lost revenue from overserving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hourly-rate" className="text-right">
                  Hourly Rate
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="hourly-rate"
                      type="number"
                      placeholder="150.00"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="pl-8"
                      data-testid="input-hourly-rate"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">per hour</span>
                </div>
              </div>
              
              {hourlyRate && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>Preview:</strong> Your hourly rate is set to{" "}
                    <span className="font-medium text-green-600">
                      {formatCurrency(hourlyRate)}
                    </span>{" "}
                    per hour.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This rate will be used to calculate lost revenue when clients are overserved.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Future Settings Placeholder */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="text-lg">Team & Departments</CardTitle>
              <CardDescription>
                Manage team member assignments and department configurations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">
                Coming soon: Team management and department settings
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettingMutation.isPending}
            data-testid="button-save"
          >
            {updateSettingMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}