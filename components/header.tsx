"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DailyNotesBanner } from "@/components/dashboard/daily-notes-banner";
import { DailyNotesDialog } from "@/components/dashboard/daily-notes-dialog";
import { NotificationPanel } from "./notifications/notification-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { useDailyNotes } from "@/hooks/use-daily-notes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

const routeLabels: Record<string, string> = {
  analytics: "Analytics",
  admin: "Admin Portal",
  backtest: "Backtest",
  coach: "AI Coach",
  "daily-notes": "Daily Notes",
  history: "Trade History",
  karma: "Karma",
  lessons: "Lessons",
  playbook: "Playbook",
  psychology: "Psychology",
  review: "Review",
  risk: "Risk",
  scanner: "Scanner",
  settings: "Settings",
  setup: "Setups",
  trade: "Trade Workspace",
  "trade/live": "Live Trade",
};

function formatSectionLabel(pathname: string): string {
  if (pathname === "/") {
    return "Dashboard";
  }

  // Check exact path match first (e.g. /trade/live)
  const pathWithoutLeadingSlash = pathname.replace(/^\//, "");
  if (routeLabels[pathWithoutLeadingSlash]) {
    return routeLabels[pathWithoutLeadingSlash];
  }

  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) {
    return "Workspace";
  }

  return routeLabels[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

function getInitials(name: string): string {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const sectionLabel = formatSectionLabel(pathname);
  const isAdminRoute = pathname.startsWith("/admin");
  const [isDailyNotesDialogOpen, setIsDailyNotesDialogOpen] = useState(false);
  const isBacktestSessionPage = /^\/backtest\/\d+/.test(pathname);
  const shouldShowTradingPlan = Boolean(user) && !isAdminRoute && pathname !== "/" && !isBacktestSessionPage;
  const dailyNotes = useDailyNotes(shouldShowTradingPlan ? user?.email ?? user?.username ?? null : null);

  return (
    <>
      <header className="z-50 border-b border-border/60 bg-background/72 backdrop-blur-xl transition-all duration-300 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
        <div className="px-4 py-3 md:px-6">
          <div className="flex min-h-11 items-center gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {!isAdminRoute && (
                <SidebarTrigger className="size-9 rounded-full border border-border/70 bg-background/75 shadow-sm hover:bg-accent/60" />
              )}
              <span className="truncate text-sm font-semibold text-foreground">{sectionLabel}</span>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-md lg:flex">
                <span className={cn("h-2 w-2 rounded-full", isAdminRoute ? "bg-amber-500" : "bg-emerald-500")} />
                {isAdminRoute ? "Staff workspace" : "Workspace synced"}
              </div>

              <ThemeToggle />

              {user ? (
                <div className="flex items-center gap-2">
                  <NotificationPanel />

                  <div className="hidden h-6 w-px bg-border sm:block" />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-1.5 py-1 pr-3 outline-none ring-offset-background transition-all hover:border-primary/20 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Account menu"
                      >
                        <Avatar className="h-8 w-8 cursor-pointer">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                            {getInitials(user.username)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="hidden text-left md:block">
                          <p className="max-w-28 truncate text-sm font-semibold text-foreground">
                            {user.username}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {user.isAdmin ? "Administrator" : "Trader"}
                          </p>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold leading-none">
                            {user.username}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button asChild variant="outline" size="sm" className="rounded-full border-border/70 bg-background/75 backdrop-blur-md">
                  <Link href="/login" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Sign in
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {shouldShowTradingPlan ? (
            <div className="mt-3 border-t border-border/50 pt-3">
              <DailyNotesBanner
                note={dailyNotes.note}
                isLoading={dailyNotes.isLoading}
                onClick={() => setIsDailyNotesDialogOpen(true)}
              />
            </div>
          ) : null}
        </div>
      </header>

      {shouldShowTradingPlan ? (
        <DailyNotesDialog
          open={isDailyNotesDialogOpen}
          onOpenChange={setIsDailyNotesDialogOpen}
          note={dailyNotes.note}
          isSaving={dailyNotes.isSaving}
          onSave={dailyNotes.save}
          onDismiss={dailyNotes.dismissPopup}
        />
      ) : null}
    </>
  );
}
