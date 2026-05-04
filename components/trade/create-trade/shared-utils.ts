import { cn } from "@/lib/utils"

export const categoryLabel: Record<number, string> = {
  1: "Market Structure",
  2: "Trade Setup",
  3: "Risk Management",
  4: "Psychology",
}

export const categoryColor: Record<number, string> = {
  1: "text-cyan-400",
  2: "text-primary",
  3: "text-red-400",
  4: "text-blue-400",
}

export const formatTradeDate = (value: string): string => {
  if (!value) {
    return "Select trade date"
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return "Select trade date"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate)
}

export const getConfidenceLabel = (confidenceLevel: number): string => {
  switch (confidenceLevel) {
    case 1:
      return "Very Low"
    case 2:
      return "Low"
    case 3:
      return "Neutral"
    case 4:
      return "High"
    case 5:
      return "Very High"
    default:
      return "Not set"
  }
}

export const getProgressTone = (progress: number) => {
  if (progress >= 75) {
    return {
      barClassName: "bg-emerald-500",
      pillClassName: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      textClassName: "text-emerald-400",
    }
  }

  if (progress >= 50) {
    return {
      barClassName: "bg-amber-400",
      pillClassName: "border-amber-500/20 bg-amber-500/10 text-amber-400",
      textClassName: "text-amber-400",
    }
  }

  if (progress >= 25) {
    return {
      barClassName: "bg-orange-400",
      pillClassName: "border-orange-500/20 bg-orange-500/10 text-orange-400",
      textClassName: "text-orange-400",
    }
  }

  return {
    barClassName: "bg-red-500",
    pillClassName: "border-red-500/20 bg-red-500/10 text-red-400",
    textClassName: "text-red-400",
  }
}

export const getRRColorClass = (rrRatio: number) => {
  if (rrRatio >= 2) {
    return "text-emerald-400"
  }

  if (rrRatio >= 1) {
    return "text-amber-400"
  }

  return "text-red-400"
}

export const surfaceFieldClassName = "border-white/10 bg-background/50 backdrop-blur-sm shadow-inner transition-all hover:border-primary/40 focus:bg-background/80 focus:ring-2 focus:ring-primary/20"
