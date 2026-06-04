"use client";

import { use, useEffect, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  LineChart,
  ListChecks,
  Play,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { AppPageShell } from "@/components/app-page-shell";
import { AppShellLoader } from "@/components/app-shell-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildRedirectWithNext } from "@/lib/auth-redirect";
import { useAuth } from "@/lib/auth-context";
import { useBacktestStore } from "@/lib/backtest-store";
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Present";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return format(date, "MMM dd, yyyy");
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return format(date, "MMM dd, yyyy HH:mm");
}

function getStatusMeta(status: string) {
  switch (status) {
    case "InProgress":
      return {
        label: "In progress",
        icon: Play,
        className: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300",
      };
    case "Completed":
      return {
        label: "Completed",
        icon: CheckCircle2,
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      };
    case "Liquidated":
      return {
        label: "Liquidated",
        icon: AlertCircle,
        className: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
      };
    default:
      return {
        label: status,
        icon: Clock3,
        className: "border-border/70 bg-muted/40 text-muted-foreground",
      };
  }
}

function getValueTone(value: number): string {
  if (value > 0) return "text-emerald-600 dark:text-emerald-300";
  if (value < 0) return "text-rose-600 dark:text-rose-300";
  return "text-muted-foreground";
}

function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={cn("h-8 gap-1.5 rounded-md px-3 text-xs font-semibold", meta.className)}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

function MetricTile({
  title,
  value,
  detail,
  icon: Icon,
  valueClassName,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-background/80 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-4 text-2xl font-bold tracking-tight tabular-nums", valueClassName)}>
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border/70 bg-background/80 text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function BacktestResults({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = Number.parseInt(resolvedParams.id, 10);
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { loadAnalytics, analytics, analyticsLoading, session, loadSession } = useBacktestStore();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname));
    }
  }, [isAuthLoading, pathname, router, user]);

  useEffect(() => {
    if (isAuthLoading || !user || Number.isNaN(sessionId)) return;

    void loadSession(sessionId);
    void loadAnalytics(sessionId);
  }, [isAuthLoading, loadAnalytics, loadSession, sessionId, user]);

  const equityData = useMemo(
    () =>
      analytics?.equityCurve.map((point) => ({
        ...point,
        displayTime: formatDateTime(point.timestamp),
      })) ?? [],
    [analytics],
  );

  if (isAuthLoading) {
    return <AppShellLoader title="Loading backtest results" description="Preparing the analytics workspace." />;
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />;
  }

  if (Number.isNaN(sessionId)) {
    return (
      <AppPageShell width="narrow">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
          <h1 className="text-xl font-semibold text-destructive">Invalid backtest session</h1>
          <p className="mt-2 text-sm text-muted-foreground">The session id in the URL is not valid.</p>
          <Button asChild className="mt-5 rounded-md">
            <Link href="/backtest">Back to Sessions</Link>
          </Button>
        </div>
      </AppPageShell>
    );
  }

  if (analyticsLoading || !analytics || !session) {
    return <AppShellLoader title="Loading session analytics" description="Calculating equity, trades, and risk metrics." />;
  }

  const netReturn = session.initialBalance > 0
    ? ((session.currentBalance - session.initialBalance) / session.initialBalance) * 100
    : 0;
  const grossLossAbs = Math.abs(analytics.grossLoss);
  const profitFactor = grossLossAbs > 0
    ? analytics.grossProfit / grossLossAbs
    : analytics.grossProfit > 0
      ? Number.POSITIVE_INFINITY
      : 0;
  const expectancy = analytics.totalTrades > 0 ? analytics.netPnl / analytics.totalTrades : 0;
  const winRatePercent = analytics.winRate * 100;
  const maxDrawdownPercent = analytics.maxDrawdown * 100;
  const profitFactorText = Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "No losses";

  return (
    <AppPageShell width="full" contentClassName="max-w-[1500px] space-y-6">
      <section className="rounded-lg border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-md sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <Button variant="ghost" asChild className="h-9 w-fit gap-2 rounded-md px-2 text-muted-foreground">
              <Link href="/backtest">
                <ArrowLeft className="h-4 w-4" />
                Sessions
              </Link>
            </Button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={session.status} />
                <Badge variant="outline" className="rounded-md border-border/70 bg-background/80 px-2.5 py-1 text-muted-foreground">
                  {formatDate(session.startDate)} - {formatDate(session.endDate)}
                </Badge>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                {session.asset} backtest results
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Final balance {formatCurrency(session.currentBalance)} from {formatCurrency(session.initialBalance)} starting capital.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {session.status === "InProgress" ? (
              <Button asChild className="h-10 gap-2 rounded-md">
                <Link href={`/backtest/${session.id}`}>
                  <Play className="h-4 w-4" />
                  Resume Replay
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild className="h-10 gap-2 rounded-md">
              <Link href="/backtest">
                <ListChecks className="h-4 w-4" />
                Session Ledger
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          title="Net PnL"
          value={formatCurrency(analytics.netPnl)}
          detail={`${formatPercent(netReturn)} account return`}
          icon={WalletCards}
          valueClassName={getValueTone(analytics.netPnl)}
        />
        <MetricTile
          title="Win rate"
          value={`${winRatePercent.toFixed(2)}%`}
          detail={`${analytics.totalWins} wins, ${analytics.totalLosses} losses`}
          icon={Target}
        />
        <MetricTile
          title="Profit factor"
          value={profitFactorText}
          detail={`${formatCurrency(analytics.grossProfit)} gross profit`}
          icon={Trophy}
        />
        <MetricTile
          title="Max drawdown"
          value={`${maxDrawdownPercent.toFixed(2)}%`}
          detail={`${formatCurrency(expectancy)} expectancy per trade`}
          icon={TrendingDown}
          valueClassName="text-rose-600 dark:text-rose-300"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card/90 shadow-sm backdrop-blur-md">
          <div className="border-b border-border/60 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-background/80 text-primary">
                <LineChart className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-semibold">Equity curve</h2>
                <p className="text-sm text-muted-foreground">Balance progression through the replay.</p>
              </div>
            </div>
          </div>
          <div className="h-[420px] p-4">
            {equityData.length === 0 ? (
              <EmptyPanel
                icon={Activity}
                title="No equity curve data"
                description="The replay did not produce balance snapshots for this session."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
                  <XAxis
                    dataKey="timestamp"
                    minTickGap={48}
                    tickFormatter={(value) => format(new Date(value), "MMM dd")}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    width={82}
                    domain={["auto", "auto"]}
                    tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => [formatCurrency(value), "Balance"]}
                    labelFormatter={(value) => formatDateTime(String(value))}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill="url(#equityFill)"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-background/80 text-primary">
              <BarChart3 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold">Trade summary</h2>
              <p className="text-sm text-muted-foreground">{analytics.totalTrades} closed trades</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wins</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">{analytics.totalWins}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.max(0, Math.min(winRatePercent, 100))}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Gross profit</p>
                <p className="mt-1 font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
                  {formatCurrency(analytics.grossProfit)}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Gross loss</p>
                <p className="mt-1 font-semibold tabular-nums text-rose-600 dark:text-rose-300">
                  {formatCurrency(grossLossAbs)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Session cursor</p>
              <p className="mt-1 font-semibold">{formatDateTime(session.currentTimestamp)}</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card/90 shadow-sm backdrop-blur-md">
        <div className="border-b border-border/60 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-background/80 text-primary">
              <ListChecks className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold">Trade ledger</h2>
              <p className="text-sm text-muted-foreground">Executed positions recorded during this replay.</p>
            </div>
          </div>
        </div>

        {analytics.tradeLog.length === 0 ? (
          <EmptyPanel
            icon={ListChecks}
            title="No trades in this session"
            description="The session completed without a recorded entry and exit pair."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">Side</TableHead>
                <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">Entry time</TableHead>
                <TableHead className="h-11 px-4 text-right text-xs uppercase tracking-[0.12em] text-muted-foreground">Entry</TableHead>
                <TableHead className="h-11 px-4 text-right text-xs uppercase tracking-[0.12em] text-muted-foreground">Exit</TableHead>
                <TableHead className="h-11 px-4 text-right text-xs uppercase tracking-[0.12em] text-muted-foreground">Size</TableHead>
                <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">Reason</TableHead>
                <TableHead className="h-11 px-4 text-right text-xs uppercase tracking-[0.12em] text-muted-foreground">PnL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.tradeLog.map((trade) => (
                <TableRow key={trade.id} className="hover:bg-muted/35">
                  <TableCell className="px-4 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md px-2.5 py-1 font-semibold",
                        trade.side === "Long"
                          ? "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
                      )}
                    >
                      {trade.side === "Long" ? <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> : <TrendingDown className="mr-1.5 h-3.5 w-3.5" />}
                      {trade.side}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-4 font-medium">{formatDateTime(trade.entryTime)}</TableCell>
                  <TableCell className="px-4 py-4 text-right tabular-nums">{trade.entryPrice}</TableCell>
                  <TableCell className="px-4 py-4 text-right tabular-nums">{trade.exitPrice}</TableCell>
                  <TableCell className="px-4 py-4 text-right tabular-nums">{trade.positionSize}</TableCell>
                  <TableCell className="px-4 py-4">
                    <Badge variant="outline" className="rounded-md border-border/70 bg-background/80 px-2.5 py-1 text-xs">
                      {trade.exitReason}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("px-4 py-4 text-right font-semibold tabular-nums", getValueTone(trade.pnl))}>
                    {trade.pnl >= 0 ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </AppPageShell>
  );
}
