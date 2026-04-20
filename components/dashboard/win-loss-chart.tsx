"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { api, ApiResponse } from "@/lib/api"
import { WinLossData } from "@/app/types/trade"
import { DashboardFilter } from "@/lib/enum/TradeEnum"

interface WinLossChartProps {
  filter: DashboardFilter
  data?: WinLossData[]
  isLoading?: boolean
}

export function WinLossChart({ filter, data: providedData, isLoading: providedLoading }: WinLossChartProps) {
  const [data, setData] = useState<WinLossData[]>(providedData ?? [])
  const [isLoading, setIsLoading] = useState(Boolean(providedLoading ?? !providedData))

  useEffect(() => {
    if (providedData) {
      setData(providedData)
    }

    if (typeof providedLoading === "boolean") {
      setIsLoading(providedLoading)
      return
    }

    if (providedData) {
      setIsLoading(false)
      return
    }

    async function fetchWinLossRatio() {
      try {
        setIsLoading(true)
        const response = await api.get<ApiResponse<WinLossData[]>>(
          `/v1/dashboard/win-loss-ratio?filter=${filter}`,
        );

        const data = response.data

        if (data.isSuccess) {
          setData(data.value)
        }
      } catch (error) {
        console.error("Failed to fetch win-loss ratio", error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchWinLossRatio()
  }, [filter, providedData, providedLoading])

  const wins = data.find((d) => d.name === "Wins")?.value || 0
  const losses = data.find((d) => d.name === "Losses")?.value || 0
  const total = wins + losses
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0

  const chartData = [
    { name: "Wins", value: wins, fill: "#22c55e" },
    { name: "Losses", value: losses, fill: "#ef4444" },
  ]

  const chartConfig = {
    wins: {
      label: "Wins",
      color: "#22c55e",
    },
    losses: {
      label: "Losses",
      color: "#ef4444",
    },
  }

  return (
    <Card className="border-border bg-card min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">Win/Loss Ratio</CardTitle>
        <CardDescription className="text-muted-foreground">
          Performance breakdown of closed trades
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 pb-4">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 pb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{wins}</p>
                <p className="text-xs text-muted-foreground">Winning Trades</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{losses}</p>
                <p className="text-xs text-muted-foreground">Losing Trades</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{winRate}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
              </PieChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
