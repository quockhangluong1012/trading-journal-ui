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
    <Card className="dashboard-card flex h-full min-w-0 flex-col overflow-hidden">
      <CardHeader className="px-6 pb-4 pt-6">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-6 pb-6 pt-0">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-18 w-full rounded-2xl" />
              <Skeleton className="h-18 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-65 w-full rounded-lg" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/30 text-sm text-muted-foreground">
            No closed trades in this period.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 pb-4">
              <div className="dashboard-tile">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {summaryLabel}
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
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
              <div className="dashboard-tile">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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