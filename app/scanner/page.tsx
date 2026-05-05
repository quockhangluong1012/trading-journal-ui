"use client";

import { useEffect } from "react";
import { useScannerStore } from "@/lib/stores/scanner-store";
import { useAuth } from "@/lib/auth-context";
import { WatchlistManager } from "@/components/scanner/watchlist-manager";
import { ScannerControl } from "@/components/scanner/scanner-control";
import { AlertFeed } from "@/components/scanner/alert-feed";
import { EconomicNewsBanner } from "@/components/scanner/economic-news-banner";
import { PreTradeCheckWidget } from "@/components/scanner/pre-trade-check-widget";
import { Radar } from "lucide-react";
import { Header } from "@/components/header";

export default function ScannerPage() {
  const { user } = useAuth();
  const { connect, disconnect } = useScannerStore();

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
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Radar className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Scanner Access Restricted</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Please log in to access the algorithmic market scanner and real-time ICT pattern detection.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-slate-50 dark:bg-background overflow-hidden selection:bg-primary/20">
      {/* Dynamic Background Elements */}
      <div className="pointer-events-none absolute -inset-[10px] opacity-60 dark:opacity-40">
        <div className="absolute -top-24 -right-24 h-[600px] w-[600px] rounded-full bg-primary/10 dark:bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-[600px] w-[600px] rounded-full bg-secondary/20 dark:bg-secondary/20 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 dark:bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8 space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Radar className="h-8 w-8 text-primary" />
              Algorithmic Scanner
            </h1>
            <p className="text-muted-foreground">
              Real-time multi-timeframe detection of ICT patterns across your watchlists.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6 lg:col-span-1">
              <ScannerControl />
              <PreTradeCheckWidget />
              <div className="h-[400px]">
                <WatchlistManager />
              </div>
            </div>
            <div className="lg:col-span-2">
              <EconomicNewsBanner />
              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm min-h-[600px]">
                <AlertFeed />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
