"use client";

import { useState, useEffect, useMemo, use } from "react";
import type { ElementType, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { useTrades } from "@/lib/trade-context";
import {
  mockCurrentPrices,
  calculateUnrealizedPnL,
  EmotionTagApi,
  getTagCategory,
  PreTradeChecklistApi,
  ChecklistModelApi,
  ChecklistModelDetailApi,
} from "@/lib/trade-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Target,
  TrendingUp,
  TrendingDown,
  Shield,
  X,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit3,
  DollarSign,
  Percent,
  BarChart3,
  FileText,
  ImageIcon,
  Expand,
  Brain,
  Tags,
  ClipboardCheck,
  Gauge,
  ImagePlus,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { Trade } from "@/lib/trade-store";
import { TradeStatus } from "@/lib/enum/TradeStatus";
import { PositionType } from "@/lib/enum/PositionType";
import { api, ApiResponse } from "@/lib/api";
import { getPlainTextFromRichText } from "@/lib/rich-text";
import { AxiosResponse } from "axios";
import { cn, getPositionTypeLabel, getTradeStatusLabel } from "@/lib/utils";

export interface TradingZoneApi {
  id: number;
  name: string;
  description: string | null;
  fromTime: string;
  toTime: string;
}

export interface TechnicalAnalysisTagApi {
  id: number;
  name: string;
  shortName: string;
  description: string;
}

type MetricTone = "default" | "positive" | "negative" | "accent" | "warning";

interface OverviewMetricCardProps {
  label: string;
  value: string;
  helper?: string;
  icon: ElementType;
  tone?: MetricTone;
  className?: string;
}

interface SnapshotPillProps {
  icon: ElementType;
  label: string;
  value: string;
  className?: string;
}

function formatDisplayDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getConfidenceLabel(confidenceLevel?: number | null): string {
  switch (confidenceLevel) {
    case 1:
      return "Very Low";
    case 2:
      return "Low";
    case 3:
      return "Neutral";
    case 4:
      return "High";
    case 5:
      return "Very High";
    default:
      return "Not set";
  }
}

function OverviewMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
  className,
}: OverviewMetricCardProps) {
  const toneStyles: Record<MetricTone, { container: string; iconWrap: string; icon: string }> = {
    default: {
      container: "border-border/70 bg-background/80",
      iconWrap: "border-border/60 bg-secondary/70",
      icon: "text-foreground",
    },
    positive: {
      container: "border-success/20 bg-success/5",
      iconWrap: "border-success/20 bg-success/10",
      icon: "text-success",
    },
    negative: {
      container: "border-destructive/20 bg-destructive/5",
      iconWrap: "border-destructive/20 bg-destructive/10",
      icon: "text-destructive",
    },
    accent: {
      container: "border-accent/20 bg-accent/5",
      iconWrap: "border-accent/20 bg-accent/10",
      icon: "text-accent",
    },
    warning: {
      container: "border-warning/20 bg-warning/5",
      iconWrap: "border-warning/20 bg-warning/10",
      icon: "text-warning",
    },
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm backdrop-blur-sm",
        toneStyles[tone].container,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {helper ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {helper}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            toneStyles[tone].iconWrap,
          )}
        >
          <Icon className={cn("h-4 w-4", toneStyles[tone].icon)} />
        </div>
      </div>
    </div>
  );
}

function SnapshotPill({
  icon: Icon,
  label,
  value,
  className,
}: SnapshotPillProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-xs shadow-sm",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

function TradeDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Skeleton className="mb-5 h-5 w-32 rounded-full" />

        <div className="mb-5 overflow-hidden rounded-[28px] border border-border/70 bg-card/80 p-5 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-10 w-48 max-w-full rounded-xl" />
                  <Skeleton className="h-4 w-80 max-w-full rounded-full" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-9 w-32 rounded-full" />
                  <Skeleton className="h-9 w-36 rounded-full" />
                  <Skeleton className="h-9 w-40 rounded-full" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          </div>
        </div>

        <Skeleton className="mb-5 h-20 rounded-2xl" />
        <Skeleton className="mb-5 h-12 w-full max-w-md rounded-2xl" />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-5">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-5">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-112 rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}

// Price Level Progress Visualization Component
function PriceLevelBar({
  trade,
  currentPrice,
}: {
  trade: Trade;
  currentPrice: number;
}) {
  const isLong = trade.position === PositionType.Long;
  const hasTargetTier1 = trade.targetTier1 > 0;
  const hasTargetTier2 = (trade.targetTier2 ?? 0) > 0;
  const hasTargetTier3 = (trade.targetTier3 ?? 0) > 0;

  // Calculate positions relative to a range
  const prices = [
    trade.stopLoss,
    trade.entryPrice,
    trade.targetTier1,
    trade.targetTier2,
    trade.targetTier3,
    currentPrice,
  ].filter((p) => p > 0);

  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;
  const range = maxPrice - minPrice;

  const getPosition = (price: number) => ((price - minPrice) / range) * 100;

  const entryPos = getPosition(trade.entryPrice);
  const currentPos = getPosition(currentPrice);
  const stopPos = getPosition(trade.stopLoss);
  const t1Pos = hasTargetTier1 ? getPosition(trade.targetTier1) : null;
  const t2Pos = hasTargetTier2 ? getPosition(trade.targetTier2!) : null;
  const t3Pos = hasTargetTier3 ? getPosition(trade.targetTier3!) : null;

  // Determine if targets are hit
  const t1Hit = hasTargetTier1 &&
    (isLong
      ? currentPrice >= trade.targetTier1
      : currentPrice <= trade.targetTier1);
  const t2Hit = hasTargetTier2 &&
    (isLong
      ? currentPrice >= trade.targetTier2!
      : currentPrice <= trade.targetTier2!);
  const t3Hit = hasTargetTier3 &&
    (isLong
      ? currentPrice >= trade.targetTier3!
      : currentPrice <= trade.targetTier3!);
  const stopHit = isLong
    ? currentPrice <= trade.stopLoss
    : currentPrice >= trade.stopLoss;

  return (
    <div className="space-y-4">
      <div className="relative h-12 rounded-lg bg-secondary/50">
        {/* Progress fill from entry to current */}
        <div
          className={`absolute top-0 h-full rounded-lg transition-all ${
            (isLong && currentPrice >= trade.entryPrice) ||
            (!isLong && currentPrice <= trade.entryPrice)
              ? "bg-success/20"
              : "bg-destructive/20"
          }`}
          style={{
            left: `${Math.min(entryPos, currentPos)}%`,
            width: `${Math.abs(currentPos - entryPos)}%`,
          }}
        />

        {/* Stop Loss marker */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`absolute top-0 h-full w-1 ${stopHit ? "bg-destructive" : "bg-destructive/60"}`}
                style={{ left: `${stopPos}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Shield
                    className={`h-4 w-4 ${stopHit ? "text-destructive" : "text-destructive/60"}`}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stop Loss: ${trade.stopLoss.toLocaleString()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Entry marker */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute top-0 h-full w-1 bg-foreground"
                style={{ left: `${entryPos}%` }}
              >
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
                  Entry
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Entry: ${trade.entryPrice.toLocaleString()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Target markers */}
        {t1Pos !== null && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`absolute top-0 h-full w-1 ${t1Hit ? "bg-success" : "bg-success/40"}`}
                  style={{ left: `${t1Pos}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <Target
                      className={`h-4 w-4 ${t1Hit ? "text-success" : "text-success/40"}`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>T1: ${trade.targetTier1.toLocaleString()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {t2Pos !== null && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`absolute top-0 h-full w-1 ${t2Hit ? "bg-success" : "bg-success/40"}`}
                  style={{ left: `${t2Pos}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <Target
                      className={`h-4 w-4 ${t2Hit ? "text-success" : "text-success/40"}`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>T2: ${trade.targetTier2.toLocaleString()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {t3Pos !== null && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`absolute top-0 h-full w-1 ${t3Hit ? "bg-success" : "bg-success/40"}`}
                  style={{ left: `${t3Pos}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <Target
                      className={`h-4 w-4 ${t3Hit ? "text-success" : "text-success/40"}`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>T3: ${trade.targetTier3.toLocaleString()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Current price indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-accent border-2 border-background flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                style={{
                  left: `${currentPos}%`,
                  transform: `translateX(-50%) translateY(-50%)`,
                }}
              >
                <DollarSign className="h-3 w-3 text-accent-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Current: ${currentPrice.toLocaleString()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-destructive" />
          <span>Stop Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-0.5 bg-foreground" />
          <span>Entry</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="h-3 w-3 text-success" />
          <span>Targets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-accent" />
          <span>Current</span>
        </div>
      </div>
    </div>
  );
}

// Status Alert Component
function TradeStatusAlert({
  trade,
  currentPrice,
}: {
  trade: Trade;
  currentPrice: number;
}) {
  const isLong = trade.position === PositionType.Long;
  const hasTargetTier1 = trade.targetTier1 > 0;
  const hasTargetTier2 = (trade.targetTier2 ?? 0) > 0;
  const hasTargetTier3 = (trade.targetTier3 ?? 0) > 0;
  const priceChangePercent =
    ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
  const adjustedPercent = isLong ? priceChangePercent : -priceChangePercent;

  // Determine alerts
  const isNearStopLoss = isLong
    ? currentPrice <= trade.stopLoss * 1.05 && currentPrice > trade.stopLoss
    : currentPrice >= trade.stopLoss * 0.95 && currentPrice < trade.stopLoss;
  const hitStopLoss = isLong
    ? currentPrice <= trade.stopLoss
    : currentPrice >= trade.stopLoss;
  const hitT1 = hasTargetTier1 &&
    (isLong
      ? currentPrice >= trade.targetTier1
      : currentPrice <= trade.targetTier1);
  const hitT2 = hasTargetTier2 &&
    (isLong
      ? currentPrice >= trade.targetTier2!
      : currentPrice <= trade.targetTier2!);
  const hitT3 = hasTargetTier3 &&
    (isLong
      ? currentPrice >= trade.targetTier3!
      : currentPrice <= trade.targetTier3!);

  if (trade.status === TradeStatus.Closed) {
    return (
      <div
        className={`rounded-lg p-4 ${(trade.pnl || 0) >= 0 ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"}`}
      >
        <div className="flex items-center gap-3">
          {(trade.pnl || 0) >= 0 ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <div>
            <p
              className={`font-medium ${(trade.pnl || 0) >= 0 ? "text-success" : "text-destructive"}`}
            >
              Trade Closed - {(trade.pnl || 0) >= 0 ? "Profit" : "Loss"}
            </p>
            <p className="text-sm text-muted-foreground">
              Closed on{" "}
              {new Date(trade.closedDate || "").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hitStopLoss) {
    return (
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Stop Loss Hit</p>
            <p className="text-sm text-muted-foreground">
              Consider closing this position to limit losses
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isNearStopLoss) {
    return (
      <div className="rounded-lg bg-warning/10 border border-warning/20 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div>
            <p className="font-medium text-warning">Approaching Stop Loss</p>
            <p className="text-sm text-muted-foreground">
              Price is within 5% of your stop loss level
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hitT3) {
    return (
      <div className="rounded-lg bg-success/10 border border-success/20 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-success">All Targets Hit</p>
            <p className="text-sm text-muted-foreground">
              Tier 3 target reached - consider taking profits
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hitT2) {
    return (
      <div className="rounded-lg bg-success/10 border border-success/20 p-4">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-success">Tier 2 Target Hit</p>
            <p className="text-sm text-muted-foreground">
              Consider partial profit taking or moving stop to breakeven
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hitT1) {
    return (
      <div className="rounded-lg bg-success/10 border border-success/20 p-4">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-success">Tier 1 Target Hit</p>
            <p className="text-sm text-muted-foreground">
              First target reached - trade is in profit
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-4 ${adjustedPercent >= 0 ? "bg-success/5 border border-success/10" : "bg-destructive/5 border border-destructive/10"}`}
    >
      <div className="flex items-center gap-3">
        {adjustedPercent >= 0 ? (
          <TrendingUp className="h-5 w-5 text-success" />
        ) : (
          <TrendingDown className="h-5 w-5 text-destructive" />
        )}
        <div>
          <p
            className={`font-medium ${adjustedPercent >= 0 ? "text-success" : "text-destructive"}`}
          >
            {adjustedPercent >= 0 ? "In Profit" : "In Loss"} (
            {adjustedPercent >= 0 ? "+" : ""}
            {adjustedPercent.toFixed(2)}%)
          </p>
          <p className="text-sm text-muted-foreground">
            Position is active and tracking
          </p>
        </div>
      </div>
    </div>
  );
}

function TradeDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { trades, updateTrade, deleteTrade, closeTrade } = useTrades();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [isTradeLoading, setIsTradeLoading] = useState(true);
  const [tradeLoadError, setTradeLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exitPrice, setExitPrice] = useState("");
  const [manualPnl, setManualPnl] = useState("");
  const [tradingResult, setTradingResult] = useState("");
  const [hitStopLoss, setHitStopLoss] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    notes: "",
    targetTier1: "",
    targetTier2: "",
    targetTier3: "",
    stopLoss: "",
    analysisTags: [] as string[],
    emotionTags: [] as string[],
    confidenceLevel: 0,
    tradingSession: "",
    screenshots: [] as { url: string }[],
    pretradeChecklist: [] as string[],
  });
  const [apiTags, setApiTags] = useState<EmotionTagApi[]>([]);
  const [apiChecklists, setApiChecklists] = useState<PreTradeChecklistApi[]>(
    [],
  );
  const [apiTechTags, setApiTechTags] = useState<TechnicalAnalysisTagApi[]>([]);
  const [apiTradingZones, setApiTradingZones] = useState<TradingZoneApi[]>([]);
  const [checklistModels, setChecklistModels] = useState<ChecklistModelApi[]>([]);
  const [selectedModelDetail, setSelectedModelDetail] = useState<ChecklistModelDetailApi | null>(null);

  useEffect(() => {
    setTrade(null);
    setIsTradeLoading(true);
    setTradeLoadError(null);

    // Fetch generic resource lists
    api
      .get<ApiResponse<EmotionTagApi[]>>("/v1/emotions")
      .then((response: AxiosResponse<ApiResponse<EmotionTagApi[]>>) => {
        let data = response.data;
        if (data.isSuccess) setApiTags(data.value);
      })
      .catch((err) => console.error("Failed to fetch API tags:", err));

    api
      .get<ApiResponse<ChecklistModelApi[]>>("/v1/checklist-models")
      .then((response: AxiosResponse<ApiResponse<ChecklistModelApi[]>>) => {
        let data = response.data;
        if (data.isSuccess) {
          setChecklistModels(data.value);
          // Auto-load first model's criteria
          if (data.value.length > 0) {
            api
              .get<ApiResponse<ChecklistModelDetailApi>>(`/v1/checklist-models/${data.value[0].id}`)
              .then((detailRes: AxiosResponse<ApiResponse<ChecklistModelDetailApi>>) => {
                let detailData = detailRes.data;
                if (detailData.isSuccess) {
                  setSelectedModelDetail(detailData.value);
                  setApiChecklists(detailData.value.criteria);
                }
              })
              .catch((err) => console.error("Failed to fetch model detail:", err));
          }
        }
      })
      .catch((err) => console.error("Failed to fetch checklist models:", err));

    api
      .get<ApiResponse<TechnicalAnalysisTagApi[]>>("/v1/technical-analysis")
      .then(
        (response: AxiosResponse<ApiResponse<TechnicalAnalysisTagApi[]>>) => {
          let data = response.data;
          if (data.isSuccess) setApiTechTags(data.value);
        },
      )
      .catch((err) =>
        console.error("Failed to fetch API technical analysis tags:", err),
      );

    api
      .get<ApiResponse<TradingZoneApi[]>>("/v1/trading-zones")
      .then((response: AxiosResponse<ApiResponse<TradingZoneApi[]>>) => {
        let data = response.data;
        if (data.isSuccess) setApiTradingZones(data.value);
      })
      .catch((err) => console.error("Failed to fetch API trading zones:", err));

    // Fetch specific trade detail by id
    api
      .get<ApiResponse<any>>(`/v1/trade-histories/${id}`)
      .then((response: AxiosResponse<ApiResponse<any>>) => {
        let data = response.data;
        if (data.isSuccess && data.value) {
          const returnedValue = data.value;
          // Map api response to local Trade structure where necessary
          const mappedTrade: Trade = {
            id: id,
            asset: returnedValue.asset,
            position: returnedValue.position,
            entryPrice: returnedValue.entryPrice,
            targetTier1: returnedValue.targetTier1,
            targetTier2: returnedValue.targetTier2 || 0,
            targetTier3: returnedValue.targetTier3 || 0,
            stopLoss: returnedValue.stopLoss,
            notes: returnedValue.notes || "",
            date: returnedValue.date,
            status: returnedValue.status,
            exitPrice: returnedValue.exitPrice,
            pnl: returnedValue.pnl,
            tradingResult: returnedValue.tradingResult,
            hitStopLoss: returnedValue.hitStopLoss,
            closedDate: returnedValue.closedDate,
            screenshots: returnedValue.screenShots
              ? returnedValue.screenShots.map((screenshotUrl: string) => ({
                  url: screenshotUrl,
                }))
              : [],
            emotionTags: returnedValue.emotionTags
              ? returnedValue.emotionTags.map((e: number) => e.toString())
              : [],
            confidenceLevel: returnedValue.confidenceLevel,
            analysisTags: returnedValue.technicalAnalysisTags
              ? returnedValue.technicalAnalysisTags.map((t: number) =>
                  t.toString(),
                )
              : [],
            tradingSession: returnedValue.tradingZoneId
              ? returnedValue.tradingZoneId.toString()
              : "",
            sessionId: returnedValue.tradingSessionId
              ? returnedValue.tradingSessionId.toString()
              : "",
            pretradeChecklist: returnedValue.selectedChecklists
              ? returnedValue.selectedChecklists.map((c: number) =>
                  c.toString(),
                )
              : [],
            riskGuardrails: returnedValue.riskGuardrail
              ? {
                  accountEquity: returnedValue.riskGuardrail.accountEquity,
                  riskPercentage: returnedValue.riskGuardrail.riskPercentage,
                  maxDailyLoss: returnedValue.riskGuardrail.maxDailyLoss,
                  takeProfit: returnedValue.riskGuardrail.takeProfit,
                  positionSize: returnedValue.riskGuardrail.positionSize,
                }
              : undefined,
            tradeSumamry: returnedValue.tradeSumamry,
          };
          setTrade(mappedTrade);
          // Setup form default data for editing
          setFormData({
            notes: mappedTrade.notes,
            targetTier1: mappedTrade.targetTier1.toString(),
            targetTier2: mappedTrade.targetTier2.toString(),
            targetTier3: mappedTrade.targetTier3.toString(),
            stopLoss: mappedTrade.stopLoss.toString(),
            analysisTags: mappedTrade.analysisTags || [],
            emotionTags: mappedTrade.emotionTags || [],
            confidenceLevel: mappedTrade.confidenceLevel || 0,
            tradingSession: mappedTrade.tradingSession || "",
            screenshots: mappedTrade.screenshots || [],
            pretradeChecklist: mappedTrade.pretradeChecklist || [],
          });
        } else {
          setTrade(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch trade detail:", err);
        setTradeLoadError("We couldn't load this trade right now.");
      })
      .finally(() => setIsTradeLoading(false));
  }, [id]);

  const currentPrice = trade
    ? mockCurrentPrices[trade.asset] || trade.entryPrice
    : 0;
  const unrealizedPnL =
    trade?.status === TradeStatus.Open
      ? calculateUnrealizedPnL(trade, currentPrice)
      : 0;

  // Calculate risk/reward metrics
  const metrics = useMemo(() => {
    if (!trade) return null;

    const isLong = trade.position === PositionType.Long;
    const riskPerUnit = Math.abs(trade.entryPrice - trade.stopLoss);
    const rewardT1 = trade.targetTier1 > 0
      ? Math.abs(trade.targetTier1 - trade.entryPrice)
      : null;
    const rewardT2 = (trade.targetTier2 ?? 0) > 0
      ? Math.abs(trade.targetTier2! - trade.entryPrice)
      : null;
    const rewardT3 = (trade.targetTier3 ?? 0) > 0
      ? Math.abs(trade.targetTier3! - trade.entryPrice)
      : null;

    const rrT1 = riskPerUnit > 0 && rewardT1 != null ? rewardT1 / riskPerUnit : 0;
    const rrT2 = riskPerUnit > 0 && rewardT2 != null ? rewardT2 / riskPerUnit : 0;
    const rrT3 = riskPerUnit > 0 && rewardT3 != null ? rewardT3 / riskPerUnit : 0;
    const validRiskRewards = [rrT1, rrT2, rrT3].filter(
      (value) => Number.isFinite(value) && value > 0,
    );
    const averageRiskReward = validRiskRewards.length
      ? validRiskRewards.reduce((total, value) => total + value, 0) /
        validRiskRewards.length
      : 0;

    const priceChange = currentPrice - trade.entryPrice;
    const priceChangePercent = (priceChange / trade.entryPrice) * 100;
    const adjustedPercent = isLong ? priceChangePercent : -priceChangePercent;

    const lifecycleEndTime =
      trade.status === TradeStatus.Closed && trade.closedDate
        ? new Date(trade.closedDate).getTime()
        : new Date().getTime();
    const daysInTrade = Math.max(
      1,
      Math.ceil(
        (lifecycleEndTime - new Date(trade.date).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const riskPercent =
      trade.entryPrice > 0 ? (riskPerUnit / trade.entryPrice) * 100 : 0;

    return {
      riskPerUnit,
      riskPercent,
      rrT1,
      rrT2,
      rrT3,
      averageRiskReward,
      priceChangePercent: adjustedPercent,
      daysInTrade,
    };
  }, [trade, currentPrice]);

  const selectedTradingZone = useMemo(() => {
    if (!trade?.tradingSession) {
      return null;
    }

    return (
      apiTradingZones.find(
        (zone) => zone.id.toString() === trade.tradingSession,
      ) ?? null
    );
  }, [apiTradingZones, trade?.tradingSession]);

  if (isTradeLoading) {
    return <TradeDetailSkeleton />;
  }

  if (!trade) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-5">
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Trade History
            </Link>
          </div>

          <div className="flex justify-center py-10 sm:py-16">
            <Card className="w-full max-w-xl border-border/70 bg-card/90 shadow-sm">
              <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10">
                <div
                  className={cn(
                    "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border",
                    tradeLoadError
                      ? "border-destructive/20 bg-destructive/10 text-destructive"
                      : "border-border/70 bg-secondary/60 text-muted-foreground",
                  )}
                >
                  {tradeLoadError ? (
                    <AlertTriangle className="h-7 w-7" />
                  ) : (
                    <BarChart3 className="h-7 w-7" />
                  )}
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {tradeLoadError ? "Unable to load trade" : "Trade not found"}
                </p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {tradeLoadError
                    ? tradeLoadError
                    : "This trade may have been deleted, archived, or the link is no longer valid."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {tradeLoadError ? (
                    <Button variant="outline" onClick={() => router.refresh()}>
                      Try Again
                    </Button>
                  ) : null}
                  <Link href="/history">
                    <Button className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to History
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const isOpenTrade = trade.status === TradeStatus.Open;
  const displayedPnL = isOpenTrade ? unrealizedPnL : trade.pnl || 0;
  const displayedPrice = isOpenTrade ? currentPrice : trade.exitPrice;
  const timeInTradeLabel = isOpenTrade ? "Time Open" : "Time Held";
  const timeInTradeValue = metrics
    ? `${metrics.daysInTrade} day${metrics.daysInTrade === 1 ? "" : "s"}`
    : "-";
  const quickStats = [
    {
      label: "Stop Loss",
      value: formatCurrency(trade.stopLoss),
      helper: metrics
        ? `${metrics.riskPercent.toFixed(1)}% risk from entry`
        : "Planned downside protection.",
      icon: Shield,
      tone: "negative" as const,
    },
    {
      label: "Risk / Unit",
      value: metrics ? formatCurrency(metrics.riskPerUnit) : "-",
      helper: "Distance between entry and stop.",
      icon: Percent,
      tone: "warning" as const,
    },
    {
      label: timeInTradeLabel,
      value: timeInTradeValue,
      helper: isOpenTrade
        ? "Position is still active."
        : `Closed ${formatDisplayDate(trade.closedDate)}`,
      icon: Clock,
      tone: "accent" as const,
    },
    {
      label: "Confidence",
      value: trade.confidenceLevel ? `${trade.confidenceLevel}/5` : "Not set",
      helper: getConfidenceLabel(trade.confidenceLevel),
      icon: Brain,
      tone:
        trade.confidenceLevel && trade.confidenceLevel >= 4
          ? "positive"
          : trade.confidenceLevel && trade.confidenceLevel >= 2
            ? "accent"
            : trade.confidenceLevel
              ? "warning"
              : "default",
    },
  ];
  const headlineMetrics = [
    {
      label: "Entry Price",
      value: formatCurrency(trade.entryPrice),
      helper: metrics
        ? `${metrics.riskPercent.toFixed(1)}% planned risk to stop`
        : "Original execution price.",
      icon: DollarSign,
      tone: "default" as const,
    },
    {
      label: isOpenTrade ? "Current Price" : "Exit Price",
      value:
        displayedPrice != null
          ? formatCurrency(displayedPrice)
          : isOpenTrade
            ? "Awaiting close"
            : "Exit price not recorded",
      helper:
        isOpenTrade && metrics
          ? `${metrics.priceChangePercent >= 0 ? "+" : ""}${metrics.priceChangePercent.toFixed(2)}% from entry`
          : trade.closedDate
            ? `Closed ${formatDisplayDate(trade.closedDate)}`
            : "Recorded once the trade is closed.",
      icon: isOpenTrade ? BarChart3 : CheckCircle2,
      tone:
        isOpenTrade && metrics && metrics.priceChangePercent >= 0
          ? "positive"
          : isOpenTrade
            ? "negative"
            : trade.pnl != null
              ? trade.pnl >= 0
                ? "positive"
                : "negative"
              : "accent",
    },
    {
      label: isOpenTrade ? "Live P&L" : "Realized P&L",
      value: `${displayedPnL >= 0 ? "+" : ""}${formatCurrency(displayedPnL)}`,
      helper: isOpenTrade
        ? "Tracking against the latest available price."
        : "Final result recorded when the trade was closed.",
      icon: displayedPnL >= 0 ? TrendingUp : TrendingDown,
      tone: displayedPnL >= 0 ? "positive" : "negative",
    },
    {
      label: "Average R:R",
      value: metrics ? `${metrics.averageRiskReward.toFixed(2)}R` : "-",
      helper: metrics
        ? `T1 ${metrics.rrT1.toFixed(1)}R · T2 ${metrics.rrT2.toFixed(1)}R · T3 ${metrics.rrT3.toFixed(1)}R`
        : "Add targets and a stop to evaluate reward potential.",
      icon: Target,
      tone:
        metrics && metrics.averageRiskReward >= 2
          ? "positive"
          : metrics && metrics.averageRiskReward >= 1
            ? "warning"
            : "negative",
    },
  ];
  const averageRiskRewardProgress = metrics
    ? Math.min(metrics.averageRiskReward, 3) * (100 / 3)
    : 0;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        id: Number(trade.id),
        asset: trade.asset,
        position: trade.position,
        entryPrice: trade.entryPrice,
        targetTier1: Number.parseFloat(formData.targetTier1) || 0,
        targetTier2: formData.targetTier2
          ? Number.parseFloat(formData.targetTier2)
          : null,
        targetTier3: formData.targetTier3
          ? Number.parseFloat(formData.targetTier3)
          : null,
        stopLoss: Number.parseFloat(formData.stopLoss) || 0,
        notes: formData.notes,
        date: trade.date,
        status: trade.status,
        exitPrice: trade.exitPrice || null,
        pnl: trade.pnl || null,
        closedDate: trade.closedDate || null,
        screenshots:
          formData.screenshots.length > 0
            ? formData.screenshots.map((s) => s.url)
            : null,
        tradeTechnicalAnalysisTags:
          formData.analysisTags.length > 0
            ? formData.analysisTags.map((id) => parseInt(id, 10))
            : null,
        emotionTags:
          formData.emotionTags.length > 0
            ? formData.emotionTags.map((id) => parseInt(id, 10))
            : null,
        confidenceLevel:
          formData.confidenceLevel > 0 ? formData.confidenceLevel : 0,
        tradeHistoryChecklists:
          formData.pretradeChecklist.map((id) => parseInt(id, 10)),
        tradingZoneId: formData.tradingSession
          ? parseInt(formData.tradingSession, 10)
          : 0,
        tradingSessionId: trade.sessionId
          ? parseInt(trade.sessionId, 10)
          : null,
        riskGuardrail: trade.riskGuardrails
          ? {
              accountEquity: trade.riskGuardrails.accountEquity || null,
              riskPercentage: trade.riskGuardrails.riskPercentage || null,
              maxDailyLoss: trade.riskGuardrails.maxDailyLoss || null,
              takeProfit: trade.riskGuardrails.takeProfit || null,
              positionSize: trade.riskGuardrails.positionSize || null,
            }
          : null,
      };

      const res = await api.put<ApiResponse<boolean>>(
        `/v1/trade-histories`,
        payload,
      );

      if (!res.data.isSuccess) {
        throw new Error("Failed to update trade via API");
      }

      toast({
        title: "Trade Updated",
        description: "Your trade details have been successfully saved.",
      });

      // Update local state to reflect changes instantly or we could refetch. Local state update for immediate feedback:
      setTrade((prev) =>
        prev
          ? {
              ...prev,
              notes: formData.notes,
              targetTier1: Number.parseFloat(formData.targetTier1) || 0,
              targetTier2: Number.parseFloat(formData.targetTier2) || 0,
              targetTier3: Number.parseFloat(formData.targetTier3) || 0,
              stopLoss: Number.parseFloat(formData.stopLoss) || 0,
              analysisTags: formData.analysisTags,
              emotionTags: formData.emotionTags,
              confidenceLevel: formData.confidenceLevel,
              tradingSession: formData.tradingSession,
              screenshots: formData.screenshots,
              pretradeChecklist: formData.pretradeChecklist,
            }
          : prev,
      );

      // Update context just in case other parts of the app need it updated before a full refetch
      updateTrade(trade.id, {
        notes: formData.notes,
        targetTier1: Number.parseFloat(formData.targetTier1) || 0,
        targetTier2: Number.parseFloat(formData.targetTier2) || 0,
        targetTier3: Number.parseFloat(formData.targetTier3) || 0,
        stopLoss: Number.parseFloat(formData.stopLoss) || 0,
        analysisTags: formData.analysisTags,
        emotionTags: formData.emotionTags,
        confidenceLevel: formData.confidenceLevel,
        tradingSession: formData.tradingSession,
        screenshots: formData.screenshots,
        pretradeChecklist: formData.pretradeChecklist,
      });

      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating trade:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.message || "Failed to update trade. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setFormData((prev) => ({
            ...prev,
            screenshots: [...prev.screenshots, { url: result }],
          }));
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleClose = async () => {
    if (exitPrice && manualPnl) {
      setIsClosing(true);
      const exitPriceNum = Number.parseFloat(exitPrice);
      const pnlNum = Number.parseFloat(manualPnl);
      
      try {
        const payload = {
          tradeId: Number(trade.id),
          exitPrice: exitPriceNum,
          pnl: pnlNum,
          tradingResult: tradingResult,
          hitStopLoss: hitStopLoss
        };
        
        const res = await api.post<ApiResponse<boolean>>(
          '/v1/trade-histories/close',
          payload
        );
        
        if (!res.data.isSuccess) {
          throw new Error("Failed to close trade via API");
        }

        toast({
          title: "Trade Closed",
          description: "Your trade has been successfully closed.",
        });

        closeTrade(trade.id, exitPriceNum);
        setCloseDialogOpen(false);
        router.push("/history");
      } catch (error: any) {
        console.error("Error closing trade:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error?.message || "Failed to close trade. Please try again.",
        });
      } finally {
        setIsClosing(false);
      }
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/v1/trade-histories/${trade.id}`);
      deleteTrade(trade.id);
      router.push("/history");
    } catch (error: any) {
      console.error("Error deleting trade:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to delete trade. Please try again.",
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <div className="mb-5">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trade History
          </Link>
        </div>

        <section className="relative mb-5 overflow-hidden rounded-[28px] border border-border/70 bg-linear-to-br from-card via-card to-primary/5 px-5 py-5 shadow-sm sm:px-6">
          <div aria-hidden="true" className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div aria-hidden="true" className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-7 border px-3 text-xs font-medium",
                      trade.position === PositionType.Long
                        ? "border-success/20 bg-success/15 text-success"
                        : "border-destructive/20 bg-destructive/15 text-destructive",
                    )}
                  >
                    {trade.position === PositionType.Long ? (
                      <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {getPositionTypeLabel(trade.position)}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={cn(
                      "h-7 bg-background/70 px-3 text-xs font-medium",
                      trade.status === TradeStatus.Open
                        ? "border-accent/30 text-accent"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {trade.status === TradeStatus.Open ? (
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {getTradeStatusLabel(trade.status)}
                  </Badge>

                  {trade.hitStopLoss ? (
                    <Badge variant="destructive" className="h-7 px-3 text-xs">
                      Hit Stop Loss
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                      {trade.asset}
                    </h1>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium shadow-sm",
                        displayedPnL >= 0
                          ? "border-success/20 bg-success/10 text-success"
                          : "border-destructive/20 bg-destructive/10 text-destructive",
                      )}
                    >
                      {displayedPnL >= 0 ? <TrendingUp className="mr-1.5 h-4 w-4" /> : <TrendingDown className="mr-1.5 h-4 w-4" />}
                      {isOpenTrade ? "Live" : "Final"} {displayedPnL >= 0 ? "+" : ""}
                      {formatCurrency(displayedPnL)}
                    </span>
                  </div>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Review execution quality, risk structure, and post-trade context without hunting across separate sections.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <SnapshotPill
                    icon={Calendar}
                    label="Opened"
                    value={formatDisplayDate(trade.date)}
                  />
                  <SnapshotPill
                    icon={Clock}
                    label={timeInTradeLabel}
                    value={timeInTradeValue}
                  />
                  {selectedTradingZone ? (
                    <SnapshotPill
                      icon={Clock}
                      label="Zone"
                      value={`${selectedTradingZone.name} · ${selectedTradingZone.fromTime} - ${selectedTradingZone.toTime}`}
                      className="border-amber-500/20 bg-amber-500/10"
                    />
                  ) : null}
                  {trade.closedDate ? (
                    <SnapshotPill
                      icon={CheckCircle2}
                      label="Closed"
                      value={formatDisplayDate(trade.closedDate)}
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="min-w-33 gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="min-w-27.5 bg-background/70"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-1.5 bg-background/70"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Trade
                  </Button>
                )}

                {trade.status === TradeStatus.Open ? (
                  <Button
                    variant="outline"
                    onClick={() => setCloseDialogOpen(true)}
                    className="gap-1.5 bg-background/70"
                  >
                    <X className="h-4 w-4" />
                    Close Trade
                  </Button>
                ) : null}

                <Button
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {headlineMetrics.map((metric) => (
                <OverviewMetricCard key={metric.label} {...metric} />
              ))}
            </div>
          </div>
        </section>

        {/* Status Alert */}
        <div className="mb-5">
          <TradeStatusAlert trade={trade} currentPrice={currentPrice} />
        </div>

        <Tabs defaultValue="detail" className="space-y-5">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl border border-border/70 bg-card/80 p-1 shadow-sm">
            <TabsTrigger
              value="detail"
              className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <BarChart3 className="h-4 w-4" />
              Trade Detail
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              Trade Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="space-y-5 outline-none">
            {/* Key Metrics Cards */}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {quickStats.map((metric) => (
                <OverviewMetricCard key={metric.label} {...metric} />
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              {/* Left Column - Price, analysis, and notes */}
              <div className="space-y-5">
                {/* Price Level Visualization */}
                {trade.status === TradeStatus.Open && (
                  <Card className="border-border/70 bg-card/90 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-accent" />
                        Price Level Progress
                      </CardTitle>
                      <CardDescription>
                        See where the live price sits relative to your stop and profit targets.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 pb-4">
                      <PriceLevelBar trade={trade} currentPrice={currentPrice} />
                    </CardContent>
                  </Card>
                )}

                {/* Target Prices Section */}
                <Card className="border-border/70 bg-card/90 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-success" />
                        Target Prices
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Review planned exits and adjust them without losing sight of the reward profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {/* Tier 1 */}
                      <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Tier 1
                          </p>
                          {metrics && (
                            <Badge variant="outline" className="text-xs">
                              {metrics.rrT1.toFixed(1)}R
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Conservative
                        </p>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.targetTier1}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                targetTier1: e.target.value,
                              }))
                            }
                            className="h-9"
                          />
                        ) : (
                          <p className="text-xl font-semibold text-success">
                            {trade.targetTier1
                              ? formatCurrency(trade.targetTier1)
                              : "-"}
                          </p>
                        )}
                      </div>

                      {/* Tier 2 */}
                      <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Tier 2
                          </p>
                          {metrics && (
                            <Badge variant="outline" className="text-xs">
                              {metrics.rrT2.toFixed(1)}R
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Moderate
                        </p>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.targetTier2}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                targetTier2: e.target.value,
                              }))
                            }
                            className="h-9"
                          />
                        ) : (
                          <p className="text-xl font-semibold text-success">
                            {trade.targetTier2
                              ? formatCurrency(trade.targetTier2)
                              : "-"}
                          </p>
                        )}
                      </div>

                      {/* Tier 3 */}
                      <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Tier 3
                          </p>
                          {metrics && (
                            <Badge variant="outline" className="text-xs">
                              {metrics.rrT3.toFixed(1)}R
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Aggressive
                        </p>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.targetTier3}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                targetTier3: e.target.value,
                              }))
                            }
                            className="h-9"
                          />
                        ) : (
                          <p className="text-xl font-semibold text-success">
                            {trade.targetTier3
                              ? formatCurrency(trade.targetTier3)
                              : "-"}
                          </p>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="pt-2">
                        <Label className="text-sm font-medium">Stop Loss</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.stopLoss}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              stopLoss: e.target.value,
                            }))
                          }
                          className="mt-1.5 h-9"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Trading Psychology */}
                  {(isEditing ||
                    trade.emotionTags?.length ||
                    trade.confidenceLevel) && (
                    <Card className="border-border/70 bg-card/90 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <Brain className="h-4 w-4 text-accent" />
                          Trading Psychology
                        </CardTitle>
                        <CardDescription>
                          Capture the mental state and conviction behind the trade.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Emotion Tags */}
                        {(isEditing ||
                          (trade.emotionTags &&
                            trade.emotionTags.length > 0)) && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Emotions
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {isEditing
                                ? apiTags.map((tag) => {
                                    const isSelected =
                                      formData.emotionTags.includes(
                                        tag.id.toString(),
                                      );
                                    const category = getTagCategory(tag.name);
                                    const colorMap = {
                                      positive: isSelected
                                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                                        : "bg-emerald-500/5 text-emerald-400/50 border-emerald-500/10",
                                      negative: isSelected
                                        ? "bg-red-500/15 text-red-400 border-red-500/25"
                                        : "bg-red-500/5 text-red-400/50 border-red-500/10",
                                      neutral: isSelected
                                        ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                                        : "bg-blue-500/5 text-blue-400/50 border-blue-500/10",
                                    };
                                    return (
                                      <button
                                        key={tag.id}
                                        onClick={() => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            emotionTags: isSelected
                                              ? prev.emotionTags.filter(
                                                  (id) =>
                                                    id !== tag.id.toString(),
                                                )
                                              : [
                                                  ...prev.emotionTags,
                                                  tag.id.toString(),
                                                ],
                                          }));
                                        }}
                                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors hover:brightness-125 ${colorMap[category]}`}
                                      >
                                        {tag.name}
                                      </button>
                                    );
                                  })
                                : trade.emotionTags?.map((tagId) => {
                                    const tag = apiTags.find(
                                      (t) =>
                                        t.id.toString() === tagId.toString(),
                                    );
                                    const label = tag
                                      ? tag.name
                                      : "Unknown Tag";
                                    const category = getTagCategory(label);
                                    const colorMap = {
                                      positive:
                                        "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
                                      negative:
                                        "bg-red-500/15 text-red-400 border-red-500/25",
                                      neutral:
                                        "bg-blue-500/15 text-blue-400 border-blue-500/25",
                                    };
                                    return (
                                      <span
                                        key={tagId}
                                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorMap[category]}`}
                                      >
                                        {label}
                                      </span>
                                    );
                                  })}
                            </div>
                          </div>
                        )}

                        {/* Confidence Level */}
                        {(isEditing || trade.confidenceLevel) && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Confidence Level
                            </p>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((level) =>
                                isEditing ? (
                                  <button
                                    key={level}
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        confidenceLevel: level,
                                      }))
                                    }
                                    className={`h-4 w-4 rounded-full transition-colors cursor-pointer hover:bg-primary/80 ${
                                      formData.confidenceLevel >= level
                                        ? "bg-primary"
                                        : "bg-secondary"
                                    }`}
                                  />
                                ) : (
                                  <div
                                    key={level}
                                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                                      trade.confidenceLevel! >= level
                                        ? "bg-primary"
                                        : "bg-secondary"
                                    }`}
                                  />
                                ),
                              )}
                              <span className="ml-1 text-xs text-muted-foreground">
                                {isEditing ? (
                                  <>
                                    {formData.confidenceLevel === 1 &&
                                      "Very Low"}
                                    {formData.confidenceLevel === 2 && "Low"}
                                    {formData.confidenceLevel === 3 &&
                                      "Neutral"}
                                    {formData.confidenceLevel === 4 && "High"}
                                    {formData.confidenceLevel === 5 &&
                                      "Very High"}
                                    {!formData.confidenceLevel && "Not Set"}
                                  </>
                                ) : (
                                  <>
                                    {trade.confidenceLevel === 1 && "Very Low"}
                                    {trade.confidenceLevel === 2 && "Low"}
                                    {trade.confidenceLevel === 3 && "Neutral"}
                                    {trade.confidenceLevel === 4 && "High"}
                                    {trade.confidenceLevel === 5 && "Very High"}
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Trading Zones */}
                  {(isEditing || trade.tradingSession) &&
                    (() => {
                      const session = apiTradingZones.find(
                        (s) =>
                          s.id.toString() ===
                          (isEditing
                            ? formData.tradingSession
                            : trade.tradingSession),
                      );

                      return (
                        <Card className="border-border/70 bg-card/90 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                              <Clock className="h-4 w-4 text-amber-400" />
                              Trading Zone
                            </CardTitle>
                            <CardDescription>
                              Keep the session context visible while reviewing the trade.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {isEditing ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${!formData.tradingSession ? "border-amber-500/50 bg-amber-500/10 text-amber-400" : "border-border hover:bg-secondary/50"}`}
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      tradingSession: "",
                                    }))
                                  }
                                >
                                  Not Set
                                </button>
                                {apiTradingZones.map((s) => (
                                  <button
                                    key={s.id}
                                    className={`flex flex-col text-left rounded-lg border px-3 py-2 transition-colors ${formData.tradingSession === s.id.toString() ? "border-amber-500/50 bg-amber-500/10" : "border-border hover:bg-secondary/50"}`}
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        tradingSession: s.id.toString(),
                                      }))
                                    }
                                  >
                                    <span
                                      className={`text-sm font-medium ${formData.tradingSession === s.id.toString() ? "text-amber-400" : ""}`}
                                    >
                                      {s.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {s.fromTime} - {s.toTime}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : session ? (
                              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                                <span className="text-sm font-medium text-amber-400">
                                  {session.name}
                                </span>
                                <span className="text-xs text-amber-400/60">
                                  {session.fromTime} - {session.toTime}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Not set
                              </span>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })()}
                </div>

                {/* Technical Analysis Tags */}
                {(isEditing ||
                  (trade.analysisTags && trade.analysisTags.length > 0)) && (
                  <Card className="border-border/70 bg-card/90 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Tags className="h-4 w-4 text-primary" />
                        Technical Analysis
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {isEditing
                            ? formData.analysisTags.length
                            : trade.analysisTags!.length}{" "}
                          Selected
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Keep the structural and setup tags visible during review and editing.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-4">
                        {isEditing && (
                          <div>
                            <div className="flex flex-wrap gap-2">
                              {apiTechTags.map((tag) => {
                                const isSelected = formData.analysisTags.includes(
                                  tag.id.toString(),
                                );
                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        analysisTags: isSelected
                                          ? prev.analysisTags.filter(
                                              (t) => t !== tag.id.toString(),
                                            )
                                          : [
                                              ...prev.analysisTags,
                                              tag.id.toString(),
                                            ],
                                      }))
                                    }
                                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                                      isSelected
                                        ? "bg-primary/20 text-primary border-primary/40 ring-1 ring-primary/30"
                                        : "bg-secondary/50 text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                                    }`}
                                    title={tag.description}
                                  >
                                    {tag.name} {tag.shortName && `(${tag.shortName})`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {!isEditing &&
                            trade.analysisTags?.map((tagId) => {
                              const matchedTag = apiTechTags.find(
                                (t) => t.id.toString() === tagId,
                              );
                              const label = matchedTag
                                ? matchedTag.name
                                : `Tag #${tagId}`;
                              return (
                                <span
                                  key={tagId}
                                  title={getPlainTextFromRichText(matchedTag?.description || "") || label}
                                  className="inline-flex rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                                >
                                  {label}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Trade Notes */}
                <Card className="border-border/70 bg-card/90 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent" />
                      Trade Notes
                    </CardTitle>
                    <CardDescription>
                      Preserve rationale, market context, and any manual observations tied to this setup.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        rows={6}
                        placeholder="Add your trade rationale, market conditions, or any other notes..."
                        className="resize-none"
                      />
                    ) : (
                      <div className="rounded-lg bg-secondary/30 p-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {getPlainTextFromRichText(trade.notes || "") || (
                            <span className="text-muted-foreground italic">
                              No notes added for this trade
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Snapshot & risk analysis */}
              <div className="space-y-5">
                <Card className="border-border/70 bg-card/90 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Trade Snapshot
                    </CardTitle>
                    <CardDescription>
                      Core context that matters when reviewing execution quality.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Direction
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {getPositionTypeLabel(trade.position)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Status
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {getTradeStatusLabel(trade.status)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Confidence
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {getConfidenceLabel(trade.confidenceLevel)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Screenshots
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {(trade.screenshots?.length || 0).toString()} attached
                        </p>
                      </div>
                    </div>

                    {selectedTradingZone ? (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-400/80">
                          Trading Zone
                        </p>
                        <p className="mt-2 text-sm font-semibold text-amber-400">
                          {selectedTradingZone.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedTradingZone.fromTime} - {selectedTradingZone.toTime}
                          {selectedTradingZone.description
                            ? ` · ${getPlainTextFromRichText(selectedTradingZone.description)}`
                            : ""}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Risk/Reward Analysis */}
                <Card className="border-border/70 bg-card/90 shadow-sm mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Percent className="h-4 w-4 text-accent" />
                      Risk Analysis
                    </CardTitle>
                    <CardDescription>
                      Evaluate whether the setup justified the risk you planned to take.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">
                          Risk per unit
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {metrics ? formatCurrency(metrics.riskPerUnit) : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">
                          R:R Tier 1
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          1:{metrics?.rrT1.toFixed(2) || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">
                          R:R Tier 2
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          1:{metrics?.rrT2.toFixed(2) || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">
                          R:R Tier 3
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          1:{metrics?.rrT3.toFixed(2) || "-"}
                        </span>
                      </div>
                    </div>

                    {/* Risk Quality Indicator */}
                    <Separator />
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        Average Risk/Reward
                      </p>
                      <div className="flex items-center gap-3">
                        {metrics && (
                          <>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/70">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  metrics.averageRiskReward >= 2
                                    ? "bg-success"
                                    : metrics.averageRiskReward >= 1
                                      ? "bg-warning"
                                      : "bg-destructive"
                                }`}
                                style={{ width: `${averageRiskRewardProgress}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {metrics.averageRiskReward.toFixed(2)}
                              R
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {metrics && metrics.averageRiskReward >= 2
                          ? "Excellent risk/reward ratio"
                          : metrics && metrics.averageRiskReward >= 1
                            ? "Acceptable risk/reward ratio"
                            : "Consider improving targets"}
                      </p>
                    </div>

                    {/* Risk Guardrails merged into Risk Analysis */}
                    {trade.riskGuardrails && (
                      <>
                        <Separator />
                        <div className="pt-1">
                          <p className="text-sm font-medium flex items-center gap-2 mb-3">
                            <Gauge className="h-4 w-4 text-destructive" />
                            Risk Guardrails
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {trade.riskGuardrails.accountEquity && (
                              <div className="rounded-md border border-border bg-secondary/20 px-3 py-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Account Equity
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-foreground">
                                  $
                                  {trade.riskGuardrails.accountEquity.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {trade.riskGuardrails.riskPercentage && (
                              <div className="rounded-md border border-border bg-secondary/20 px-3 py-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Risk per Trade
                                </p>
                                <p
                                  className={`mt-0.5 text-sm font-bold ${trade.riskGuardrails.riskPercentage > 2 ? "text-red-400" : "text-foreground"}`}
                                >
                                  {trade.riskGuardrails.riskPercentage}%
                                </p>
                              </div>
                            )}
                            {trade.riskGuardrails.maxDailyLoss && (
                              <div className="rounded-md border border-border bg-secondary/20 px-3 py-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Max Daily Loss
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-foreground">
                                  $
                                  {trade.riskGuardrails.maxDailyLoss.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {trade.riskGuardrails.positionSize && (
                              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Position Size
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-primary">
                                  {trade.riskGuardrails.positionSize.toLocaleString()}{" "}
                                  units
                                </p>
                              </div>
                            )}
                            {trade.riskGuardrails.takeProfit && (
                              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Take Profit
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-emerald-400">
                                  $
                                  {trade.riskGuardrails.takeProfit.toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Pre-trade Checklist (Model-based) */}
            {(isEditing ||
              (trade.pretradeChecklist &&
                trade.pretradeChecklist.length > 0)) && (
              <Card className="border-border/70 bg-card/90 shadow-sm mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-amber-400" />
                    Pre-trade Checklist
                    {selectedModelDetail && (
                      <span className="text-[10px] font-normal text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                        {selectedModelDetail.name}
                      </span>
                    )}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {isEditing
                        ? formData.pretradeChecklist.length
                        : trade.pretradeChecklist!.length}
                      /{apiChecklists.length} Completed
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Review setup discipline against the currently selected checklist model.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3, 4].map((typeId) => {
                      const items = apiChecklists.filter(
                        (item) => item.checkListType === typeId,
                      );

                      if (items.length === 0) return null;

                      const categoryLabel: Record<number, string> = {
                        1: "Market Structure",
                        2: "Trading Setup",
                        3: "Risk Management",
                        4: "Psychology",
                      };
                      const categoryColor: Record<number, string> = {
                        1: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                        2: "bg-primary/10 text-primary border-primary/20",
                        3: "bg-red-500/10 text-red-400 border-red-500/20",
                        4: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                      };

                      return (
                        <div key={typeId} className="space-y-3">
                          <div
                            className={`px-3 py-1.5 rounded-md border text-xs font-semibold uppercase tracking-wider ${categoryColor[typeId]}`}
                          >
                            {categoryLabel[typeId]}
                          </div>
                          <div className="space-y-2">
                            {items.map((item) => {
                              const isChecked = isEditing
                                ? formData.pretradeChecklist.includes(
                                    item.id.toString(),
                                  )
                                : trade.pretradeChecklist!.includes(
                                    item.id.toString(),
                                  );

                              if (isEditing) {
                                return (
                                  <label
                                    key={item.id}
                                    className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-all ${
                                      isChecked
                                        ? "border-emerald-500/30 bg-emerald-500/5"
                                        : "border-border bg-secondary/20 hover:bg-secondary/40"
                                    }`}
                                  >
                                    <div className="flex items-center h-5">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            pretradeChecklist: isChecked
                                              ? prev.pretradeChecklist.filter(
                                                  (i) =>
                                                    i !== item.id.toString(),
                                                )
                                              : [
                                                  ...prev.pretradeChecklist,
                                                  item.id.toString(),
                                                ],
                                          }));
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 bg-secondary text-primary focus:ring-primary/30"
                                      />
                                    </div>
                                    <span
                                      className={`text-sm leading-tight transition-colors ${
                                        isChecked
                                          ? "text-emerald-400"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {item.name}
                                    </span>
                                  </label>
                                );
                              }

                              return (
                                <label
                                  key={item.id}
                                  className={`flex cursor-default items-start gap-3 rounded-md border px-3 py-2.5 transition-all ${
                                    isChecked
                                      ? "border-emerald-500/30 bg-emerald-500/5 opacity-90"
                                      : "border-border bg-secondary/10 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-center h-5">
                                    <input
                                      type="checkbox"
                                      readOnly
                                      checked={isChecked}
                                      className={`h-4 w-4 rounded border-gray-300 bg-secondary ${isChecked ? "text-emerald-500" : "text-muted-foreground"} focus:ring-0 cursor-default`}
                                    />
                                  </div>
                                  <span
                                    className={`text-sm leading-tight transition-colors ${
                                      isChecked
                                        ? "text-emerald-400"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {item.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {trade.status === TradeStatus.Closed && trade.tradingResult && (
              <Card className="border-border/70 bg-card/90 shadow-sm mt-4 mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    Trading Result
                  </CardTitle>
                  <CardDescription>
                    Final outcome notes captured when the trade was closed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {getPlainTextFromRichText(trade.tradingResult)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Screenshots */}
            {(isEditing ||
              (trade.screenshots && trade.screenshots.length > 0)) && (
              <Card className="border-border/70 bg-card/90 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-accent" />
                    Screenshots
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {isEditing
                        ? formData.screenshots.length
                        : trade.screenshots?.length || 0}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Attach chart context and execution evidence for better post-trade review.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    {isEditing && (
                      <label
                        htmlFor="screenshot-upload"
                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-secondary/30"
                      >
                        <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          Click to upload screenshots
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">
                          PNG, JPG, or WebP
                        </span>
                        <input
                          id="screenshot-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={handleScreenshotUpload}
                        />
                      </label>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {(isEditing
                        ? formData.screenshots
                        : trade.screenshots || []
                      ).map((src, index) => (
                        <div
                          key={src.url || index}
                          className="group relative overflow-hidden rounded-lg border border-border"
                        >
                          <button
                            type="button"
                            onClick={() => setLightboxImage(src.url)}
                            className="w-full h-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <img
                              src={src.url}
                              alt={`Trade screenshot ${index + 1}`}
                              className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-background/0 transition-colors group-hover:bg-background/40">
                              <Expand className="h-5 w-5 text-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                          </button>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  screenshots: prev.screenshots.filter(
                                    (_, i) => i !== index,
                                  ),
                                }))
                              }
                              className="absolute top-2 right-2 rounded-full bg-background/80 p-1.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {isEditing && formData.screenshots.length === 0 && (
                        <div className="col-span-full py-8 text-center border-2 border-dashed border-border rounded-lg bg-secondary/20">
                          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No screenshots added yet.
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            Click the upload area above to select image files.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="summary" className="space-y-4 outline-none">
            {trade.tradeSumamry ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border/70 bg-card/90 shadow-sm lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">
                      {trade.tradeSumamry.executiveSummary}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-accent" />
                      Technical Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {trade.tradeSumamry.technicalInsights}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-amber-400" />
                      Psychology Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {trade.tradeSumamry.psychologyAnalysis}
                    </p>
                  </CardContent>
                </Card>

                {trade.tradeSumamry.criticalMistakes &&
                  (trade.tradeSumamry.criticalMistakes.technical?.length > 0 ||
                    trade.tradeSumamry.criticalMistakes.psychological?.length >
                      0) && (
                    <Card className="border-border/70 bg-card/90 shadow-sm lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Critical Mistakes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {trade.tradeSumamry.criticalMistakes.technical?.length >
                          0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Gauge className="h-4 w-4 text-muted-foreground" />
                              Technical Mistakes
                            </h4>
                            <ul className="list-disc pl-5 text-sm space-y-1.5 text-muted-foreground">
                              {trade.tradeSumamry.criticalMistakes.technical.map(
                                (m: string, i: number) => (
                                  <li key={i}>{m}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                        {trade.tradeSumamry.criticalMistakes.psychological
                          ?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Brain className="h-4 w-4 text-muted-foreground" />
                              Psychological Mistakes
                            </h4>
                            <ul className="list-disc pl-5 text-sm space-y-1.5 text-muted-foreground">
                              {trade.tradeSumamry.criticalMistakes.psychological.map(
                                (m: string, i: number) => (
                                  <li key={i}>{m}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-card border-dashed">
                <FileText className="h-8 w-8 text-muted-foreground/50 mb-4" />
                <p className="text-foreground font-medium">
                  No summary available
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  A trade summary is not available for this trade yet. Trade
                  summaries provide AI-generated insights into your technical
                  and psychological performance.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Close Trade Dialog */}
        <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <DialogContent className="sm:max-w-106.25">
            <DialogHeader>
              <DialogTitle>Close Trade</DialogTitle>
              <DialogDescription>
                Enter the exit price to close your {trade.asset}{" "}
                {trade.position} position.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-muted-foreground">Entry Price</p>
                  <p className="font-medium">
                    {formatCurrency(trade.entryPrice)}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-muted-foreground">Current Price</p>
                  <p className="font-medium">{formatCurrency(currentPrice)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitPrice">Exit Price</Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="0.01"
                  placeholder={currentPrice.toString()}
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualPnl">P&L</Label>
                <Input
                  id="manualPnl"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={manualPnl}
                  onChange={(e) => setManualPnl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradingResult">Result</Label>
                <Textarea
                  id="tradingResult"
                  placeholder="Enter trade result notes..."
                  value={tradingResult}
                  onChange={(e) => setTradingResult(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="hitStopLoss"
                  checked={hitStopLoss}
                  onChange={(e) => setHitStopLoss(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
                <Label htmlFor="hitStopLoss">Hit stop loss</Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setCloseDialogOpen(false)}
                disabled={isClosing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleClose}
                disabled={!exitPrice || !manualPnl || isClosing}
              >
                {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isClosing ? "Closing..." : "Close Trade"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Screenshot Lightbox */}
        <Dialog
          open={!!lightboxImage}
          onOpenChange={() => setLightboxImage(null)}
        >
          <DialogContent className="max-w-3xl p-2 sm:p-4">
            <DialogHeader className="sr-only">
              <DialogTitle>Screenshot Preview</DialogTitle>
              <DialogDescription>
                Full-size view of the trade screenshot
              </DialogDescription>
            </DialogHeader>
            {lightboxImage && (
              <img
                src={lightboxImage}
                alt="Screenshot full view"
                className="w-full rounded-lg object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Trade Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-106.25">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Trade
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this {trade.asset} trade? This
                action cannot be undone and all trade data will be permanently
                removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isDeleting ? "Deleting..." : "Delete Trade"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <TradeDetailContent id={id} />;
}
