"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { FileText, Zap } from "lucide-react"
import { AppPageIntro } from "@/components/app-page-intro"
import { AppPageShell } from "@/components/app-page-shell"
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
    <AppPageShell contentClassName="space-y-8 py-4 sm:py-6 lg:py-8">
      <AppPageIntro
        badge="Template library"
        icon={<FileText className="h-6 w-6" />}
        title="Trade Templates"
        description="Save frequently-used configurations and create trades faster during live sessions."
        actions={
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
        }
      />

      <TemplateManager onUseTemplate={handleUseTemplate} />

      <QuickTradeModal
        open={quickTradeOpen}
        onOpenChange={setQuickTradeOpen}
        prefillTemplate={selectedTemplate}
      />
    </AppPageShell>
  )
}

export default function TemplatesPage() {
  return <TemplatesContent />
}
