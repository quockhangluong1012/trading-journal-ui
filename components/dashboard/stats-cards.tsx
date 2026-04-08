"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Activity, Target } from "lucide-react"
import { api } from "@/lib/api"
import { DashboardFilter } from "@/lib/enum/TradeEnum"

interface DashboardStats {
  totalPnL: number
  winRate: number
  totalTrades: number
  openPositions: number
}

export function StatsCards({ filter }: { filter: DashboardFilter }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalPnL: 0,
    winRate: 0,
    totalTrades: 0,
    openPositions: 0
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get(`/v1/dashboard/statistics?filter=${filter}`)
        if (response.data) {
          const data = response.data.value ?? response.data
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard statistics:", error)
      }
    }

    fetchStats()
  }, [filter])

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border bg-card">
          <CardContent className="pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
              </div>
              <div className={`rounded-full p-3 ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
