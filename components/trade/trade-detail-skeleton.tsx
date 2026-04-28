import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";

export function TradeDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Skeleton className="mb-5 h-5 w-32 rounded-full" />

        <div className="mb-5 overflow-hidden rounded-[28px] border border-border/70 bg-card/80 p-5 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-10 w-48 max-w-full rounded-xl" />
                  <Skeleton className="h-4 w-80 max-w-full rounded-full" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-9 w-32 rounded-full" />
                  <Skeleton className="h-9 w-36 rounded-full" />
                  <Skeleton className="h-9 w-40 rounded-full" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          </div>
        </div>

        <Skeleton className="mb-5 h-20 rounded-2xl" />
        <Skeleton className="mb-5 h-12 w-full max-w-md rounded-2xl" />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-5">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-5">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-112 rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
