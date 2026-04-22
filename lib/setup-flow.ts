import { MarkerType, type Edge, type Node } from "@xyflow/react"

export type SetupNodeKind = "start" | "step" | "decision" | "end"

export interface SetupDiagramNode {
  id: string
  kind: SetupNodeKind
  title: string
  notes: string | null
  position: {
    x: number
    y: number
  }
}

export interface SetupDiagramEdge {
  id: string
  source: string
  target: string
  label: string | null
}

export interface SetupDiagram {
  nodes: SetupDiagramNode[]
  edges: SetupDiagramEdge[]
}

export interface SetupDiagramValidationIssue {
  field: "nodes" | "edges"
  message: string
}

export interface SetupChecklistItem {
  id: string
  kind: Exclude<SetupNodeKind, "start" | "end">
  title: string
  notes: string | null
}

export interface SetupFlowNodeData extends Record<string, unknown> {
  title: string
  notes: string | null
  kind: SetupNodeKind
}

export type SetupFlowNode = Node<SetupFlowNodeData>
export type SetupFlowEdge = Edge

const DEFAULT_NODE_TITLES: Record<SetupNodeKind, string> = {
  start: "Start",
  step: "Action step",
  decision: "Decision",
  end: "End",
}

let setupNodeCounter = 0
let setupEdgeCounter = 0

function createSetupDiagramEdge(source: string, target: string, label?: string | null): SetupDiagramEdge {
  setupEdgeCounter += 1

  return {
    id: `setup-edge-${setupEdgeCounter}`,
    source,
    target,
    label: label ?? null,
  }
}

export function createSetupDiagramNode(
  kind: SetupNodeKind,
  overrides: Partial<Omit<SetupDiagramNode, "id" | "kind">> = {},
): SetupDiagramNode {
  setupNodeCounter += 1

  return {
    id: `setup-node-${setupNodeCounter}`,
    kind,
    title: overrides.title ?? DEFAULT_NODE_TITLES[kind],
    notes: overrides.notes ?? null,
    position: overrides.position ?? { x: 0, y: 0 },
  }
}

export function createDefaultSetupDiagram(): SetupDiagram {
  const startNode = createSetupDiagramNode("start", {
    title: "Start",
    notes: "Define the market context that makes this setup worth tracking.",
    position: { x: 80, y: 180 },
  })

  const actionNode = createSetupDiagramNode("step", {
    title: "Validate context",
    notes: "Check bias, liquidity, timing, and invalidation before committing.",
    position: { x: 360, y: 180 },
  })

  const endNode = createSetupDiagramNode("end", {
    title: "Execute or stand aside",
    notes: "Take the trade only if every condition still holds.",
    position: { x: 640, y: 180 },
  })

  return {
    nodes: [startNode, actionNode, endNode],
    edges: [
      createSetupDiagramEdge(startNode.id, actionNode.id),
      createSetupDiagramEdge(actionNode.id, endNode.id, "All conditions align"),
    ],
  }
}

export function countActionableSetupSteps(nodes: SetupDiagramNode[]): number {
  return nodes.filter((node) => node.kind !== "start" && node.kind !== "end").length
}

function isActionableSetupNode(
  node: SetupDiagramNode,
): node is SetupDiagramNode & { kind: Exclude<SetupNodeKind, "start" | "end"> } {
  return node.kind !== "start" && node.kind !== "end"
}

function compareNodesByCanvasPosition(left: SetupDiagramNode, right: SetupDiagramNode): number {
  if (left.position.y !== right.position.y) {
    return left.position.y - right.position.y
  }

  if (left.position.x !== right.position.x) {
    return left.position.x - right.position.x
  }

  return left.title.localeCompare(right.title)
}

export function buildSetupChecklistItems(diagram: SetupDiagram): SetupChecklistItem[] {
  const nodesById = new Map(diagram.nodes.map((node) => [node.id, node] as const))
  const actionableNodesById = new Map(
    diagram.nodes.filter(isActionableSetupNode).map((node) => [node.id, node] as const),
  )

  if (actionableNodesById.size === 0) {
    return []
  }

  const outgoingTargets = new Map<string, string[]>()

  for (const edge of diagram.edges) {
    const sourceNode = nodesById.get(edge.source)
    const targetNode = nodesById.get(edge.target)

    if (!sourceNode || !targetNode) {
      continue
    }

    const nextTargets = outgoingTargets.get(edge.source) ?? []
    nextTargets.push(edge.target)
    outgoingTargets.set(edge.source, nextTargets)
  }

  for (const [sourceId, targetIds] of outgoingTargets) {
    targetIds.sort((leftId, rightId) => {
      const leftNode = nodesById.get(leftId)
      const rightNode = nodesById.get(rightId)

      if (!leftNode || !rightNode) {
        return 0
      }

      return compareNodesByCanvasPosition(leftNode, rightNode)
    })
    outgoingTargets.set(sourceId, targetIds)
  }

  const orderedActionableIds: string[] = []
  const visitedNodeIds = new Set<string>()
  const queue = diagram.nodes
    .filter((node) => node.kind === "start")
    .sort(compareNodesByCanvasPosition)
    .map((node) => node.id)

  while (queue.length > 0) {
    const currentNodeId = queue.shift()

    if (!currentNodeId || visitedNodeIds.has(currentNodeId)) {
      continue
    }

    visitedNodeIds.add(currentNodeId)

    if (actionableNodesById.has(currentNodeId)) {
      orderedActionableIds.push(currentNodeId)
    }

    for (const nextNodeId of outgoingTargets.get(currentNodeId) ?? []) {
      if (!visitedNodeIds.has(nextNodeId)) {
        queue.push(nextNodeId)
      }
    }
  }

  const orderedActionableIdSet = new Set(orderedActionableIds)
  const remainingActionableNodes = [...actionableNodesById.values()]
    .filter((node) => !orderedActionableIdSet.has(node.id))
    .sort(compareNodesByCanvasPosition)

  return [...orderedActionableIds.map((nodeId) => actionableNodesById.get(nodeId)!), ...remainingActionableNodes]
    .map((node) => ({
      id: node.id,
      kind: node.kind,
      title: node.title,
      notes: node.notes,
    }))
}

export function validateSetupDiagram(diagram: SetupDiagram): SetupDiagramValidationIssue[] {
  const issues: SetupDiagramValidationIssue[] = []

  if (diagram.nodes.length === 0) {
    issues.push({
      field: "nodes",
      message: "At least one setup node is required.",
    })

    return issues
  }

  const nodeIds: string[] = []

  for (const node of diagram.nodes) {
    if (!node.id.trim()) {
      issues.push({
        field: "nodes",
        message: "Every setup node must include an id.",
      })
      continue
    }

    nodeIds.push(node.id.trim())

    if (!node.title.trim()) {
      issues.push({
        field: "nodes",
        message: "Every setup node must include a title.",
      })
    }
  }

  if (new Set(nodeIds.map((nodeId) => nodeId.toLowerCase())).size !== nodeIds.length) {
    issues.push({
      field: "nodes",
      message: "Setup node ids must be unique.",
    })
  }

  const knownNodeIds = new Set(nodeIds.map((nodeId) => nodeId.toLowerCase()))
  const seenConnections = new Set<string>()

  for (const edge of diagram.edges) {
    const source = edge.source.trim()
    const target = edge.target.trim()

    if (!source || !target) {
      issues.push({
        field: "edges",
        message: "Every setup connection must include both source and target nodes.",
      })
      continue
    }

    if (!knownNodeIds.has(source.toLowerCase()) || !knownNodeIds.has(target.toLowerCase())) {
      issues.push({
        field: "edges",
        message: "Setup connections must reference existing nodes.",
      })
    }

    if (source.localeCompare(target, undefined, { sensitivity: "accent" }) === 0) {
      issues.push({
        field: "edges",
        message: "Setup connections cannot point to the same node.",
      })
    }

    const connectionKey = `${source.toLowerCase()}->${target.toLowerCase()}`
    if (seenConnections.has(connectionKey)) {
      issues.push({
        field: "edges",
        message: "Duplicate setup connections are not allowed.",
      })
    }

    seenConnections.add(connectionKey)
  }

  return issues
}

export function toFlowNodes(nodes: SetupDiagramNode[]): SetupFlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "setup",
    position: node.position,
    data: {
      title: node.title,
      notes: node.notes,
      kind: node.kind,
    },
  }))
}

export function toFlowEdges(edges: SetupDiagramEdge[]): SetupFlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label ?? undefined,
    type: "smoothstep",
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
  }))
}

export function fromFlowState(nodes: SetupFlowNode[], edges: SetupFlowEdge[]): SetupDiagram {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.data.kind,
      title: node.data.title,
      notes: node.data.notes ?? null,
      position: {
        x: node.position.x,
        y: node.position.y,
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: typeof edge.label === "string" ? edge.label : null,
    })),
  }
}

export function toApiDiagram(diagram: SetupDiagram) {
  return {
    nodes: diagram.nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      x: node.position.x,
      y: node.position.y,
      title: node.title.trim(),
      notes: node.notes?.trim() ? node.notes.trim() : null,
    })),
    edges: diagram.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label?.trim() ? edge.label.trim() : null,
    })),
  }
}