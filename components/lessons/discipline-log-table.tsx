"use client"

import { useCallback, useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { CheckCircle2, XCircle, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SafeHtml } from "@/components/ui/safe-html"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import {
  searchDisciplineLogs,
  getDisciplineRules,
  logDiscipline,
  type DisciplineLogDto,
  type DisciplineRuleDto,
} from "@/lib/lessons-api"

export function DisciplineLogTable() {
  const [logs, setLogs] = useState<DisciplineLogDto[]>([])
  const [rules, setRules] = useState<DisciplineRuleDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [selectedRuleId, setSelectedRuleId] = useState("")
  const [wasFollowed, setWasFollowed] = useState(true)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pageSize = 20

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await searchDisciplineLogs({ page, pageSize })
      setLogs(res.data.value.values)
      setTotalItems(res.data.value.totalItems)
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [page])

  const fetchRules = useCallback(async () => {
    try {
      const res = await getDisciplineRules()
      setRules(res.data.value.filter((r) => r.isActive))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { void fetchLogs() }, [fetchLogs])
  useEffect(() => { void fetchRules() }, [fetchRules])

  const handleLog = async () => {
    if (!selectedRuleId) {
      toast({ title: "Select a rule", variant: "destructive" })
      return
    }
    try {
      setIsSubmitting(true)
      await logDiscipline({
        disciplineRuleId: Number(selectedRuleId),
        tradeHistoryId: null,
        wasFollowed,
        notes: notes.trim() || null,
        date: new Date().toISOString(),
      })
      toast({ title: wasFollowed ? "Rule followed ✓" : "Rule broken ✗" })
      setIsLogOpen(false)
      setNotes("")
      setSelectedRuleId("")
      setWasFollowed(true)
      void fetchLogs()
    } catch {
      toast({ title: "Failed to log", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalPages = Math.ceil(totalItems / pageSize)

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Discipline Log</CardTitle>
          <Button size="sm" onClick={() => setIsLogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Log Check
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No discipline logs yet. Start by checking your rules after each trade!</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/50 p-3 text-sm">
                  {log.wasFollowed ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">{log.ruleName}</p>
                    {log.notes && (
                      <SafeHtml
                        html={log.notes}
                        className="text-[10px] text-muted-foreground truncate [&>ul]:pl-4 [&>ul]:list-disc [&>ul]:m-0 [&>p]:m-0" 
                      />
                    )}
                  </div>
                  {log.tradeAsset && (
                    <Badge variant="outline" className="text-[10px] shrink-0">{log.tradeAsset}</Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(parseISO(log.date), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{totalItems} entries</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
                  <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Discipline Check</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Rule *</Label>
              <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                <SelectTrigger><SelectValue placeholder="Select a rule" /></SelectTrigger>
                <SelectContent>
                  {rules.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm">Did you follow this rule?</Label>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${wasFollowed ? "text-emerald-600" : "text-red-500"}`}>
                  {wasFollowed ? "Yes ✓" : "No ✗"}
                </span>
                <Switch checked={wasFollowed} onCheckedChange={setWasFollowed} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input placeholder="What happened?" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsLogOpen(false)}>Cancel</Button>
              <Button onClick={handleLog} disabled={isSubmitting}>
                {isSubmitting ? "Logging..." : "Log Check"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
