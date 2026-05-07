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
    <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-background/85 ring-1 ring-slate-300/40 p-4 shadow-[0_12px_30px_rgba(148,163,184,0.14)] backdrop-blur-md transition-all duration-300 hover:border-slate-300/90 hover:bg-background hover:shadow-[0_18px_35px_rgba(148,163,184,0.18)] dark:border-slate-700/70 dark:bg-slate-950/80 dark:ring-white/5 dark:shadow-[0_12px_30px_rgba(2,8,23,0.24)] dark:hover:border-slate-500/80 dark:hover:bg-slate-950 dark:hover:shadow-[0_18px_35px_rgba(2,8,23,0.3)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-foreground/80">
        {label}
      </p>
      <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        <span className={cn("inline-block transition-transform duration-300 group-hover:translate-x-0.5", valueClassName)}>{value}</span>
      </div>
      {helper ? (
        <p className="mt-2 border-t border-slate-200/80 pt-2 text-[11px] leading-relaxed text-muted-foreground/80 dark:border-slate-700/70">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
