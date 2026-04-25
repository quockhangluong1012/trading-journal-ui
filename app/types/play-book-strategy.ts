import { PlaybookResults } from "./play-book-trade"

export interface PlaybookStrategy {
  id: string
  name: string
  description: string
  type: string
  status: "active" | "completed" | "draft" | string
  createdAt: string
  asset: string
  timeframe: string
  dateRange: { start: string; end: string }
  entryIndicators: string[]
  exitIndicators: string[]
  riskPerTrade: number
  stopLossType: string
  stopLossValue: number
  takeProfitType: string
  takeProfitValue: number
  positionSizing: string
  positionSizeValue: number
  results: PlaybookResults
}
