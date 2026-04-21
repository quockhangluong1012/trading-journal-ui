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
    { name: "Wins", value: wins, fill: "var(--success)" },
    { name: "Losses", value: losses, fill: "var(--destructive)" },
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
    <Card className="min-w-0 border-0 bg-card rounded-[1.5rem] shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all duration-500 hover:shadow-[0_8px_30px_-6px_rgba(6,81,237,0.12)] relative overflow-hidden flex flex-col h-full">
      <CardHeader className="pb-4 pt-6 px-6">
        <div className="space-y-1">
          <CardTitle className="text-[1.1rem] font-bold text-foreground">Win/Loss Ratio</CardTitle>
          <CardDescription className="text-sm font-medium text-muted-foreground">
            Performance breakdown of closed trades
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col justify-between">
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
                <p className="text-[1.75rem] font-bold text-success leading-none mb-1.5">{wins}</p>
                <p className="text-xs font-medium text-muted-foreground">Winning Trades</p>
              </div>
              <div className="text-center">
                <p className="text-[1.75rem] font-bold text-destructive leading-none mb-1.5">{losses}</p>
                <p className="text-xs font-medium text-muted-foreground">Losing Trades</p>
              </div>
              <div className="text-center">
                <p className="text-[1.75rem] font-bold text-foreground leading-none mb-1.5">{winRate}%</p>
                <p className="text-xs font-medium text-muted-foreground">Win Rate</p>
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  stroke="none"
                  paddingAngle={5}
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
