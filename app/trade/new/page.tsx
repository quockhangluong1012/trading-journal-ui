import { Suspense } from "react"
import { AppShellLoader } from "@/components/app-shell-loader"
import { CreateTradeRoutePageClient } from "./create-trade-route-page-client"

export default function CreateTradeRoutePage() {
  return (
    <Suspense
      fallback={
        <AppShellLoader
          title="Loading trade planner"
          description="Preparing your trade setup workspace."
        />
      }
    >
      <CreateTradeRoutePageClient />
    </Suspense>
  )
}