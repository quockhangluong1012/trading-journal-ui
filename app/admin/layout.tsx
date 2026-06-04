"use client";

import { AppShellLoader } from "@/components/app-shell-loader";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/header";
import { AdminSidebar } from "./components/admin-sidebar";
import { buildRedirectWithNext } from "@/lib/auth-redirect";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    
    // Only protect non-login admin routes
    if (pathname !== "/admin/login") {
      if (!user || !user.isAdmin) {
        router.replace(buildRedirectWithNext("/admin/login", pathname));
      }
    } else {
      // If they are on the login page but are ALREADY an admin, redirect them into the admin portal
      if (user && user.isAdmin) {
        router.replace("/admin");
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return <AppShellLoader title="Loading the admin workspace" description="Checking staff access and preparing management tools." />;
  }

  // To prevent flash of unauthorized content, we only render children if condition is met
  if (pathname !== "/admin/login" && (!user || !user.isAdmin)) {
    return <AppShellLoader title="Checking admin access" description="Routing you to the correct portal." />;
  }

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_24%),radial-gradient(circle_at_82%_10%,rgba(79,70,229,0.08),transparent_24%)]" />
      <div className="relative z-10 flex flex-col">
        <Header />
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
