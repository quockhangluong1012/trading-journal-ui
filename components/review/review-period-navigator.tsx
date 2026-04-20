"use client"

import { useState } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarUi } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ReviewPeriodType,
  formatPeriodLabel,
  getPeriodBounds,
  navigatePeriod,
} from "@/lib/review-api"

interface ReviewPeriodNavigatorProps {
  currentDate: Date
  periodType: ReviewPeriodType
  onNavigate: (date: Date) => void
}

export function ReviewPeriodNavigator({
  currentDate,
  periodType,
  onNavigate,
}: ReviewPeriodNavigatorProps) {
  const [open, setOpen] = useState(false)
  const currentPeriod = getPeriodBounds(periodType, currentDate)
  const todayPeriod = getPeriodBounds(periodType, new Date())
  const isCurrentPeriod = currentPeriod.start.getTime() === todayPeriod.start.getTime()

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 p-1.5 shadow-sm backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onNavigate(navigatePeriod(periodType, currentDate, "prev"))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-auto min-w-[210px] rounded-xl px-4 py-2.5">
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="text-sm font-medium text-foreground">
                {formatPeriodLabel(periodType, currentDate)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {isCurrentPeriod ? "Current review window" : "Jump to another date"}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <CalendarUi
            mode="single"
            selected={currentDate}
            onSelect={(date) => {
              if (!date) {
                return
              }

              onNavigate(date)
              setOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isCurrentPeriod}
        onClick={() => onNavigate(navigatePeriod(periodType, currentDate, "next"))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="hidden items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground md:flex">
        <Calendar className="h-3.5 w-3.5" />
        {isCurrentPeriod ? "Live period" : "Archived period"}
      </div>
    </div>
  )
}