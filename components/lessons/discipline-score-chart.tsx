"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Shield } from "lucide-react"
import type { DisciplineTimePoint } from "@/lib/lessons-api"
import { format, parseISO } from "date-fns"

interface Props {
  timeline: DisciplineTimePoint[]
  isLoading: boolean
}

export function DisciplineScoreChart({ timeline, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader><CardTitle>Discipline Score</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[250px] w-full rounded-lg" /></CardContent>
      </Card>
    )
  }

  const data = timeline.map((pt) => ({
    ...pt,
    label: format(parseISO(pt.date), "MMM d"),
  }))

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Shield className="h-4 w-4 text-primary" />
          Discipline Score (12 weeks)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No discipline logs yet. Start logging your rule checks!
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="disciplineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.6 0.22 277)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.6 0.22 277)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "0.8125rem",
                }}
                formatter={(value: number, name: string) => [`${value}%`, "Score"]}
                labelFormatter={(label) => `Week of ${label}`}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="oklch(0.6 0.22 277)"
                strokeWidth={2.5}
                fill="url(#disciplineGradient)"
                dot={{ r: 3, fill: "oklch(0.6 0.22 277)" }}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
