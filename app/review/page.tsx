"use client"

import { ClipboardList, Wand2 } from "lucide-react"
import Link from "next/link"
import { AppPageIntro } from "@/components/app-page-intro"
import { AppPageShell } from "@/components/app-page-shell"
import { ReviewCommandCenter } from "@/components/review/review-command-center"
import { ReviewMetricGrid } from "@/components/review/review-metric-grid"
import { ReviewNotesPanel, ReviewPeriodDetailsCard } from "@/components/review/review-side-panels"
import { ReviewSummaryCard } from "@/components/review/review-summary-card"
import { ReviewTradeJournal } from "@/components/review/review-trade-journal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useReviewWorkspace } from "@/hooks/use-review-workspace"
import { ReviewPeriodType, formatPeriodLabel } from "@/lib/review-api"
import { buildReviewNarrative, buildReviewPulse } from "@/lib/review-overview"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { AppShellLoader } from "@/components/app-shell-loader"
import { useEffect } from "react"

function ReviewTabContent({ periodType }: { periodType: ReviewPeriodType }) {
  const workspace = useReviewWorkspace(periodType)
  const periodLabel = formatPeriodLabel(periodType, workspace.currentDate)
  const narrative = buildReviewNarrative(workspace.review, periodLabel)
  const pulseCards = buildReviewPulse(workspace.review)

  return (
    <div className="space-y-6">
      <ReviewCommandCenter
        currentDate={workspace.currentDate}
        isExporting={workspace.isExporting}
        isGeneratingSummary={workspace.isGeneratingSummary}
        isLoading={workspace.isLoading}
        isRefreshing={workspace.isRefreshing}
        lastUpdatedAt={workspace.lastUpdatedAt}
        narrative={narrative}
        periodLabel={periodLabel}
        periodType={periodType}
        pulseCards={pulseCards}
        review={workspace.review}
        syncWarning={workspace.syncWarning}
        onExportReport={() => {
          void workspace.exportReport()
        }}
        onGenerateSummary={() => {
          void workspace.generateSummary()
        }}
        onNavigate={workspace.setCurrentDate}
        onRefresh={() => {
          void workspace.refresh({ silent: true })
        }}
      />

      <ReviewMetricGrid isLoading={workspace.isLoading} review={workspace.review} />

      {/* Two-column layout: Main content (journal + AI) | Sidebar (notes + details) */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">
          {/* Trade journal — the main focus of the redesign */}
          <ReviewTradeJournal isLoading={workspace.isLoading} trades={workspace.trades} />

          {/* AI summary below the trade journal */}
          <ReviewSummaryCard
            isGenerating={workspace.isGeneratingSummary}
            review={workspace.review}
            onGenerateSummary={() => {
              void workspace.generateSummary()
            }}
          />
        </div>

        <div className="space-y-6">
          <ReviewNotesPanel
            isSaving={workspace.isSaving}
            notes={workspace.notes}
            onChange={workspace.handleNotesChange}
            onSave={() => {
              void workspace.saveNotesNow()
            }}
          />

          <ReviewPeriodDetailsCard
            bounds={workspace.bounds}
            periodLabel={periodLabel}
            review={workspace.review}
          />
        </div>
      </div>
    </div>
  )
}

// --- Main Page ---
function ReviewContent() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname))
    }
  }, [user, isAuthLoading, pathname, router])

  if (isAuthLoading) {
    return <AppShellLoader title="Loading review" description="Gathering your review workspace." />
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />
  }

  return (
    <AppPageShell contentClassName="space-y-6">
        <AppPageIntro
          badge="Review workspace"
          icon={<ClipboardList className="h-6 w-6" />}
          title="Trade Review"
          description="Review your trading journal with full trade details, notes, emotions, and AI coaching insights. Export as PDF anytime."
          actions={
            <Link
              href="/review/wizard"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-md"
            >
              <Wand2 className="h-4 w-4" />
              Review Wizard
            </Link>
          }
        />

        <Tabs defaultValue="weekly" className="space-y-6">
          <TabsList className="grid h-auto w-full max-w-2xl grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-1 lg:grid-cols-4">
            <TabsTrigger value="daily" className="gap-1.5 rounded-xl px-3 py-2.5">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1.5 rounded-xl px-3 py-2.5">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5 rounded-xl px-3 py-2.5">Monthly</TabsTrigger>
            <TabsTrigger value="quarterly" className="gap-1.5 rounded-xl px-3 py-2.5">Quarterly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <ReviewTabContent periodType={ReviewPeriodType.Daily} />
          </TabsContent>
          <TabsContent value="weekly">
            <ReviewTabContent periodType={ReviewPeriodType.Weekly} />
          </TabsContent>
          <TabsContent value="monthly">
            <ReviewTabContent periodType={ReviewPeriodType.Monthly} />
          </TabsContent>
          <TabsContent value="quarterly">
            <ReviewTabContent periodType={ReviewPeriodType.Quarterly} />
          </TabsContent>
        </Tabs>
    </AppPageShell>
  )
}

export default function ReviewPage() {
  return <ReviewContent />
}
