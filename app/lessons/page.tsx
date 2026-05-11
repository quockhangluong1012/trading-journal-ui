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
import { AppPageIntro } from "@/components/app-page-intro"
import { AppPageShell } from "@/components/app-page-shell"
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
    return <AppShellLoader title="Loading knowledge library" description="Preparing your lessons and discipline dashboard." />
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to the login page." />
  }

  return (
    <>
      <AppPageShell className="selection:bg-primary/20" contentClassName="space-y-6">
          <AppPageIntro
            badge="Knowledge workspace"
            icon={<BookOpen className="h-6 w-6" />}
            title="Knowledge Library & Discipline"
            description="Turn lessons into a tagged knowledge library, track study status, and stay disciplined in execution."
            actions={
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="gap-2 bg-linear-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
              >
                <Plus className="h-4 w-4" />
                New Lesson
              </Button>
            }
          />

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
                  <span className="hidden sm:inline">Library</span>
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
      </AppPageShell>

      <CreateLessonDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false)
          void fetchDashboard()
          setRefreshTrigger(prev => prev + 1)
        }}
      />
    </>
  )
}
