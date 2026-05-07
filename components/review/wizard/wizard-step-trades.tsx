"use client"

import { ArrowDownCircle, ArrowUpCircle, Trophy, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SafeHtml } from "@/components/ui/safe-html"
import { Textarea } from "@/components/ui/textarea"
import type { UseReviewWizardResult } from "@/hooks/use-review-wizard"
import type { WizardTradeHighlight } from "@/lib/wizard-api"

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
})

function TradeCard({ trade, rank }: { trade: WizardTradeHighlight; rank: number }) {
  const isWin = trade.pnl > 0
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${
      isWin ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
            isWin ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
          }`}>
            #{rank}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{trade.asset}</p>
            <p className="text-xs text-muted-foreground">
              {trade.position} · {new Date(trade.closedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
            {isWin ? "+" : ""}{currencyFmt.format(trade.pnl)}
          </p>
          <div className="mt-1 flex gap-1">
            {trade.isRuleBroken && (
              <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-[10px] text-red-400">
                <AlertTriangle className="mr-0.5 h-2.5 w-2.5" /> Rule break
              </Badge>
            )}
          </div>
        </div>
      </div>
      {trade.emotionTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {trade.emotionTags.map((tag) => (
            <Badge key={tag} variant="outline" className="border-border/50 text-[10px]">{tag}</Badge>
          ))}
        </div>
      )}
      {trade.notes && (
        <SafeHtml
          html={trade.notes}
          className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2 [&_p]:inline [&_ul]:inline [&_li]:inline"
        />
      )}
    </div>
  )
}

export function WizardStepTrades({ wizard }: { wizard: UseReviewWizardResult }) {
  const { wizardData, form, updateForm } = wizard

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best trades */}
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-emerald-400" />
              Best Trades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {wizardData?.bestTrades.length ? (
              wizardData.bestTrades.map((t, i) => <TradeCard key={t.tradeId} trade={t} rank={i + 1} />)
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No trades in this period</p>
            )}
          </CardContent>
        </Card>

        {/* Worst trades */}
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Worst Trades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {wizardData?.worstTrades.length ? (
              wizardData.worstTrades.map((t, i) => <TradeCard key={t.tradeId} trade={t} rank={i + 1} />)
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No trades in this period</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reflections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
              What made your best trades work?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="What setup, timing, or mindset led to these wins?"
              value={form.bestTradeReflection}
              onChange={(e) => updateForm("bestTradeReflection", e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowDownCircle className="h-4 w-4 text-red-400" />
              What went wrong with your worst trades?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="What mistakes or conditions led to these losses?"
              value={form.worstTradeReflection}
              onChange={(e) => updateForm("worstTradeReflection", e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
