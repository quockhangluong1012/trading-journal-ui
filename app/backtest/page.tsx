"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  Info,
  LineChart,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import * as signalR from "@microsoft/signalr";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";

import { AppPageShell } from "@/components/app-page-shell";
import { AppShellLoader } from "@/components/app-shell-loader";
import { CreateSessionModal } from "@/components/backtest/create-session-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { useBacktestStore, type BacktestSessionSummary } from "@/lib/backtest-store";
import { cn } from "@/lib/utils";

type StatusFilter = "All" | "InProgress" | "Completed" | "Liquidated";

const STATUS_FILTERS: StatusFilter[] = ["All", "InProgress", "Completed", "Liquidated"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatSessionDate(value: string | null | undefined): string {
  if (!value) {
    return "Present";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return format(date, "MMM dd, yyyy");
}

function formatSessionDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not started";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

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
        icon: AlertTriangle,
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

function getPnlClassName(value: number): string {
  if (value > 0) {
    return "text-emerald-600 dark:text-emerald-300";
  }

  if (value < 0) {
    return "text-rose-600 dark:text-rose-300";
  }

  return "text-muted-foreground";
}

function getSessionPriority(session: BacktestSessionSummary): number {
  if (session.status === "InProgress") return 0;
  if (session.status === "Completed") return 1;
  if (session.status === "Liquidated") return 2;
  return 3;
}

function buildStats(sessions: BacktestSessionSummary[]) {
  const active = sessions.filter((session) => session.status === "InProgress").length;
  const completed = sessions.filter((session) => session.status === "Completed").length;
  const liquidated = sessions.filter((session) => session.status === "Liquidated").length;
  const ready = sessions.filter((session) => session.isDataReady).length;
  const netPnl = sessions.reduce(
    (sum, session) => sum + (session.currentBalance - session.initialBalance),
    0,
  );
  const averageReturn =
    sessions.length > 0
      ? sessions.reduce((sum, session) => sum + session.pnlPercent, 0) / sessions.length
      : 0;
  const profitable = sessions.filter((session) => session.pnlPercent > 0).length;
  const profitableRate = sessions.length > 0 ? (profitable / sessions.length) * 100 : 0;

  return {
    total: sessions.length,
    active,
    completed,
    liquidated,
    ready,
    netPnl,
    averageReturn,
    profitableRate,
  };
}

function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={cn("h-7 gap-1.5 rounded-md px-2.5 text-xs font-semibold", meta.className)}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

function StatTile({
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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/80 text-muted-foreground">
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

function SessionActions({
  session,
  isDeleting,
  onDelete,
}: {
  session: BacktestSessionSummary;
  isDeleting: boolean;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {session.status === "InProgress" ? (
        <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 rounded-md px-2.5">
          <Link href={`/backtest/${session.id}`}>
            <Play className="h-3.5 w-3.5" />
            Resume
          </Link>
        </Button>
      ) : null}

      <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5 rounded-md px-2.5">
        <Link href={`/backtest/${session.id}/results`}>
          <Info className="h-3.5 w-3.5" />
          Results
        </Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
            disabled={isDeleting}
            title="Delete session"
            aria-label={`Delete ${session.asset} session`}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backtest session?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {session.asset} session and its replay state. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => onDelete(session.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SessionsSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="grid gap-3 rounded-lg border border-border/60 bg-background/60 p-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_120px]">
          <div className="h-5 animate-pulse rounded-md bg-muted" />
          <div className="h-5 animate-pulse rounded-md bg-muted" />
          <div className="h-5 animate-pulse rounded-md bg-muted" />
          <div className="h-5 animate-pulse rounded-md bg-muted" />
          <div className="h-5 animate-pulse rounded-md bg-muted" />
          <div className="h-5 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptySessions({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center border-t border-border/60 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border/70 bg-background/80 text-muted-foreground">
        {hasFilters ? <Search className="h-6 w-6" /> : <Database className="h-6 w-6" />}
      </div>
      <h3 className="mt-5 text-lg font-semibold">
        {hasFilters ? "No sessions match the current view" : "No backtest sessions yet"}
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {hasFilters
          ? "Adjust the search text or status filter to widen the session list."
          : "Create a session to replay historical candles, place orders, and review the resulting trade log."}
      </p>
      {!hasFilters ? (
        <Button onClick={onCreate} className="mt-5 h-10 gap-2 rounded-md">
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      ) : null}
    </div>
  );
}

function MobileSessionList({
  sessions,
  deletingId,
  onDelete,
}: {
  sessions: BacktestSessionSummary[];
  deletingId: number | null;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="divide-y divide-border/60 lg:hidden">
      {sessions.map((session) => (
        <article key={session.id} className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/80 text-primary">
                  <LineChart className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">{session.asset}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatSessionDate(session.startDate)} - {formatSessionDate(session.endDate)}
                  </p>
                </div>
              </div>
            </div>
            <StatusBadge status={session.status} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">Current balance</p>
              <p className="mt-1 font-semibold tabular-nums">{formatCurrency(session.currentBalance)}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">Return</p>
              <p className={cn("mt-1 font-semibold tabular-nums", getPnlClassName(session.pnlPercent))}>
                {formatPercent(session.pnlPercent)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge
              variant="outline"
              className={cn(
                "rounded-md border-border/70 px-2.5 py-1 text-xs",
                session.isDataReady
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-300",
              )}
            >
              {session.isDataReady ? "Data ready" : "Preparing data"}
            </Badge>
            <SessionActions
              session={session}
              isDeleting={deletingId === session.id}
              onDelete={onDelete}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

export default function BacktestDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { sessions, sessionsLoading, loadSessions, deleteSession } = useBacktestStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const toastIdRef = useRef<string | number>("");

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname));
    }
  }, [user, isAuthLoading, pathname, router]);

  useEffect(() => {
    if (isAuthLoading || !user) return;

    void loadSessions();

    const hubUrl = process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/hubs/backtest`
      : "https://localhost:7139/hubs/backtest";

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          try {
            const stored = localStorage.getItem("trading-journey-auth-user");
            if (stored) {
              const authUser = JSON.parse(stored);
              return authUser?.token || "";
            }
          } catch {
            return "";
          }
          return "";
        },
      })
      .withAutomaticReconnect()
      .build();

    connection.on(
      "DataProgress",
      (data: { asset: string; totalCandles: number; importedCandles: number; totalExpected: number }) => {
        const formattedImported = new Intl.NumberFormat("en-US").format(data.importedCandles);
        const formattedTotal = new Intl.NumberFormat("en-US").format(data.totalExpected);
        const message = `Importing ${data.asset}: ${formattedImported} / ${formattedTotal} candles`;

        if (!toastIdRef.current) {
          toastIdRef.current = toast.loading(message, { duration: 10000 });
        } else {
          toast.loading(message, { id: toastIdRef.current, duration: 10000 });
        }

        if (data.importedCandles >= data.totalExpected) {
          toast.success(
            `${data.asset} import completed. Total: ${new Intl.NumberFormat("en-US").format(data.totalCandles)}`,
            { id: toastIdRef.current },
          );
          toastIdRef.current = "";
          void loadSessions();
        }
      },
    );

    connection.start().catch((error) => console.error("SignalR Connection Error:", error));

    return () => {
      void connection.stop();
    };
  }, [isAuthLoading, loadSessions, user]);

  const stats = useMemo(() => buildStats(sessions), [sessions]);

  const filteredSessions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return sessions
      .filter((session) => {
        const matchesStatus = statusFilter === "All" || session.status === statusFilter;
        const matchesSearch = !query || session.asset.toLowerCase().includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((left, right) => {
        const priorityDelta = getSessionPriority(left) - getSessionPriority(right);
        if (priorityDelta !== 0) return priorityDelta;

        return new Date(right.createdDate).getTime() - new Date(left.createdDate).getTime();
      });
  }, [searchTerm, sessions, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      All: sessions.length,
      InProgress: stats.active,
      Completed: stats.completed,
      Liquidated: stats.liquidated,
    }),
    [sessions.length, stats.active, stats.completed, stats.liquidated],
  );

  const hasFilters = statusFilter !== "All" || searchTerm.trim().length > 0;

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteSession(id);
      toast.success("Backtest session deleted.");
    } catch {
      toast.error("Failed to delete backtest session.");
    } finally {
      setDeletingId(null);
    }
  };

  if (isAuthLoading) {
    return <AppShellLoader title="Loading backtesting" description="Gathering your session details." />;
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />;
  }

  return (
    <AppPageShell width="full" contentClassName="max-w-[1500px] space-y-6">
      <section className="rounded-lg border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-md sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="flex w-fit items-center gap-1 rounded-lg border border-border/70 bg-background/75 p-1 shadow-sm">
              <Button variant="ghost" size="sm" asChild className="h-8 rounded-md px-3 text-xs">
                <Link href="/">Live Desk</Link>
              </Button>
              <Button size="sm" className="h-8 rounded-md px-3 text-xs" asChild>
                <Link href="/backtest">Backtest Lab</Link>
              </Button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
                  Replay workspace
                </Badge>
                <Badge variant="outline" className="rounded-md border-border/70 bg-background/80 px-2.5 py-1 text-muted-foreground">
                  {stats.ready}/{stats.total || 0} data ready
                </Badge>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Backtest command center
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review replay sessions, resume active workspaces, and compare results from historical market runs.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-md"
              onClick={() => void loadSessions()}
              disabled={sessionsLoading}
            >
              <RefreshCw className={cn("h-4 w-4", sessionsLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)} className="h-10 gap-2 rounded-md">
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          title="Active sessions"
          value={stats.active.toString()}
          detail={`${stats.completed} completed, ${stats.liquidated} liquidated`}
          icon={Activity}
        />
        <StatTile
          title="Net PnL"
          value={formatCompactCurrency(stats.netPnl)}
          detail={`${formatPercent(stats.averageReturn)} average return`}
          icon={WalletCards}
          valueClassName={getPnlClassName(stats.netPnl)}
        />
        <StatTile
          title="Profitable runs"
          value={`${stats.profitableRate.toFixed(0)}%`}
          detail={`${stats.total} total replay sessions`}
          icon={TrendingUp}
        />
        <StatTile
          title="Data readiness"
          value={`${stats.ready}/${stats.total || 0}`}
          detail="Sessions ready for clean replay"
          icon={Database}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card/90 shadow-sm backdrop-blur-md">
        <div className="space-y-4 border-b border-border/60 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold">Session ledger</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredSessions.length} of {sessions.length} sessions shown
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search assets"
                  className="h-10 rounded-md border-border/70 bg-background/75 pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((filterValue) => {
              const isActive = statusFilter === filterValue;
              const meta = filterValue === "All" ? null : getStatusMeta(filterValue);
              const Icon = filterValue === "All" ? BarChart3 : meta?.icon ?? Clock3;

              return (
                <Button
                  key={filterValue}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filterValue)}
                  className="h-9 shrink-0 gap-2 rounded-md px-3 text-xs"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {filterValue === "All" ? "All" : getStatusMeta(filterValue).label}
                  <span className={cn("rounded bg-background/20 px-1.5 py-0.5 tabular-nums", !isActive && "bg-muted text-muted-foreground")}>
                    {statusCounts[filterValue]}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {sessionsLoading && sessions.length === 0 ? (
          <SessionsSkeleton />
        ) : filteredSessions.length === 0 ? (
          <EmptySessions hasFilters={hasFilters} onCreate={() => setIsCreateModalOpen(true)} />
        ) : (
          <>
            <MobileSessionList
              sessions={filteredSessions}
              deletingId={deletingId}
              onDelete={(id) => void handleDelete(id)}
            />

            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">Asset</TableHead>
                    <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">Date range</TableHead>
                    <TableHead className="h-11 px-4 text-right text-xs uppercase tracking-[0.12em] text-muted-foreground">Balance</TableHead>
                    <TableHead className="h-11 px-4 text-right text-xs uppercase tracking-[0.12em] text-muted-foreground">Return</TableHead>
                    <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">Status</TableHead>
                    <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">Data</TableHead>
                    <TableHead className="h-11 px-4 text-right text-xs uppercase tracking-[0.12em] text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id} className="group hover:bg-muted/35">
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/80 text-primary">
                            <LineChart className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-semibold">{session.asset}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Created {formatSessionDateTime(session.createdDate)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span>{formatSessionDate(session.startDate)} - {formatSessionDate(session.endDate)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Candle cursor {formatSessionDateTime(session.currentTimestamp)}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <p className="font-semibold tabular-nums">{formatCurrency(session.currentBalance)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          from {formatCurrency(session.initialBalance)}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <div className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", getPnlClassName(session.pnlPercent))}>
                          {session.pnlPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {formatPercent(session.pnlPercent)}
                        </div>
                        <p className={cn("mt-1 text-xs tabular-nums", getPnlClassName(session.currentBalance - session.initialBalance))}>
                          {formatCurrency(session.currentBalance - session.initialBalance)}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <StatusBadge status={session.status} />
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-md border-border/70 px-2.5 py-1 text-xs",
                            session.isDataReady
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-300",
                          )}
                        >
                          {session.isDataReady ? "Ready" : "Preparing"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <SessionActions
                          session={session}
                          isDeleting={deletingId === session.id}
                          onDelete={(id) => void handleDelete(id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <CreateSessionModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </AppPageShell>
  );
}
