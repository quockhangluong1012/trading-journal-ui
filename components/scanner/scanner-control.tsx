import { useScannerStore } from "@/lib/stores/scanner-store";
import { ScannerStatus } from "@/lib/scanner-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, Radar, ServerCrash, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ScannerControl() {
  const { status, watchlists, startScanner, stopScanner } = useScannerStore();
  const runningWatchlists = watchlists.filter((w) => w.isScannerRunning);
  const isRunning = runningWatchlists.length > 0;
  const isError = status.status === ScannerStatus.Error;

  const totalAssetsMonitored = runningWatchlists.reduce(
    (sum, w) => sum + w.assets.length,
    0
  );

  const handleToggle = async () => {
    if (isRunning) {
      await stopScanner();
    } else {
      await startScanner();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Radar className={`h-5 w-5 ${isRunning ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
          Scanner Engine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${
                isRunning ? "bg-emerald-500 animate-pulse" : 
                isError ? "bg-red-500" : "bg-gray-400"
              }`} />
              <span className="font-medium">
                {isRunning ? "Running" : isError ? "Error" : "Stopped"}
              </span>
            </div>
            {status.lastScanTime && (
              <p className="text-xs text-muted-foreground">
                Last scan: {formatDistanceToNow(new Date(status.lastScanTime), { addSuffix: true })}
              </p>
            )}
          </div>

          <Button 
            onClick={handleToggle}
            variant={isRunning ? "destructive" : "default"}
            className="w-28"
            title={isRunning ? "Stop all watchlist scanners" : "Start all watchlist scanners"}
          >
            {isRunning ? (
              <>
                <Square className="mr-2 h-4 w-4 fill-current" /> Stop All
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4 fill-current" /> Start All
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{runningWatchlists.length}</span>
            <span className="text-xs text-muted-foreground">Scanning</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{totalAssetsMonitored}</span>
            <span className="text-xs text-muted-foreground">Assets</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{status.activeAlerts}</span>
            <span className="text-xs text-muted-foreground">Alerts</span>
          </div>
        </div>

        {/* Per-watchlist status chips */}
        {runningWatchlists.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Active Scanners
            </p>
            <div className="flex flex-wrap gap-1.5">
              {runningWatchlists.map((w) => (
                <span
                  key={w.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {w.name}
                  <span className="text-emerald-600/60 dark:text-emerald-400/60">
                    ({w.assets.length})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {isError && (
          <div className="mt-4 p-3 bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-md flex items-start gap-2">
            <ServerCrash className="h-5 w-5 shrink-0 mt-0.5" />
            <p>The scanner engine encountered an error. Please try restarting it or check your connection.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
