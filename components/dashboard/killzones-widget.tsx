"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"
import { toast } from "sonner"

type Killzone = {
  id: string
  name: string
  startHour: number // 0-24
  endHour: number // 0-24
  color: string
  bgColor: string
  borderColor: string
}

// These are defined in local time (assuming the user wants 14:00-17:00 for London based on the image).
// A more robust approach would be to calculate based on UTC/NY time, 
// but for now we'll use a fixed configuration that matches the user's request.
// If the user's timezone is UTC+7 (ICT), 14:00 is 07:00 UTC / 08:00 BST.
const KILLZONES: Killzone[] = [
  {
    id: "asian",
    name: "Asian Killzone",
    startHour: 6,
    endHour: 12,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
  },
  {
    id: "london",
    name: "London Killzone",
    startHour: 14,
    endHour: 17,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
  },
  {
    id: "ny",
    name: "New York Killzone",
    startHour: 19,
    endHour: 22,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500",
  },
]

export function KillzonesWidget() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [notifiedKillzoneId, setNotifiedKillzoneId] = useState<string | null>(null)

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
    const activeKillzone = KILLZONES.find(
      (kz) => currentHour >= kz.startHour && currentHour < kz.endHour
    )

    if (activeKillzone) {
      if (notifiedKillzoneId !== activeKillzone.id) {
        // Trigger toast notification
        toast.info(`${activeKillzone.name} is now active!`, {
          description: `Time entered the ${activeKillzone.name}.`,
          duration: 5000,
        })
        
        // Trigger browser notification if permitted
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification(`${activeKillzone.name} Active`, {
            body: `Time entered the ${activeKillzone.name}.`,
          })
        }
        
        setNotifiedKillzoneId(activeKillzone.id)
      }
    } else {
      if (notifiedKillzoneId !== null) {
        setNotifiedKillzoneId(null)
      }
    }
  }, [currentTime, notifiedKillzoneId, mounted])

  if (!mounted) return null

  const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
  const progressPercent = (currentHour / 24) * 100

  const activeKillzone = KILLZONES.find(
    (kz) => currentHour >= kz.startHour && currentHour < kz.endHour
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
          Trading Killzones
          <span className="text-sm font-normal text-muted-foreground ml-2 tabular-nums bg-secondary/50 px-2 py-0.5 rounded-md border border-border/50 shadow-sm">
            {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </CardTitle>
        {activeKillzone ? (
          <Badge variant="outline" className={cn("animate-pulse border", activeKillzone.borderColor, activeKillzone.color, activeKillzone.bgColor)}>
            {activeKillzone.name} Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            No Active Killzone
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative pt-8 pb-4">
          {/* Labels for Killzones */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {KILLZONES.map((kz) => {
              const leftPercent = (kz.startHour / 24) * 100
              const widthPercent = ((kz.endHour - kz.startHour) / 24) * 100
              const isActive = activeKillzone?.id === kz.id

              return (
                <div
                  key={kz.id}
                  className={cn(
                    "absolute top-0 flex flex-col items-center transition-all duration-300",
                    isActive ? "opacity-100 scale-105 z-10" : "opacity-70"
                  )}
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                >
                  <span className={cn("text-[10px] sm:text-xs font-semibold whitespace-nowrap mb-1", kz.color)}>
                    {kz.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {formatTime(kz.startHour)} - {formatTime(kz.endHour)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Timeline Bar */}
          <div className="relative h-6 mt-6 rounded-md bg-secondary/40 border border-border overflow-hidden">
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

            {/* Killzone Highlight Boxes */}
            {KILLZONES.map((kz) => {
              const leftPercent = (kz.startHour / 24) * 100
              const widthPercent = ((kz.endHour - kz.startHour) / 24) * 100
              const isActive = activeKillzone?.id === kz.id

              return (
                <TooltipProvider key={kz.id}>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "absolute top-0 h-full border-2 transition-all duration-300 cursor-pointer",
                          kz.borderColor,
                          isActive ? kz.bgColor : "bg-transparent",
                          isActive ? "shadow-[0_0_10px_rgba(0,0,0,0.1)] z-10" : ""
                        )}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{kz.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(kz.startHour)} - {formatTime(kz.endHour)}
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
