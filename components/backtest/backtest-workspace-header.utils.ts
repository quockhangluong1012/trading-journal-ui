export type BacktestPnlTone = "positive" | "negative" | "neutral";

export function formatBacktestCurrency(value: number): string {
  const absoluteValue = Math.abs(value);
  const maximumFractionDigits = absoluteValue > 0 && absoluteValue < 0.01 ? 5 : 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
}

export function getBacktestPnlTone(value: number): BacktestPnlTone {
  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "neutral";
}

export function getBacktestPnlClassName(value: number): string {
  const tone = getBacktestPnlTone(value);

  if (tone === "positive") {
    return "text-emerald-500";
  }

  if (tone === "negative") {
    return "text-rose-500";
  }

  return "text-foreground";
}

export function getBacktestStatusLabel(status: string): string {
  if (status === "InProgress") {
    return "In progress";
  }

  if (status === "Completed") {
    return "Completed";
  }

  if (status === "Liquidated") {
    return "Liquidated";
  }

  return status;
}

export function getBacktestStatusClassName(status: string): string {
  if (status === "Completed") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (status === "Liquidated") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300";
  }

  return "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300";
}

export function getBacktestStatusSummary(status: string): string {
  if (status === "Completed") {
    return "Replay is closed. Review the final state or open the results page.";
  }

  if (status === "Liquidated") {
    return "Session liquidated. Review the order flow and risk before restarting.";
  }

  return "Replay is live. Step through candles or adjust the pace as needed.";
}
