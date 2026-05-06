"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  BookOpen,
  Plus,
  Shield,
  ListChecks,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
} from "lucide-react"
import { Header } from "@/components/header"
import { AppShellLoader } from "@/components/app-shell-loader"
import { useAuth } from "@/lib/auth-context"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { LessonsStatsCards } from "@/components/lessons/lessons-stats-cards"
import { DisciplineScoreChart } from "@/components/lessons/discipline-score-chart"
import { CategoryBreakdownChart } from "@/components/lessons/category-breakdown-chart"
import { AiLessonSuggestions } from "@/components/lessons/ai-lesson-suggestions"
import { LessonsList } from "@/components/lessons/lessons-list"
import { DisciplineRulesPanel } from "@/components/lessons/discipline-rules-panel"
import { DisciplineLogTable } from "@/components/lessons/discipline-log-table"
import { CreateLessonDialog } from "@/components/lessons/create-lesson-dialog"
import {
  getLessonsDashboard,
  type LessonsDashboardDto,
} from "@/lib/lessons-api"

export default function LessonsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [dashboard, setDashboard] = useState<LessonsDashboardDto | null>(null)
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("lessons")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname))
    }
  }, [user, isLoading, pathname, router])

  const fetchDashboard = useCallback(async () => {
    try {
      setIsDashboardLoading(true)
      const res = await getLessonsDashboard()
      setDashboard(res.data.value)
    } catch {
      // ignore
    } finally {
      setIsDashboardLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      void fetchDashboard()
    }
  }, [user, fetchDashboard])

  if (isLoading) {
    return <AppShellLoader title="Loading lessons" description="Preparing your lessons & discipline dashboard." />
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to the login page." />
  }

  return (
    <div className="min-h-screen relative bg-slate-50 dark:bg-background overflow-hidden selection:bg-primary/20">
      {/* Dynamic Background */}
      <div className="pointer-events-none absolute -inset-[10px] opacity-60 dark:opacity-40">
        <div className="absolute -top-24 -right-24 h-[600px] w-[600px] rounded-full bg-primary/10 dark:bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-[600px] w-[600px] rounded-full bg-secondary/20 dark:bg-secondary/20 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
          {/* Page Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                Lessons & Discipline
              </h1>
              <p className="mt-1 text-muted-foreground">
                Track what you learn from losses, stay disciplined, and grow as a trader.
              </p>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Lesson
            </Button>
          </div>

          <div className="space-y-6">
            {/* Stats Cards */}
            <LessonsStatsCards dashboard={dashboard} isLoading={isDashboardLoading} />

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <DisciplineScoreChart
                timeline={dashboard?.disciplineTimeline ?? []}
                isLoading={isDashboardLoading}
              />
              <CategoryBreakdownChart
                breakdown={dashboard?.categoryBreakdown ?? []}
                isLoading={isDashboardLoading}
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-lg grid-cols-3 mx-auto bg-muted/50 backdrop-blur-md border border-border/50">
                <TabsTrigger value="lessons" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Lessons</span>
                </TabsTrigger>
                <TabsTrigger value="rules" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Rules</span>
                </TabsTrigger>
                <TabsTrigger value="log" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <ListChecks className="h-4 w-4" />
                  <span className="hidden sm:inline">Log</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lessons" className="mt-6">
                <div className="space-y-6">
                  <AiLessonSuggestions onCreated={() => {
                    void fetchDashboard()
                    setRefreshTrigger((prev) => prev + 1)
                  }} />
                  <LessonsList onRefreshDashboard={fetchDashboard} refreshTrigger={refreshTrigger} />
                </div>
              </TabsContent>

              <TabsContent value="rules" className="mt-6">
                <DisciplineRulesPanel />
              </TabsContent>

              <TabsContent value="log" className="mt-6">
                <DisciplineLogTable />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <CreateLessonDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false)
          void fetchDashboard()
          setRefreshTrigger(prev => prev + 1)
        }}
      />
    </div>
  )
}
