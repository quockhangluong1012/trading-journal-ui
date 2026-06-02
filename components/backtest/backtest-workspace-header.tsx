"use client";

import type { ReactNode } from "react";
import {
  Pause,
  Play,
  SkipForward,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PlaybackSpeed, Timeframe } from "@/lib/backtest-store";
import { cn } from "@/lib/utils";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

import {
  formatBacktestCurrency,
  getBacktestPnlClassName,
  getBacktestStatusClassName,
  getBacktestStatusLabel,
} from "./backtest-workspace-header.utils";

const TIMEFRAME_OPTIONS: Array<{ value: Timeframe; label: string }> = [
  { value: "M1", label: "1m" },
  { value: "M5", label: "5m" },
  { value: "M15", label: "15m" },
  { value: "H1", label: "1H" },
  { value: "H4", label: "4H" },
  { value: "D1", label: "1D" },
];

interface BacktestWorkspaceHeaderProps {
  asset: string;
  sessionStatus: string;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  activeTimeframe: Timeframe;
  isSwitchingTimeframe: boolean;
  formattedTimestamp: string;
  activePositionsCount: number;
  pendingOrdersCount: number;
  closedPositionsCount: number;
  balance: number;
  equity: number;
  unrealizedPnl: number;
  onTogglePlayback: () => void;
  onSkip: () => void;
  onPlaybackSpeedChange: (speed: PlaybackSpeed) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  finishAction?: ReactNode;
}

export function BacktestWorkspaceHeader({
  asset,
  sessionStatus,
  isPlaying,
  playbackSpeed,
  activeTimeframe,
  isSwitchingTimeframe,
  balance,
  equity,
  unrealizedPnl,
  onTogglePlayback,
  onSkip,
  onPlaybackSpeedChange,
  onTimeframeChange,
  finishAction,
}: BacktestWorkspaceHeaderProps) {
  const isVisible = useScrollDirection();

  const formattedBalance = formatBacktestCurrency(balance);
  const formattedEquity = formatBacktestCurrency(equity);
  const formattedUnrealizedPnl = formatBacktestCurrency(unrealizedPnl);
  const displayUnrealizedPnl = unrealizedPnl > 0 ? `+${formattedUnrealizedPnl}` : formattedUnrealizedPnl;
  const playbackLabel = isPlaying ? "Pause replay" : "Start replay";
  const statusLabel = getBacktestStatusLabel(sessionStatus);

  return (
    <section
      aria-label="Backtest workspace header"
      className={cn(
        "z-20 overflow-hidden border-b bg-background/95 px-4 py-1.5 backdrop-blur transition-all duration-300 supports-backdrop-filter:bg-background/80",
        isVisible ? "max-h-40" : "max-h-0 border-b-0 py-0",
      )}
    >
      <div className="rounded-xl border border-border/70 bg-linear-to-br from-card via-card to-primary/5 px-2.5 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* ── Left: Asset identity + financial metrics ── */}
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <h1 className="max-w-44 truncate text-lg font-semibold tracking-tight text-foreground sm:max-w-56" title={asset}>{asset}</h1>
            <Badge variant="outline" className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]", getBacktestStatusClassName(sessionStatus))}>
              {statusLabel}
            </Badge>

            {/* Separator */}
            <div aria-hidden="true" className="hidden sm:block h-6 w-px bg-border/60" />

            {/* Inline financial metrics */}
            <div className="hidden sm:flex items-center gap-1 text-sm">
              <span className="text-muted-foreground/70 font-medium">Bal</span>
              <span className="font-semibold tabular-nums text-foreground">{formattedBalance}</span>
              <span aria-hidden="true" className="mx-1 text-border/40 select-none">|</span>
              <span className="text-muted-foreground/70 font-medium">Eq</span>
              <span className="font-semibold tabular-nums text-foreground">{formattedEquity}</span>
              <span aria-hidden="true" className="mx-1 text-border/40 select-none">|</span>
              <span className="text-muted-foreground/70 font-medium">PnL</span>
              <span className={cn("font-semibold tabular-nums", getBacktestPnlClassName(unrealizedPnl))}>
                {displayUnrealizedPnl}
              </span>
            </div>

            {/* Mobile metrics (compact) */}
            <div className="flex sm:hidden items-center gap-1 text-xs">
              <span className="font-semibold tabular-nums text-foreground">{formattedBalance}</span>
              <span aria-hidden="true" className="text-border/40 select-none">·</span>
              <span className={cn("font-semibold tabular-nums", getBacktestPnlClassName(unrealizedPnl))}>
                {displayUnrealizedPnl}
              </span>
            </div>
          </div>

          {/* ── Right: Playback controls + finish action ── */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <Button
              type="button"
              className="h-8 shrink-0 rounded-md px-2.5 text-xs"
              onClick={onTogglePlayback}
            >
              {isPlaying ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
              {playbackLabel}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-8 shrink-0 rounded-md px-2.5 text-xs"
              onClick={onSkip}
              aria-label="Step forward one candle"
            >
              <SkipForward className="mr-1.5 h-3.5 w-3.5" />
              Next candle
            </Button>

            <Select
              value={playbackSpeed.toString()}
              onValueChange={(nextValue) => onPlaybackSpeedChange(Number.parseInt(nextValue, 10) as PlaybackSpeed)}
            >
              <SelectTrigger
                className="h-8 min-w-20 shrink-0 rounded-md border-border/70 bg-background/75 px-2 text-xs shadow-sm"
                aria-label="Playback speed"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x speed</SelectItem>
                <SelectItem value="2">2x speed</SelectItem>
                <SelectItem value="5">5x speed</SelectItem>
                <SelectItem value="10">10x speed</SelectItem>
              </SelectContent>
            </Select>

            <span className="shrink-0 text-[8px] font-medium uppercase tracking-[0.14em] text-muted-foreground">TF</span>

            <ToggleGroup
              type="single"
              value={activeTimeframe}
              variant="outline"
              aria-label="Chart timeframe"
              className="flex shrink-0 gap-1 rounded-md bg-muted/25 p-0.5"
              onValueChange={(nextValue) => {
                if (nextValue) {
                  onTimeframeChange(nextValue as Timeframe);
                }
              }}
            >
              {TIMEFRAME_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  disabled={isSwitchingTimeframe}
                  aria-label={`Switch to ${option.label} timeframe`}
                  className="h-7 min-w-9 rounded-sm border-border/70 bg-background/75 px-2 text-xs font-medium shadow-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {isSwitchingTimeframe ? (
              <Badge variant="outline" aria-live="polite" className="shrink-0 rounded-full border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">
                Updating
              </Badge>
            ) : null}

            {finishAction ? <div className="shrink-0">{finishAction}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
