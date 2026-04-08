"use client";

import { useEffect, useState } from "react";
import { useBacktestStore } from "@/lib/backtest-store";
import { format } from "date-fns";
import { Plus, Play, Info, Trash2, Activity } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateSessionModal } from "@/components/backtest/create-session-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function BacktestDashboard() {
  const { sessions, sessionsLoading, loadSessions, deleteSession } = useBacktestStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this session?")) {
      await deleteSession(id);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backtesting</h1>
          <p className="text-muted-foreground mt-1">
            Simulate trading strategies on historical data.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your Sessions</CardTitle>
          <CardDescription>
            Manage and resume your backtest workspaces
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading && sessions.length === 0 ? (
            <div className="flex justify-center p-8">
              <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed rounded-lg">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No sessions found</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Start your first backtest session to practice your strategies.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} variant="outline">
                Create Session
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead className="text-right">Initial Balance</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                    <TableHead className="text-right">PnL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.asset}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(session.startDate), "MMM dd, yyyy")} -{" "}
                          {session.endDate ? format(new Date(session.endDate), "MMM dd, yyyy") : "Present"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(session.initialBalance)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(session.currentBalance)}</TableCell>
                      <TableCell className="text-right">
                        <span className={session.pnlPercent > 0 ? "text-green-500" : session.pnlPercent < 0 ? "text-red-500" : ""}>
                          {session.pnlPercent > 0 ? "+" : ""}{session.pnlPercent.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            session.status === "InProgress" ? "default" :
                            session.status === "Completed" ? "secondary" : "destructive"
                          }
                        >
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {session.status === "InProgress" && (
                          <Button variant="ghost" size="icon" asChild title="Resume Workspace">
                            <Link href={`/backtest/${session.id}`}>
                              <Play className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" asChild title="View Analytics">
                          <Link href={`/backtest/${session.id}/results`}>
                            <Info className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(session.id)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateSessionModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
