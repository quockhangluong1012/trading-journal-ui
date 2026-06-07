import { cn } from "@/lib/utils"

export interface TradeSummaryStatProps {
  label: string
  value: string
  helper?: string
  valueClassName?: string
}

export function TradeSummaryStat({
  label,
  value,
  helper,
  valueClassName,
}: TradeSummaryStatProps) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-background/85 p-3 dark:border-slate-700/70 dark:bg-slate-950/70">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-lg font-bold tracking-tight text-foreground tabular-nums">
        <span className={cn(valueClassName)}>{value}</span>
      </div>
      {helper ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground/80">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
