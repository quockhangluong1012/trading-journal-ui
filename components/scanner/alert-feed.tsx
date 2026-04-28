import { useScannerStore } from "@/lib/stores/scanner-store";
import { AlertCard } from "./alert-card";
import { Activity, BellOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function AlertFeed() {
  const { alerts, isLoading, dismissAlert } = useScannerStore();

  if (isLoading && (!alerts || alerts.length === 0)) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-lg border p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <BellOff className="h-6 w-6 opacity-50" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No Alerts Yet</h3>
        <p className="max-w-xs text-sm">
          Scanner alerts will appear here when ICT patterns are detected matching your criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> 
          Live Alerts
        </h2>
        <span className="text-sm text-muted-foreground">
          {alerts.length} active
        </span>
      </div>
      <ScrollArea className="h-[600px] pr-4">
        <div className="flex flex-col gap-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
