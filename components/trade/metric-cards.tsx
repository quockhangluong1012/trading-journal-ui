import { ElementType } from "react";
import { cn } from "@/lib/utils";

type MetricTone = "default" | "positive" | "negative" | "accent" | "warning";

interface OverviewMetricCardProps {
  label: string;
  value: string;
  helper?: string;
  icon: ElementType;
  tone?: MetricTone;
  className?: string;
}

export function OverviewMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
  className,
}: OverviewMetricCardProps) {
  const toneStyles: Record<MetricTone, { container: string; iconWrap: string; icon: string }> = {
    default: {
      container: "border-border/70 bg-background/80",
      iconWrap: "border-border/60 bg-secondary/70",
      icon: "text-foreground",
    },
    positive: {
      container: "border-success/20 bg-success/5",
      iconWrap: "border-success/20 bg-success/10",
      icon: "text-success",
    },
    negative: {
      container: "border-destructive/20 bg-destructive/5",
      iconWrap: "border-destructive/20 bg-destructive/10",
      icon: "text-destructive",
    },
    accent: {
      container: "border-accent/20 bg-accent/5",
      iconWrap: "border-accent/20 bg-accent/10",
      icon: "text-accent",
    },
    warning: {
      container: "border-warning/20 bg-warning/5",
      iconWrap: "border-warning/20 bg-warning/10",
      icon: "text-warning",
    },
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm backdrop-blur-sm",
        toneStyles[tone].container,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {helper ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {helper}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            toneStyles[tone].iconWrap,
          )}
        >
          <Icon className={cn("h-4 w-4", toneStyles[tone].icon)} />
        </div>
      </div>
    </div>
  );
}

interface SnapshotPillProps {
  icon: ElementType;
  label: string;
  value: string;
  className?: string;
}

export function SnapshotPill({
  icon: Icon,
  label,
  value,
  className,
}: SnapshotPillProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-xs shadow-sm",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium text-foreground">{value}</span>
    </div>
  );
}
