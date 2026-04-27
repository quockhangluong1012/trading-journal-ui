"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"
import { toast } from "sonner"

type MacroTime = {
  id: string
  name: string
  startHour: number // 0-24
  endHour: number // 0-24
  color: string
  bgColor: string
  borderColor: string
}

// These are calculated for UTC+7 (based on the user's timezone) 
// to match New York time macros.
const MACRO_TIMES: MacroTime[] = [
  {
    id: "macro-0",
    name: "NY PM Macro 1",
    startHour: 0 + 10 / 60, // 00:10 Local (13:10 NY)
    endHour: 0 + 40 / 60, // 00:40 Local (13:40 NY)
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500",
  },
  {
    id: "macro-1",
    name: "NY PM Macro 2",
    startHour: 2 + 15 / 60, // 02:15 Local (15:15 NY)
    endHour: 2 + 45 / 60, // 02:45 Local (15:45 NY)
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500",
  },
  {
    id: "macro-2",
    name: "London Macro 1",
    startHour: 13 + 33 / 60, // 13:33 Local (02:33 NY)
    endHour: 14,             // 14:00 Local (03:00 NY)
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
  },
  {
    id: "macro-3",
    name: "London Macro 2",
    startHour: 15 + 3 / 60, // 15:03 Local (04:03 NY)
    endHour: 15 + 30 / 60,  // 15:30 Local (04:30 NY)
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
  },
  {
    id: "macro-4",
    name: "NY AM Macro 1",
    startHour: 19 + 50 / 60, // 19:50 Local (08:50 NY)
    endHour: 20 + 10 / 60,   // 20:10 Local (09:10 NY)
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500",
  },
  {
    id: "macro-5",
    name: "NY AM Macro 2",
    startHour: 20 + 50 / 60, // 20:50 Local (09:50 NY)
    endHour: 21 + 10 / 60,   // 21:10 Local (10:10 NY)
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500",
  },
  {
    id: "macro-6",
    name: "NY AM Macro 3",
    startHour: 21 + 50 / 60, // 21:50 Local (10:50 NY)
    endHour: 22 + 10 / 60,   // 22:10 Local (11:10 NY)
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500",
  },
  {
    id: "macro-7",
    name: "NY Lunch Macro",
    startHour: 22 + 50 / 60, // 22:50 Local (11:50 NY)
    endHour: 23 + 10 / 60,   // 23:10 Local (12:10 NY)
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
  },
]

export function MacroTimesWidget() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [notifiedMacroId, setNotifiedMacroId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    
    // Request notification permission if not already granted or denied
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
    
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
    const activeMacro = MACRO_TIMES.find(
      (m) => currentHour >= m.startHour && currentHour < m.endHour
    )

    if (activeMacro) {
      if (notifiedMacroId !== activeMacro.id) {
        // Trigger toast notification
        toast.info(`${activeMacro.name} is now active!`, {
          description: `Time entered the ${activeMacro.name}.`,
          duration: 5000,
        })
        
        // Trigger browser notification if permitted
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification(`${activeMacro.name} Active`, {
            body: `Time entered the ${activeMacro.name}.`,
          })
        }
        
        setNotifiedMacroId(activeMacro.id)
      }
    } else {
      if (notifiedMacroId !== null) {
        setNotifiedMacroId(null)
      }
    }
  }, [currentTime, notifiedMacroId, mounted])

  if (!mounted) return null

  const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
  const progressPercent = (currentHour / 24) * 100

  const activeMacro = MACRO_TIMES.find(
    (m) => currentHour >= m.startHour && currentHour < m.endHour
  )

  const formatTime = (timeHour: number) => {
    const hours = Math.floor(timeHour)
    const mins = Math.round((timeHour - hours) * 60)
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          ICT Macro Times
          <span className="text-sm font-normal text-muted-foreground ml-2 tabular-nums bg-secondary/50 px-2 py-0.5 rounded-md border border-border/50 shadow-sm">
            {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </CardTitle>
        {activeMacro ? (
          <Badge variant="outline" className={cn("animate-pulse border", activeMacro.borderColor, activeMacro.color, activeMacro.bgColor)}>
            {activeMacro.name} Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            No Active Macro
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative pt-8 pb-4">
          {/* Timeline Bar */}
          <div className="relative h-6 rounded-md bg-secondary/40 border border-border overflow-hidden">
            {/* Progress Fill */}
            <div
              className="absolute top-0 left-0 h-full bg-primary/20 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
            
            {/* Progress Current Time Indicator */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-primary z-20 shadow-[0_0_8px_rgba(var(--primary),0.8)] transition-all duration-1000 ease-linear"
              style={{ left: `${progressPercent}%` }}
            >
              <div className="absolute -top-6 -translate-x-1/2 bg-background border shadow-sm rounded px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {formatTime(currentHour)}
              </div>
            </div>

            {/* Macro Highlight Boxes */}
            {MACRO_TIMES.map((m) => {
              const leftPercent = (m.startHour / 24) * 100
              const widthPercent = ((m.endHour - m.startHour) / 24) * 100
              const isActive = activeMacro?.id === m.id

              return (
                <TooltipProvider key={m.id}>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "absolute top-0 h-full border-2 transition-all duration-300 cursor-pointer",
                          m.borderColor,
                          isActive ? m.bgColor : "bg-transparent",
                          isActive ? "shadow-[0_0_10px_rgba(0,0,0,0.1)] z-10" : ""
                        )}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(m.startHour)} - {formatTime(m.endHour)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}

            {/* Hour Markers */}
            <div className="absolute inset-0 pointer-events-none flex justify-between">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-full w-px",
                    i % 6 === 0 ? "bg-border/80" : "bg-border/30"
                  )}
                />
              ))}
            </div>
          </div>
          
          {/* Ticks for main hours */}
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
