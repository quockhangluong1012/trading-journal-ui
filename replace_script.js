const fs = require('fs');
const file = 'c:/project/.NET/trading-journal-ui/components/dashboard/dashboard-command-center.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Progress import
content = content.replace('import { Progress } from "@/components/ui/progress"\n', '');

// 2. Replace toneClasses
content = content.replace(
  `const toneClasses = {
  positive: "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
  neutral: "border-border/70 bg-background/70 text-foreground",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-400",
} as const`,
  `const toneClasses = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400",
  neutral: "border-border/40 bg-white text-foreground dark:border-border/60 dark:bg-card shadow-sm",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400",
} as const`
);

// 3. Replace the return statement body
const newBody = `  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-[#fbfdfc] p-6 lg:p-8 shadow-sm dark:bg-background/40 animate-in fade-in slide-in-from-bottom-[2%] duration-700">
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_380px] lg:grid-rows-[auto_auto]">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="rounded-full border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Dashboard pulse
            </Badge>
            {todaySetupBadge}
            <Badge
              variant="outline"
              className="rounded-full border-border/60 bg-white px-3.5 py-1.5 text-[11px] font-medium text-foreground dark:bg-card shadow-sm"
            >
              {filterLabel}
            </Badge>
            <span className="px-1 text-[11px] font-medium text-muted-foreground">
              {formatLastUpdated(lastUpdatedAt)}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-[2.75rem]">
              {getGreeting(userName)}
            </h1>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
                <Skeleton className="h-4 w-full max-w-xl rounded-md" />
              </div>
            ) : (
              <p className="max-w-[42rem] text-[15px] font-medium leading-relaxed text-muted-foreground">
                {overview.summary}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-5 pt-2">
            <div className="flex w-full items-center gap-1 overflow-x-auto rounded-full border border-border/50 bg-white p-1.5 shadow-sm dark:bg-card sm:w-auto">
              {filterOptions.map((option) => (
                <Button
                  key={option.label}
                  variant={filter === option.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onFilterChange(option.value)}
                  className={cn(
                    "h-8 shrink-0 rounded-full px-4 text-xs font-semibold transition-all",
                    filter === option.value
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm dark:bg-emerald-600 dark:text-white"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" className="h-11 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 gap-2" asChild>
                <Link href={buildCreateTradeHref(pathname)}>
                  <TrendingUp className="h-4 w-4" />
                  New Trade
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-11 rounded-full border-border/60 bg-white px-5 text-sm font-semibold shadow-sm gap-2 hover:bg-accent dark:bg-card" asChild>
                <Link href="/review">
                  <TrendingDown className="h-4 w-4" />
                  Review
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-11 rounded-full border-border/60 bg-white px-5 text-sm font-semibold shadow-sm gap-2 hover:bg-accent dark:bg-card" asChild>
                <Link href="/analytics">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Analytics
                </Link>
              </Button>
            </div>
          </div>

          {syncWarning ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-500">
              {syncWarning}
            </div>
          ) : null}

          <div className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {overview.insights.map((insight) => {
              const Icon = getInsightIcon(insight.title)
              
              const valueColor = insight.tone === 'positive' ? 'text-emerald-700 dark:text-emerald-400' : 
                                 insight.tone === 'warning' ? 'text-amber-700 dark:text-amber-400' : 
                                 'text-foreground';

              const titleColor = insight.tone === 'positive' ? 'text-emerald-700/80 dark:text-emerald-400/80' : 
                                 insight.tone === 'warning' ? 'text-amber-700/80 dark:text-amber-400/80' : 
                                 'text-muted-foreground';

              return (
                <div
                  key={insight.title}
                  className={cn(
                    "group relative rounded-[1.25rem] border p-5 transition-all hover:shadow-md",
                    toneClasses[insight.tone],
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", titleColor)}>
                      {insight.title}
                    </p>
                    <Icon className={cn("h-4 w-4", valueColor)} />
                  </div>
                  <p className={cn("mt-4 text-3xl font-bold tracking-tight", valueColor)}>{insight.value}</p>
                  <p className={cn("mt-2 text-xs font-medium leading-relaxed opacity-80", titleColor)}>
                    {insight.detail}
                  </p>
                </div>
              )
            })}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/60 bg-white p-7 shadow-sm dark:bg-card lg:row-span-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Current focus
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                </div>
              ) : (
                <p className="text-[13px] font-medium leading-relaxed text-foreground">{overview.focusMessage}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-9 shrink-0 gap-2 rounded-xl border-border/60 bg-white text-xs font-semibold shadow-sm dark:bg-card hover:bg-accent"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="mt-8 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Win rate</span>
                <span>{stats.winRate.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                <div 
                  className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
                  style={{ width: \`\${Math.max(0, Math.min(stats.winRate, 100))}%\` }}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-border/40 bg-[#fafafa] p-5 dark:bg-background/50">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Open book
                </p>
                <p className="mt-3 text-3xl font-bold text-foreground">{stats.openPositions}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {overview.openPositionsSummary.longCount} long / {overview.openPositionsSummary.shortCount} short
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-border/40 bg-[#fafafa] p-5 dark:bg-background/50">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Setup quality
                </p>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {overview.openPositionsSummary.avgRiskReward !== null
                    ? \`\${overview.openPositionsSummary.avgRiskReward.toFixed(1)}R\`
                    : "Clear"}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {overview.openPositionsSummary.highConfidenceCount} high-conviction ideas live
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              {sessionControl}
              <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs font-semibold hover:bg-accent" asChild>
                <Link href="/history">
                  <Clock3 className="h-4 w-4" />
                  History
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )`;

const startIndex = content.indexOf('  return (');
const endIndex = content.lastIndexOf('  )');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newBody + content.substring(endIndex + 3);
  fs.writeFileSync(file, content);
  console.log('Successfully updated component.');
} else {
  console.error('Could not find return statement.');
}
