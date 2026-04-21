import { describe, expect, it } from "vitest"

import {
  buildSetupChecklistItems,
  countActionableSetupSteps,
  createDefaultSetupDiagram,
  createSetupDiagramNode,
  validateSetupDiagram,
} from "@/lib/setup-flow"

describe("setup-flow helpers", () => {
  it("creates a starter diagram with start, action, and end nodes", () => {
    const diagram = createDefaultSetupDiagram()

    expect(diagram.nodes.map((node) => node.kind)).toEqual(["start", "step", "end"])
    expect(diagram.edges).toHaveLength(2)
    expect(countActionableSetupSteps(diagram.nodes)).toBe(1)
  })

  it("creates decision nodes with a readable default title and requested position", () => {
    const node = createSetupDiagramNode("decision", {
      position: { x: 320, y: 180 },
    })

    expect(node.id).toMatch(/^setup-node-/)
    expect(node.kind).toBe("decision")
    expect(node.title).toBe("Decision")
    expect(node.position).toEqual({ x: 320, y: 180 })
  })

  it("counts only actionable nodes as steps", () => {
    const nodes = [
      createSetupDiagramNode("start"),
      createSetupDiagramNode("step"),
      createSetupDiagramNode("decision"),
      createSetupDiagramNode("end"),
    ]

    expect(countActionableSetupSteps(nodes)).toBe(2)
  })

  it("builds checklist items in flow order while excluding start and end nodes", () => {
    const startNode = {
      id: "setup-node-start",
      kind: "start" as const,
      title: "Start",
      notes: null,
      position: { x: 80, y: 160 },
    }
    const stepNode = {
      id: "setup-node-step",
      kind: "step" as const,
      title: "Confirm session bias",
      notes: "Start from the higher-timeframe direction.",
      position: { x: 320, y: 160 },
    }
    const decisionNode = {
      id: "setup-node-decision",
      kind: "decision" as const,
      title: "Liquidity sweep complete?",
      notes: "If not, stand aside.",
      position: { x: 560, y: 160 },
    }
    const endNode = {
      id: "setup-node-end",
      kind: "end" as const,
      title: "Done",
      notes: null,
      position: { x: 800, y: 160 },
    }

    const checklist = buildSetupChecklistItems({
      nodes: [startNode, stepNode, decisionNode, endNode],
      edges: [
        { id: "edge-start-step", source: startNode.id, target: stepNode.id, label: null },
        { id: "edge-step-decision", source: stepNode.id, target: decisionNode.id, label: null },
        { id: "edge-decision-end", source: decisionNode.id, target: endNode.id, label: "Yes" },
      ],
    })

    expect(checklist).toEqual([
      {
        id: stepNode.id,
        kind: "step",
        title: "Confirm session bias",
        notes: "Start from the higher-timeframe direction.",
      },
      {
        id: decisionNode.id,
        kind: "decision",
        title: "Liquidity sweep complete?",
        notes: "If not, stand aside.",
      },
    ])
  })

  it("appends disconnected actionable nodes using canvas position order", () => {
    const startNode = {
      id: "setup-node-start",
      kind: "start" as const,
      title: "Start",
      notes: null,
      position: { x: 80, y: 160 },
    }
    const connectedStep = {
      id: "setup-node-connected",
      kind: "step" as const,
      title: "Connected step",
      notes: null,
      position: { x: 320, y: 160 },
    }
    const disconnectedDecision = {
      id: "setup-node-disconnected-decision",
      kind: "decision" as const,
      title: "Disconnected decision",
      notes: null,
      position: { x: 220, y: 260 },
    }
    const disconnectedStep = {
      id: "setup-node-disconnected-step",
      kind: "step" as const,
      title: "Disconnected step",
      notes: null,
      position: { x: 420, y: 320 },
    }
    const endNode = {
      id: "setup-node-end",
      kind: "end" as const,
      title: "Done",
      notes: null,
      position: { x: 560, y: 160 },
    }

    const checklist = buildSetupChecklistItems({
      nodes: [startNode, connectedStep, disconnectedDecision, disconnectedStep, endNode],
      edges: [
        { id: "edge-start-step", source: startNode.id, target: connectedStep.id, label: null },
        { id: "edge-step-end", source: connectedStep.id, target: endNode.id, label: null },
      ],
    })

    expect(checklist.map((item) => item.id)).toEqual([
      connectedStep.id,
      disconnectedDecision.id,
      disconnectedStep.id,
    ])
  })

  it("flags invalid duplicate and self-referencing connections before save", () => {
    const startNode = createSetupDiagramNode("start", { title: "Start" })
    const duplicateNode = { ...createSetupDiagramNode("step", { title: "Review" }), id: startNode.id }
    const validNode = createSetupDiagramNode("end", { title: "End" })

    const issues = validateSetupDiagram({
      nodes: [startNode, duplicateNode, validNode],
      edges: [
        { id: "edge-1", source: startNode.id, target: startNode.id, label: null },
        { id: "edge-2", source: "missing-node", target: validNode.id, label: null },
      ],
    })

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Setup node ids must be unique.",
        "Setup connections cannot point to the same node.",
        "Setup connections must reference existing nodes.",
      ]),
    )
  })
})