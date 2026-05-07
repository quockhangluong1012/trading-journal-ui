"use client"

import type { ReactNode } from "react"

import { Header } from "@/components/header"
import { cn } from "@/lib/utils"

const widthClasses = {
  default: "max-w-7xl",
  narrow: "max-w-5xl",
  full: "max-w-none",
} as const

interface AppPageShellProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  width?: keyof typeof widthClasses
}

export function AppPageShell({
  children,
  className,
  contentClassName,
  width = "default",
}: AppPageShellProps) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-background", className)}>
      <div className="pointer-events-none absolute inset-0 opacity-90 dark:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.14),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(234,179,8,0.07),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.20),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(250,204,21,0.08),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.68),transparent_22%,rgba(248,250,252,0.78))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.3),transparent_22%,rgba(2,6,23,0.72))]" />
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "linear-gradient(to bottom, white, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              "linear-gradient(rgba(71,85,105,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(71,85,105,0.18) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "linear-gradient(to bottom, white, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main
          className={cn(
            "mx-auto flex-1 w-full px-4 py-4 sm:px-6 sm:py-8 lg:px-8",
            widthClasses[width],
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}