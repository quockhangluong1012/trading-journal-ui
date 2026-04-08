"use client"

import { useState, useEffect } from "react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { api } from "@/lib/api"
import { DashboardFilter } from "@/lib/enum/TradeEnum"

export function ProfitChart({ filter }: { filter: DashboardFilter }) {
  const [chartData, setChartData] = useState<{ date: string; profit: number }[]>([])
  const [totalPnL, setTotalPnL] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(`/v1/dashboard/profit-trajectory?filter=${filter}`)
        if (response.data.isSuccess) {
          let cumulativeProfit = 0
          const formattedData = response.data.value.map((item: any) => {
            cumulativeProfit += item.pnL
            return {
              date: item.date,
              profit: cumulativeProfit,
            }
          })
          setChartData(formattedData)
          setTotalPnL(cumulativeProfit)
        }
      } catch (error) {
        console.error("Failed to fetch profit trajectory", error)
      }
    }
    fetchData()
  }, [filter])

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
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-foreground">Profit Trajectory</CardTitle>
            <CardDescription className="text-muted-foreground">
              Cumulative profit over time
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold ${
              totalPnL >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {formatCurrency(totalPnL)}
          </span>
          <span className="text-sm text-muted-foreground">Total P&L</span>
        </div>
        <ChartContainer config={chartConfig} className="h-[250px] w-full" style={{ aspectRatio: "auto" }}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#374151" }}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
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
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#profitGradient)"
                name="Profit"
              />
            </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
