"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { PieChart as PieIcon } from "lucide-react"
import { type CategoryBreakdownItem, LessonCategory, LessonCategoryLabels } from "@/lib/lessons-api"

interface Props {
  breakdown: CategoryBreakdownItem[]
  isLoading: boolean
}

const COLORS = [
  "oklch(0.6 0.22 277)",   // indigo
  "oklch(0.65 0.18 150)",  // green
  "oklch(0.7 0.18 45)",    // amber
  "oklch(0.6 0.2 25)",     // red
  "oklch(0.6 0.15 300)",   // purple
  "oklch(0.65 0.15 200)",  // teal
  "oklch(0.7 0.15 80)",    // yellow
  "oklch(0.55 0.15 340)",  // pink
  "oklch(0.5 0.1 240)",    // slate
]

export function CategoryBreakdownChart({ breakdown, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[250px] w-full rounded-lg" /></CardContent>
      </Card>
    )
  }

  const data = breakdown.map((item) => ({
    ...item,
    name: LessonCategoryLabels[item.category] ?? "Other",
  }))

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <PieIcon className="h-4 w-4 text-primary" />
          Lesson Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No lessons recorded yet. Create your first lesson!
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "0.8125rem",
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value} (${props?.payload?.percentage || 0}%)`,
                  "Lessons",
                ]}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
