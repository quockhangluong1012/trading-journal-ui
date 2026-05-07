"use client";
"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSidebar = AppSidebar;
var React = require("react");
var link_1 = require("next/link");
var navigation_1 = require("next/navigation");
var lucide_react_1 = require("lucide-react");
var sidebar_1 = require("@/components/ui/sidebar");
var auth_context_1 = require("@/lib/auth-context");
var data = {
    navMain: [
        {
            title: "Main",
            items: [
                { title: "Dashboard", url: "/", icon: lucide_react_1.LayoutDashboard },
                { title: "Scanner", url: "/scanner", icon: lucide_react_1.Radar },
            ],
        },
        {
            title: "Trading",
            items: [
                { title: "Trade History", url: "/history", icon: lucide_react_1.History },
                { title: "Setup", url: "/setup", icon: lucide_react_1.GitBranch },
                { title: "Templates", url: "/trade/templates", icon: lucide_react_1.FileText },
                { title: "Playbook", url: "/playbook", icon: lucide_react_1.BookOpen },
            ],
        },
        {
            title: "Analysis",
            items: [
                { title: "Analytics", url: "/analytics", icon: lucide_react_1.BarChart3 },
                { title: "Review", url: "/review", icon: lucide_react_1.ClipboardList },
                { title: "Review Wizard", url: "/review/wizard", icon: lucide_react_1.Wand2 },
            ],
        },
        {
            title: "Psychology & Risk",
            items: [
                { title: "Psychology", url: "/psychology", icon: lucide_react_1.Brain },
                { title: "Daily Notes", url: "/daily-notes", icon: lucide_react_1.CalendarDays },
                { title: "Risk Management", url: "/risk", icon: lucide_react_1.Shield },
                { title: "Karma & Badges", url: "/karma", icon: lucide_react_1.Trophy },
            ],
        },
        {
            title: "Education",
            items: [
                { title: "Lessons", url: "/lessons", icon: lucide_react_1.BookOpen },
                { title: "AI Coach", url: "/coach", icon: lucide_react_1.Sparkles },
            ],
        },
        {
            title: "Settings",
            items: [
                { title: "Pre-trade models", url: "/settings/pretrade-models", icon: lucide_react_1.ClipboardList },
                { title: "Admin", url: "/admin", icon: lucide_react_1.Settings2, adminOnly: true },
            ],
        },
    ],
};
function AppSidebar(_a) {
    var props = __rest(_a, []);
    var pathname = (0, navigation_1.usePathname)();
    var user = (0, auth_context_1.useAuth)().user;
    return (<sidebar_1.Sidebar variant="inset" {...props}>
      <sidebar_1.SidebarContent className="px-1">
        {data.navMain.map(function (group) { return (<sidebar_1.SidebarGroup key={group.title} className="py-1">
            <sidebar_1.SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/55">
              {group.title}
            </sidebar_1.SidebarGroupLabel>
            <sidebar_1.SidebarGroupContent>
              <sidebar_1.SidebarMenu>
                {group.items.map(function (item) {
                if (item.adminOnly && !(user === null || user === void 0 ? void 0 : user.isAdmin))
                    return null;
                var isActive = item.url === "/"
                    ? pathname === item.url
                    : pathname === item.url || pathname.startsWith("".concat(item.url, "/"));
                return (<sidebar_1.SidebarMenuItem key={item.title}>
                      <sidebar_1.SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="h-10 rounded-xl px-3 text-[13px] font-medium text-sidebar-foreground/82 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-sidebar-primary data-[active=true]:shadow-sm">
                        <link_1.default href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </link_1.default>
                      </sidebar_1.SidebarMenuButton>
                    </sidebar_1.SidebarMenuItem>);
            })}
              </sidebar_1.SidebarMenu>
            </sidebar_1.SidebarGroupContent>
          </sidebar_1.SidebarGroup>); })}
      </sidebar_1.SidebarContent>
    </sidebar_1.Sidebar>);
}
