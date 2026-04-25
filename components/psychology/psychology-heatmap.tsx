"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, TrendingDown, TrendingUp } from "lucide-react";
import { getTagCategory } from "@/lib/trade-store";
import { api } from "@/lib/api";
import { PsychologyChartState, SURFACE_CARD_CLASS } from "./psychology-stats";

function getHeatColor(avgPnl: number, maxAbsPnl: number) {
  const ratio = avgPnl / maxAbsPnl;
  if (ratio > 0.5) return { bg: "bg-emerald-500/30", border: "border-emerald-500/40", text: "text-emerald-400" };
  if (ratio > 0.15) return { bg: "bg-emerald-500/15", border: "border-emerald-500/25", text: "text-emerald-400" };
  if (ratio > -0.15) return { bg: "bg-secondary/40", border: "border-border", text: "text-muted-foreground" };
  if (ratio > -0.5) return { bg: "bg-red-500/15", border: "border-red-500/25", text: "text-red-400" };
  return { bg: "bg-red-500/30", border: "border-red-500/40", text: "text-red-400" };
}

const CATEGORY_CLASSES: Record<string, string> = {
  positive: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  negative: "border-red-500/25 bg-red-500/10 text-red-400",
  neutral: "border-blue-500/25 bg-blue-500/10 text-blue-400",
};

export function PsychologyHeatmap() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get("/v1/dashboard/psychology-heatmap")
      .then((res) => { if (res.data.isSuccess) setData(res.data.value); })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || data.length === 0) {
    return (
      <Card className={`${SURFACE_CARD_CLASS} lg:col-span-2`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Flame className="h-5 w-5 text-amber-400" /> Psychology Heatmap
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Emotion vs PnL correlation across your closed trades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PsychologyChartState icon={Flame}
            message="Need closed trades with emotion tags before this map can show profitable and costly states."
            isLoading={isLoading} className="h-50" />
        </CardContent>
      </Card>
    );
  }

  const maxAbsPnl = Math.max(...data.map((d) => Math.abs(d.avgPnl)), 1);

  return (
    <Card className={`${SURFACE_CARD_CLASS} lg:col-span-2`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Flame className="h-5 w-5 text-amber-400" /> Psychology Heatmap
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Emotion vs PnL correlation &mdash; identify which states produce the best and worst outcomes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">Loss</span>
          <div className="h-2.5 w-6 rounded-sm bg-red-500/30" />
          <div className="h-2.5 w-6 rounded-sm bg-red-500/15" />
          <div className="h-2.5 w-6 rounded-sm bg-secondary/40" />
          <div className="h-2.5 w-6 rounded-sm bg-emerald-500/15" />
          <div className="h-2.5 w-6 rounded-sm bg-emerald-500/30" />
          <span className="text-[10px] text-muted-foreground ml-1">Profit</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => {
            const heat = getHeatColor(item.avgPnl, maxAbsPnl);
            const category = getTagCategory(item.label);
            return (
              <div key={item.id} className={`rounded-lg border ${heat.border} ${heat.bg} p-3 transition-all hover:scale-[1.02]`}>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${CATEGORY_CLASSES[category]}`}>
                    {category}
                  </span>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className={`text-lg font-bold ${heat.text}`}>{item.avgPnl >= 0 ? "+" : ""}${item.avgPnl.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">avg PnL / trade</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-400"><TrendingUp className="h-2.5 w-2.5" />{item.wins}W</span>
                      <span className="flex items-center gap-0.5 text-[10px] text-red-400"><TrendingDown className="h-2.5 w-2.5" />{item.losses}L</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.winRate}% win rate &middot; {item.count} trades</p>
                  </div>
                </div>
                <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-secondary/50">
                  {item.count > 0 && (<><div className="h-full bg-emerald-500/60" style={{ width: `${item.winRate}%` }} /><div className="h-full bg-red-500/60" style={{ width: `${100 - item.winRate}%` }} /></>)}
                </div>
              </div>
            );
          })}
        </div>

        {data.length >= 2 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /><span className="text-xs font-medium text-emerald-400">Most Profitable State</span></div>
              <p className="mt-1 text-sm font-bold text-foreground">{data[0].label}</p>
              <p className="text-xs text-muted-foreground">+${data[0].avgPnl.toLocaleString()} avg PnL across {data[0].count} trades</p>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-400" /><span className="text-xs font-medium text-red-400">Most Costly State</span></div>
              <p className="mt-1 text-sm font-bold text-foreground">{data[data.length - 1].label}</p>
              <p className="text-xs text-muted-foreground">{data[data.length - 1].avgPnl >= 0 ? "+" : ""}${data[data.length - 1].avgPnl.toLocaleString()} avg PnL across {data[data.length - 1].count} trades</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
