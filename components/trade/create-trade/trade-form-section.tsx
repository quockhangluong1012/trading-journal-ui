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
        "group relative overflow-hidden rounded-3xl border border-white/10 border-t-[3px] border-t-primary/70 dark:border-white/5 dark:border-t-primary bg-background/30 shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/5 via-transparent to-background/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex flex-col gap-4 border-b border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-linear-to-br from-background/80 to-muted/50 text-foreground shadow-inner transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">
            {icon}
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs leading-relaxed text-muted-foreground/80">
              {description}
            </p>
          </div>
        </div>
        {headerAccessory ? <div className="ml-[64px] sm:ml-0">{headerAccessory}</div> : null}
      </div>
      <div className={cn("relative z-10 px-6 py-6", contentClassName)}>{children}</div>
    </section>
  )
}
