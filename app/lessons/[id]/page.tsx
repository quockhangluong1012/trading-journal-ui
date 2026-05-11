"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter, usePathname } from "next/navigation"
import { format, parseISO } from "date-fns"
import {
  ArrowLeft, Pencil, Trash2, Link2, Unlink, AlertTriangle,
  CheckCircle2, Target, Calendar, TrendingDown,
} from "lucide-react"
import { AppPageShell } from "@/components/app-page-shell"
import { AppShellLoader } from "@/components/app-shell-loader"
import { useAuth } from "@/lib/auth-context"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SafeHtml } from "@/components/ui/safe-html"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/hooks/use-toast"
import {
  getLessonDetail, updateLesson, deleteLesson, unlinkTradeFromLesson,
  linkTradesToLesson,
  formatLessonTags,
  parseLessonTags,
  LessonCategoryLabels, LessonSeverityLabels, LessonStatusLabels,
  LessonCategory, LessonSeverity, LessonStatus,
  type LessonLearnedDetailDto, type UpdateLessonRequest,
} from "@/lib/lessons-api"

const severityColors: Record<LessonSeverity, string> = {
  [LessonSeverity.Minor]: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  [LessonSeverity.Moderate]: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  [LessonSeverity.Critical]: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
}

const statusColors: Record<LessonStatus, string> = {
  [LessonStatus.New]: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  [LessonStatus.Reviewing]: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  [LessonStatus.Applied]: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  [LessonStatus.Archived]: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
}

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: authLoading } = useAuth()
  const [lesson, setLesson] = useState<LessonLearnedDetailDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [linkTradeId, setLinkTradeId] = useState("")

  // Edit form state
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editSeverity, setEditSeverity] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [editTagsInput, setEditTagsInput] = useState("")
  const [editKeyTakeaway, setEditKeyTakeaway] = useState("")
  const [editActionItems, setEditActionItems] = useState("")
  const [editImpactScore, setEditImpactScore] = useState(5)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.replace(buildRedirectWithNext("/login", pathname))
  }, [user, authLoading, pathname, router])

  const fetchLesson = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await getLessonDetail(Number(id))
      setLesson(res.data.value)
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { if (user && id) void fetchLesson() }, [user, id, fetchLesson])

  const openEdit = () => {
    if (!lesson) return
    setEditTitle(lesson.title)
    setEditContent(lesson.content)
    setEditCategory(String(lesson.category))
    setEditSeverity(String(lesson.severity))
    setEditStatus(String(lesson.status))
    setEditTagsInput(formatLessonTags(lesson.tags))
    setEditKeyTakeaway(lesson.keyTakeaway ?? "")
    setEditActionItems(lesson.actionItems ?? "")
    setEditImpactScore(lesson.impactScore)
    setIsEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!lesson) return
    try {
      setIsSubmitting(true)
      const data: UpdateLessonRequest = {
        id: lesson.id,
        title: editTitle.trim(),
        content: editContent.trim(),
        category: Number(editCategory),
        severity: Number(editSeverity),
        status: Number(editStatus),
        keyTakeaway: editKeyTakeaway.trim() || null,
        actionItems: editActionItems.trim() || null,
        impactScore: editImpactScore,
        tags: parseLessonTags(editTagsInput),
      }
      await updateLesson(lesson.id, data)
      toast({ title: "Lesson updated" })
      setIsEditOpen(false)
      void fetchLesson()
    } catch {
      toast({ title: "Failed to update", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!lesson) return
    try {
      await deleteLesson(lesson.id)
      toast({ title: "Lesson deleted" })
      router.push("/lessons")
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" })
    }
  }

  const handleUnlink = async (tradeId: number) => {
    if (!lesson) return
    try {
      await unlinkTradeFromLesson(lesson.id, tradeId)
      toast({ title: "Trade unlinked" })
      void fetchLesson()
    } catch {
      toast({ title: "Failed to unlink", variant: "destructive" })
    }
  }

  const handleLinkTrade = async () => {
    if (!lesson || !linkTradeId.trim()) return
    try {
      await linkTradesToLesson(lesson.id, [Number(linkTradeId)])
      toast({ title: "Trade linked" })
      setIsLinkOpen(false)
      setLinkTradeId("")
      void fetchLesson()
    } catch {
      toast({ title: "Failed to link trade", variant: "destructive" })
    }
  }

  if (authLoading) return <AppShellLoader title="Loading" description="" />
  if (!user) return <AppShellLoader title="Redirecting" description="" />

  return (
    <AppPageShell contentClassName="max-w-4xl py-4 sm:py-6 lg:py-8">
          <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground" onClick={() => router.push("/lessons")}>
            <ArrowLeft className="h-4 w-4" /> Back to Knowledge Library
          </Button>

          {isLoading || !lesson ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className={`${severityColors[lesson.severity]} border`}>
                      {LessonSeverityLabels[lesson.severity]}
                    </Badge>
                    <Badge className={statusColors[lesson.status]}>
                      {LessonStatusLabels[lesson.status]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {LessonCategoryLabels[lesson.category]}
                    </Badge>
                    {lesson.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
                  <p className="mt-1 text-xs text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseISO(lesson.createdDate), "MMMM d, yyyy")}</span>
                    {lesson.updatedDate && <span>• Updated {format(parseISO(lesson.updatedDate), "MMM d")}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
                </div>
              </div>

              {/* Key Takeaway */}
              {lesson.keyTakeaway && (
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                  <CardContent className="flex items-start gap-3 p-4">
                    <Target className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400 mb-1">Key Takeaway</p>
                      <p className="text-sm text-foreground">{lesson.keyTakeaway}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content */}
              <Card className="glass-card">
                <CardHeader><CardTitle className="text-base">Lesson Details</CardTitle></CardHeader>
                <CardContent>
                  <SafeHtml html={lesson.content} className="prose prose-sm dark:prose-invert max-w-none" />
                </CardContent>
              </Card>

              {/* Action Items */}
              {lesson.actionItems && (
                <Card className="glass-card">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Action Items</CardTitle></CardHeader>
                  <CardContent>
                    <SafeHtml html={lesson.actionItems} className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground" />
                  </CardContent>
                </Card>
              )}

              {/* Impact Score */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Impact Score</p>
                    <span className="text-sm font-bold text-primary">{lesson.impactScore}/10</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={`h-2 flex-1 rounded-full ${i < lesson.impactScore ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Linked Trades */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" />Linked Trades</CardTitle>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsLinkOpen(true)}>
                      <Plus className="h-3.5 w-3.5" />Link Trade
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {lesson.linkedTrades.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No trades linked. Link the trades that caused this lesson.</p>
                  ) : (
                    <div className="space-y-2">
                      {lesson.linkedTrades.map((trade) => (
                        <div key={trade.id} className="flex items-center gap-4 rounded-xl border border-border/50 bg-background/50 p-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{trade.asset}</span>
                              <Badge variant="outline" className="text-[10px]">{trade.position === 0 ? "Long" : "Short"}</Badge>
                              {trade.isRuleBroken && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {format(parseISO(trade.date), "MMM d, yyyy")} • Entry: {trade.entryPrice}
                              {trade.exitPrice != null && ` → Exit: ${trade.exitPrice}`}
                            </p>
                          </div>
                          {trade.pnl != null && (
                            <span className={`text-sm font-semibold ${trade.pnl >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                            </span>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleUnlink(trade.id)}>
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {lesson.linkedTrades.some(t => t.pnl != null && t.pnl < 0) && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/10 p-3 mt-3">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                            Total loss: {lesson.linkedTrades.filter(t => t.pnl != null && t.pnl < 0).reduce((s, t) => s + (t.pnl ?? 0), 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Lesson</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={200} /></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label>Category</Label><Select value={editCategory} onValueChange={setEditCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(LessonCategoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Severity</Label><Select value={editSeverity} onValueChange={setEditSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(LessonSeverityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Study Status</Label><Select value={editStatus} onValueChange={setEditStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(LessonStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Tags</Label><Input value={editTagsInput} onChange={(e) => setEditTagsInput(e.target.value)} placeholder="AMD, NQ, London open" /></div>
            <div className="space-y-2"><Label>Key Takeaway</Label><Input value={editKeyTakeaway} onChange={(e) => setEditKeyTakeaway(e.target.value)} maxLength={500} /></div>
            <div className="space-y-2"><Label>Content</Label><Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-30" /></div>
            <div className="space-y-2"><Label>Action Items</Label><Textarea value={editActionItems} onChange={(e) => setEditActionItems(e.target.value)} className="min-h-20" /></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><Label>Impact Score</Label><span className="text-sm font-semibold text-primary">{editImpactScore}/10</span></div>
              <Slider value={[editImpactScore]} onValueChange={([v]) => setEditImpactScore(v)} min={1} max={10} step={1} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Trade Dialog */}
      <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link a Trade</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Trade ID</Label>
              <Input type="number" placeholder="Enter the trade history ID" value={linkTradeId} onChange={(e) => setLinkTradeId(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">You can find the trade ID in your trade history list.</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsLinkOpen(false)}>Cancel</Button>
              <Button onClick={handleLinkTrade}>Link Trade</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppPageShell>
  )
}

function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  )
}
