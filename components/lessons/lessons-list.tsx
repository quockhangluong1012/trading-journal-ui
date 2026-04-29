"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { Search, ChevronRight, SlidersHorizontal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  searchLessons,
  LessonCategory,
  LessonSeverity,
  LessonStatus,
  LessonCategoryLabels,
  LessonSeverityLabels,
  LessonStatusLabels,
  type LessonLearnedDto,
  type SearchLessonsRequest,
} from "@/lib/lessons-api"

interface Props {
  onRefreshDashboard: () => void
  refreshTrigger?: number
}

const severityColors: Record<LessonSeverity, string> = {
  [LessonSeverity.Minor]: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  [LessonSeverity.Moderate]: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  [LessonSeverity.Critical]: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const statusColors: Record<LessonStatus, string> = {
  [LessonStatus.New]: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  [LessonStatus.Reviewing]: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  [LessonStatus.Applied]: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  [LessonStatus.Archived]: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
}

export function LessonsList({ onRefreshDashboard, refreshTrigger = 0 }: Props) {
  const router = useRouter()
  const [lessons, setLessons] = useState<LessonLearnedDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const pageSize = 10

  const fetchLessons = useCallback(async () => {
    try {
      setIsLoading(true)
      const req: SearchLessonsRequest = { page, pageSize }
      if (categoryFilter !== "all") req.category = Number(categoryFilter)
      if (severityFilter !== "all") req.severity = Number(severityFilter)
      if (statusFilter !== "all") req.status = Number(statusFilter)
      if (searchTerm.trim()) req.searchTerm = searchTerm.trim()

      const res = await searchLessons(req)
      setLessons(res.data.value.values)
      setTotalItems(res.data.value.totalItems)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [page, categoryFilter, severityFilter, statusFilter, searchTerm])

  useEffect(() => { void fetchLessons() }, [fetchLessons, refreshTrigger])

  const totalPages = Math.ceil(totalItems / pageSize)

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">All Lessons</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="h-9 w-48 pl-8 text-sm"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(LessonCategoryLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1) }}>
              <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {Object.entries(LessonSeverityLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(LessonStatusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No lessons found. Start by creating your first lesson!</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => router.push(`/lessons/${lesson.id}`)}
                  className="flex w-full items-center gap-4 rounded-xl border border-border/50 bg-background/50 p-4 text-left transition-all hover:bg-muted/50 hover:border-border hover:shadow-sm group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-foreground truncate">{lesson.title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${severityColors[lesson.severity]}`}>
                        {LessonSeverityLabels[lesson.severity]}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[lesson.status]}`}>
                        {LessonStatusLabels[lesson.status]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {LessonCategoryLabels[lesson.category]}
                      </span>
                      {lesson.linkedTradesCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          • {lesson.linkedTradesCount} trade{lesson.linkedTradesCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-3 rounded-full ${i < lesson.impactScore ? "bg-primary" : "bg-muted"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(lesson.createdDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{totalItems} lesson{totalItems !== 1 ? "s" : ""}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
