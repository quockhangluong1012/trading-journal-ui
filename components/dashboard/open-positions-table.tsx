"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api, ApiPaginatedResponse, type ApiResponse } from "@/lib/api"
import { CreateTradeDialog } from "@/components/create-trade-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpRight, ArrowDownRight, Eye } from "lucide-react"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"
import { EmotionTag, TradeHistory } from "@/app/types/trade"
import { EmotionType } from "@/lib/enum/EmotionType"
import { DashboardFilter } from "@/lib/enum/TradeEnum"

function getFromDateForFilter(filter: DashboardFilter): string | null {
  const now = new Date()
  switch (filter) {
    case DashboardFilter.OneDay:
      return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    case DashboardFilter.OneWeek:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case DashboardFilter.OneMonth:
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString()
    case DashboardFilter.ThreeMonth:
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString()
    case DashboardFilter.All:
    default:
      return null
  }
}

export function OpenPositionsTable({ refreshKey, filter }: { refreshKey?: number; filter: DashboardFilter }) {
  const [openPositions, setOpenPositions] = useState<TradeHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchOpenPositions = useCallback(async () => {
    try {
      setIsLoading(true)
      const fromDate = getFromDateForFilter(filter)
      const payload = {
        asset: "",
        position: null,
        status: TradeStatus.Open,
        fromDate: fromDate,
        toDate: null,
        page: 1,
        pageSize: 10
      }
      const response = await api.post<ApiPaginatedResponse<TradeHistory>>(
        "/v1/trade-histories/search",
        payload,
      );
      if (response.data?.isSuccess) {
        setOpenPositions(response.data.value.values);
      }
    } catch (error) {
      console.error("Failed to fetch open positions:", error)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchOpenPositions()
  }, [fetchOpenPositions, refreshKey])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const getPositionTypeLabel = (position: PositionType) => {
      switch (position) {
        case PositionType.Long:
          return "Long"
        case PositionType.Short:
          return "Short"
        default:
          return "All"
      }
    }
  
  return (
    <Card className="border-border bg-card min-w-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-foreground">
              Open Positions
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Currently active trades
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : openPositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">No open positions</p>
            <CreateTradeDialog onSuccess={fetchOpenPositions}>
              <Button variant="outline" className="mt-3">
                Create your first trade
              </Button>
            </CreateTradeDialog>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Asset</TableHead>
                  <TableHead className="text-muted-foreground">
                    Position
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Confidence Level
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Emotions
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Entry
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPositions.map((trade) => {
                  return (
                    <TableRow key={trade.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {trade.asset}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            trade.position === PositionType.Long
                              ? "bg-success/20 text-success"
                              : "bg-destructive/20 text-destructive"
                          }
                        >
                          {trade.position === PositionType.Long ? (
                            <ArrowUpRight className="mr-1 h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="mr-1 h-3 w-3" />
                          )}
                          {getPositionTypeLabel(trade.position)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                                (trade.confidenceLevel ?? 0) >= level
                                  ? "bg-primary"
                                  : "bg-secondary"
                              }`}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {trade.emotionTags.slice(0, 2).map((emotionTag: EmotionTag) => {
                            const label = emotionTag.name;
                            const category = emotionTag.emotionType;
                            const colorMap = {
                              [EmotionType.Positive]:
                                "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
                              [EmotionType.Negative]:
                                "bg-red-500/15 text-red-400 border-red-500/25",
                              [EmotionType.Neutral]:
                                "bg-blue-500/15 text-blue-400 border-blue-500/25",
                            };
                            return (
                              <span
                                key={emotionTag.id}
                                className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${colorMap[category]}`}
                              >
                                {label}
                              </span>
                            );
                          })}
                          {trade.emotionTags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{trade.emotionTags.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatCurrency(trade.entryPrice)}
                      </TableCell>
                      <TableCell className="">
                        <Link href={`/trade/${trade.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
