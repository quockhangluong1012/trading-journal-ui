"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { samplePsychologyEntries, sampleUserSessions, type PsychologyEntry, type UserSession } from "./trade-store"
import { sampleStrategies, runProgressiveBacktest, 
  type StrategyTemplate, type BacktestProgress, 
  runBacktest} from "./playbook-store"
import { PositionType } from "./enum/PositionType"
import { PlaybookStrategy } from "@/app/types/play-book-strategy"
import { TradeStatus } from "./enum/TradeStatus"
import { api, ApiResponse } from "./api"
import { toast } from "@/hooks/use-toast"
import { Trade } from "@/app/types/trade"
import type { PlaybookType, PlaybookStatus, StopLossType, TakeProfitType, PositionSizingType } from "@/app/constants/playbook"

// --- Enum mapping helpers ---

const strategyTypeToInt: Record<PlaybookType, number> = { backtest: 0, forward: 1 }
const strategyTypeFromInt: Record<number, PlaybookType> = { 0: "backtest", 1: "forward" }

const strategyStatusToInt: Record<PlaybookStatus, number> = { draft: 0, running: 1, completed: 2 }
const strategyStatusFromInt: Record<number, PlaybookStatus> = { 0: "draft", 1: "running", 2: "completed" }

const stopLossTypeToInt: Record<StopLossType, number> = { fixed: 0, atr: 1, percent: 2 }
const stopLossTypeFromInt: Record<number, StopLossType> = { 0: "fixed", 1: "atr", 2: "percent" }

const takeProfitTypeToInt: Record<TakeProfitType, number> = { fixed: 0, "rr-ratio": 1, percent: 2 }
const takeProfitTypeFromInt: Record<number, TakeProfitType> = { 0: "fixed", 1: "rr-ratio", 2: "percent" }

const positionSizingToInt: Record<PositionSizingType, number> = { fixed: 0, "percent-equity": 1 }
const positionSizingFromInt: Record<number, PositionSizingType> = { 0: "fixed", 1: "percent-equity" }

type StrategyCategory = "scalping" | "swing" | "position" | "day-trading" | "custom"
const categoryToInt: Record<StrategyCategory, number> = { scalping: 0, swing: 1, position: 2, "day-trading": 3, custom: 4 }
const categoryFromInt: Record<number, StrategyCategory> = { 0: "scalping", 1: "swing", 2: "position", 3: "day-trading", 4: "custom" }

function mapStrategyToApi(s: Omit<PlaybookStrategy, "id" | "createdAt" | "status">) {
  return {
    name: s.name,
    description: s.description,
    type: strategyTypeToInt[s.type],
    asset: s.asset,
    timeframe: s.timeframe,
    dateRangeStart: s.dateRange?.start || null,
    dateRangeEnd: s.dateRange?.end || null,
    entryIndicators: s.entryIndicators,
    exitIndicators: s.exitIndicators,
    riskPerTrade: s.riskPerTrade,
    stopLossType: stopLossTypeToInt[s.stopLossType],
    stopLossValue: s.stopLossValue,
    takeProfitType: takeProfitTypeToInt[s.takeProfitType],
    takeProfitValue: s.takeProfitValue,
    positionSizing: positionSizingToInt[s.positionSizing],
    positionSizeValue: s.positionSizeValue,
  }
}

function mapStrategyUpdateToApi(id: number, s: Partial<PlaybookStrategy>) {
  return {
    id,
    name: s.name,
    description: s.description,
    type: s.type !== undefined ? strategyTypeToInt[s.type] : undefined,
    status: s.status !== undefined ? strategyStatusToInt[s.status] : undefined,
    asset: s.asset,
    timeframe: s.timeframe,
    dateRangeStart: s.dateRange?.start || null,
    dateRangeEnd: s.dateRange?.end || null,
    entryIndicators: s.entryIndicators,
    exitIndicators: s.exitIndicators,
    riskPerTrade: s.riskPerTrade,
    stopLossType: s.stopLossType !== undefined ? stopLossTypeToInt[s.stopLossType] : undefined,
    stopLossValue: s.stopLossValue,
    takeProfitType: s.takeProfitType !== undefined ? takeProfitTypeToInt[s.takeProfitType] : undefined,
    takeProfitValue: s.takeProfitValue,
    positionSizing: s.positionSizing !== undefined ? positionSizingToInt[s.positionSizing] : undefined,
    positionSizeValue: s.positionSizeValue,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStrategyFromApi(s: any): PlaybookStrategy {
  return {
    id: s.id.toString(),
    name: s.name,
    description: s.description,
    type: strategyTypeFromInt[s.type] ?? "backtest",
    status: strategyStatusFromInt[s.status] ?? "draft",
    createdAt: s.createdDate ? new Date(s.createdDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    asset: s.asset,
    timeframe: s.timeframe,
    dateRange: { start: s.dateRangeStart || "", end: s.dateRangeEnd || "" },
    entryIndicators: s.entryIndicators ?? [],
    exitIndicators: s.exitIndicators ?? [],
    riskPerTrade: s.riskPerTrade,
    stopLossType: stopLossTypeFromInt[s.stopLossType] ?? "fixed",
    stopLossValue: s.stopLossValue,
    takeProfitType: takeProfitTypeFromInt[s.takeProfitType] ?? "rr-ratio",
    takeProfitValue: s.takeProfitValue,
    positionSizing: positionSizingFromInt[s.positionSizing] ?? "percent-equity",
    positionSizeValue: s.positionSizeValue,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTemplateFromApi(t: any): StrategyTemplate {
  return {
    id: t.id.toString(),
    name: t.name,
    description: t.description,
    category: categoryFromInt[t.category] ?? "custom",
    isBuiltIn: false,
    config: {
      asset: t.asset,
      timeframe: t.timeframe,
      dateRange: { start: t.dateRangeStart || "", end: t.dateRangeEnd || "" },
      entryIndicators: t.entryIndicators ?? [],
      exitIndicators: t.exitIndicators ?? [],
      riskPerTrade: t.riskPerTrade,
      stopLossType: stopLossTypeFromInt[t.stopLossType] ?? "fixed",
      stopLossValue: t.stopLossValue,
      takeProfitType: takeProfitTypeFromInt[t.takeProfitType] ?? "rr-ratio",
      takeProfitValue: t.takeProfitValue,
      positionSizing: positionSizingFromInt[t.positionSizing] ?? "percent-equity",
      positionSizeValue: t.positionSizeValue,
    },
  }
}

interface TradeContextType {
  trades: Trade[]
  addTrade: (trade: Omit<Trade, "id">) => void
  updateTrade: (id: string, trade: Partial<Trade>) => void
  deleteTrade: (id: string) => void
  closeTrade: (id: string, exitPrice: number) => void
  
  // User Sessions
  userSessions: UserSession[]
  activeSession: UserSession | null
  startSession: () => Promise<void>
  endSession: (note: string, duration: string) => Promise<void>

  psychologyEntries: PsychologyEntry[]
  addPsychologyEntry: (entry: Omit<PsychologyEntry, "id">) => void
  updatePsychologyEntry: (id: string, entry: Partial<PsychologyEntry>) => void
  deletePsychologyEntry: (id: string) => void
  // Playbook
  strategies: PlaybookStrategy[]
  addStrategy: (strategy: Omit<PlaybookStrategy, "id" | "createdAt" | "status">) => void
  updateStrategy: (id: string, updates: Partial<PlaybookStrategy>) => void
  deleteStrategy: (id: string) => void
  runStrategy: (id: string) => void
  runStrategyProgressive: (id: string) => void
  cancelProgressiveRun: () => void
  backtestProgress: BacktestProgress | null
  activeBacktestId: string | null
  // Playbook loading
  pendingPlaybookStrategyId: string | null
  setPendingPlaybookStrategyId: (id: string | null) => void
  // Templates
  customTemplates: StrategyTemplate[]
  saveTemplate: (template: Omit<StrategyTemplate, "id" | "isBuiltIn">) => void
  deleteTemplate: (id: string) => void
  duplicateStrategy: (id: string) => void
}

const TradeContext = createContext<TradeContextType | undefined>(undefined)

export function TradeProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [psychologyEntries, setPsychologyEntries] = useState<PsychologyEntry[]>(samplePsychologyEntries)
  const [strategies, setStrategies] = useState<PlaybookStrategy[]>(sampleStrategies)
  const [userSessions, setUserSessions] = useState<UserSession[]>(sampleUserSessions)

  const activeSession = userSessions.find(s => s.status === "Active") || null

  // --- Load strategies and templates from API on mount ---
  useEffect(() => {
    
  }, [])

  const startSession = async () => {
    try {
      const now = new Date()
      const res = await api.post<number>("/v1/trading-sessions", {
        fromTime: now.toISOString(),
      })

      const newSession: UserSession = {
        id: res.data.toString(),
        startTime: now.toISOString(),
        status: "Active",
        tradesCount: 0,
        pnl: 0,
      }
      setUserSessions(prev => [newSession, ...prev])
      toast({ title: "Session started", description: "Your trading session has begun. Good luck!" })
    } catch (error) {
      console.error("Error starting session:", error)
      toast({ title: "Failed to start session", description: "Could not create session. Please try again.", variant: "destructive" })
    }
  }

  const endSession = async (note: string, duration: string) => {
    const session = userSessions.find(s => s.status === "Active")
    if (!session) return

    try {
      const now = new Date()
      const res = await api.post<ApiResponse<boolean>>("/v1/trading-sessions/end", {
        id: Number.parseInt(session.id, 10),
        toTime: now.toISOString(),
        note: note || "",
        duration: duration,
      })

      if (!res.data.isSuccess) {
        throw new Error("Failed to end session")
      }

      setUserSessions(prev => prev.map(s => {
        if (s.status === "Active") {
          return {
            ...s,
            status: "Closed" as const,
            endTime: now.toISOString(),
            notes: note || undefined,
          }
        }
        return s
      }))
      toast({ title: "Session ended", description: "Your trading session has been saved." })
    } catch (error) {
      console.error("Error ending session:", error)
      toast({ title: "Failed to end session", description: "Could not end session. Please try again.", variant: "destructive" })
    }
  }

  // Progressive backtest state
  const [backtestProgress, setBacktestProgress] = useState<BacktestProgress | null>(null)
  const [activeBacktestId, setActiveBacktestId] = useState<string | null>(null)
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null)
  const [pendingPlaybookStrategyId, setPendingPlaybookStrategyId] = useState<string | null>(null)

  const runStrategyProgressive = async (id: string) => {
    // Cancel any existing run (not easily cancellable for backend unless using cancellation token APIs, we'll just ignore for now)
    if (cancelFn) cancelFn()

    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "running" as const, results: undefined } : s))
    )
    setActiveBacktestId(id)
    setBacktestProgress({
      progress: 0, phase: "initializing", tradesProcessed: 0, totalTrades: 0, interimWinRate: 0, interimPnl: 0, interimProfitFactor: 0, equitySoFar: []
    })

    const strat = strategies.find((s) => s.id === id)
    if (!strat) return

    let isCancelled = false;
    setCancelFn(() => () => { isCancelled = true; })

    // Start fake progress
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
      if (fakeProgress < 90) {
        fakeProgress += 5;
        setBacktestProgress((prev) => prev ? { ...prev, progress: fakeProgress, phase: fakeProgress < 10 ? "initializing" : "processing" } : null)
      }
    }, 500);

    try {
      // 1. Check if historical data exists
      const filesRes = await api.get<ApiResponse<any[]>>("/v1/backtests/historical-data")
      let hasData = false
      if (filesRes.data.isSuccess && filesRes.data.value) {
        hasData = filesRes.data.value.some((f) => 
          f.asset.toLowerCase() === strat.asset.toLowerCase() &&
          new Date(f.startDate) <= new Date(strat.dateRange.start) &&
          new Date(f.endDate) >= new Date(strat.dateRange.end)
        )
      }

      if (isCancelled) throw new Error("Cancelled")

      // 2. Download if missing
      if (!hasData) {
        const dlRes = await api.post<ApiResponse<any>>("/v1/backtests/historical-data", {
          asset: strat.asset,
          startDate: strat.dateRange.start,
          endDate: strat.dateRange.end,
        })
        if (!dlRes.data.isSuccess) throw new Error("Failed to download historical data")
      }

      if (isCancelled) throw new Error("Cancelled")

      // 3. Create Backtest
      const createRes = await api.post<ApiResponse<number>>("/v1/backtests", {
        strategyId: Number.parseInt(strat.id),
        name: `Run for ${strat.name}`,
        startDate: strat.dateRange.start,
        endDate: strat.dateRange.end,
        initialCapital: strat.positionSizing === "percent-equity" ? 50000 : strat.positionSizeValue * 5
      })
      if (!createRes.data.isSuccess) throw new Error("Failed to create backtest session")
      const backtestId = createRes.data.value

      if (isCancelled) throw new Error("Cancelled")

      // 4. Run Backtest
      const runRes = await api.post<ApiResponse<any>>(`/v1/backtests/${backtestId}/run`)
      if (!runRes.data.isSuccess) throw new Error("Failed to run backtest")

      // 5. Map to PlaybookResults
      const data = runRes.data.value
      const startingCapital = data.initialCapital
      const trades = data.trades || []
      
      let equity = startingCapital
      let peak = startingCapital
      const equityCurve = trades.map((t: any) => {
        equity += t.pnl
        if (equity > peak) peak = equity
        const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0
        return {
          date: new Date(t.entryDate).toISOString().split("T")[0],
          equity: Math.round(equity),
          drawdown: Math.round(drawdown * 100) / 100
        }
      })

      const tradeLog = trades.map((t: any) => {
        const entryDate = new Date(t.entryDate)
        const exitDate = new Date(t.exitDate)
        const holdingMs = exitDate.getTime() - entryDate.getTime()
        const holdingDays = Math.max(1, Math.round(holdingMs / (1000 * 60 * 60 * 24)))
        return {
          id: `t-${t.id}`,
          date: entryDate.toISOString().split("T")[0],
          direction: t.position === 0 ? "long" : "short",
          entry: t.entryPrice,
          exit: t.exitPrice,
          pnl: t.pnl,
          pnlPct: Math.round((t.pnl / startingCapital) * 10000) / 100,
          holdingDays
        }
      })

      const monthlyPnl: Record<string, number> = {}
      trades.forEach((t: any) => {
        const month = new Date(t.entryDate).toISOString().slice(0, 7)
        monthlyPnl[month] = (monthlyPnl[month] || 0) + t.pnl
      })
      const monthlyReturns = Object.entries(monthlyPnl).map(([month, pnl]) => ({
        month, returnPct: Math.round((pnl / startingCapital) * 10000) / 100
      })).sort((a, b) => a.month.localeCompare(b.month))

      const results = {
        totalTrades: data.totalTrades,
        winRate: data.winRate,
        profitFactor: data.profitFactor > 999 ? 99.99 : data.profitFactor,
        expectancy: data.totalTrades > 0 ? Math.round((data.totalPnl / data.totalTrades) * 100) / 100 : 0,
        maxDrawdown: data.maxDrawdown,
        maxDrawdownPct: data.maxDrawdownPct,
        netProfit: data.totalPnl,
        netProfitPct: Math.round((data.totalPnl / startingCapital) * 1000) / 10,
        avgWin: data.avgWin,
        avgLoss: data.avgLoss,
        largestWin: data.largestWin,
        largestLoss: data.largestLoss,
        avgHoldingPeriod: strat.timeframe === "1D" || strat.timeframe === "1W" ? "几天" : "数小时",
        sharpeRatio: data.sharpeRatio,
        equityCurve,
        tradeLog,
        monthlyReturns,
        wins: data.winCount,
        losses: data.lossCount,
        side: "Long/Short"
      }

      if (isCancelled) throw new Error("Cancelled")

      clearInterval(progressInterval)
      setBacktestProgress({
        progress: 100, phase: "complete", 
        tradesProcessed: data.totalTrades, totalTrades: data.totalTrades, 
        interimWinRate: data.winRate, interimPnl: data.totalPnl, 
        interimProfitFactor: results.profitFactor, equitySoFar: equityCurve
      })

      setStrategies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "completed" as const, results } : s))
      )
      
      setTimeout(() => {
        setBacktestProgress(null)
        setActiveBacktestId(null)
        setCancelFn(null)
      }, 1500)

    } catch (error: any) {
      clearInterval(progressInterval)
      if (error.message !== "Cancelled") {
        console.error("Backtest error", error)
        toast({ title: "Backtest Failed", description: error.message || "An error occurred", variant: "destructive" })
      }
      setStrategies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "draft" as const } : s))
      )
      setBacktestProgress(null)
      setActiveBacktestId(null)
      setCancelFn(null)
    }
  }

  const cancelProgressiveRun = () => {
    if (cancelFn) cancelFn()
    if (activeBacktestId) {
      setStrategies((prev) =>
        prev.map((s) => (s.id === activeBacktestId ? { ...s, status: "draft" as const } : s))
      )
    }
    setActiveBacktestId(null)
    setBacktestProgress(null)
    setCancelFn(null)
  }

  const addStrategy = async (strategy: Omit<PlaybookStrategy, "id" | "createdAt" | "status">) => {
    try {
      const payload = mapStrategyToApi(strategy)
      const res = await api.post<ApiResponse<number>>("/v1/strategies", payload)
      if (res.data.isSuccess) {
        const newStrategy: PlaybookStrategy = {
          ...strategy,
          id: res.data.value.toString(),
          createdAt: new Date().toISOString().split("T")[0],
          status: "draft",
        }
        setStrategies((prev) => [newStrategy, ...prev])
        toast({ title: "Strategy created", description: "Your strategy has been saved." })
      } else {
        toast({ title: "Failed to create strategy", description: "Please try again.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error creating strategy:", error)
      toast({ title: "Failed to create strategy", description: "Could not save strategy. Please try again.", variant: "destructive" })
    }
  }

  const updateStrategy = async (id: string, updates: Partial<PlaybookStrategy>) => {
    try {
      // Merge current strategy with updates to send full object
      const current = strategies.find(s => s.id === id)
      if (!current) return
      const merged = { ...current, ...updates }
      const payload = mapStrategyUpdateToApi(Number.parseInt(id, 10), merged)
      const res = await api.put<ApiResponse<number>>(`/v1/strategies/${id}`, payload)
      if (res.data.isSuccess) {
        setStrategies((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
        )
      } else {
        toast({ title: "Failed to update strategy", description: "Please try again.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error updating strategy:", error)
      toast({ title: "Failed to update strategy", description: "Could not update strategy. Please try again.", variant: "destructive" })
    }
  }

  const deleteStrategy = async (id: string) => {
    try {
      const res = await api.delete<ApiResponse<number>>(`/v1/strategies/${id}`)
      if (res.data.isSuccess) {
        setStrategies((prev) => prev.filter((s) => s.id !== id))
        toast({ title: "Strategy deleted", description: "Strategy has been removed." })
      } else {
        toast({ title: "Failed to delete strategy", description: "Please try again.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deleting strategy:", error)
      toast({ title: "Failed to delete strategy", description: "Could not delete strategy. Please try again.", variant: "destructive" })
    }
  }

  const runStrategy = async (id: string) => {
    setStrategies((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        return { ...s, status: "running" as const }
      })
    )

    try {
      const strat = strategies.find((s) => s.id === id)
      if (!strat) throw new Error("Strategy not found")

      // 1. Check if historical data exists
      const filesRes = await api.get<ApiResponse<any[]>>("/v1/backtests/historical-data")
      let hasData = false
      if (filesRes.data.isSuccess && filesRes.data.value) {
        hasData = filesRes.data.value.some((f) => 
          f.asset.toLowerCase() === strat.asset.toLowerCase() &&
          new Date(f.startDate) <= new Date(strat.dateRange.start) &&
          new Date(f.endDate) >= new Date(strat.dateRange.end)
        )
      }

      // 2. Download if missing
      if (!hasData) {
        toast({ title: "Downloading Data", description: `Fetching historical data for ${strat.asset}...` })
        const dlRes = await api.post<ApiResponse<any>>("/v1/backtests/historical-data", {
          asset: strat.asset,
          startDate: strat.dateRange.start,
          endDate: strat.dateRange.end,
        })
        if (!dlRes.data.isSuccess) {
          throw new Error("Failed to download historical data")
        }
      }

      // 3. Create Backtest
      const createRes = await api.post<ApiResponse<number>>("/v1/backtests", {
        strategyId: Number.parseInt(strat.id),
        name: `Run for ${strat.name}`,
        startDate: strat.dateRange.start,
        endDate: strat.dateRange.end,
        initialCapital: strat.positionSizing === "percent-equity" ? 50000 : strat.positionSizeValue * 5
      })

      if (!createRes.data.isSuccess) {
        throw new Error("Failed to create backtest session")
      }
      const backtestId = createRes.data.value

      // 4. Run Backtest
      const runRes = await api.post<ApiResponse<any>>(`/v1/backtests/${backtestId}/run`)
      if (!runRes.data.isSuccess) {
        throw new Error("Failed to run backtest")
      }

      // 5. Map to PlaybookResults
      const data = runRes.data.value
      const startingCapital = data.initialCapital

      // Generate equity curve from trades
      const trades = data.trades || []
      let equity = startingCapital
      let peak = startingCapital
      const equityCurve = trades.map((t: any) => {
        equity += t.pnl
        if (equity > peak) peak = equity
        const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0
        return {
          date: new Date(t.entryDate).toISOString().split("T")[0],
          equity: Math.round(equity),
          drawdown: Math.round(drawdown * 100) / 100
        }
      })

      // Generate trade log
      const tradeLog = trades.map((t: any) => {
        const entryDate = new Date(t.entryDate)
        const exitDate = new Date(t.exitDate)
        const holdingMs = exitDate.getTime() - entryDate.getTime()
        const holdingDays = Math.max(1, Math.round(holdingMs / (1000 * 60 * 60 * 24)))
        
        return {
          id: `t-${t.id}`,
          date: entryDate.toISOString().split("T")[0],
          direction: t.position === 0 ? "long" : "short",
          entry: t.entryPrice,
          exit: t.exitPrice,
          pnl: t.pnl,
          pnlPct: Math.round((t.pnl / startingCapital) * 10000) / 100,
          holdingDays
        }
      })

      // Generate monthly returns
      const monthlyPnl: Record<string, number> = {}
      trades.forEach((t: any) => {
        const month = new Date(t.entryDate).toISOString().slice(0, 7)
        monthlyPnl[month] = (monthlyPnl[month] || 0) + t.pnl
      })
      const monthlyReturns = Object.entries(monthlyPnl).map(([month, pnl]) => ({
        month,
        returnPct: Math.round((pnl / startingCapital) * 10000) / 100
      })).sort((a, b) => a.month.localeCompare(b.month))

      const results = {
        totalTrades: data.totalTrades,
        winRate: data.winRate,
        profitFactor: data.profitFactor > 999 ? 99.99 : data.profitFactor,
        expectancy: data.totalTrades > 0 ? Math.round((data.totalPnl / data.totalTrades) * 100) / 100 : 0,
        maxDrawdown: data.maxDrawdown,
        maxDrawdownPct: data.maxDrawdownPct,
        netProfit: data.totalPnl,
        netProfitPct: Math.round((data.totalPnl / startingCapital) * 1000) / 10,
        avgWin: data.avgWin,
        avgLoss: data.avgLoss,
        largestWin: data.largestWin,
        largestLoss: data.largestLoss,
        avgHoldingPeriod: strat.timeframe === "1D" || strat.timeframe === "1W" ? "几天" : "数小时", // generic placeholder
        sharpeRatio: data.sharpeRatio,
        equityCurve,
        tradeLog,
        monthlyReturns,
        wins: data.winCount,
        losses: data.lossCount,
        side: "Long/Short"
      }

      setStrategies((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s
          return { ...s, status: "completed" as const, results }
        })
      )

      toast({ title: "Backtest Complete", description: `Processed ${data.totalTrades} trades.` })

    } catch (error: any) {
      console.error("Backtest error", error)
      toast({ title: "Backtest Failed", description: error.message || "An error occurred", variant: "destructive" })
      setStrategies((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s
          return { ...s, status: "draft" as const }
        })
      )
    }
  }

  // Templates
  const [customTemplates, setCustomTemplates] = useState<StrategyTemplate[]>([])

  const saveTemplate = async (template: Omit<StrategyTemplate, "id" | "isBuiltIn">) => {
    try {
      const payload = {
        name: template.name,
        description: template.description,
        category: categoryToInt[template.category],
        asset: template.config.asset,
        timeframe: template.config.timeframe,
        dateRangeStart: template.config.dateRange?.start || null,
        dateRangeEnd: template.config.dateRange?.end || null,
        entryIndicators: template.config.entryIndicators,
        exitIndicators: template.config.exitIndicators,
        riskPerTrade: template.config.riskPerTrade,
        stopLossType: stopLossTypeToInt[template.config.stopLossType],
        stopLossValue: template.config.stopLossValue,
        takeProfitType: takeProfitTypeToInt[template.config.takeProfitType],
        takeProfitValue: template.config.takeProfitValue,
        positionSizing: positionSizingToInt[template.config.positionSizing],
        positionSizeValue: template.config.positionSizeValue,
      }
      const res = await api.post<ApiResponse<number>>("/v1/strategy-templates", payload)
      if (res.data.isSuccess) {
        const newTemplate: StrategyTemplate = {
          ...template,
          id: res.data.value.toString(),
          isBuiltIn: false,
        }
        setCustomTemplates((prev) => [newTemplate, ...prev])
        toast({ title: "Template saved", description: "Your template has been saved." })
      } else {
        toast({ title: "Failed to save template", description: "Please try again.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error saving template:", error)
      toast({ title: "Failed to save template", description: "Could not save template. Please try again.", variant: "destructive" })
    }
  }

  const deleteTemplate = async (id: string) => {
    try {
      const res = await api.delete<ApiResponse<number>>(`/v1/strategy-templates/${id}`)
      if (res.data.isSuccess) {
        setCustomTemplates((prev) => prev.filter((t) => t.id !== id))
        toast({ title: "Template deleted", description: "Template has been removed." })
      } else {
        toast({ title: "Failed to delete template", description: "Please try again.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({ title: "Failed to delete template", description: "Could not delete template. Please try again.", variant: "destructive" })
    }
  }

  const duplicateStrategy = async (id: string) => {
    try {
      const res = await api.post<ApiResponse<number>>(`/v1/strategies/${id}/duplicate`, {})
      if (res.data.isSuccess) {
        // Refetch all strategies to get the duplicated one
        const listRes = await api.get<ApiResponse<PlaybookStrategy[]>>("/v1/strategies")
        if (listRes.data.isSuccess && listRes.data.value) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped = (listRes.data.value as any[]).map(mapStrategyFromApi)
          setStrategies(mapped)
        }
        toast({ title: "Strategy duplicated", description: "A copy of the strategy has been created." })
      } else {
        toast({ title: "Failed to duplicate strategy", description: "Please try again.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error duplicating strategy:", error)
      toast({ title: "Failed to duplicate strategy", description: "Could not duplicate strategy. Please try again.", variant: "destructive" })
    }
  }

  const addPsychologyEntry = (entry: Omit<PsychologyEntry, "id">) => {
    const newEntry: PsychologyEntry = {
      ...entry,
      id: `p-${Date.now()}`,
    }
    setPsychologyEntries((prev) => [...prev, newEntry])
  }

  const updatePsychologyEntry = (id: string, updates: Partial<PsychologyEntry>) => {
    setPsychologyEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    )
  }

  const deletePsychologyEntry = (id: string) => {
    setPsychologyEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const addTrade = (trade: Omit<Trade, "id">) => {
    const newTrade: Trade = {
      ...trade,
      id: Date.now().toString(),
    }
    setTrades((prev) => [...prev, newTrade])
  }

  const updateTrade = (id: string, updates: Partial<Trade>) => {
    setTrades((prev) =>
      prev.map((trade) => (trade.id === id ? { ...trade, ...updates } : trade))
    )
  }

  const deleteTrade = (id: string) => {
    setTrades((prev) => prev.filter((trade) => trade.id !== id))
  }

  const closeTrade = (id: string, exitPrice: number) => {
    setTrades((prev) =>
      prev.map((trade) => {
        if (trade.id !== id) return trade
        const multiplier = trade.position === PositionType.Long ? 1 : -1
        const pnl = (exitPrice - trade.entryPrice) * multiplier * 100
        return {
          ...trade,
          status: TradeStatus.Closed,
          exitPrice,
          pnl,
          closedDate: new Date().toISOString().split("T")[0],
        }
      })
    )
  }

  return (
    <TradeContext.Provider value={{ trades, addTrade, updateTrade, deleteTrade, closeTrade, userSessions, activeSession, startSession, endSession, psychologyEntries, addPsychologyEntry, updatePsychologyEntry, deletePsychologyEntry, strategies, addStrategy, updateStrategy, deleteStrategy, runStrategy, runStrategyProgressive, cancelProgressiveRun, backtestProgress, activeBacktestId, pendingPlaybookStrategyId, setPendingPlaybookStrategyId, customTemplates, saveTemplate, deleteTemplate, duplicateStrategy }}>
      {children}
    </TradeContext.Provider>
  )
}

export function useTrades() {
  const context = useContext(TradeContext)
  if (!context) {
    throw new Error("useTrades must be used within a TradeProvider")
  }
  return context
}
