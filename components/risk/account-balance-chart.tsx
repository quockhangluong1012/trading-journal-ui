"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createAccountBalanceEntry, type AccountBalanceEntry } from "@/lib/risk-api"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"

export function AccountBalancePanel({ data, onRefresh }: { data: AccountBalanceEntry[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [entryType, setEntryType] = useState("1")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const chartData = [...data].reverse().map(e => ({ date: new Date(e.entryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }), balance: e.balanceAfter }))

  const handleSubmit = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setSaving(true)
    try {
      await createAccountBalanceEntry({ entryType: parseInt(entryType), amount: amt, notes: notes || undefined, entryDate: new Date().toISOString() })
      setShowForm(false); setAmount(""); setNotes(""); onRefresh()
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <Card className={SC}>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <div><CardTitle className="text-lg">Account Balance History</CardTitle>
            <CardDescription>Track your deposits, withdrawals, and account growth</CardDescription></div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(!showForm)}><Plus className="h-3.5 w-3.5" />Add Entry</Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6 space-y-3 rounded-xl border border-border/50 bg-secondary/20 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
                  <Select value={entryType} onValueChange={setEntryType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Initial Deposit</SelectItem>
                      <SelectItem value="1">Deposit</SelectItem>
                      <SelectItem value="2">Withdrawal</SelectItem>
                      <SelectItem value="3">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Amount</label>
                  <Input type="number" step="any" placeholder="500.00" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
                  <Input placeholder="Monthly deposit" value={notes} onChange={e => setNotes(e.target.value)} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          )}
          {chartData.length > 1 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs><linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${v.toLocaleString()}`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Balance"]} />
                  <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" fill="url(#balGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Add balance entries to see the chart</div>}
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card className={SC}>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Recent Entries</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.slice(0, 10).map(e => (
                <div key={e.id} className="flex items-center justify-between rounded-xl bg-secondary/20 px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.entryType === "Withdrawal" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>{e.entryType}</span>
                    <span className="text-muted-foreground">{new Date(e.entryDate).toLocaleDateString()}</span>
                    {e.notes && <span className="text-muted-foreground/60">— {e.notes}</span>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">${e.amount.toLocaleString()}</span>
                    <span className="ml-2 text-muted-foreground">→ ${e.balanceAfter.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
