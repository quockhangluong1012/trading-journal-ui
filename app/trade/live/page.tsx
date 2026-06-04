"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { buildRedirectWithNext } from "@/lib/auth-redirect";
import { AppShellLoader } from "@/components/app-shell-loader";
import { LiveTradingViewWidget } from "@/components/trade/live-tradingview-widget";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function LiveTradePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(buildRedirectWithNext("/login", "/trade/live"));
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <AppShellLoader
        title="Loading live trade"
        description="Preparing your live trading workspace."
      />
    );
  }

  if (!user) {
    return (
      <AppShellLoader
        title="Redirecting to sign in"
        description="Taking you to the live trading workspace as soon as your session is ready."
      />
    );
  }

  return (
    <TooltipProvider disableHoverableContent>
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden p-3 sm:p-4">
          <LiveTradingViewWidget className="h-full" />
        </div>
      </div>
    </TooltipProvider>
  );
}
