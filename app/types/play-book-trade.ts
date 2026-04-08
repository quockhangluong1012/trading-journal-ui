export interface PlaybookResults {
    totalTrades: number
    winRate: number
    profitFactor: number
    expectancy: number
    maxDrawdown: number
    maxDrawdownPct: number
    netProfit: number
    netProfitPct: number
    avgWin: number
    avgLoss: number
    largestWin: number
    largestLoss: number
    avgHoldingPeriod: string
    sharpeRatio: number
    equityCurve: { date: string; equity: number; drawdown: number }[]
    tradeLog: PlaybookTrade[]
    monthlyReturns: { month: string; returnPct: number }[],
    wins: number,
    losses: number,
    side: string
}

export interface PlaybookTrade {
    id: string
    date: string
    direction: "long" | "short"
    entry: number
    exit: number
    pnl: number
    pnlPct: number
    holdingDays: number
}
