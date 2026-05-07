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
        "group relative overflow-hidden rounded-3xl border border-slate-200/80 border-t-[3px] border-t-primary/70 bg-background/80 ring-1 ring-slate-300/50 shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur-xl transition-all duration-500 hover:border-primary/35 hover:shadow-[0_24px_55px_rgba(79,70,229,0.08)] dark:border-slate-700/70 dark:bg-slate-950/85 dark:ring-white/5 dark:shadow-[0_20px_45px_rgba(2,8,23,0.38)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-br from-white/5 via-transparent to-transparent opacity-80" />
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/8 via-transparent to-background/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex flex-col gap-4 border-b border-slate-200/80 bg-slate-50/85 px-6 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-linear-to-br from-background/95 to-slate-100/80 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3 dark:border-slate-600/80 dark:from-slate-950/95 dark:to-slate-900/85">
            {icon}
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs leading-relaxed text-muted-foreground/80">
              {description}
            </p>
          </div>
        </div>
        {headerAccessory ? <div className="ml-16 sm:ml-0">{headerAccessory}</div> : null}
      </div>
      <div className={cn("relative z-10 px-6 py-6", contentClassName)}>{children}</div>
    </section>
  )
}
