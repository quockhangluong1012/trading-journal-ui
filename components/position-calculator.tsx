"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function PositionCalculator() {
  const [accountBalance, setAccountBalance] = useState("10000")
  const [riskPercent, setRiskPercent] = useState("1")
  
  // Crypto
  const [entryPrice, setEntryPrice] = useState("")
  const [stopLossPrice, setStopLossPrice] = useState("")

  // Forex
  const [stopLossPips, setStopLossPips] = useState("")
  const [pipValue, setPipValue] = useState("10") // Standard lot generally $10/pip

  const riskAmount = (parseFloat(accountBalance) || 0) * ((parseFloat(riskPercent) || 0) / 100)

  // Crypto calculation Calculate position size: Risk Amount / ABS(Entry - StopLoss)
  const priceDiff = Math.abs((parseFloat(entryPrice) || 0) - (parseFloat(stopLossPrice) || 0))
  const cryptoPositionSize = priceDiff > 0 ? (riskAmount / priceDiff).toFixed(4) : "0.0000"

  // Forex Calculation: Risk Amount / (SL Pips * Pip Value)
  const forexPositionSize = (parseFloat(stopLossPips) && parseFloat(pipValue)) 
    ? (riskAmount / (parseFloat(stopLossPips) * parseFloat(pipValue))).toFixed(2) 
    : "0.00"

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Position Size Calculator</CardTitle>
        <CardDescription>Determine your optimal lot size holding to your risk rules.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Account Balance ($)</Label>
            <Input type="number" value={accountBalance} onChange={e => setAccountBalance(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Risk Percentage (%)</Label>
            <Input type="number" step="0.1" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} />
          </div>
        </div>

        <div className="mb-4 rounded bg-muted/50 p-3 text-center">
          <div className="text-sm text-muted-foreground">Amount at Risk</div>
          <div className="text-xl font-bold text-destructive">${riskAmount.toFixed(2)}</div>
        </div>

        <Tabs defaultValue="crypto">
          <TabsList className="grid w-full grid-cols-2 gap-0 overflow-hidden rounded-md border text-sm">
            <TabsTrigger value="crypto" className="rounded-none py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Crypto / Stocks</TabsTrigger>
            <TabsTrigger value="forex" className="rounded-none py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Forex</TabsTrigger>
          </TabsList>
          
          <TabsContent value="crypto" className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Entry Price</Label>
                <Input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Stop Loss Price</Label>
                <Input type="number" value={stopLossPrice} onChange={e => setStopLossPrice(e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border border-success/50 bg-success/10 p-4 text-center">
              <div className="text-sm font-medium text-success">Position Size (Units)</div>
              <div className="text-2xl font-bold text-success">{cryptoPositionSize}</div>
            </div>
          </TabsContent>

          <TabsContent value="forex" className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Stop Loss (Pips)</Label>
                <Input type="number" value={stopLossPips} onChange={e => setStopLossPips(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Pip Value per Standard Lot ($)</Label>
                <Input type="number" value={pipValue} onChange={e => setPipValue(e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border border-success/50 bg-success/10 p-4 text-center">
              <div className="text-sm font-medium text-success">Position Size (Standard Lots)</div>
              <div className="text-2xl font-bold text-success">{forexPositionSize}</div>
            </div>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  )
}
