"use client";

import { type ElementType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const ANALYTICS_SURFACE_CLASS = "border-border/70 bg-card/95 shadow-sm";

export const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);

export const pct = (value: number) => `${value.toFixed(1)}%`;

export function MetricCard({ label, value, sub, icon: Icon, color = "text-foreground", bgColor = "border border-border/60 bg-secondary/30" }: {
  label: string; value: string; sub?: string; icon: ElementType; color?: string; bgColor?: string;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-linear-to-b from-card to-card/80 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</p>
            {sub ? <p className="text-xs leading-relaxed text-muted-foreground">{sub}</p> : null}
          </div>
          <div className={cn("rounded-2xl p-2.5 shadow-sm", bgColor)}><Icon className={`h-4 w-4 ${color}`} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-background via-background to-primary/5 shadow-sm">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.45fr)_360px] lg:px-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-40 rounded-full" /><Skeleton className="h-6 w-14 rounded-full" /><Skeleton className="h-6 w-36 rounded-full" />
            </div>
            <div className="space-y-2"><Skeleton className="h-10 w-72 rounded-xl" /><Skeleton className="h-5 w-full max-w-2xl rounded-md" /><Skeleton className="h-4 w-full max-w-3xl rounded-md" /></div>
            <div className="flex flex-wrap items-center gap-3"><Skeleton className="h-10 w-60 rounded-2xl" /><Skeleton className="h-9 w-32 rounded-xl" /><Skeleton className="h-9 w-24 rounded-xl" /></div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/85 p-5 shadow-sm backdrop-blur-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <Skeleton className="h-3 w-20 rounded-md" /><Skeleton className="mt-3 h-7 w-24 rounded-md" /><Skeleton className="mt-2 h-3 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className={ANALYTICS_SURFACE_CLASS}><CardContent className="pt-5 pb-4"><Skeleton className="h-4 w-24 rounded-md" /><Skeleton className="mt-3 h-8 w-28 rounded-md" /><Skeleton className="mt-3 h-3 w-32 rounded-md" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={ANALYTICS_SURFACE_CLASS}><CardContent className="pt-6"><Skeleton className="h-70 w-full rounded-2xl" /></CardContent></Card>
        <Card className={ANALYTICS_SURFACE_CLASS}><CardContent className="pt-6"><Skeleton className="h-70 w-full rounded-2xl" /></CardContent></Card>
      </div>
    </div>
  );
}
