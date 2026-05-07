"use client";

import { AppPageShell } from "@/components/app-page-shell"
import { SetupManager } from "@/components/settings/setup-manager"
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { buildRedirectWithNext } from "@/lib/auth-redirect";
import { AppShellLoader } from "@/components/app-shell-loader";
import { useEffect } from "react";

export default function SetupPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname));
    }
  }, [user, isAuthLoading, pathname, router]);

  if (isAuthLoading) {
    return <AppShellLoader title="Loading settings" description="Gathering your setups." />;
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />;
  }

  return (
    <AppPageShell width="full" contentClassName="w-full xl:px-8 2xl:px-10">
        <SetupManager />
    </AppPageShell>
  )
}