"use client";

import { AppPageShell } from "@/components/app-page-shell";
import { PretradeModelManager } from "@/components/settings/pretrade-model-manager";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { buildRedirectWithNext } from "@/lib/auth-redirect";
import { AppShellLoader } from "@/components/app-shell-loader";
import { useEffect } from "react";

export default function PretradeModelsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname));
    }
  }, [user, isAuthLoading, pathname, router]);

  if (isAuthLoading) {
    return <AppShellLoader title="Loading settings" description="Gathering your pre-trade models." />;
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />;
  }

  return (
    <AppPageShell width="narrow" contentClassName="py-8">
        <PretradeModelManager />
    </AppPageShell>
  );
}