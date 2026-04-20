"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AppShellLoader } from "@/components/app-shell-loader"
import { CreateTradePage as CreateTradePageContent } from "@/components/create-trade-page"
import { Header } from "@/components/header"
import { useAuth } from "@/lib/auth-context"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { sanitizeTradeReturnPath } from "@/lib/create-trade-form"

export function CreateTradeRoutePageClient() {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = sanitizeTradeReturnPath(searchParams.get("next"))

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <CreateTradePageContent returnTo={returnTo} />
      </main>
    </div>
  )
}