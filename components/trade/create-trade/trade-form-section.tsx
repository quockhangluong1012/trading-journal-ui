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
        "rounded-xl border border-border/60 bg-card",
        className,
      )}
    >
      <div className="flex flex-col gap-2 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="shrink-0">{icon}</span>
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs leading-snug text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {headerAccessory ? <div className="shrink-0">{headerAccessory}</div> : null}
      </div>
      <div className={cn("px-4 pb-4 pt-3", contentClassName)}>{children}</div>
    </section>
  )
}
