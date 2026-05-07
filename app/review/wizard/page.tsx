"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Wand2 } from "lucide-react"
import { AppPageIntro } from "@/components/app-page-intro"
import { AppPageShell } from "@/components/app-page-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { WizardContainer } from "@/components/review/wizard/wizard-container"
import { useReviewWizard } from "@/hooks/use-review-wizard"
import { ReviewPeriodType } from "@/lib/review-api"
import { useAuth } from "@/lib/auth-context"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { AppShellLoader } from "@/components/app-shell-loader"

function WizardTabContent({ periodType }: { periodType: ReviewPeriodType }) {
  const wizard = useReviewWizard(periodType, new Date())

  if (wizard.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-100 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    )
  }

  return <WizardContainer wizard={wizard} />
}

function WizardContent() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("period") === "monthly" ? "monthly" : "weekly"

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname))
    }
  }, [user, isAuthLoading, pathname, router])

  if (isAuthLoading) {
    return <AppShellLoader title="Loading wizard" description="Preparing your review wizard." />
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />
  }

  return (
    <AppPageShell contentClassName="space-y-6">
        <AppPageIntro
          badge="Structured review"
          icon={<Wand2 className="h-6 w-6" />}
          title="Review Wizard"
          description="Complete a structured review to analyze your performance, identify patterns, and set improvement goals."
        />

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid h-auto w-full max-w-md grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-1">
            <TabsTrigger value="weekly" className="gap-1.5 rounded-xl px-4 py-2.5">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5 rounded-xl px-4 py-2.5">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <WizardTabContent periodType={ReviewPeriodType.Weekly} />
          </TabsContent>
          <TabsContent value="monthly">
            <WizardTabContent periodType={ReviewPeriodType.Monthly} />
          </TabsContent>
        </Tabs>
    </AppPageShell>
  )
}

function WizardContentFallback() {
  return <AppShellLoader title="Loading wizard" description="Preparing your review wizard." />
}

export default function ReviewWizardPage() {
  return (
    <Suspense fallback={<WizardContentFallback />}>
      <WizardContent />
    </Suspense>
  )
}
