"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Upload, Calendar as CalendarIcon, ChevronDown, Activity, Sparkles, TrendingUp, TrendingDown } from "lucide-react"
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
import { motion, AnimatePresence } from "framer-motion"

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
  const [direction, setDirection] = useState(0) // 1 for right, -1 for left

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const month = currentDate.getMonth() + 1
        const year = currentDate.getFullYear()
        const response = await api.get<ApiResponse<TradingCalendarResponse>>(`/v1/dashboard/calendar?month=${month}&year=${year}&date=${currentDate.toISOString()}&filter=${filter}`)
        const data = response.data;

        if (data.isSuccess && data.value) {
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
    setDirection(1)
    setCurrentDate(addMonths(currentDate, 1))
  }

  const prevMonth = () => {
    setDirection(-1)
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

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 30 : -30,
        opacity: 0,
        scale: 0.98,
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 30 : -30,
        opacity: 0,
        scale: 0.98,
      };
    }
  };

  return (
    <Card className="col-span-full border-0 shadow-none bg-transparent">
      <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between space-y-4 xl:space-y-0 pb-6 px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-6 space-y-3 sm:space-y-0 w-full xl:w-auto">
          <div className="flex items-center gap-4">
             <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
               <CalendarIcon className="h-5 w-5" />
             </div>
             <div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                  {format(currentDate, dateFormat)}
                </CardTitle>
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                  <Activity className="h-3.5 w-3.5" /> Trading Performance
                </p>
             </div>
          </div>
          
          <div className="hidden sm:block h-10 w-px bg-border/50 mx-2" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="group flex cursor-pointer items-center space-x-4 rounded-xl border border-border/60 bg-background/60 px-5 py-3 text-sm font-bold shadow-sm backdrop-blur-md transition-colors hover:border-border hover:bg-background/90">
                 <div className="flex flex-col">
                   <span className="mb-1.5 flex items-center gap-1 text-[10px] uppercase leading-none tracking-widest text-muted-foreground transition-colors group-hover:text-foreground/70">
                     {pnlView}
                   </span>
                   <span className={cn(
                     "flex items-center gap-1 text-xl leading-none tracking-tight transition-colors",
                     displayedPnl > 0 ? "text-emerald-500" :
                     displayedPnl < 0 ? "text-rose-500" : "text-foreground"
                   )}>
                      {displayedPnl > 0 && <TrendingUp className="h-4 w-4 text-emerald-500 mr-0.5" />}
                      {displayedPnl < 0 && <TrendingDown className="h-4 w-4 text-rose-500 mr-0.5" />}
                      {displayedPnl === 0 ? '$0' : formatCurrency(displayedPnl)}
                   </span>
                 </div>
                 <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-muted transition-colors shadow-inner">
                   <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                 </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-2xl border-border/50 backdrop-blur-2xl bg-background/90 p-2 min-w-[200px] shadow-2xl">
              {["Monthly P&L", "Weekly P&L", "Daily P&L"].map((view) => (
                <DropdownMenuItem 
                  key={view} 
                  onClick={() => setPnlView(view as PnlViewType)}
                  className={cn("rounded-xl px-4 py-3 cursor-pointer font-medium transition-colors text-sm", pnlView === view && "bg-primary/10 text-primary font-bold")}
                >
                  {view}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
          <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl h-11 px-5 font-semibold transition-all">
             <Upload className="h-4 w-4 mr-2" />
             Import CSV
          </Button>
          
          <div className="flex items-center space-x-1.5 p-1.5 rounded-xl border border-border/60 bg-background/60 backdrop-blur-md shadow-sm">
            <Button variant="ghost" size="sm" className="h-9 px-5 rounded-xl text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-background shadow-sm transition-all" onClick={() => { setDirection(currentDate < new Date() ? 1 : -1); setCurrentDate(new Date()) }}>
              Today
            </Button>
            <div className="w-px h-5 bg-border/50 mx-1" />
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-background shadow-sm transition-all" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-background shadow-sm transition-all" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-0 pb-0">
        <div className="dashboard-card overflow-hidden">

          <div className="grid grid-cols-7 border-b border-border/40 bg-muted/30 backdrop-blur-md relative z-10">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
               <div key={day} className={cn("text-center py-4 text-[11px] uppercase tracking-widest font-extrabold text-muted-foreground", i > 0 && "border-l border-border/40")}>
                  {day}
               </div>
            ))}
          </div>
          
          <div className="relative overflow-hidden min-h-[600px] z-10">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={currentDate.toString()}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 }
                }}
                className="grid grid-cols-7 w-full h-full"
              >
                {days.map((day, i) => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const pnl = dailyPnL[dateKey] || 0
                  const tradesCount = dailyTrades[dateKey] || 0
                  
                  const isCurrentMonth = isSameMonth(day, monthStart)
                  const isDayToday = isToday(day)
                  
                  return (
                    <motion.div
                      whileHover={isCurrentMonth ? { scale: 0.97, zIndex: 20 } : {}}
                      key={day.toString()}
                      className={cn(
                        "min-h-[80px] sm:min-h-[140px] p-1.5 sm:p-4 flex flex-col items-center border-t border-border/40 transition-all duration-300 relative group/day overflow-hidden",
                        i % 7 !== 0 && "border-l border-border/40",
                        !isCurrentMonth ? "bg-muted/10 opacity-40 grayscale" : "bg-transparent hover:bg-background/80 hover:border-border/60",
                        isCurrentMonth && pnl > 0 && "bg-emerald-500/10 hover:bg-emerald-500/15",
                        isCurrentMonth && pnl < 0 && "bg-rose-500/10 hover:bg-rose-500/15",
                      )}
                    >
                      {/* Active Day Background Gradients */}
                      {isCurrentMonth && pnl > 0 && (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-50 group-hover/day:opacity-100 transition-opacity duration-500" />
                      )}
                      {isCurrentMonth && pnl < 0 && (
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-50 group-hover/day:opacity-100 transition-opacity duration-500" />
                      )}

                      <div className="w-full flex justify-between items-start relative z-10 mb-2">
                        <div
                          className={cn(
                            "text-xs sm:text-sm font-bold h-7 w-7 sm:h-9 sm:w-9 rounded-full flex items-center justify-center transition-all duration-300",
                            isDayToday 
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : isCurrentMonth && pnl > 0 
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 group-hover/day:bg-emerald-500/20 group-hover/day:scale-110"
                                : isCurrentMonth && pnl < 0
                                  ? "text-rose-600 dark:text-rose-400 bg-rose-500/10 group-hover/day:bg-rose-500/20 group-hover/day:scale-110"
                                  : (!isDayToday && !isCurrentMonth) 
                                    ? "text-muted-foreground" 
                                    : "text-foreground bg-muted/40 group-hover/day:bg-muted/60 group-hover/day:scale-110"
                          )}
                        >
                          {format(day, "d")}
                        </div>

                        {tradesCount > 0 && isCurrentMonth && (
                           <div className="flex items-center justify-center h-6 px-2.5 rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-[10px] font-bold text-muted-foreground shadow-sm transition-all group-hover/day:border-border group-hover/day:text-foreground">
                             {tradesCount} <span className="hidden xl:inline ml-1">trades</span>
                           </div>
                        )}
                      </div>
                      
                      {tradesCount > 0 && (
                        <div className="flex flex-col items-center justify-center flex-1 w-full relative z-10 mt-1">
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={cn(
                              "text-[10px] sm:text-lg font-bold tracking-tight flex items-center gap-1",
                              pnl > 0 && "text-emerald-500 dark:text-emerald-400",
                              pnl < 0 && "text-rose-500 dark:text-rose-400",
                              pnl === 0 && "text-muted-foreground",
                            )}
                          >
                            {pnl > 0 ? "+" : ""}{formatCurrency(pnl).replace("+", "")}
                          </motion.div>
                          
                          {/* Mini sparkline or indicator */}
                          <div className={cn(
                            "h-1.5 w-8 rounded-full mt-3 opacity-70 transition-all duration-300 group-hover/day:w-12 group-hover/day:opacity-100",
                            pnl > 0 && "bg-emerald-500",
                            pnl < 0 && "bg-rose-500",
                            pnl === 0 && "bg-muted-foreground"
                          )} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
