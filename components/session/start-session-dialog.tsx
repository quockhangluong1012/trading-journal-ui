"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useTrades } from "@/lib/trade-context"

interface StartSessionDialogProps {
  children: React.ReactNode
}

export function StartSessionDialog({ children }: StartSessionDialogProps) {
  const { startSession } = useTrades()
  const [open, setOpen] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const handleStart = async () => {
    setIsStarting(true)
    try {
      await startSession()
      setOpen(false)
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start Trading Session</DialogTitle>
          <DialogDescription>
            Start a new trading session. The timer will begin counting from 00:00. You can end the session at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isStarting}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={isStarting}>
            {isStarting ? "Starting..." : "Start Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
