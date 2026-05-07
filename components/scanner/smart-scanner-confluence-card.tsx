"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Radar, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { scannerApi, type SmartScannerConfluenceDto } from "@/lib/scanner-api";
import { cn } from "@/lib/utils";

interface SmartScannerConfluenceCardProps {
  symbols: string[];
}

const riskLevelStyles: Record<string, string> = {
  green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  yellow: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  red: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  unavailable: "border-border/70 bg-secondary/20 text-muted-foreground",
};

function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z]/g, "");
}

export function SmartScannerConfluenceCard({ symbols }: SmartScannerConfluenceCardProps) {
  const uniqueSymbols = useMemo(
    () => [...new Set(symbols.map(normalizeSymbol).filter((symbol) => symbol.length >= 6))],
    [symbols],
  );
  const [selectedSymbol, setSelectedSymbol] = useState(uniqueSymbols[0] ?? "EURUSD");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SmartScannerConfluenceDto | null>(null);

  useEffect(() => {
    if (uniqueSymbols.length === 0) {
      return;
    }

    setSelectedSymbol((current) => (uniqueSymbols.includes(normalizeSymbol(current)) ? current : uniqueSymbols[0]));
  }, [uniqueSymbols]);

  const handleAnalyze = async () => {
    const symbol = normalizeSymbol(selectedSymbol);
    if (!symbol) {
      setError("Enter a symbol like EURUSD to analyze confluence.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setResult(await scannerApi.getSmartConfluence(symbol));
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Smart scanner confluence is unavailable right now.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/15 bg-linear-to-br from-primary/5 via-background to-background shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Radar className="h-4 w-4 text-primary" />
          Smart scanner confluence
        </CardTitle>
        <CardDescription>
          Group multi-timeframe confirmations for one symbol and overlay the nearby economic-risk state.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uniqueSymbols.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {uniqueSymbols.map((symbol) => {
              const isActive = normalizeSymbol(selectedSymbol) === symbol;
              return (
                <Button
                  key={symbol}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSymbol(symbol)}
                  className="rounded-full"
                >
                  {symbol}
                </Button>
              );
            })}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            value={selectedSymbol}
            aria-label="Smart scanner symbol"
            onChange={(event) => setSelectedSymbol(event.target.value)}
            placeholder="EURUSD"
            className="border-primary/20 bg-background lg:max-w-xs"
          />
          <Button type="button" variant="outline" onClick={() => void handleAnalyze()} disabled={isLoading} className="gap-2 lg:w-auto">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isLoading ? "Analyzing..." : "Analyze confluence"}
          </Button>
        </div>

        {error ? <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {result ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  riskLevelStyles[result.economicRiskState.toLowerCase()] ?? riskLevelStyles.unavailable,
                )}
              >
                {result.economicRiskState} event risk
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background text-muted-foreground">
                Max score {result.maxConfluenceScore}
              </Badge>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
              <p className="text-sm text-foreground">{result.economicRiskMessage}</p>
            </div>

            {result.candidates.length > 0 ? (
              <div className="space-y-3">
                {result.candidates.map((candidate) => {
                  const latestSignal = candidate.signals[0];

                  return (
                    <div key={`${candidate.patternType}-${candidate.confluenceScore}`} className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{candidate.patternType}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {candidate.confirmingTimeframes.join(", ")} confirming
                          </p>
                        </div>
                        <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                          Score {candidate.confluenceScore}
                        </Badge>
                      </div>

                      {latestSignal ? (
                        <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/5 p-3">
                          <p className="text-xs font-medium text-foreground">{latestSignal.description}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {latestSignal.timeframe} at {latestSignal.priceAtDetection.toFixed(5)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                No scanner candidate is meeting the current minimum confluence threshold.
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}