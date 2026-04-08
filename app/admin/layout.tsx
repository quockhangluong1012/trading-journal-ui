"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/header";
import { AdminSidebar } from "./components/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    
    // Only protect non-login admin routes
    if (pathname !== "/admin/login") {
      if (!user || !user.isAdmin) {
        router.replace("/admin/login");
      }
    } else {
      // If they are on the login page but are ALREADY an admin, redirect them into the admin portal
      if (user && user.isAdmin) {
        router.replace("/admin");
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  // To prevent flash of unauthorized content, we only render children if condition is met
  if (pathname !== "/admin/login" && (!user || !user.isAdmin)) {
    return null;
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
