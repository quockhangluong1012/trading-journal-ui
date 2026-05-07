"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationPanel } from "./notifications/notification-panel";
import { ThemeToggle } from "@/components/theme-toggle";
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
};

function formatSectionLabel(pathname: string): string {
  if (pathname === "/") {
    return "Dashboard";
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

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/72 backdrop-blur-xl transition-all duration-300 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
      <div className="flex min-h-17 items-center gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <SidebarTrigger className="size-9 rounded-full border border-border/70 bg-background/75 shadow-sm hover:bg-accent/60" />

          <div className="hidden min-w-0 items-center gap-3 md:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm shadow-primary/10">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Trading Journey
              </p>
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{sectionLabel}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    isAdminRoute
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
                  )}
                >
                  {isAdminRoute ? "Admin" : "Live"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="min-w-0 md:hidden">
            <span className="truncate text-sm font-semibold text-foreground">{sectionLabel}</span>
          </div>
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
    </header>
  );
}
