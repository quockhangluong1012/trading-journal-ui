"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Upload, Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  isToday 
} from "date-fns"
import { cn } from "@/lib/utils"
import { api, ApiResponse } from "@/lib/api"
import { CalendarData } from "@/app/types/trade"
import { DashboardFilter } from "@/lib/enum/TradeEnum"

interface TradingCalendarResponse {
  monthlyPnL: number;
  weeklyPnL: number;
  dailyPnL: number;
  data: CalendarData[];
}

type PnlViewType = "Monthly P&L" | "Weekly P&L" | "Daily P&L";

export function CalendarWidget({ filter }: { filter: DashboardFilter }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dailyPnL, setDailyPnL] = useState<Record<string, number>>({})
  const [dailyTrades, setDailyTrades] = useState<Record<string, number>>({})
  const [pnlView, setPnlView] = useState<PnlViewType>("Monthly P&L")
  const [monthlyPnL, setMonthlyPnL] = useState(0)
  const [weeklyPnL, setWeeklyPnL] = useState(0)
  const [dailyPnLValue, setDailyPnLValue] = useState(0)

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const month = currentDate.getMonth() + 1
        const year = currentDate.getFullYear()
        const response = await api.get<ApiResponse<TradingCalendarResponse>>(`/v1/dashboard/calendar?month=${month}&year=${year}&date=${currentDate.toISOString()}&filter=${filter}`)
        const data = response.data;

        if (data.isSuccess) {
          if (data.value) {
            setMonthlyPnL(data.value.monthlyPnL);
            setWeeklyPnL(data.value.weeklyPnL);
            setDailyPnLValue(data.value.dailyPnL);

            const pnlMap: Record<string, number> = {};
            const tradesMap: Record<string, number> = {};
            data.value.data.forEach((item: CalendarData) => {
              const dateKey = item.date.split("T")[0];
              pnlMap[dateKey] = (pnlMap[dateKey] || 0) + item.pnL;
              tradesMap[dateKey] = (tradesMap[dateKey] || 0) + 1;
            });
            
            setDailyPnL(pnlMap);
            setDailyTrades(tradesMap);
          }
        }
      } catch (error) {
        console.error("Failed to fetch calendar data:", error)
      }
    }

    fetchCalendarData()
  }, [currentDate, filter])

  // Calendar dates
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const dateFormat = "MMMM yyyy"
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  })

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      signDisplay: "always",
      maximumFractionDigits: 0
    }).format(amount)
  }

  const displayedPnl = pnlView === "Monthly P&L" ? monthlyPnL : pnlView === "Weekly P&L" ? weeklyPnL : dailyPnLValue;

  return (
    <Card className="col-span-full border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-6 px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
          <CardTitle className="text-xl font-bold">{format(currentDate, dateFormat)}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center space-x-1 border px-3 py-1.5 rounded-md text-sm font-medium bg-card cursor-pointer hover:bg-muted/50 transition-colors">
                 <span className="text-muted-foreground mr-1">{pnlView}:</span>
                 <span className={cn(displayedPnl > 0 ? "text-emerald-600 dark:text-emerald-500" : displayedPnl < 0 ? "text-rose-600 dark:text-rose-500" : "")}>
                    {displayedPnl === 0 ? '$0' : formatCurrency(displayedPnl)}
                 </span>
                 <ChevronDown className="h-4 w-4 text-muted-foreground ml-1 opacity-50" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setPnlView("Monthly P&L")}>Monthly P&L</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPnlView("Weekly P&L")}>Weekly P&L</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPnlView("Daily P&L")}>Daily P&L</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground">
             <Upload className="h-4 w-4 mr-2" />
             Import CSV
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 bg-card shrink-0">
             <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="icon" className="h-9 w-9 bg-card shrink-0 text-muted-foreground hover:text-foreground" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-card shrink-0 text-muted-foreground hover:text-foreground" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-9 bg-card text-muted-foreground hover:text-foreground" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="rounded-[1.5rem] border-0 bg-card overflow-hidden shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all duration-500 hover:shadow-[0_8px_30px_-6px_rgba(6,81,237,0.12)]">
          <div className="grid grid-cols-7 border-b border-border/30 bg-muted/20">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
               <div key={day} className={cn("text-center py-3 text-[13px] font-semibold text-muted-foreground", i > 0 && "border-l border-border/30")}>
                  {day}
               </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const pnl = dailyPnL[dateKey] || 0
              const tradesCount = dailyTrades[dateKey] || 0
              
              const isCurrentMonth = isSameMonth(day, monthStart)
              const isDayToday = isToday(day)
              
              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "min-h-[120px] p-2 flex flex-col items-center border-t transition-colors",
                    i % 7 !== 0 && "border-l",
                    !isCurrentMonth ? "bg-muted/10 opacity-60" : "bg-card hover:bg-muted/10",
                    isCurrentMonth && pnl > 0 && "bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40",
                    isCurrentMonth && pnl < 0 && "bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40",
                  )}
                >
                  <div
                    className={cn(
                      "text-sm font-medium mb-1",
                      isDayToday && "bg-primary text-primary-foreground h-7 w-7 rounded-full flex items-center justify-center -mt-0.5",
                      (!isDayToday && !isCurrentMonth) && "text-muted-foreground",
                      (!isDayToday && isCurrentMonth) && "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  {tradesCount > 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 gap-1 w-full">
                      <div
                        className={cn(
                          "text-sm font-bold tracking-tight",
                          pnl > 0 && "text-emerald-600 dark:text-emerald-500",
                          pnl < 0 && "text-rose-600 dark:text-rose-500",
                          pnl === 0 && "text-muted-foreground",
                        )}
                      >
                        {pnl > 0 ? "+" : ""}{formatCurrency(pnl).replace("+", "")}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {tradesCount} {tradesCount === 1 ? 'trade' : 'trades'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
