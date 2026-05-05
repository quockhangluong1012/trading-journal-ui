"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { buildRedirectWithNext } from "@/lib/auth-redirect";
import { AppShellLoader } from "@/components/app-shell-loader";
import {
  getDailyNotes,
  getDailyNote,
  upsertDailyNote,
  type DailyNoteSummaryDto,
  type DailyNoteDto,
  type UpsertDailyNoteRequest,
} from "@/lib/daily-notes-api";
import { DailyNotesDialog } from "@/components/dashboard/daily-notes-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Clock,
  Brain,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Sparkles,
  ListFilter,
  FileText,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────

function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekRange(refDate: Date): { start: Date; end: Date; label: string } {
  const d = new Date(refDate);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { start, end, label: `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}` };
}

function getMonthRange(refDate: Date): { start: Date; end: Date; label: string } {
  const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
  return {
    start,
    end,
    label: refDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}

function shiftWeek(refDate: Date, delta: number): Date {
  const d = new Date(refDate);
  d.setDate(d.getDate() + delta * 7);
  return d;
}

function shiftMonth(refDate: Date, delta: number): Date {
  const d = new Date(refDate);
  d.setMonth(d.getMonth() + delta);
  return d;
}

const biasConfig: Record<string, { icon: typeof TrendingUp; label: string; cls: string }> = {
  Bullish: { icon: TrendingUp, label: "Bullish", cls: "text-emerald-600 dark:text-emerald-400" },
  Bearish: { icon: TrendingDown, label: "Bearish", cls: "text-red-500 dark:text-red-400" },
  Neutral: { icon: Minus, label: "Neutral", cls: "text-amber-500 dark:text-amber-400" },
};

const riskCls: Record<string, string> = {
  Conservative: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Normal: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Aggressive: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

// ─── Note Card ────────────────────────────────────────────────────────

function NoteCard({
  note,
  onView,
}: {
  note: DailyNoteSummaryDto;
  onView: () => void;
}) {
  const bias = biasConfig[note.dailyBias];
  const BiasIcon = bias?.icon;
  const sessions = note.sessionFocus ? note.sessionFocus.split(",").filter(Boolean) : [];
  const dateObj = new Date(note.noteDate + "T00:00:00");
  const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short" });
  const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <button
      type="button"
      onClick={onView}
      className="group relative w-full overflow-hidden rounded-2xl border border-border/70
        bg-gradient-to-br from-background via-background to-background
        p-4 text-left transition-all duration-300
        hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      id={`daily-note-card-${note.id}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-accent/3 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start gap-4">
        {/* Date pill */}
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{dayLabel}</span>
          <span className="text-lg font-bold leading-tight">{dateObj.getDate()}</span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{dateLabel}</span>
            <Badge variant="outline" className="border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              {note.filledFieldsCount}/8 fields
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {bias && BiasIcon && (
              <Badge variant="outline" className="gap-1 border-border/50 bg-background/80">
                <BiasIcon className={`h-3 w-3 ${bias.cls}`} />
                <span className="text-xs">{bias.label}</span>
              </Badge>
            )}
            {note.riskAppetite && riskCls[note.riskAppetite] && (
              <Badge variant="outline" className={`text-xs ${riskCls[note.riskAppetite]}`}>
                <Shield className="mr-1 h-3 w-3" />
                {note.riskAppetite}
              </Badge>
            )}
            {sessions.length > 0 && (
              <Badge variant="outline" className="gap-1 border-border/50 bg-background/80">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">{sessions.join(", ")}</span>
              </Badge>
            )}
          </div>

          {note.mentalState && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              <Brain className="mr-1 inline h-3 w-3" />
              {note.mentalState}
            </p>
          )}
        </div>

        <Eye className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:text-primary" />
      </div>
    </button>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────

function NoteDetailPanel({
  note,
  onClose,
  onEdit,
}: {
  note: DailyNoteDto;
  onClose: () => void;
  onEdit: () => void;
}) {
  const dateObj = new Date(note.noteDate + "T00:00:00");
  const fullDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const bias = biasConfig[note.dailyBias];
  const BiasIcon = bias?.icon;

  const sections = [
    { label: "Market Structure Notes", icon: TrendingUp, value: note.marketStructureNotes },
    { label: "Key Levels & Liquidity", icon: Compass, value: note.keyLevelsAndLiquidity },
    { label: "News & Events", icon: FileText, value: note.newsAndEvents },
    { label: "Mental State & Mindset", icon: Brain, value: note.mentalState },
    { label: "Key Rules & Reminders", icon: ListFilter, value: note.keyRulesAndReminders },
  ];

  return (
    <Card className="sticky top-8 rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-primary/3 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary gap-1.5">
            <Sparkles className="h-3 w-3" />
            Daily Note
          </Badge>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
        <CardTitle className="text-xl">{fullDate}</CardTitle>
        <div className="flex flex-wrap gap-2 pt-1">
          {bias && BiasIcon && (
            <Badge variant="outline" className="gap-1 border-border/50">
              <BiasIcon className={`h-3 w-3 ${bias.cls}`} />
              {bias.label}
            </Badge>
          )}
          {note.riskAppetite && (
            <Badge variant="outline" className={riskCls[note.riskAppetite] || ""}>
              <Shield className="mr-1 h-3 w-3" />
              {note.riskAppetite}
            </Badge>
          )}
          {note.sessionFocus && (
            <Badge variant="outline" className="gap-1 border-border/50">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {note.sessionFocus.split(",").filter(Boolean).join(", ")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((s) => {
          if (!s.value?.trim()) return null;
          const Icon = s.icon;
          return (
            <div key={s.label} className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {s.label}
              </p>
              <p className="whitespace-pre-wrap rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                {s.value}
              </p>
            </div>
          );
        })}
        <Button onClick={onEdit} className="w-full gap-2 mt-2">
          Edit Note
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Weekly/Monthly Review Summary ────────────────────────────────────

function ReviewSummary({ notes }: { notes: DailyNoteSummaryDto[] }) {
  const totalNotes = notes.length;
  const biasCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => { if (n.dailyBias) counts[n.dailyBias] = (counts[n.dailyBias] || 0) + 1; });
    return counts;
  }, [notes]);
  const riskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => { if (n.riskAppetite) counts[n.riskAppetite] = (counts[n.riskAppetite] || 0) + 1; });
    return counts;
  }, [notes]);
  const avgFields = totalNotes > 0 ? (notes.reduce((s, n) => s + n.filledFieldsCount, 0) / totalNotes).toFixed(1) : "0";
  const dominantBias = Object.entries(biasCounts).sort((a, b) => b[1] - a[1])[0];

  if (totalNotes === 0) return null;

  return (
    <Card className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          Period Summary
        </CardTitle>
        <CardDescription>{totalNotes} note{totalNotes !== 1 ? "s" : ""} · avg {avgFields}/8 fields</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/40 bg-background/60 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalNotes}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/60 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{avgFields}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Fields</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/60 p-3 text-center">
            <p className="text-lg font-bold text-primary">{dominantBias ? dominantBias[0] : "—"}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Top Bias</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/60 p-3 text-center">
            <div className="flex flex-wrap justify-center gap-1">
              {Object.entries(riskCounts).map(([r, c]) => (
                <Badge key={r} variant="outline" className={`text-[10px] ${riskCls[r] || ""}`}>
                  {r} ({c})
                </Badge>
              ))}
              {Object.keys(riskCounts).length === 0 && <span className="text-lg font-bold text-primary">—</span>}
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-1">Risk Split</p>
          </div>
        </div>

        {/* Bias breakdown bar */}
        {totalNotes > 0 && Object.keys(biasCounts).length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bias Distribution</p>
            <div className="flex h-3 overflow-hidden rounded-full">
              {Object.entries(biasCounts).map(([b, c]) => {
                const pct = (c / totalNotes) * 100;
                const color = b === "Bullish" ? "bg-emerald-500" : b === "Bearish" ? "bg-red-500" : "bg-amber-500";
                return <div key={b} className={`${color} transition-all`} style={{ width: `${pct}%` }} title={`${b}: ${c}`} />;
              })}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              {Object.entries(biasCounts).map(([b, c]) => (
                <span key={b}>{b}: {c} ({((c / totalNotes) * 100).toFixed(0)}%)</span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

function DailyNotesContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthLoading && !user) router.replace(buildRedirectWithNext("/login", pathname));
  }, [user, isAuthLoading, pathname, router]);

  const [viewMode, setViewMode] = useState<"all" | "week" | "month">("all");
  const [refDate, setRefDate] = useState(() => new Date());
  const [notes, setNotes] = useState<DailyNoteSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<DailyNoteDto | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const range = useMemo(() => {
    if (viewMode === "week") return getWeekRange(refDate);
    if (viewMode === "month") return getMonthRange(refDate);
    return null;
  }, [viewMode, refDate]);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = range ? toDateOnly(range.start) : undefined;
      const endDate = range ? toDateOnly(range.end) : undefined;
      const res = await getDailyNotes(startDate, endDate);
      if (res.data.isSuccess) setNotes(res.data.value ?? []);
    } catch (err) {
      console.error("Failed to fetch daily notes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (!isAuthLoading && user) fetchNotes();
  }, [isAuthLoading, user, fetchNotes]);

  const handleViewNote = useCallback(async (noteDate: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await getDailyNote(noteDate);
      if (res.data.isSuccess && res.data.value) setSelectedNote(res.data.value);
    } catch (err) {
      console.error("Failed to fetch note detail:", err);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const handleSave = useCallback(async (data: UpsertDailyNoteRequest) => {
    setIsSaving(true);
    try {
      const res = await upsertDailyNote(data);
      if (res.data.isSuccess) {
        setSelectedNote(res.data.value);
        setEditDialogOpen(false);
        fetchNotes();
        return res.data.value;
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [fetchNotes]);

  const handlePrev = () => setRefDate((d) => (viewMode === "week" ? shiftWeek(d, -1) : shiftMonth(d, -1)));
  const handleNext = () => setRefDate((d) => (viewMode === "week" ? shiftWeek(d, 1) : shiftMonth(d, 1)));
  const handleToday = () => setRefDate(new Date());

  if (isAuthLoading) return <AppShellLoader title="Loading" description="Preparing your daily notes." />;
  if (!user) return <AppShellLoader title="Redirecting" description="Taking you to login." />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary" />
                Daily Notes
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Review your trading preparation notes — daily, weekly, or monthly.
              </p>
            </div>
          </div>

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as "all" | "week" | "month"); setRefDate(new Date()); }} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="grid h-auto w-fit grid-cols-3 gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-1">
                <TabsTrigger value="all" className="gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm">
                  <ListFilter className="h-3.5 w-3.5" />All
                </TabsTrigger>
                <TabsTrigger value="week" className="gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm">
                  <CalendarDays className="h-3.5 w-3.5" />Week
                </TabsTrigger>
                <TabsTrigger value="month" className="gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm">
                  <CalendarRange className="h-3.5 w-3.5" />Month
                </TabsTrigger>
              </TabsList>

              {/* Period navigation */}
              {viewMode !== "all" && range && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[180px] text-center text-sm font-medium text-foreground">
                    {range.label}
                  </span>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={handleNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={handleToday}>
                    Today
                  </Button>
                </div>
              )}
            </div>

            {/* Review Summary (week/month) */}
            <TabsContent value="week"><ReviewSummary notes={notes} /></TabsContent>
            <TabsContent value="month"><ReviewSummary notes={notes} /></TabsContent>
            <TabsContent value="all"><span /></TabsContent>
          </Tabs>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notes.length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-border/70 bg-background/60">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays className="mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground">No daily notes found</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {viewMode === "all"
                    ? "Start your daily briefing from the Dashboard to see notes here."
                    : `No notes for this ${viewMode}. Try a different period.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
              {/* Notes list */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {notes.length} note{notes.length !== 1 ? "s" : ""}
                </p>
                {notes.map((n) => (
                  <NoteCard key={n.id} note={n} onView={() => handleViewNote(n.noteDate)} />
                ))}
              </div>

              {/* Detail panel */}
              <div className="hidden lg:block">
                {isLoadingDetail ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : selectedNote ? (
                  <NoteDetailPanel
                    note={selectedNote}
                    onClose={() => setSelectedNote(null)}
                    onEdit={() => setEditDialogOpen(true)}
                  />
                ) : (
                  <Card className="sticky top-8 rounded-2xl border border-dashed border-border/50 bg-background/60">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                      <Eye className="mb-3 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-foreground">Select a note</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Click on any note card to view its full details here.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Edit Dialog (reuses existing component) */}
        <DailyNotesDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          note={selectedNote}
          isSaving={isSaving}
          onSave={handleSave}
          onDismiss={() => setEditDialogOpen(false)}
        />
      </main>
    </div>
  );
}

export default function DailyNotesPage() {
  return <DailyNotesContent />;
}
