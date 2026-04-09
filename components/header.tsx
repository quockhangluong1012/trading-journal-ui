"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
// import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  LayoutDashboard,
  History,
  Brain,
  Wrench,
  BarChart3,
  Settings2,
  // Sun,
  // Moon,
  LogOut,
  User,
  Bell,
  Activity,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Trade History", href: "/history", icon: History },
  { name: "Psychology", href: "/psychology", icon: Brain },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Backtest", href: "/backtest", icon: Activity },
  { name: "Review", href: "/review", icon: ClipboardList },
  { name: "Admin", href: "/admin", icon: Settings2 },
];

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
  // const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b border-border bg-card transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-2 sm:px-2 lg:px-2">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary transition-colors duration-300">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">
              Trading Journey
            </span>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {navigation.filter(item => {
                if (user?.isAdmin) {
                  return item.name === "Admin";
                }
                return item.name !== "Admin";
              }).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            {/* <div className="ml-2 h-6 w-px bg-border" /> */}
            {/* <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
              aria-label="Toggle theme"
            >
              {mounted ? (
                theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              ) : (
                <span className="h-4 w-4" />
              )}
            </button> */}

            {/* Avatar / Sign In */}
            <div className="ml-1 h-6 w-px bg-border" />
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
                    <div className="flex flex-col max-h-[300px] overflow-y-auto">
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
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
