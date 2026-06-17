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
    <Card className="dashboard-card flex h-full min-w-0 flex-col overflow-hidden">
      <CardHeader className="px-6 pb-4 pt-6">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground">Win/Loss Ratio</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Performance breakdown of closed trades
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between px-6 pb-6 pt-0">
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
            <div className="grid grid-cols-3 gap-3 pb-4">
              <div className="dashboard-tile p-3 text-center">
                <p className="mb-1.5 text-[1.75rem] font-bold leading-none text-success">{wins}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wins</p>
              </div>
              <div className="dashboard-tile p-3 text-center">
                <p className="mb-1.5 text-[1.75rem] font-bold leading-none text-destructive">{losses}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Losses</p>
              </div>
              <div className="dashboard-tile p-3 text-center">
                <p className="mb-1.5 text-[1.75rem] font-bold leading-none text-foreground">{winRate}%</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Win Rate</p>
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
