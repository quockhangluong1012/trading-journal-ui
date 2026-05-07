"use client"

import { Flag, GitBranch, Play, Square } from "lucide-react"
import { Handle, Position, type NodeProps } from "@xyflow/react"

import { SafeHtml } from "@/components/ui/safe-html"
import { cn } from "@/lib/utils"
import type { SetupFlowNode } from "@/lib/setup-flow"

const NODE_STYLES = {
  start: {
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    icon: Play,
  },
  step: {
    badge: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    border: "border-sky-500/30",
    icon: Flag,
  },
  decision: {
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    icon: GitBranch,
  },
  end: {
    badge: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    border: "border-violet-500/30",
    icon: Square,
  },
} as const

export function SetupFlowNodeComponent({ data, selected }: NodeProps<SetupFlowNode>) {
  const style = NODE_STYLES[data.kind]
  const Icon = style.icon
  const canReceiveConnections = data.kind !== "start"
  const canSendConnections = data.kind !== "end"

  return (
    <div
      className={cn(
        "min-w-56 max-w-64 rounded-2xl border bg-background/95 shadow-lg backdrop-blur-sm transition-all",
        style.border,
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      {canReceiveConnections ? (
        <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
      ) : null}

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]", style.badge)}>
            {data.kind}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{data.title}</p>
          <SafeHtml
            html={data.notes?.trim() ? data.notes : "No guidance yet. Add the conditions or reminders you want to see here."}
            className="mt-1 text-xs leading-relaxed text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          />
        </div>
      </div>

      {canSendConnections ? (
        <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
      ) : null}
    </div>
  )
}