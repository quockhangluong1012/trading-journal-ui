"use client"

import { useState, useEffect } from "react"
import { AppPageIntro } from "@/components/app-page-intro"
import { AppPageShell } from "@/components/app-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getTradingProfile, updateTradingProfile } from "@/lib/discipline-api"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { AppShellLoader } from "@/components/app-shell-loader"

export default function DisciplineSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [maxTrades, setMaxTrades] = useState<string>("")
  const [maxLoss, setMaxLoss] = useState<string>("")
  const [maxConsecutive, setMaxConsecutive] = useState<string>("")

  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname))
    }
  }, [user, isAuthLoading, pathname, router])

  useEffect(() => {
    if (isAuthLoading || !user) return;
    getTradingProfile()
      .then(res => {
        if (res.data.isSuccess) {
          const p = res.data.value;
          setEnabled(p.isDisciplineEnabled ?? true);
          setMaxTrades(p.maxTradesPerDay?.toString() || "");
          setMaxLoss(p.maxDailyLossPercentage?.toString() || "");
          setMaxConsecutive(p.maxConsecutiveLosses?.toString() || "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateTradingProfile({
        isDisciplineEnabled: enabled,
        maxTradesPerDay: maxTrades ? parseInt(maxTrades) : null,
        maxDailyLossPercentage: maxLoss ? parseFloat(maxLoss) : null,
        maxConsecutiveLosses: maxConsecutive ? parseInt(maxConsecutive) : null,
      })
      if (res.data.isSuccess) {
        toast({ title: "Success", description: "Discipline profile saved." })
      } else {
        toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (isAuthLoading) {
    return <AppShellLoader title="Loading settings" description="Gathering your profile data." />
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />
  }

  return (
    <AppPageShell width="narrow" contentClassName="space-y-6 py-4 sm:py-8">
        <AppPageIntro
          badge="Trading guardrails"
          title="Gamification & Discipline"
          description="Configure trading rules that help flag emotional or out-of-bounds execution in your journal history."
        />
        
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Trading Rules</CardTitle>
              <CardDescription>Configure rules to keep your emotional trading in check. If a trade violates these rules, it will be flagged as a Discipline Violation in your history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Rule Enforcement</Label>
                  <p className="text-sm text-muted-foreground">Actively monitor your trades against these rules.</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="maxTrades">Max Trades Per Day</Label>
                  <Input 
                    id="maxTrades" 
                    type="number" 
                    placeholder="e.g. 3" 
                    value={maxTrades} 
                    onChange={e => setMaxTrades(e.target.value)} 
                    disabled={!enabled}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="maxLoss">Max Daily Loss (%)</Label>
                  <Input 
                    id="maxLoss" 
                    type="number" 
                    step="0.1" 
                    placeholder="e.g. 2.0" 
                    value={maxLoss} 
                    onChange={e => setMaxLoss(e.target.value)} 
                    disabled={!enabled}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxConsecutive">Max Consecutive Losses</Label>
                  <Input 
                    id="maxConsecutive" 
                    type="number" 
                    placeholder="e.g. 2" 
                    value={maxConsecutive} 
                    onChange={e => setMaxConsecutive(e.target.value)} 
                    disabled={!enabled}
                  />
                  <p className="text-sm text-muted-foreground">Stop trading if you hit a losing streak.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        )}
    </AppPageShell>
  )
}
