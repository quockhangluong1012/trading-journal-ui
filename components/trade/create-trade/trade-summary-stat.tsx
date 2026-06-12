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
    <div className="rounded-lg bg-muted/40 p-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-base font-semibold tracking-tight text-foreground tabular-nums">
        <span className={cn(valueClassName)}>{value}</span>
      </div>
      {helper ? (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
