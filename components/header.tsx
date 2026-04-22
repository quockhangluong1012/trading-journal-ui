"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Brain,
  ClipboardList,
  GitBranch,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  TrendingUp,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Trade History", href: "/history", icon: History },
  { name: "Psychology", href: "/psychology", icon: Brain },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Backtest", href: "/backtest", icon: Activity },
  { name: "Review", href: "/review", icon: ClipboardList },
  { name: "Admin", href: "/admin", icon: Settings2 },
];

function getVisibleNavigation(isAdmin?: boolean) {
  return navigation.filter((item) => item.name !== "Admin" || Boolean(isAdmin));
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
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleNavigation = getVisibleNavigation(user?.isAdmin);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-md transition-all duration-300 shadow-sm shadow-black/5 dark:shadow-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary transition-colors duration-300">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="truncate text-lg font-semibold text-foreground sm:text-xl">
              Trading Journey
            </span>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {visibleNavigation.map((item) => {
              const isActive = item.href === "/"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Notifications"
                    >
                      <Bell className="h-5 w-5" />
                      <span className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="flex flex-col max-h-75 overflow-y-auto">
                      <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-default">
                        <p className="text-sm font-medium">Welcome to Trading Journey</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">Start tracking your trades and improve your trading psychology using our tools.</p>
                        <p className="text-[10px] text-muted-foreground mt-1">2 hours ago</p>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-default">
                        <p className="text-sm font-medium">New Strategy Template</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">Check out the new smart money concepts strategy template in your strategies tab.</p>
                        <p className="text-[10px] text-muted-foreground mt-1">1 day ago</p>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="ml-1 hidden h-6 w-px bg-border sm:block" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 rounded-full outline-none ring-offset-background transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="Account menu"
                    >
                      <Avatar className="h-8 w-8 cursor-pointer">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {getInitials(user.username)}
                        </AvatarFallback>
                      </Avatar>
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
                    <DropdownMenuItem asChild>
                      <Link href="/setup" className="cursor-pointer">
                        <GitBranch className="mr-2 h-4 w-4" />
                        Setup
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings/pretrade-models" className="cursor-pointer">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Pre-trade models
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground sm:flex"
              >
                <User className="h-4 w-4" />
                <span>Sign in</span>
              </Link>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(20rem,85vw)] p-0">
                <SheetHeader className="border-b border-border px-4 py-4 text-left">
                  <SheetTitle className="flex items-center gap-3 text-base">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary transition-colors duration-300">
                      <TrendingUp className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-foreground">Trading Journey</span>
                  </SheetTitle>
                  <SheetDescription>
                    {user ? `Signed in as ${user.email}` : "Navigate your trading workspace."}
                  </SheetDescription>
                </SheetHeader>

                <div className="flex h-full flex-col gap-4 px-4 py-4">
                  <nav className="flex flex-col gap-1">
                    {visibleNavigation.map((item) => {
                      const isActive = item.href === "/"
                        ? pathname === item.href
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="mt-auto border-t border-border pt-4">
                    {user ? (
                      <>
                        <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/40 p-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                              {getInitials(user.username)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{user.username}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>

                        <Button asChild variant="outline" className="mb-3 w-full justify-start gap-2">
                          <Link href="/setup">
                            <GitBranch className="h-4 w-4" />
                            Setup
                          </Link>
                        </Button>

                        <Button asChild variant="outline" className="mb-3 w-full justify-start gap-2">
                          <Link href="/settings/pretrade-models">
                            <ClipboardList className="h-4 w-4" />
                            Pre-trade models
                          </Link>
                        </Button>

                        <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </Button>
                      </>
                    ) : (
                      <Button asChild className="w-full justify-start gap-2">
                        <Link href="/login">
                          <User className="h-4 w-4" />
                          Sign in
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
