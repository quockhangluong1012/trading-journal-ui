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
  BarChart3,
  ClipboardList,
  Wand2,
  Activity,
  Sparkles,
  Trophy,
  GitBranch,
  FileText,
  CalendarDays
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
        { title: "Backtest", url: "/backtest", icon: Activity },
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <Sidebar variant="inset" {...props}>
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
    </Sidebar>
  )
}
