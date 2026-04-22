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
    <Card className="min-w-0 border border-white/10 bg-card/60 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 hover:shadow-[0_15px_40px_-10px_rgba(79,70,229,0.2)] hover:border-white/20 relative overflow-hidden flex flex-col h-full group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <CardHeader className="pb-4 pt-6 px-6 relative z-10">
        <div className="space-y-1">
          <CardTitle className="text-[1.1rem] font-bold text-foreground">Win/Loss Ratio</CardTitle>
          <CardDescription className="text-sm font-medium text-muted-foreground">
            Performance breakdown of closed trades
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col justify-between relative z-10">
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
              <div className="text-center rounded-2xl bg-white/5 border border-white/5 p-3 backdrop-blur-sm transition-transform hover:scale-105">
                <p className="text-[1.75rem] font-bold text-success leading-none mb-1.5 drop-shadow-sm">{wins}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wins</p>
              </div>
              <div className="text-center rounded-2xl bg-white/5 border border-white/5 p-3 backdrop-blur-sm transition-transform hover:scale-105">
                <p className="text-[1.75rem] font-bold text-destructive leading-none mb-1.5 drop-shadow-sm">{losses}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Losses</p>
              </div>
              <div className="text-center rounded-2xl bg-white/5 border border-white/5 p-3 backdrop-blur-sm transition-transform hover:scale-105">
                <p className="text-[1.75rem] font-bold text-foreground leading-none mb-1.5 drop-shadow-sm">{winRate}%</p>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Win Rate</p>
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
