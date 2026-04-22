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
              <div className="flex items-center space-x-1 border border-border/50 px-4 py-2 rounded-xl text-sm font-bold bg-background/50 backdrop-blur-md cursor-pointer hover:bg-background/80 transition-all shadow-sm group">
                 <span className="text-muted-foreground uppercase tracking-wider text-[11px] mr-1">{pnlView}:</span>
                 <span className={cn("drop-shadow-sm", displayedPnl > 0 ? "text-success" : displayedPnl < 0 ? "text-destructive" : "")}>
                    {displayedPnl === 0 ? '$0' : formatCurrency(displayedPnl)}
                 </span>
                 <ChevronDown className="h-4 w-4 text-muted-foreground ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
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
          <Button variant="outline" size="icon" className="h-10 w-10 bg-background/50 backdrop-blur-sm border-border/50 shrink-0 hover:bg-muted rounded-xl transition-transform hover:scale-105">
             <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="icon" className="h-10 w-10 bg-background/50 backdrop-blur-sm border-border/50 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-transform hover:-translate-x-1" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 bg-background/50 backdrop-blur-sm border-border/50 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-transform hover:translate-x-1" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-10 bg-background/50 backdrop-blur-sm border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl font-bold uppercase tracking-wider text-[11px] transition-transform hover:scale-105" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 relative z-10">
        <div className="rounded-[2rem] border border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden shadow-sm dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 hover:shadow-md hover:border-border/80">
          <div className="grid grid-cols-7 border-b border-border/30 bg-muted/20 backdrop-blur-md">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
               <div key={day} className={cn("text-center py-4 text-[11px] uppercase tracking-wider font-bold text-muted-foreground", i > 0 && "border-l border-border/30")}>
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
                    "min-h-[120px] p-3 flex flex-col items-center border-t border-border/30 transition-all duration-300 relative group/day",
                    i % 7 !== 0 && "border-l border-border/30",
                    !isCurrentMonth ? "bg-muted/20 opacity-50 grayscale" : "bg-card hover:bg-muted/30",
                    isCurrentMonth && pnl > 0 && "bg-success/5 hover:bg-success/15",
                    isCurrentMonth && pnl < 0 && "bg-destructive/5 hover:bg-destructive/15",
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none" />
                  <div
                    className={cn(
                      "text-sm font-bold mb-2 relative z-10",
                      isDayToday && "bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center -mt-1 shadow-md shadow-primary/20",
                      (!isDayToday && !isCurrentMonth) && "text-muted-foreground",
                      (!isDayToday && isCurrentMonth) && "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  {tradesCount > 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 gap-1 w-full relative z-10">
                      <div
                        className={cn(
                          "text-base font-extrabold tracking-tight drop-shadow-sm",
                          pnl > 0 && "text-success",
                          pnl < 0 && "text-destructive",
                          pnl === 0 && "text-muted-foreground",
                        )}
                      >
                        {pnl > 0 ? "+" : ""}{formatCurrency(pnl).replace("+", "")}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
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
