"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { PsychologyCommandCenter } from "@/components/psychology/psychology-command-center";
import { PsychologyStats, SURFACE_CARD_CLASS } from "@/components/psychology/psychology-stats";
import { MoodTrendChart } from "@/components/psychology/psychology-charts";
import { EmotionWinRateChart, EmotionFrequencyChart, EmotionDistributionChart } from "@/components/psychology/psychology-charts";
import { PsychologyHeatmap } from "@/components/psychology/psychology-heatmap";
import { PsychologyCoachPanel, PatternGuideCard, ReflectionRoutineCard } from "@/components/psychology/psychology-coach-panel";
import { TiltGaugeWidget } from "@/components/psychology/tilt-gauge-widget";
import { TiltHistoryChart } from "@/components/psychology/tilt-history-chart";
import { StreakWidget } from "@/components/psychology/streak-widget";
import { JournalEntryCard, JournalEntriesSkeleton, type ApiJournalEntry } from "@/components/psychology/journal-entry";
import { NewEntryForm } from "@/components/psychology/new-entry-form";
import { useTrades } from "@/lib/trade-context";
import { type EmotionTagApi } from "@/lib/trade-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Download, FileText, Flame, Plus, Search } from "lucide-react";
import { type ApiPaginatedResponse, api } from "@/lib/api";
import {
  buildPsychologyNarrative, buildPsychologyPulse,
  filterJournalEntries, type PsychologyJournalFilter, type PsychologyStatsSnapshot,
} from "@/lib/psychology-overview";
import { getPlainTextFromRichText } from "@/lib/rich-text";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { buildRedirectWithNext } from "@/lib/auth-redirect";
import { AppShellLoader } from "@/components/app-shell-loader";

const JOURNAL_ARCHIVE_PAGE_SIZE = 10;
const JOURNAL_FETCH_PAGE_SIZE = 100;
const PSYCHOLOGY_TABS = ["overview", "journal", "patterns"] as const;
const PSYCHOLOGY_TAB_STORAGE_KEY = "trading-journal-psychology-tab";
const JOURNAL_FILTERS: ReadonlyArray<{ value: PsychologyJournalFilter; label: string }> = [
  { value: "all", label: "All entries" },
  { value: "recent", label: "Recent" },
  { value: "high-confidence", label: "High confidence" },
  { value: "needs-reset", label: "Needs reset" },
];

type PsychologyTabValue = (typeof PSYCHOLOGY_TABS)[number];

function isPsychologyTabValue(value: string | null): value is PsychologyTabValue {
  return PSYCHOLOGY_TABS.some((tab) => tab === value);
}

function PsychologyContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname));
    }
  }, [user, isAuthLoading, pathname, router]);

  const { trades } = useTrades();
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PsychologyTabValue>("overview");
  const [journalFilter, setJournalFilter] = useState<PsychologyJournalFilter>("all");
  const [archivePage, setArchivePage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [apiTags, setApiTags] = useState<EmotionTagApi[]>([]);
  const [journalEntries, setJournalEntries] = useState<ApiJournalEntry[]>([]);
  const [isLoadingJournals, setIsLoadingJournals] = useState(true);
  const { toast } = useToast();
  const [statsData, setStatsData] = useState<PsychologyStatsSnapshot | null>(null);

  useEffect(() => {
    try {
      const storedTab = window.localStorage.getItem(PSYCHOLOGY_TAB_STORAGE_KEY);
      if (isPsychologyTabValue(storedTab)) setActiveTab(storedTab);
    } catch { /* Ignore storage access failures. */ }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(PSYCHOLOGY_TAB_STORAGE_KEY, activeTab); } catch { /* Ignore */ }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/v1/dashboard/statistic");
      if (res.data.isSuccess) setStatsData(res.data.value);
    } catch (err) { console.error("Failed to fetch psychology stats:", err); }
  };

  const fetchJournals = async () => {
    setIsLoadingJournals(true);
    try {
      const allEntries: ApiJournalEntry[] = [];
      let nextPage = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await api.post<ApiPaginatedResponse<ApiJournalEntry>>("/v1/psychology-journals/search", {
          page: nextPage, pageSize: JOURNAL_FETCH_PAGE_SIZE, overallMood: null, confidentLevel: null, emotionTags: null,
        });
        if (!res.data.isSuccess) break;
        allEntries.push(...(res.data.value.values ?? []));
        hasMore = Boolean(res.data.value.hasMore);
        nextPage += 1;
      }
      setJournalEntries(allEntries);
      setArchivePage(1);
    } catch (err) { console.error("Failed to fetch journals:", err); }
    finally { setIsLoadingJournals(false); }
  };

  useEffect(() => {
    if (isAuthLoading || !user) return;
    api.get("/v1/emotions").then((res) => res.data).then((data) => { if (data.isSuccess) setApiTags(data.value); })
      .catch((err) => console.error("Failed to fetch API tags:", err));
    fetchJournals();
    fetchStats();
  }, [isAuthLoading, user]);

  const sortedEntries = useMemo(() => filterJournalEntries(journalEntries, "all"), [journalEntries]);
  const filteredEntries = useMemo(() => {
    let entries = filterJournalEntries(journalEntries, journalFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter((e) =>
        getPlainTextFromRichText(e.todayTradingReview).toLowerCase().includes(q) ||
        e.emotionTags.some((tag) => tag.name.toLowerCase().includes(q))
      );
    }
    if (moodFilter !== "all") entries = entries.filter((e) => e.overallMood === parseInt(moodFilter, 10));
    if (confidenceFilter !== "all") entries = entries.filter((e) => e.confidentLevel === parseInt(confidenceFilter, 10));
    return entries;
  }, [journalEntries, journalFilter, searchQuery, moodFilter, confidenceFilter]);

  const paginatedFilteredEntries = useMemo(() => {
    const startIndex = (archivePage - 1) * JOURNAL_ARCHIVE_PAGE_SIZE;
    return filteredEntries.slice(startIndex, startIndex + JOURNAL_ARCHIVE_PAGE_SIZE);
  }, [archivePage, filteredEntries]);

  const latestEntry = sortedEntries[0] ?? null;
  const narrative = useMemo(() => buildPsychologyNarrative({ stats: statsData, entries: sortedEntries }), [statsData, sortedEntries]);
  const pulseCards = useMemo(() => buildPsychologyPulse(statsData, sortedEntries), [statsData, sortedEntries]);
  const journalFilterCounts = useMemo(() => ({
    all: sortedEntries.length,
    recent: filterJournalEntries(sortedEntries, "recent").length,
    "high-confidence": filterJournalEntries(sortedEntries, "high-confidence").length,
    "needs-reset": filterJournalEntries(sortedEntries, "needs-reset").length,
  }), [sortedEntries]);

  const totalArchivePages = Math.max(1, Math.ceil(filteredEntries.length / JOURNAL_ARCHIVE_PAGE_SIZE));
  const archiveStart = filteredEntries.length === 0 ? 0 : (archivePage - 1) * JOURNAL_ARCHIVE_PAGE_SIZE + 1;
  const archiveEnd = Math.min(archivePage * JOURNAL_ARCHIVE_PAGE_SIZE, filteredEntries.length);
  const activeFilterLabel = JOURNAL_FILTERS.find((f) => f.value === journalFilter)?.label ?? "All entries";

  useEffect(() => { setArchivePage(1); }, [journalFilter, searchQuery, moodFilter, confidenceFilter]);
  useEffect(() => { if (archivePage > totalArchivePages) setArchivePage(totalArchivePages); }, [archivePage, totalArchivePages]);

  const handleDeleteEntry = async (id: number) => {
    try {
      await api.delete(`/v1/psychology-journals/${id}`);
      toast({ title: "Entry deleted", description: "The journal entry was successfully removed." });
      fetchJournals(); fetchStats();
    } catch (err) {
      toast({ title: "Failed to delete", description: "There was an error deleting your entry.", variant: "destructive" });
      console.error("Failed to delete journal:", err);
    }
  };

  const handleExport = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      psychologyEntries: sortedEntries,
      tradeEmotionData: trades
        .filter((trade) => trade.emotionTags?.length || trade.confidenceLevel || trade.psychologyNotes)
        .map((trade) => ({ tradeId: trade.id, asset: trade.asset, date: trade.date, emotionTags: trade.emotionTags, confidenceLevel: trade.confidenceLevel, psychologyNotes: trade.psychologyNotes, pnl: trade.pnl, status: trade.status })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `trading-psychology-${new Date().toISOString().split("T")[0]}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveEntry = () => { setNewEntryOpen(false); fetchJournals(); fetchStats(); };

  if (isAuthLoading) return <AppShellLoader title="Loading psychology" description="Gathering your mental game data." />;
  if (!user) return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="space-y-6">
          <PsychologyCommandCenter
            narrative={narrative} pulseCards={pulseCards} journalEntriesCount={sortedEntries.length} latestEntry={latestEntry}
            exportAction={
              <Button variant="outline" size="default" className="gap-2 rounded-full border-border/70 bg-background/50 shadow-sm backdrop-blur-md transition-all hover:bg-accent/50" onClick={handleExport}>
                <Download className="h-4 w-4" /> Export data
              </Button>
            }
            onOpenNewEntry={() => setNewEntryOpen(true)}
            onOpenJournal={() => setActiveTab("journal")}
            onOpenPatterns={() => setActiveTab("patterns")}
          />

          <Tabs value={activeTab} onValueChange={(v) => { if (isPsychologyTabValue(v)) setActiveTab(v); }} className="space-y-6">
            <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-1">
              <TabsTrigger value="overview" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><Brain className="h-3.5 w-3.5" />Overview</TabsTrigger>
              <TabsTrigger value="journal" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><FileText className="h-3.5 w-3.5" />Journal</TabsTrigger>
              <TabsTrigger value="patterns" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><Flame className="h-3.5 w-3.5" />Patterns</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <PsychologyStats statsData={statsData} />
              <div className="grid gap-6 lg:grid-cols-2">
                <TiltGaugeWidget />
                <StreakWidget />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <MoodTrendChart />
                <TiltHistoryChart />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <PsychologyCoachPanel statsData={statsData} journalEntries={sortedEntries} onOpenJournal={() => setActiveTab("journal")} onOpenPatterns={() => setActiveTab("patterns")} />
                <PsychologyHeatmap />
              </div>
            </TabsContent>

            <TabsContent value="journal" className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
                <ReflectionRoutineCard onOpenNewEntry={() => setNewEntryOpen(true)} />
                <Card className={SURFACE_CARD_CLASS}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <CardTitle className="text-lg text-foreground">Journal archive</CardTitle>
                        <CardDescription className="text-muted-foreground">{activeFilterLabel} · {filteredEntries.length} total reflection{filteredEntries.length === 1 ? "" : "s"}</CardDescription>
                      </div>
                      <Button size="sm" className="gap-2" onClick={() => setNewEntryOpen(true)}><Plus className="h-4 w-4" />Add entry</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search reflections or tags..." className="pl-8 bg-background/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <Select value={moodFilter} onValueChange={setMoodFilter}>
                          <SelectTrigger className="w-[140px] bg-background/50"><SelectValue placeholder="Mood" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Moods</SelectItem>
                            <SelectItem value="5">Excellent</SelectItem><SelectItem value="4">Good</SelectItem>
                            <SelectItem value="3">Neutral</SelectItem><SelectItem value="2">Low</SelectItem><SelectItem value="1">Very Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                          <SelectTrigger className="w-[140px] bg-background/50"><SelectValue placeholder="Confidence" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Confidence</SelectItem>
                            <SelectItem value="5">Locked in</SelectItem><SelectItem value="4">Strong</SelectItem>
                            <SelectItem value="3">Balanced</SelectItem><SelectItem value="2">Tentative</SelectItem><SelectItem value="1">Fragile</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {JOURNAL_FILTERS.map((filter) => (
                        <Button key={filter.value} variant={journalFilter === filter.value ? "default" : "outline"} size="sm" className="gap-2 rounded-xl" onClick={() => setJournalFilter(filter.value)}>
                          {filter.label}
                          <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">{journalFilterCounts[filter.value]}</span>
                        </Button>
                      ))}
                    </div>
                    {isLoadingJournals ? <JournalEntriesSkeleton /> : filteredEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/60 px-6 py-12 text-center">
                        <Brain className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-foreground">{sortedEntries.length === 0 ? "No journal entries yet" : `No ${activeFilterLabel.toLowerCase()} reflections`}</p>
                        <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{sortedEntries.length === 0 ? "Start journaling to track your mental state." : "Try another filter or log a fresh reflection."}</p>
                        <Button size="sm" className="mt-4 gap-2" onClick={() => setNewEntryOpen(true)}><Plus className="h-4 w-4" />{sortedEntries.length === 0 ? "Create first entry" : "Add new entry"}</Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {paginatedFilteredEntries.map((entry) => <JournalEntryCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} />)}
                        {filteredEntries.length > JOURNAL_ARCHIVE_PAGE_SIZE ? (
                          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">Showing {archiveStart} to {archiveEnd} of {filteredEntries.length} reflections</p>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => setArchivePage((p) => Math.max(1, p - 1))} disabled={archivePage === 1 || isLoadingJournals}>Previous</Button>
                              <Button variant="outline" size="sm" onClick={() => setArchivePage((p) => Math.min(totalArchivePages, p + 1))} disabled={archivePage >= totalArchivePages || isLoadingJournals}>Next</Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <EmotionWinRateChart />
                <EmotionFrequencyChart />
                <EmotionDistributionChart />
                <PatternGuideCard onOpenJournal={() => setActiveTab("journal")} />
              </div>
            </TabsContent>
          </Tabs>

          <Dialog open={newEntryOpen} onOpenChange={setNewEntryOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
              <DialogHeader>
                <DialogTitle>New Psychology Entry</DialogTitle>
                <DialogDescription>Log your emotional state and reflect on your trading mindset while the session is still fresh.</DialogDescription>
              </DialogHeader>
              <NewEntryForm apiTags={apiTags} onSave={handleSaveEntry} onCancel={() => setNewEntryOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

export default function PsychologyPage() {
  return <PsychologyContent />;
}
