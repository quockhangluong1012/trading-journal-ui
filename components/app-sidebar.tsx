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
  FileText
} from "lucide-react"

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <TrendingUp className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Trading Journey</span>
                  <span className="truncate text-xs">Track & Improve</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  if (item.adminOnly && !user?.isAdmin) return null;
                  
                  const isActive = item.url === "/" 
                    ? pathname === item.url 
                    : pathname === item.url || pathname.startsWith(`${item.url}/`);

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
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
