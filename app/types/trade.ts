import { EmotionType } from "@/lib/enum/EmotionType";
import { PositionType } from "@/lib/enum/PositionType";
import { TradeStatus } from "@/lib/enum/TradeStatus";
import { TradeScreenshot } from "@/lib/trade-store";

export interface EmotionTag {
  id: number;
  name: string;
  emotionType: EmotionType;
}

export interface TradeHistory {
  id: string;
  asset: string;
  position: PositionType;
  status: TradeStatus;
  date: Date;
  pnl: number;
  notes: string;
  emotionTags: EmotionTag[];
  closedDate: Date;
  confidenceLevel: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  targetTier1: number;
  targetTier2: number;
  targetTier3: number;
};

export interface Trade {
  id: string;
  asset: string;
  position: PositionType;
  entryPrice: number;
  targetTier1: number;
  targetTier2: number;
  targetTier3: number;
  stopLoss: number;
  notes: string;
  date: string;
  status: TradeStatus;
  exitPrice?: number;
  pnl?: number;
  closedDate?: string;
  screenshots?: TradeScreenshot[];
  emotionTags?: string[];
  confidenceLevel?: number;
  psychologyNotes?: string;
  analysisTags?: string[];
  tradingSession?: string;
  sessionId?: string;
  pretradeChecklist?: string[];
  riskGuardrails?: {
    accountEquity?: number;
    riskPercentage?: number;
    maxDailyLoss?: number;
    takeProfit?: number;
    positionSize?: number;
  };
}

export interface CalendarData {
  date: string;
  pnL: number;
}

export interface WinLossData {
  name: string;
  value: number;
}