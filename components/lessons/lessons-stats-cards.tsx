"use client"

import { BookOpen, CheckCircle2, AlertTriangle, Shield, TrendingUp, TrendingDown, DollarSign, Link2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { LessonsDashboardDto } from "@/lib/lessons-api"

interface Props {
  dashboard: LessonsDashboardDto | null
  isLoading: boolean
}

export function LessonsStatsCards({ dashboard, isLoading }: Props) {
  if (isLoading || !dashboard) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-5">
              <Skeleton className="h-20 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const trendIcon = dashboard.disciplineScoreTrend >= 0
    ? <TrendingUp className="h-3.5 w-3.5" />
    : <TrendingDown className="h-3.5 w-3.5" />

  const trendColor = dashboard.disciplineScoreTrend >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-500 dark:text-red-400"

  const cards = [
    {
      title: "Total Lessons",
      value: dashboard.totalLessons,
      subtitle: `${dashboard.activeLessons} active`,
      icon: BookOpen,
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/25",
    },
    {
      title: "Applied",
      value: dashboard.appliedLessons,
      subtitle: dashboard.totalLessons > 0
        ? `${Math.round((dashboard.appliedLessons / dashboard.totalLessons) * 100)}% completion`
        : "No lessons yet",
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-green-600",
      shadow: "shadow-emerald-500/25",
    },
    {
      title: "Critical Pending",
      value: dashboard.criticalLessons,
      subtitle: dashboard.criticalLessons > 0 ? "Needs attention" : "All clear",
      icon: AlertTriangle,
      gradient: "from-amber-500 to-orange-600",
      shadow: "shadow-amber-500/25",
    },
    {
      title: "Discipline Score",
      value: `${dashboard.disciplineScore}%`,
      subtitle: (
        <span className={`flex items-center gap-1 ${trendColor}`}>
          {trendIcon}
          {Math.abs(dashboard.disciplineScoreTrend)}% vs last 30d
        </span>
      ),
      icon: Shield,
      gradient: dashboard.disciplineScore >= 80
        ? "from-emerald-500 to-green-600"
        : dashboard.disciplineScore >= 60
          ? "from-amber-500 to-orange-600"
          : "from-red-500 to-rose-600",
      shadow: dashboard.disciplineScore >= 80
        ? "shadow-emerald-500/25"
        : dashboard.disciplineScore >= 60
          ? "shadow-amber-500/25"
          : "shadow-red-500/25",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="glass-card group hover:scale-[1.02] transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {card.title}
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {card.value}
                </p>
                <div className="text-xs text-muted-foreground">
                  {card.subtitle}
                </div>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} ${card.shadow} shadow-lg transition-transform group-hover:scale-110`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
