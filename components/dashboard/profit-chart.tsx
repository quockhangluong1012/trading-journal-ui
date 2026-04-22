"use client"

import { useEffect, useMemo, useState } from "react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { buildProfitChartData, ProfitTrajectoryPoint } from "@/lib/dashboard-insights"
import { DashboardFilter } from "@/lib/enum/TradeEnum"

interface ProfitChartProps {
  filter: DashboardFilter
  profitTrajectory?: ProfitTrajectoryPoint[]
  isLoading?: boolean
}

export function ProfitChart({ filter, profitTrajectory: providedTrajectory, isLoading: providedLoading }: ProfitChartProps) {
  const [profitTrajectory, setProfitTrajectory] = useState<ProfitTrajectoryPoint[]>(providedTrajectory ?? [])
  const [isLoading, setIsLoading] = useState(Boolean(providedLoading ?? !providedTrajectory))

  useEffect(() => {
    if (providedTrajectory) {
      setProfitTrajectory(providedTrajectory)
    }

    if (typeof providedLoading === "boolean") {
      setIsLoading(providedLoading)
      return
    }

    if (providedTrajectory) {
      setIsLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const response = await api.get(`/v1/dashboard/profit-trajectory?filter=${filter}`)
        if (response.data.isSuccess) {
          setProfitTrajectory(response.data.value)
        }
      } catch (error) {
        console.error("Failed to fetch profit trajectory", error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [filter, providedLoading, providedTrajectory])

  const { chartData, totalPnL } = useMemo(
    () => buildProfitChartData(profitTrajectory),
    [profitTrajectory],
  )

  const chartConfig = {
    profit: {
      label: "Cumulative Profit",
      color: "#22c55e",
    },
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card className="min-w-0 border border-white/10 bg-card/60 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 hover:shadow-[0_15px_40px_-10px_rgba(79,70,229,0.2)] hover:border-white/20 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <CardHeader className="pb-4 pt-6 px-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-[1.1rem] font-bold text-foreground">
              Profit Trajectory
            </CardTitle>
            <CardDescription className="text-sm font-medium text-muted-foreground">
              Cumulative profit over time
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 relative z-10">
        {isLoading ? (
          <div className="space-y-4">
            <div className="mb-4 flex items-baseline gap-2">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <Skeleton className="h-62.5 w-full rounded-lg" />
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-4 rounded-2xl bg-white/5 border border-white/5 p-4 backdrop-blur-sm max-w-xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Total P&L</span>
                <span
                  className={`text-3xl font-extrabold drop-shadow-sm ${
                    totalPnL >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatCurrency(totalPnL)}
                </span>
              </div>
            </div>
            <ChartContainer
              config={chartConfig}
              className="h-62.5 w-full"
              style={{ aspectRatio: "auto" }}
            >
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="profitGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--success)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--success)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "transparent" }}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(value as number)}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--success)"
                  strokeWidth={2}
                  fill="url(#profitGradient)"
                  name="Profit"
                />
              </AreaChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
