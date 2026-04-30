"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateRiskConfig, type RiskConfig } from "@/lib/risk-api"
import { toast } from "sonner"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"

export function RiskConfigPanel({ config, onSaved }: { config: RiskConfig | null; onSaved: () => void }) {
  const [form, setForm] = useState<RiskConfig>({ dailyLossLimitPercent: 2, weeklyDrawdownCapPercent: 5, riskPerTradePercent: 1, maxOpenPositions: 5, maxCorrelatedPositions: 3, accountBalance: 10000 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (config) setForm(config) }, [config])

  const handleSave = async () => {
    setSaving(true)
    try { await updateRiskConfig(form); toast.success("Risk settings saved."); onSaved() }
    catch { toast.error("Failed to save settings.") }
    setSaving(false)
  }

  const fields: { key: keyof RiskConfig; label: string; suffix: string; step: string; min: number; max: number }[] = [
    { key: "accountBalance", label: "Account Balance", suffix: "$", step: "100", min: 1, max: 10000000 },
    { key: "dailyLossLimitPercent", label: "Daily Loss Limit", suffix: "%", step: "0.5", min: 0.1, max: 100 },
    { key: "weeklyDrawdownCapPercent", label: "Weekly Drawdown Cap", suffix: "%", step: "0.5", min: 0.1, max: 100 },
    { key: "riskPerTradePercent", label: "Risk Per Trade", suffix: "%", step: "0.25", min: 0.1, max: 50 },
    { key: "maxOpenPositions", label: "Max Open Positions", suffix: "", step: "1", min: 1, max: 50 },
    { key: "maxCorrelatedPositions", label: "Max Correlated Positions", suffix: "", step: "1", min: 1, max: 20 },
  ]

  return (
    <Card className={SC}>
      <CardHeader className="pb-2"><CardTitle className="text-lg">Risk Configuration</CardTitle>
        <CardDescription>Set your risk management guardrails. These limits will trigger alerts on the dashboard.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label} {f.suffix && <span className="text-primary">{f.suffix}</span>}</label>
              <Input type="number" step={f.step} min={f.min} max={f.max} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
