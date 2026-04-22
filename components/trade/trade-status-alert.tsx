import { Trade } from "@/lib/trade-store";
import { PositionType } from "@/lib/enum/PositionType";
import { TradeStatus } from "@/lib/enum/TradeStatus";
import { CheckCircle2, XCircle, AlertTriangle, Target, TrendingUp, TrendingDown } from "lucide-react";

export function TradeStatusAlert({
  trade,
  currentPrice,
}: {
  trade: Trade;
  currentPrice: number;
}) {
  const isLong = trade.position === PositionType.Long;
  const hasTargetTier1 = trade.targetTier1 > 0;
  const hasTargetTier2 = (trade.targetTier2 ?? 0) > 0;
  const hasTargetTier3 = (trade.targetTier3 ?? 0) > 0;
  const priceChangePercent =
    ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
  const adjustedPercent = isLong ? priceChangePercent : -priceChangePercent;

  // Determine alerts
  const isNearStopLoss = isLong
    ? currentPrice <= trade.stopLoss * 1.05 && currentPrice > trade.stopLoss
    : currentPrice >= trade.stopLoss * 0.95 && currentPrice < trade.stopLoss;
  const hitStopLoss = isLong
    ? currentPrice <= trade.stopLoss
    : currentPrice >= trade.stopLoss;
  const hitT1 = hasTargetTier1 &&
    (isLong
      ? currentPrice >= trade.targetTier1
      : currentPrice <= trade.targetTier1);
  const hitT2 = hasTargetTier2 &&
    (isLong
      ? currentPrice >= trade.targetTier2!
      : currentPrice <= trade.targetTier2!);
  const hitT3 = hasTargetTier3 &&
    (isLong
      ? currentPrice >= trade.targetTier3!
      : currentPrice <= trade.targetTier3!);

  if (trade.status === TradeStatus.Closed) {
    return (
      <div
        className={`rounded-lg p-4 ${(trade.pnl || 0) >= 0 ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"}`}
      >
        <div className="flex items-center gap-3">
          {(trade.pnl || 0) >= 0 ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <div>
            <p
              className={`font-medium ${(trade.pnl || 0) >= 0 ? "text-success" : "text-destructive"}`}
            >
              Trade Closed - {(trade.pnl || 0) >= 0 ? "Profit" : "Loss"}
            </p>
            <p className="text-sm text-muted-foreground">
              Closed on{" "}
              {new Date(trade.closedDate || "").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hitStopLoss) {
    return (
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Stop Loss Hit</p>
            <p className="text-sm text-muted-foreground">
              Consider closing this position to limit losses
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isNearStopLoss) {
    return (
      <div className="rounded-lg bg-warning/10 border border-warning/20 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div>
            <p className="font-medium text-warning">Approaching Stop Loss</p>
            <p className="text-sm text-muted-foreground">
              Price is within 5% of your stop loss level
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hitT3) {
    return (
      <div className="rounded-lg bg-success/10 border border-success/20 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-success">All Targets Hit</p>
            <p className="text-sm text-muted-foreground">
              Tier 3 target reached - consider taking profits
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hitT2) {
    return (
      <div className="rounded-lg bg-success/10 border border-success/20 p-4">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-success">Tier 2 Target Hit</p>
            <p className="text-sm text-muted-foreground">
              Consider partial profit taking or moving stop to breakeven
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hitT1) {
    return (
      <div className="rounded-lg bg-success/10 border border-success/20 p-4">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-success">Tier 1 Target Hit</p>
            <p className="text-sm text-muted-foreground">
              First target reached - trade is in profit
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-4 ${adjustedPercent >= 0 ? "bg-success/5 border border-success/10" : "bg-destructive/5 border border-destructive/10"}`}
    >
      <div className="flex items-center gap-3">
        {adjustedPercent >= 0 ? (
          <TrendingUp className="h-5 w-5 text-success" />
        ) : (
          <TrendingDown className="h-5 w-5 text-destructive" />
        )}
        <div>
          <p
            className={`font-medium ${adjustedPercent >= 0 ? "text-success" : "text-destructive"}`}
          >
            {adjustedPercent >= 0 ? "In Profit" : "In Loss"} (
            {adjustedPercent >= 0 ? "+" : ""}
            {adjustedPercent.toFixed(2)}%)
          </p>
          <p className="text-sm text-muted-foreground">
            Position is active and tracking
          </p>
        </div>
      </div>
    </div>
  );
}
