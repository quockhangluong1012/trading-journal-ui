"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Skull } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface RetireDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setupName: string
  onConfirm: (reason: string) => Promise<void>
}

export function RetireDialog({ open, onOpenChange, setupName, onConfirm }: RetireDialogProps) {
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setIsSubmitting(true)
    try {
      await onConfirm(reason.trim())
      setReason("")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/70 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <Skull className="h-5 w-5" />Retire Setup
          </DialogTitle>
          <DialogDescription>
            You are about to retire <span className="font-semibold text-foreground">{setupName}</span>.
            This marks it as underperforming and moves it to the retired section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs text-amber-200/80">
              Retired setups are kept for historical reference. You can reactivate them later if conditions change.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Why are you retiring this setup? <span className="text-red-400">*</span>
            </label>
            <textarea
              className="w-full rounded-xl border border-border/70 bg-secondary/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 resize-y min-h-[80px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Win rate dropped below 40% over last 20 trades, edge no longer present in current market conditions..."
              maxLength={1000}
            />
            <p className="text-right text-[10px] text-muted-foreground">{reason.length}/1000</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isSubmitting}
            className="rounded-xl"
          >
            {isSubmitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Skull className="mr-1.5 h-3.5 w-3.5" />
            )}
            Retire Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
