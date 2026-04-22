"use client"

import { useMemo } from "react"

import { Background, BackgroundVariant, ReactFlow } from "@xyflow/react"
import { GitBranch, ListChecks, LockKeyhole } from "lucide-react"

import { SetupFlowNodeComponent } from "@/components/settings/setup-flow-node"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { buildSetupChecklistItems, toFlowEdges, toFlowNodes } from "@/lib/setup-flow"
import type { TradingSetupDetailDto } from "@/lib/setup-api"

const nodeTypes = {
  setup: SetupFlowNodeComponent,
}

const checklistToneClasses = {
  decision: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  step: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
} as const

interface TodaySetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setup: TradingSetupDetailDto | null
}

export function TodaySetupDialog({
  open,
  onOpenChange,
  setup,
}: TodaySetupDialogProps) {
  const flowNodes = useMemo(() => (setup ? toFlowNodes(setup.nodes) : []), [setup])
  const flowEdges = useMemo(() => (setup ? toFlowEdges(setup.edges) : []), [setup])
  const actionableSteps = useMemo(
    () => (setup ? buildSetupChecklistItems({ nodes: setup.nodes, edges: setup.edges }) : []),
    [setup],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300">
              Today setup
            </Badge>
            {setup ? (
              <Badge variant="outline" className="border-border/70 bg-background/80 text-muted-foreground">
                {actionableSteps.length} actionable steps
              </Badge>
            ) : null}
            <Badge variant="outline" className="border-border/70 bg-background/80 text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5" />
              Read only flowchart
            </Badge>
          </div>

          <DialogTitle className="text-2xl tracking-tight">
            {setup?.name ?? "No setup selected for today"}
          </DialogTitle>
          <DialogDescription className="max-w-3xl leading-relaxed">
            {setup?.description?.trim()
              ? setup.description
              : "Review the setup created today from your setup library."}
          </DialogDescription>
        </DialogHeader>

        {!setup ? (
          <div className="px-6 py-6 text-sm text-muted-foreground">
            No setup was created today.
          </div>
        ) : (
          <div className="grid min-h-0 gap-0 lg:grid-cols-[minmax(0,1.45fr)_380px]">
            <div className="border-b border-border/70 lg:border-b-0 lg:border-r lg:border-border/70">
              <div className="flex items-center gap-2 px-6 py-4 text-sm font-medium text-foreground">
                <GitBranch className="h-4 w-4 text-primary" />
                Flowchart reference
              </div>
              <div className="h-[420px] w-full bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))]">
                <ReactFlow
                  key={`${setup.id}-${setup.lastUpdatedAt}`}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={nodeTypes}
                  elementsSelectable={false}
                  nodesConnectable={false}
                  nodesDraggable={false}
                  nodesFocusable={false}
                  edgesFocusable={false}
                  panOnDrag={false}
                  zoomOnDoubleClick={false}
                  zoomOnPinch={false}
                  zoomOnScroll={false}
                >
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1.1} />
                </ReactFlow>
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="space-y-1 px-6 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Actionable steps
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Use this ordered reference while reviewing the read only flowchart.
                </p>
              </div>

              <ScrollArea className="max-h-[420px] px-6 py-4">
                <div className="space-y-3 pr-3">
                  {actionableSteps.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                      This setup does not have any actionable steps yet. Add step or decision nodes in the setup editor first.
                    </div>
                  ) : (
                    actionableSteps.map((step, index) => {
                      return (
                        <div
                          key={step.id}
                          className="rounded-2xl border border-border/70 bg-background p-4"
                        >
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={checklistToneClasses[step.kind]}
                              >
                                {step.kind}
                              </Badge>
                              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                Step {index + 1}
                              </span>
                            </div>

                            <p className="text-sm font-semibold leading-relaxed text-foreground">
                              {step.title}
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {step.notes?.trim() || "No extra notes saved for this step."}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}