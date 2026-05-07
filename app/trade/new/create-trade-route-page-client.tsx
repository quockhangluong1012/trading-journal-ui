"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AppShellLoader } from "@/components/app-shell-loader"
import { AppPageShell } from "@/components/app-page-shell"
import { CreateTradePage as CreateTradePageContent } from "@/components/create-trade-page"
import { useAuth } from "@/lib/auth-context"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { sanitizeTradeReturnPath } from "@/lib/create-trade-form"

export function CreateTradeRoutePageClient() {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = sanitizeTradeReturnPath(searchParams.get("next"))
  const templateIdStr = searchParams.get("templateId")
  const parsedTemplateId = templateIdStr ? Number.parseInt(templateIdStr, 10) : undefined
  const templateId = parsedTemplateId !== undefined && Number.isNaN(parsedTemplateId)
    ? undefined
    : parsedTemplateId
  const queryOverrides = {
    asset: searchParams.get("asset") || undefined,
    position: searchParams.get("position") || undefined,
    entry: searchParams.get("entry") || undefined,
    sl: searchParams.get("sl") || undefined,
    t1: searchParams.get("t1") || undefined,
    zone: searchParams.get("zone") || undefined,
    confidence: searchParams.get("confidence") || undefined,
  }

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname))
    }
  }, [isLoading, pathname, router, user])

  if (isLoading) {
    return (
      <AppShellLoader
        title="Loading trade planner"
        description="Preparing your trade setup workspace."
      />
    )
  }

  if (!user) {
    return (
      <AppShellLoader
        title="Redirecting to sign in"
        description="Taking you back to the trade planner as soon as your session is ready."
      />
    )
  }

  return (
    <AppPageShell contentClassName="py-4 sm:py-6 lg:py-8">
      <CreateTradePageContent 
        returnTo={returnTo} 
        templateId={templateId} 
        queryOverrides={queryOverrides} 
      />
    </AppPageShell>
  )
}