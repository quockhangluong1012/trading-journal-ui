import { api, type ApiResponse } from "./api"

export interface TradingSetupGenerationRequest {
  prompt: string
  maxNodes?: number
  dedupeAgainstExisting?: boolean
}

export interface TradingSetupGenerationNode {
  id: string
  kind: string
  x: number
  y: number
  title: string
  notes: string | null
}

export interface TradingSetupGenerationEdge {
  id: string
  source: string
  target: string
  label: string | null
}

export interface TradingSetupGenerationResult {
  summary: string
  name: string
  description: string | null
  nodes: TradingSetupGenerationNode[]
  edges: TradingSetupGenerationEdge[]
  assumptions: string[]
  warnings: string[]
  confidence: number
}

export interface PreTradeChecklistInterpretationRequest {
  checklistModelId: number
  input: string
}

export interface PreTradeChecklistInterpretationMatch {
  checklistId: number
  checklistName: string
  category: string
  rationale: string
  confidence: number
}

export interface PreTradeChecklistInterpretationResult {
  checklistModelId: number
  summary: string
  confidence: number
  suggestedChecklistIds: number[]
  matches: PreTradeChecklistInterpretationMatch[]
  unmatchedInputs: string[]
}

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

export interface MorningBriefingResult {
  greeting: string
  briefing: string
  focusAreas: string[]
  warnings: string[]
  actionItem: string
  overallMood: string
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

export async function getMorningBriefing(): Promise<MorningBriefingResult | null> {
  const response = await api.get<ApiResponse<MorningBriefingResult | null>>("/v1/ai-briefing")

  if (!response.data.isSuccess) {
    throw new Error("Unable to load the saved morning briefing right now.")
  }

  return response.data.value ?? null
}

export async function generateMorningBriefing(): Promise<MorningBriefingResult> {
  const response = await api.post<ApiResponse<MorningBriefingResult>>("/v1/ai-briefing/generate")

  if (!response.data.isSuccess || !response.data.value) {
    throw new Error("Unable to generate the morning briefing right now.")
  }

  return response.data.value
}

export async function analyzeChartScreenshot(request: ChartScreenshotAnalysisRequest): Promise<ChartScreenshotAnalysisResult> {
  const response = await api.post<ApiResponse<ChartScreenshotAnalysisResult>>("/v1/ai-validation/analyze-chart", request)
  return response.data.value
}

export async function generateTradingSetupPreview(
  request: TradingSetupGenerationRequest,
): Promise<TradingSetupGenerationResult> {
  const response = await api.post<ApiResponse<TradingSetupGenerationResult>>("/v1/ai-playbook/generate-setup", {
    prompt: request.prompt,
    maxNodes: request.maxNodes ?? 8,
    dedupeAgainstExisting: request.dedupeAgainstExisting ?? true,
  })

  if (!response.data.isSuccess) {
    throw new Error("Unable to generate a setup preview right now.")
  }

  return response.data.value
}

export async function interpretPreTradeChecklist(
  request: PreTradeChecklistInterpretationRequest,
): Promise<PreTradeChecklistInterpretationResult> {
  const response = await api.post<ApiResponse<PreTradeChecklistInterpretationResult>>("/v1/ai-validation/interpret-checklist", request)

  if (!response.data.isSuccess) {
    throw new Error("Unable to interpret the checklist notes right now.")
  }

  return response.data.value
}