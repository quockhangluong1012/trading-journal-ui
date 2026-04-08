"use client";

import Link from "link/next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Heart, 
  BarChart3, 
  Clock, 
  ClipboardCheck, 
  ListChecks, 
  LayoutDashboard 
} from "lucide-react";
import LinkComponent from "next/link"; // Workaround for strict import

export function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Staff Management", href: "/admin/staffs", icon: Users },
    { name: "Emotion Tags", href: "/admin/emotions", icon: Heart },
    { name: "Technical Analysis", href: "/admin/technical-analysis", icon: BarChart3 },
    { name: "Trading Zones", href: "/admin/trading-zones", icon: Clock },
    { name: "Checklist Models", href: "/admin/checklist-models", icon: ClipboardCheck },
    { name: "Pretrade Checklists", href: "/admin/pretrade-checklists", icon: ListChecks },
  ];

  return (
    <div className="w-64 border-r border-border min-h-[calc(100vh-65px)] bg-muted/20 p-4">
      <div className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <LinkComponent
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </LinkComponent>
          );
        })}
      </div>
    </div>
  );
}
