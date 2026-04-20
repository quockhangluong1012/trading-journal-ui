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
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto p-6">
            {children}
        </main>
      </div>
    </div>
  );
}
