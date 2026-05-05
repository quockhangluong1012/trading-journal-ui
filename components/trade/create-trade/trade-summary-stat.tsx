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
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-background/40 p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-background/60 hover:shadow-md">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-foreground/80">
        {label}
      </p>
      <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        <span className={cn("inline-block transition-transform duration-300 group-hover:translate-x-0.5", valueClassName)}>{value}</span>
      </div>
      {helper ? (
        <p className="mt-2 border-t border-border/30 pt-2 text-[11px] leading-relaxed text-muted-foreground/80">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
