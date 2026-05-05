"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { FileText, Zap } from "lucide-react"
import { Header } from "@/components/header"
import { TemplateManager } from "@/components/trade/template-manager"
import { QuickTradeModal } from "@/components/trade/quick-trade-modal"
import { useAuth } from "@/lib/auth-context"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { AppShellLoader } from "@/components/app-shell-loader"
import { Button } from "@/components/ui/button"
import { type TradeTemplateDto } from "@/lib/template-api"

function TemplatesContent() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [quickTradeOpen, setQuickTradeOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TradeTemplateDto | null>(null)

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname))
    }
  }, [user, isAuthLoading, pathname, router])

  if (isAuthLoading) {
    return <AppShellLoader title="Loading templates" description="Preparing your trade templates." />
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />
  }

  const handleUseTemplate = (template: TradeTemplateDto) => {
    setSelectedTemplate(template)
    setQuickTradeOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
              <FileText className="h-6 w-6 text-primary" />
              Trade Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Save frequently-used configurations and create trades faster during live sessions.
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedTemplate(null)
              setQuickTradeOpen(true)
            }}
            className="gap-2 rounded-full bg-emerald-600 shadow-sm shadow-emerald-600/25 hover:bg-emerald-700"
          >
            <Zap className="h-4 w-4" />
            Quick Trade
          </Button>
        </div>

        {/* Template manager grid */}
        <TemplateManager onUseTemplate={handleUseTemplate} />

        {/* Quick trade modal */}
        <QuickTradeModal
          open={quickTradeOpen}
          onOpenChange={setQuickTradeOpen}
          prefillTemplate={selectedTemplate}
        />
      </main>
    </div>
  )
}

export default function TemplatesPage() {
  return <TemplatesContent />
}
