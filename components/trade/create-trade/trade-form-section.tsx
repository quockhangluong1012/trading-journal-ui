import { cn } from "@/lib/utils"

export interface TradeFormSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  headerAccessory?: React.ReactNode
}

export function TradeFormSection({
  title,
  description,
  icon,
  children,
  className,
  contentClassName,
  headerAccessory,
}: TradeFormSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200/80 bg-background/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/80",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-b border-slate-200/70 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700/60 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-background text-foreground dark:border-slate-700/70 dark:bg-slate-900">
            {icon}
          </div>
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs leading-snug text-muted-foreground/80">
              {description}
            </p>
          </div>
        </div>
        {headerAccessory ? <div className="shrink-0">{headerAccessory}</div> : null}
      </div>
      <div className={cn("px-4 py-4", contentClassName)}>{children}</div>
    </section>
  )
}
