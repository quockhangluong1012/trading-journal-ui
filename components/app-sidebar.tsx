"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  History,
  Brain,
  BookOpen,
  Radar,
  Shield,
  Settings2,
  TrendingUp,
  BarChart3,
  ClipboardList,
  Wand2,
  Sparkles,
  Trophy,
  GitBranch,
  FileText,
  CalendarDays
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"

const data = {
  navMain: [
    {
      title: "Main",
      items: [
        { title: "Dashboard", url: "/", icon: LayoutDashboard },
        { title: "Scanner", url: "/scanner", icon: Radar },
      ],
    },
    {
      title: "Trading",
      items: [
        { title: "Trade History", url: "/history", icon: History },
        { title: "Setup", url: "/setup", icon: GitBranch },
        { title: "Templates", url: "/trade/templates", icon: FileText },
        { title: "Playbook", url: "/playbook", icon: BookOpen },
      ],
    },
    {
      title: "Analysis",
      items: [
        { title: "Analytics", url: "/analytics", icon: BarChart3 },
        { title: "Review", url: "/review", icon: ClipboardList },
        { title: "Review Wizard", url: "/review/wizard", icon: Wand2 },
      ],
    },
    {
      title: "Psychology & Risk",
      items: [
        { title: "Psychology", url: "/psychology", icon: Brain },
        { title: "Daily Notes", url: "/daily-notes", icon: CalendarDays },
        { title: "Risk Management", url: "/risk", icon: Shield },
        { title: "Karma & Badges", url: "/karma", icon: Trophy },
      ],
    },
    {
      title: "Education",
      items: [
        { title: "Lessons", url: "/lessons", icon: BookOpen },
        { title: "AI Coach", url: "/coach", icon: Sparkles },
      ],
    },
    {
      title: "Settings",
      items: [
        { title: "Pre-trade models", url: "/settings/pretrade-models", icon: ClipboardList },
        { title: "Admin", url: "/admin", icon: Settings2, adminOnly: true },
      ],
    },
  ],
}

function getInitials(name: string): string {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase())
    .join("")
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="gap-4 px-3 pb-3 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-auto rounded-[1.35rem] border border-sidebar-border/80 bg-sidebar-accent/40 p-3 shadow-sm transition-all hover:bg-sidebar-accent/70"
            >
              <Link href="/">
                <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-sidebar-primary/12 text-sidebar-primary shadow-sm shadow-sidebar-primary/15">
                  <TrendingUp className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/65">
                    Trading Journey
                  </span>
                  <span className="truncate text-sm font-semibold text-sidebar-foreground">Market Workspace</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className="rounded-full bg-sidebar-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-primary hover:bg-sidebar-primary/12">
                      Focus
                    </Badge>
                    <span className="truncate text-xs text-sidebar-foreground/70">Track, review, improve</span>
                  </div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-1">
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title} className="py-1">
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/55">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  if (item.adminOnly && !user?.isAdmin) return null;
                  
                  const isActive = item.url === "/" 
                    ? pathname === item.url 
                    : pathname === item.url || pathname.startsWith(`${item.url}/`);

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className="h-10 rounded-xl px-3 text-[13px] font-medium text-sidebar-foreground/82 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-sidebar-primary data-[active=true]:shadow-sm"
                      >
                        <Link href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="px-3 pb-3 pt-2">
        <div className="rounded-[1.35rem] border border-sidebar-border/75 bg-sidebar-accent/35 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-sidebar-border/70">
              <AvatarFallback className="bg-sidebar-primary/12 text-sidebar-primary text-xs font-semibold">
                {getInitials(user?.username ?? "Trader")}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {user?.username ?? "Guest"}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/65">
                {user?.isAdmin ? "Administrator" : "Trading workspace"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-sidebar-border/70 bg-sidebar/70 px-3 py-2 text-xs">
            <span className="text-sidebar-foreground/65">Sidebar toggle</span>
            <span className="font-medium text-sidebar-foreground">Ctrl+B</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
