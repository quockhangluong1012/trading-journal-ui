"use client";

import { useEffect } from "react";
import { useScannerStore } from "@/lib/stores/scanner-store";
import { useAuth } from "@/lib/auth-context";
import { WatchlistManager } from "@/components/scanner/watchlist-manager";
import { ScannerControl } from "@/components/scanner/scanner-control";
import { AlertFeed } from "@/components/scanner/alert-feed";
import { EconomicNewsBanner } from "@/components/scanner/economic-news-banner";
import { PreTradeCheckWidget } from "@/components/scanner/pre-trade-check-widget";
import { SmartScannerConfluenceCard } from "@/components/scanner/smart-scanner-confluence-card";
import { AppPageIntro } from "@/components/app-page-intro";
import { AppPageShell } from "@/components/app-page-shell";
import { Radar } from "lucide-react";

export default function ScannerPage() {
  const { user } = useAuth();
  const { connect, disconnect, alerts, watchlists } = useScannerStore();
  const scannerSymbols = [...new Set([
    ...alerts.map((alert) => alert.symbol),
    ...watchlists.flatMap((watchlist) => (watchlist.assets ?? []).map((asset) => asset.symbol)),
  ])];

  useEffect(() => {
    if (user?.token) {
      connect(user.token);
    }
    return () => {
      disconnect();
    };
  }, [user?.token, connect, disconnect]);

  if (!user) {
    return (
      <AppPageShell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="app-surface max-w-lg px-8 py-10 text-center">
            <Radar className="mx-auto mb-4 h-16 w-16 text-primary/55" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">Scanner Access Restricted</h2>
            <p className="text-muted-foreground">
              Sign in to access the algorithmic market scanner and real-time ICT pattern detection.
            </p>
          </div>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell className="selection:bg-primary/20" contentClassName="space-y-6">
          <AppPageIntro
            badge="Scanner workspace"
            icon={<Radar className="h-6 w-6" />}
            title="Algorithmic Scanner"
            description="Real-time multi-timeframe detection of ICT patterns across your watchlists."
            stats={[
              { label: "Active alerts", value: alerts.length },
              { label: "Watchlists", value: watchlists.length },
              { label: "Symbols tracked", value: scannerSymbols.length },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6 lg:col-span-1">
              <ScannerControl />
              <PreTradeCheckWidget />
              <SmartScannerConfluenceCard symbols={scannerSymbols} />
              <div className="h-100">
                <WatchlistManager />
              </div>
            </div>
            <div className="lg:col-span-2">
              <EconomicNewsBanner />
              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm min-h-150">
                <AlertFeed />
              </div>
            </div>
          </div>
    </AppPageShell>
  );
}
