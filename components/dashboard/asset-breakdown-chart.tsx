"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import type { AssetBreakdown } from "@/lib/analytics-api"
import {
  buildAssetBreakdownChartData,
  type AssetBreakdownMetric,
} from "@/lib/dashboard-insights"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

interface AssetBreakdownChartProps {
  title: string
  description: string
  data: AssetBreakdown[]
  metric: AssetBreakdownMetric
  isLoading?: boolean
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

export function AssetBreakdownChart({
  title,
  description,
  data,
  metric,
  isLoading = false,
}: AssetBreakdownChartProps) {
  const { chartData, totalPnl, totalTrades, leadingAsset } = useMemo(
    () => buildAssetBreakdownChartData(data, metric),
    [data, metric],
  )

  const isPnlMetric = metric === "pnl"
  const chartConfig = isPnlMetric
    ? { pnl: { label: "P&L", color: "#22c55e" } }
    : { count: { label: "Trades", color: "#3b82f6" } }

  const summaryLabel = isPnlMetric ? "Net P&L" : "Trades logged"
  const summaryValue = isPnlMetric
    ? currencyFormatter.format(totalPnl)
    : integerFormatter.format(totalTrades)
  const leadingLabel = isPnlMetric ? "Biggest move" : "Most traded"
  const leadingValue = leadingAsset
    ? isPnlMetric
      ? `${leadingAsset.asset} ${currencyFormatter.format(leadingAsset.pnl)}`
      : `${leadingAsset.asset} ${integerFormatter.format(leadingAsset.count)} trades`
    : "No data"

  return (
    <Card className="min-w-0 border border-white/10 bg-card/60 backdrop-blur-xl rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 hover:shadow-[0_15px_40px_-10px_rgba(79,70,229,0.2)] hover:border-white/20 relative overflow-hidden flex flex-col h-full group">
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <CardHeader className="pb-4 pt-6 px-6 relative z-10">
        <div className="space-y-1">
          <CardTitle className="text-[1.1rem] font-bold text-foreground">{title}</CardTitle>
          <CardDescription className="text-sm font-medium text-muted-foreground">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col relative z-10">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-18 w-full rounded-2xl" />
              <Skeleton className="h-18 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-65 w-full rounded-lg" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-sm text-muted-foreground">
            No closed trades in this period.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 pb-4">
              <div className="rounded-2xl bg-white/5 border border-white/5 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {summaryLabel}
                </p>
                <p
                  className={`mt-1 text-2xl font-extrabold drop-shadow-sm ${
                    isPnlMetric
                      ? totalPnl >= 0
                        ? "text-success"
                        : "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {summaryValue}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/5 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {leadingLabel}
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">{leadingValue}</p>
              </div>
            </div>

            <ChartContainer config={chartConfig} className="h-65 w-full" style={{ aspectRatio: "auto" }}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 16, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) =>
                    isPnlMetric
                      ? currencyFormatter.format(Number(value))
                      : integerFormatter.format(Number(value))
                  }
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="asset"
                  type="category"
                  width={56}
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                {isPnlMetric ? <ReferenceLine x={0} stroke="#9ca3af" strokeDasharray="3 3" /> : null}
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        isPnlMetric
                          ? currencyFormatter.format(Number(value))
                          : `${integerFormatter.format(Number(value))} trades`
                      }
                      labelFormatter={(label) => String(label)}
                    />
                  }
                />
                <Bar
                  dataKey={metric}
                  radius={[0, 10, 10, 0]}
                  fill={isPnlMetric ? "var(--success)" : "#3b82f6"}
                  maxBarSize={28}
                >
                  {isPnlMetric
                    ? chartData.map((item) => (
                        <Cell
                          key={item.asset}
                          fill={item.pnl >= 0 ? "var(--success)" : "var(--destructive)"}
                        />
                      ))
                    : null}
                </Bar>
              </BarChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}