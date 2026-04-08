"use client"

import { useState, useEffect } from "react"
import { Play, Clock, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTrades } from "@/lib/trade-context"
import { StartSessionDialog } from "./start-session-dialog"

export function ActiveSessionWidget() {
  const { activeSession, endSession } = useTrades()
  const [elapsed, setElapsed] = useState<string>("00:00")
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [note, setNote] = useState("")
  const [isEnding, setIsEnding] = useState(false)

  useEffect(() => {
    if (!activeSession) {
      return
    }

    const calculateElapsed = () => {
      const now = new Date().getTime()
      const start = new Date(activeSession.startTime).getTime()
      const difference = now - start

      setElapsed(formatTime(Math.max(0, difference)))
    }

    // Calculate immediately
    calculateElapsed()

    // Update every second
    const interval = setInterval(calculateElapsed, 1000)

    return () => clearInterval(interval)
  }, [activeSession])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const handleEndSession = async () => {
    setIsEnding(true)
    try {
      await endSession(note, elapsed)
      setEndDialogOpen(false)
      setNote("")
    } finally {
      setIsEnding(false)
    }
  }

  if (!activeSession) {
    return (
      <StartSessionDialog>
        <Button variant="outline" size="lg" className="gap-2">
          <Play className="h-4 w-4" />
          Start Session
        </Button>
      </StartSessionDialog>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div 
          className="flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium border-primary/20 bg-primary/5 text-primary"
        >
          <Clock className="h-4 w-4" />
          <span className="tabular-nums w-[70px] text-center">{elapsed}</span>
        </div>
        <Button 
          variant="destructive" 
          size="lg" 
          onClick={() => setEndDialogOpen(true)}
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          End Session
        </Button>
      </div>

      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>End Trading Session</DialogTitle>
            <DialogDescription>
              Add a note about your session before ending it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="session-note">Note</Label>
              <Textarea
                id="session-note"
                placeholder="How was your session? Any lessons learned?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndDialogOpen(false)} disabled={isEnding}>
              Cancel
            </Button>
            <Button onClick={handleEndSession} disabled={isEnding} variant="destructive">
              {isEnding ? "Saving..." : "Save & End Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
