import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface AppPageIntroStat {
  label: string
  value: ReactNode
}

interface AppPageIntroProps {
  badge?: ReactNode
  icon?: ReactNode
  title: string
  description?: ReactNode
  actions?: ReactNode
  stats?: AppPageIntroStat[]
  className?: string
}

export function AppPageIntro({
  badge,
  icon,
  title,
  description,
  actions,
  stats,
  className,
}: AppPageIntroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-4xl border border-border/70 bg-card/80 px-5 py-5 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:px-6 sm:py-6 lg:px-8",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(79,70,229,0.09),transparent_38%,rgba(14,165,233,0.08)_100%)] dark:bg-[linear-gradient(135deg,rgba(129,140,248,0.12),transparent_38%,rgba(56,189,248,0.08)_100%)]" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            {badge ? (
              <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/8 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                {badge}
              </Badge>
            ) : null}

            <div className="flex items-start gap-4">
              {icon ? (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm shadow-primary/10">
                  {icon}
                </div>
              ) : null}

              <div className="space-y-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>

        {stats && stats.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/60 bg-background/75 px-4 py-3 shadow-sm backdrop-blur-md"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </p>
                <div className="mt-1.5 text-lg font-semibold text-foreground">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}