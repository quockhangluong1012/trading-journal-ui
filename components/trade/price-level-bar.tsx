import { Trade } from "@/lib/trade-store";
import { PositionType } from "@/lib/enum/PositionType";
import { formatTradePrice } from "@/lib/trade-price-format";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Target, DollarSign } from "lucide-react";

export function PriceLevelBar({
  trade,
  currentPrice,
}: {
  trade: Trade;
  /** Real market/exit price. Omit (or pass null) when no live price exists. */
  currentPrice?: number | null;
}) {
  const isLong = trade.position === PositionType.Long;
  const hasTargetTier1 = trade.targetTier1 > 0;
  const hasTargetTier2 = (trade.targetTier2 ?? 0) > 0;
  const hasTargetTier3 = (trade.targetTier3 ?? 0) > 0;
  const hasLivePrice = typeof currentPrice === "number" && currentPrice > 0;

  // Calculate positions relative to a range
  const prices = [
    trade.stopLoss,
    trade.entryPrice,
    trade.targetTier1,
    trade.targetTier2,
    trade.targetTier3,
    hasLivePrice ? currentPrice : undefined,
  ].filter((p): p is number => typeof p === "number" && p > 0);

  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;
  const range = maxPrice - minPrice;

  const getPosition = (price: number) => ((price - minPrice) / range) * 100;

  const entryPos = getPosition(trade.entryPrice);
  const currentPos = hasLivePrice ? getPosition(currentPrice) : null;
  const stopPos = getPosition(trade.stopLoss);
  const t1Pos = hasTargetTier1 ? getPosition(trade.targetTier1) : null;
  const t2Pos = hasTargetTier2 ? getPosition(trade.targetTier2!) : null;
  const t3Pos = hasTargetTier3 ? getPosition(trade.targetTier3!) : null;

  // Determine if targets are hit (only meaningful with a real current price)
  const t1Hit = hasLivePrice && hasTargetTier1 &&
    (isLong
      ? currentPrice >= trade.targetTier1
      : currentPrice <= trade.targetTier1);
  const t2Hit = hasLivePrice && hasTargetTier2 &&
    (isLong
      ? currentPrice >= trade.targetTier2!
      : currentPrice <= trade.targetTier2!);
  const t3Hit = hasLivePrice && hasTargetTier3 &&
    (isLong
      ? currentPrice >= trade.targetTier3!
      : currentPrice <= trade.targetTier3!);
  const stopHit = hasLivePrice &&
    (isLong ? currentPrice <= trade.stopLoss : currentPrice >= trade.stopLoss);

  return (
    <div className="space-y-4">
      <div className="relative h-12 rounded-lg bg-secondary/50">
        {/* Progress fill from entry to current (only when a live price exists) */}
        {hasLivePrice && currentPos !== null && (
          <div
            className={`absolute top-0 h-full rounded-lg transition-all ${
              (isLong && currentPrice >= trade.entryPrice) ||
              (!isLong && currentPrice <= trade.entryPrice)
                ? "bg-success/20"
                : "bg-destructive/20"
            }`}
            style={{
              left: `${Math.min(entryPos, currentPos)}%`,
              width: `${Math.abs(currentPos - entryPos)}%`,
            }}
          />
        )}

        {/* Stop Loss marker */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`absolute top-0 h-full w-1 ${stopHit ? "bg-destructive" : "bg-destructive/60"}`}
                style={{ left: `${stopPos}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Shield
                    className={`h-4 w-4 ${stopHit ? "text-destructive" : "text-destructive/60"}`}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stop Loss: {formatTradePrice(trade.stopLoss)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Entry marker */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute top-0 h-full w-1 bg-foreground"
                style={{ left: `${entryPos}%` }}
              >
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
                  Entry
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Entry: {formatTradePrice(trade.entryPrice)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Target markers */}
        {t1Pos !== null && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`absolute top-0 h-full w-1 ${t1Hit ? "bg-success" : "bg-success/40"}`}
                  style={{ left: `${t1Pos}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <Target
                      className={`h-4 w-4 ${t1Hit ? "text-success" : "text-success/40"}`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>T1: {formatTradePrice(trade.targetTier1)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {t2Pos !== null && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`absolute top-0 h-full w-1 ${t2Hit ? "bg-success" : "bg-success/40"}`}
                  style={{ left: `${t2Pos}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <Target
                      className={`h-4 w-4 ${t2Hit ? "text-success" : "text-success/40"}`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>T2: {formatTradePrice(trade.targetTier2)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {t3Pos !== null && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`absolute top-0 h-full w-1 ${t3Hit ? "bg-success" : "bg-success/40"}`}
                  style={{ left: `${t3Pos}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <Target
                      className={`h-4 w-4 ${t3Hit ? "text-success" : "text-success/40"}`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>T3: {formatTradePrice(trade.targetTier3)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Current price indicator (only when a live price exists) */}
        {hasLivePrice && currentPos !== null && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-accent border-2 border-background flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                  style={{
                    left: `${currentPos}%`,
                    transform: `translateX(-50%) translateY(-50%)`,
                  }}
                >
                  <DollarSign className="h-3 w-3 text-accent-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Current: {formatTradePrice(currentPrice)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {!hasLivePrice && (
        <p className="text-center text-xs text-muted-foreground">
          Showing planned stop, entry, and target levels. Live price tracking
          isn&apos;t connected yet.
        </p>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-destructive" />
          <span>Stop Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-0.5 bg-foreground" />
          <span>Entry</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="h-3 w-3 text-success" />
          <span>Targets</span>
        </div>
        {hasLivePrice && (
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-accent" />
            <span>Current</span>
          </div>
        )}
      </div>
    </div>
  );
}
