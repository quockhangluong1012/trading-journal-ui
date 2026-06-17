"use client"

import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, FilePenLine } from "lucide-react"

import type { TradeHistory } from "@/app/types/trade"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"

interface MissingTradeNotesCardProps {
  trades: TradeHistory[]
  isLoading: boolean
}

const tradeDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatTradeDate(dateValue: Date): string {
  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date"
  }

  return tradeDateFormatter.format(parsedDate)
}

export function MissingTradeNotesCard({ trades, isLoading }: MissingTradeNotesCardProps) {
  return (
    <Card className="dashboard-card min-w-0 overflow-hidden">
      <CardHeader className="px-6 pb-4 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <FilePenLine className="h-4.5 w-4.5 text-primary" />
              Trades needing notes
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Finish the journal entries you skipped so review data stays trustworthy.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
            {trades.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-0">
        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : trades.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-5 text-sm text-emerald-700 dark:text-emerald-300">
            All caught up. Every trade in this filter window already has notes.
          </div>
        ) : (
          <div className="max-h-104 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Asset</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Position</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Opened</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => {
                  const formattedDate = formatTradeDate(trade.date)

                  return (
                    <TableRow key={trade.id} className="border-border/30 transition-colors hover:bg-muted/50">
                      <TableCell className="font-semibold text-foreground">{trade.asset}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            trade.position === PositionType.Long
                              ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-300"
                              : "bg-red-500/15 text-red-500 dark:text-red-300"
                          }
                        >
                          {trade.position === PositionType.Long ? (
                            <ArrowUpRight className="mr-1 h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="mr-1 h-3 w-3" />
                          )}
                          {trade.position === PositionType.Long ? "Long" : "Short"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                          {trade.status === TradeStatus.Open ? "Open" : "Closed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formattedDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="gap-2" asChild>
                          <Link href={`/trade/${trade.id}`} aria-label={`Add notes for ${trade.asset} trade from ${formattedDate}`}>
                            <FilePenLine className="h-4 w-4" />
                            Add notes
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}