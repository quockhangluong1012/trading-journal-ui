import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EquityPoint } from "@/lib/analytics-api"

export function PerformanceHeatmap({ data }: { data: EquityPoint[] }) {
  // We need daily PNLs, but equityData is cumulative profit over time.
  // We should compute daily PNLs from the equity points.
  const dailyPnls = useMemo(() => {
    const pnlMap = new Map<string, number>()
    let previousProfit = 0
    
    data.forEach((point, index) => {
      const pnl = index === 0 ? point.profit : point.profit - previousProfit
      previousProfit = point.profit
      
      const dateStr = new Date(point.date).toISOString().split('T')[0]
      pnlMap.set(dateStr, (pnlMap.get(dateStr) || 0) + pnl)
    })
    
    return pnlMap
  }, [data])

  // Generate the last 365 days
  const calendarDays = useMemo(() => {
    const days = []
    const today = new Date()
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const pnl = dailyPnls.get(dateStr) || 0
      days.push({ date: d, dateStr, pnl })
    }
    return days
  }, [dailyPnls])

  if (data.length === 0) {
    return (
      <div className="flex h-50 items-center justify-center text-sm text-muted-foreground">
        No daily performance data yet
      </div>
    )
  }

  // Weeks organization for the grid
  const weeks: { date: Date; dateStr: string; pnl: number }[][] = []
  let currentWeek: { date: Date; dateStr: string; pnl: number }[] = []
  
  // Pad the first week if it doesn't start on Sunday
  if (calendarDays.length > 0) {
    const firstDay = calendarDays[0].date.getDay()
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push({ date: new Date(0), dateStr: "", pnl: 0 })
    }
  }

  calendarDays.forEach((day) => {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  const getColor = (pnl: number) => {
    if (pnl === 0) return "bg-secondary/30 border-border/30"
    if (pnl > 0) {
      if (pnl > 500) return "bg-emerald-500 border-emerald-600"
      if (pnl > 100) return "bg-emerald-400 border-emerald-500"
      return "bg-emerald-300 border-emerald-400"
    }
    if (pnl < -500) return "bg-red-500 border-red-600"
    if (pnl < -100) return "bg-red-400 border-red-500"
    return "bg-red-300 border-red-400"
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[750px] flex flex-col gap-1.5">
        <div className="flex gap-1">
          {weeks.map((week, wIndex) => (
            <div key={wIndex} className="flex flex-col gap-1">
              {week.map((day, dIndex) => {
                if (!day.dateStr) return <div key={dIndex} className="w-3 h-3" /> // empty padding
                return (
                  <TooltipProvider key={day.dateStr}>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger>
                        <div
                          className={`w-3 h-3 rounded-sm border ${getColor(day.pnl)} transition-transform hover:scale-125`}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        <p className="font-semibold">{day.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        <p className={day.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {day.pnl > 0 ? "+" : ""}{formatCurrency(day.pnl)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground mt-2">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <div className="w-3 h-3 rounded-sm bg-red-300" />
          <div className="w-3 h-3 rounded-sm bg-secondary/30" />
          <div className="w-3 h-3 rounded-sm bg-emerald-300" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
