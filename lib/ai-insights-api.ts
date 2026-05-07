import { api, type ApiResponse } from "./api"

export interface NaturalLanguageTradeSearchResult {
  asset: string | null
  position: "Long" | "Short" | null
  status: "Open" | "Closed" | null
  fromDate: string | null
  toDate: string | null
  interpretation: string
}

export interface DiscoverTradePatternsRequest {
  fromDate?: string | null
  toDate?: string | null
}

export interface DiscoveredTradePattern {
  title: string
  category: string
  description: string
  evidence: string
  confidence: number
}

export interface TradePatternDiscoveryResult {
  summary: string
  patterns: DiscoveredTradePattern[]
  actionItems: string[]
  sampleSize: number
}

export interface SuggestLessonsRequest {
  fromDate?: string | null
  toDate?: string | null
}

export interface SuggestedLesson {
  title: string
  content: string
  category: number
  severity: number
  keyTakeaway: string | null
  actionItems: string | null
  impactScore: number
  linkedTradeIds: number[]
}

export interface SuggestedLessonsResult {
  summary: string
  suggestions: SuggestedLesson[]
  sampleSize: number
}

export interface PlaybookOptimizationRequest {
  fromDate?: string | null
  toDate?: string | null
}

export interface PlaybookOptimizationRecommendation {
  setupId: number
  setupName: string
  action: "prioritize" | "refine" | "retire" | "observe"
  rationale: string
  recommendation: string
  confidence: number
  totalTrades: number
  winRate: number
  totalPnl: number
  expectancy: number
  avgRiskReward: number
  grade: string
}

export interface PlaybookOptimizationResult {
  summary: string
  recommendations: PlaybookOptimizationRecommendation[]
  sampleSize: number
}

export interface AiRiskAdvisorResult {
  riskLevel: string
  summary: string
  positionSizingAdvice: string
  keyRisks: string[]
  actionItems: string[]
  shouldReduceRisk: boolean
  confidence: number
}

export interface AiDisciplineGuardianResult {
  riskLevel: string
  tiltType: string
  title: string
  message: string
  actionItems: string[]
  shouldNotify: boolean
}

export interface AiEconomicImpactPredictorResult {
  riskLevel: string
  summary: string
  tradeStance: string
  keyDrivers: string[]
  actionItems: string[]
  confidence: number
}

export interface ChartScreenshotAnalysisRequest {
  asset: string
  position: string
  entryPrice?: number | null
  stopLoss?: number | null
  targetTier1?: number | null
  tradingZone?: string | null
  notes?: string | null
  screenshots: string[]
}

export interface ChartScreenshotAnalysisResult {
  summary: string
  marketStructure: string
  amdPhase: string
  premiumDiscount: string
  confidenceScore: number
  keyLevels: string[]
  detectedConfluences: string[]
  warnings: string[]
  suggestedActions: string[]
}

export async function searchTradesNaturalLanguage(query: string): Promise<NaturalLanguageTradeSearchResult> {
  const response = await api.post<ApiResponse<NaturalLanguageTradeSearchResult>>("/v1/ai-search/trades", { query })
  return response.data.value
}

export async function discoverTradePatterns(request: DiscoverTradePatternsRequest): Promise<TradePatternDiscoveryResult> {
  const response = await api.post<ApiResponse<TradePatternDiscoveryResult>>("/v1/ai-patterns/discover", request)
  return response.data.value
}

export async function suggestLessons(request: SuggestLessonsRequest = {}): Promise<SuggestedLessonsResult> {
  const response = await api.post<ApiResponse<SuggestedLessonsResult>>("/v1/ai-lessons/suggest", request)
  return response.data.value
}

export async function optimizePlaybook(request: PlaybookOptimizationRequest): Promise<PlaybookOptimizationResult> {
  const response = await api.post<ApiResponse<PlaybookOptimizationResult>>("/v1/ai-playbook/optimize", request)
  return response.data.value
}

export async function generateRiskAdvice(): Promise<AiRiskAdvisorResult> {
  const response = await api.post<ApiResponse<AiRiskAdvisorResult>>("/v1/ai-risk/generate")
  return response.data.value
}

export async function generateDisciplineGuardian(): Promise<AiDisciplineGuardianResult> {
  const response = await api.post<ApiResponse<AiDisciplineGuardianResult>>("/v1/ai-discipline/guardian")
  return response.data.value
}

export async function generateEconomicImpactPrediction(
  symbol: string,
  proximityMinutes: number = 30,
): Promise<AiEconomicImpactPredictorResult> {
  const response = await api.post<ApiResponse<AiEconomicImpactPredictorResult>>("/v1/ai-economic/predict-impact", {
    symbol,
    proximityMinutes,
  })
  return response.data.value
}

export async function analyzeChartScreenshot(request: ChartScreenshotAnalysisRequest): Promise<ChartScreenshotAnalysisResult> {
  const response = await api.post<ApiResponse<ChartScreenshotAnalysisResult>>("/v1/ai-validation/analyze-chart", request)
  return response.data.value
}