"use client";

import { useEffect, useState, useCallback } from "react";
import { scannerApi, PreTradeCheckDto } from "@/lib/scanner-api";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface PreTradeCheckWidgetProps {
  symbol?: string;
  compact?: boolean;
}

export function PreTradeCheckWidget({ symbol, compact = false }: PreTradeCheckWidgetProps) {
  const [check, setCheck] = useState<PreTradeCheckDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadCheck = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await scannerApi.getPreTradeCheck(symbol);
      setCheck(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to load pre-trade check:", error);
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    loadCheck();
    const interval = setInterval(loadCheck, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, [loadCheck]);

  if (isLoading && !check) {
    return (
      <div className={`rounded-xl border bg-card p-4 animate-pulse ${compact ? "" : "shadow-sm"}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-48 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!check) return null;

  const config = {
    Green: {
      icon: ShieldCheck,
      bgClass: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      textColor: "text-emerald-800 dark:text-emerald-300",
      pulseBar: "bg-emerald-500",
      glow: "shadow-emerald-500/10",
    },
    Yellow: {
      icon: ShieldAlert,
      bgClass: "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20",
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      iconColor: "text-amber-600 dark:text-amber-400",
      textColor: "text-amber-800 dark:text-amber-300",
      pulseBar: "bg-amber-500 animate-pulse",
      glow: "shadow-amber-500/10",
    },
    Red: {
      icon: ShieldX,
      bgClass: "border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20",
      iconBg: "bg-red-100 dark:bg-red-900/40",
      iconColor: "text-red-600 dark:text-red-400",
      textColor: "text-red-800 dark:text-red-300",
      pulseBar: "bg-red-500 animate-pulse",
      glow: "shadow-red-500/10",
    },
  }[check.safetyLevel] ?? {
    icon: Shield, bgClass: "border-border bg-card", iconBg: "bg-muted",
    iconColor: "text-muted-foreground", textColor: "text-foreground",
    pulseBar: "bg-muted", glow: "",
  };

  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`relative overflow-hidden rounded-lg border p-3 transition-all ${config.bgClass} ${config.glow}`}>
        <div className={`absolute top-0 left-0 h-full w-1 ${config.pulseBar}`} />
        <div className="flex items-center gap-2.5 pl-2">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
          <span className={`text-sm font-medium ${config.textColor}`}>
            {check.safetyLevel === "Green" ? "Safe to trade" :
             check.safetyLevel === "Yellow" ? "Caution" : "Stop trading"}
          </span>
          {check.minutesUntilNextHighImpact && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {check.minutesUntilNextHighImpact}m
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border shadow-sm transition-all ${config.bgClass} ${config.glow}`}>
      <div className={`absolute top-0 left-0 h-full w-1.5 ${config.pulseBar}`} />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-full p-2 ${config.iconBg}`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div>
              <h3 className={`font-semibold text-sm ${config.textColor}`}>
                Pre-Trade Safety Check
              </h3>
              <p className={`mt-1 text-sm ${config.textColor} opacity-90`}>
                {check.message}
              </p>

              {check.recommendedWaitMinutes > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                  <Clock className="h-3.5 w-3.5" />
                  Wait {check.recommendedWaitMinutes} minutes before trading
                </div>
              )}

              {check.upcomingDangerEvents.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {check.upcomingDangerEvents.slice(0, 3).map((evt) => (
                    <div key={evt.id} className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span className="font-medium">{evt.eventName}</span>
                      <span className="text-muted-foreground">({evt.currency})</span>
                      {evt.minutesUntilRelease && (
                        <span className="ml-auto text-muted-foreground">in {evt.minutesUntilRelease}m</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={loadCheck}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors"
            title="Refresh check"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {lastRefresh && (
          <p className="mt-2 text-[10px] text-muted-foreground text-right">
            Updated {format(lastRefresh, "HH:mm:ss")}
          </p>
        )}
      </div>
    </div>
  );
}
