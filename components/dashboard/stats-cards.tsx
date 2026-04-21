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
      iconColor: stats.totalPnL >= 0 ? "text-success" : "text-destructive",
      bgColor: stats.totalPnL >= 0 ? "bg-success/10" : "bg-destructive/10",
    },
    {
      title: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Target,
      iconColor: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Total Trades",
      value: stats.totalTrades.toString(),
      icon: Activity,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Open Positions",
      value: stats.openPositions.toString(),
      icon: TrendingUp,
      iconColor: "text-warning",
      bgColor: "bg-warning/10",
    },
  ]

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {isLoading
        ? cards.map((card) => (
            <Card key={card.title} className="border-0 bg-card rounded-3xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                </div>
              </CardContent>
            </Card>
          ))
        : cards.map((card, index) => (
            <Card 
              key={card.title} 
              className="group relative overflow-hidden border-0 bg-card shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_30px_-6px_rgba(6,81,237,0.12)] rounded-[1.5rem] animate-in slide-in-from-bottom-[5%] fade-in"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2 relative z-10">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
                  </div>
                  <div className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${card.bgColor} relative z-10`}>
                    <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
    </div>
  )
}
