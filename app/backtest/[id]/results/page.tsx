"use client";

import { useEffect, use } from "react";
import { useBacktestStore } from "@/lib/backtest-store";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Activity, TrendingUp, Target, BarChart2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Header } from "@/components/header";

export default function BacktestResults({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);
  const { loadAnalytics, analytics, analyticsLoading, session, loadSession } = useBacktestStore();

  useEffect(() => {
    loadSession(sessionId);
    loadAnalytics(sessionId);
  }, [sessionId, loadAnalytics, loadSession]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  if (analyticsLoading || !analytics || !session) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-7xl p-6">
        <Button variant="ghost" asChild className="mb-6">
        <Link href="/backtest">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sessions
        </Link>
      </Button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Session Results: {session.asset}</h1>
          <p className="text-muted-foreground mt-1">
            Ran from {format(new Date(session.startDate), "MMM dd, yyyy")} to {session.endDate ? format(new Date(session.endDate), "MMM dd, yyyy") : "Present"}
          </p>
        </div>
        <Badge variant={session.status === "Liquidated" ? "destructive" : "default"} className="text-lg py-1 px-4">
          {session.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="bg-card overflow-hidden relative border-border/50 shadow-sm hover:border-primary/20 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp strokeWidth={3} className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold tracking-tight ${analytics.netPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {analytics.netPnl >= 0 ? "+" : ""}{formatCurrency(analytics.netPnl)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card overflow-hidden relative border-border/50 shadow-sm hover:border-primary/20 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Target strokeWidth={3} className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{(analytics.winRate * 100).toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-card overflow-hidden relative border-border/50 shadow-sm hover:border-primary/20 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BarChart2 strokeWidth={3} className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline gap-2">
            <div className="text-3xl font-bold tracking-tight">{analytics.totalTrades}</div>
            <p className="text-sm text-muted-foreground font-medium">
              <span className="text-emerald-500">{analytics.totalWins}W</span> / <span className="text-rose-500">{analytics.totalLosses}L</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card overflow-hidden relative border-border/50 shadow-sm hover:border-primary/20 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertCircle strokeWidth={3} className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Max Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-rose-500">{(analytics.maxDrawdown * 100).toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Equity Curve</CardTitle>
            <CardDescription>Account balance over the backtest session.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {analytics.equityCurve.length === 0 ? (
              <div className="flex h-full items-center justify-center flex-col opacity-50">
                <Activity className="h-10 w-10 mb-2" />
                <p>No equity curve data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.equityCurve} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(tick) => format(new Date(tick), "MMM dd")}
                    minTickGap={50}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tickFormatter={(tick) => `$${tick.toLocaleString()}`}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => [formatCurrency(value), "Balance"]}
                    labelFormatter={(label) => format(new Date(label), "MMM dd, yyyy HH:mm")}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden mb-8">
        <CardHeader className="bg-secondary/20 border-b pb-4">
          <CardTitle>Trade Log</CardTitle>
          <CardDescription>Ledger of all executed positions during this backtest session.</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.tradeLog.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No trades were taken in this session.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Side</TableHead>
                    <TableHead>Entry Time</TableHead>
                    <TableHead className="text-right">Entry Price</TableHead>
                    <TableHead className="text-right">Exit Price</TableHead>
                    <TableHead className="text-center">Reason</TableHead>
                    <TableHead className="text-right">PnL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.tradeLog.map((trade) => (
                    <TableRow key={trade.id} className="hover:bg-secondary/40 transition-colors">
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`font-semibold ${trade.side === "Long" ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/10" : "border-rose-500/50 text-rose-500 bg-rose-500/10"}`}
                        >
                          {trade.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{format(new Date(trade.entryTime), "MMM dd, yyyy HH:mm")}</TableCell>
                      <TableCell className="text-right tabular-nums">{trade.entryPrice}</TableCell>
                      <TableCell className="text-right tabular-nums">{trade.exitPrice}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                          {trade.exitReason}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold tabular-nums ${trade.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {trade.pnl >= 0 ? "+" : ""}{formatCurrency(trade.pnl)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
