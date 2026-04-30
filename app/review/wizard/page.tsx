"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ClipboardList, Wand2 } from "lucide-react"
import { Header } from "@/components/header"
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
        <Skeleton className="h-[400px] w-full rounded-2xl" />
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-1.5">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <Wand2 className="h-6 w-6 text-primary" />
            Review Wizard
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete a structured review to analyze your performance, identify patterns, and set improvement goals.
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="weekly" className="gap-1.5">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <WizardTabContent periodType={ReviewPeriodType.Weekly} />
          </TabsContent>
          <TabsContent value="monthly">
            <WizardTabContent periodType={ReviewPeriodType.Monthly} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
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
