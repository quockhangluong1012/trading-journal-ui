"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Activity, Target } from "lucide-react"
import { api } from "@/lib/api"
import { DashboardStats } from "@/lib/dashboard-insights"
import { DashboardFilter } from "@/lib/enum/TradeEnum"

interface StatsCardsProps {
  filter: DashboardFilter
  stats?: DashboardStats
  isLoading?: boolean
}

const EMPTY_STATS: DashboardStats = {
  totalPnL: 0,
  winRate: 0,
  totalTrades: 0,
  openPositions: 0,
}

export function StatsCards({ filter, stats: providedStats, isLoading: providedLoading }: StatsCardsProps) {
  const [stats, setStats] = useState<DashboardStats>(providedStats ?? EMPTY_STATS)
  const [isLoading, setIsLoading] = useState(Boolean(providedLoading ?? !providedStats))

  useEffect(() => {
    if (providedStats) {
      setStats(providedStats)
    }

    if (typeof providedLoading === "boolean") {
      setIsLoading(providedLoading)
      return
    }

    if (providedStats) {
      setIsLoading(false)
      return
    }

    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const response = await api.get(`/v1/dashboard/statistics?filter=${filter}`)
        if (response.data) {
          const data = response.data.value ?? response.data
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard statistics:", error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchStats()
  }, [filter, providedLoading, providedStats])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const cards = [
    {
      title: "Total P&L",
      value: formatCurrency(stats.totalPnL),
      icon: stats.totalPnL >= 0 ? TrendingUp : TrendingDown,
      iconColor: stats.totalPnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      bgColor: stats.totalPnL >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20",
      cardStyle: stats.totalPnL >= 0 ? "border-emerald-500/30 bg-linear-to-br from-emerald-500/10 to-emerald-500/5 text-emerald-800 dark:text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-rose-500/30 bg-linear-to-br from-rose-500/10 to-rose-500/5 text-rose-800 dark:text-rose-100 shadow-[0_0_15px_rgba(243,62,88,0.1)]",
    },
    {
      title: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Target,
      iconColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/20",
      cardStyle: "border-blue-500/30 bg-linear-to-br from-blue-500/10 to-blue-500/5 text-blue-800 dark:text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.1)]",
    },
    {
      title: "Total Trades",
      value: stats.totalTrades.toString(),
      icon: Activity,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/20",
      cardStyle: "border-indigo-500/30 bg-linear-to-br from-indigo-500/10 to-indigo-500/5 text-indigo-800 dark:text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.1)]",
    },
    {
      title: "Open Positions",
      value: stats.openPositions.toString(),
      icon: TrendingUp,
      iconColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/20",
      cardStyle: "border-amber-500/30 bg-linear-to-br from-amber-500/10 to-amber-500/5 text-amber-800 dark:text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    },
  ]

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
      {isLoading
        ? cards.map((card) => (
            <Card key={card.title} className="border border-white/10 bg-card/60 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardContent className="p-7">
                <div className="flex items-center justify-between">
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-20 rounded-md bg-white/5" />
                    <Skeleton className="h-8 w-24 rounded-md bg-white/5" />
                  </div>
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                </div>
              </CardContent>
            </Card>
          ))
        : cards.map((card, index) => (
            <Card 
              key={card.title} 
              className={`group relative overflow-hidden border ${card.cardStyle} backdrop-blur-md transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_15px_40px_-10px_rgba(79,70,229,0.2)] rounded-[2rem] animate-in slide-in-from-bottom-[5%] fade-in`}
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <CardContent className="p-7">
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 transition-colors">{card.title}</p>
                    <p className="text-3xl font-extrabold tracking-tight mt-1">{card.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${card.bgColor} shadow-sm border border-white/20`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor} drop-shadow-sm`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
    </div>
  )
}
