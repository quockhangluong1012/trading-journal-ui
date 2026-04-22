import type { AxiosResponse } from "axios"

import { api, type ApiResponse } from "./api"
import type { SetupDiagramNode, SetupDiagramEdge, SetupNodeKind } from "./setup-flow"

export interface TradingSetupSummaryDto {
  id: number
  name: string
  description: string | null
  stepCount: number
  createdAt: string
  lastUpdatedAt: string
}

export interface TradingSetupDetailDto extends TradingSetupSummaryDto {
  nodes: SetupDiagramNode[]
  edges: SetupDiagramEdge[]
}

interface TradingSetupNodeApiDto {
  id: string
  kind: string
  x: number
  y: number
  title: string
  notes: string | null
}

type TradingSetupNodeResponseDto = SetupDiagramNode | TradingSetupNodeApiDto

interface TradingSetupDetailResponseDto extends TradingSetupSummaryDto {
  nodes: TradingSetupNodeResponseDto[]
  edges: SetupDiagramEdge[]
}

type TradingSetupDetailFailureResponse = {
  isSuccess: false
  value: unknown
}

type TradingSetupDetailSuccessResponse = {
  isSuccess: true
  value: TradingSetupDetailDto
}

type TradingSetupDetailRawSuccessResponse = {
  isSuccess: true
  value: TradingSetupDetailResponseDto
}

type TradingSetupDetailApiResponse = TradingSetupDetailSuccessResponse | TradingSetupDetailFailureResponse
type TradingSetupDetailRawApiResponse = TradingSetupDetailRawSuccessResponse | TradingSetupDetailFailureResponse

export interface TradingSetupPayload {
  name: string
  description?: string | null
  nodes: Array<{
    id: string
    kind: string
    x: number
    y: number
    title: string
    notes: string | null
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    label: string | null
  }>
}

function normalizeSetupNodeKind(kind: string): SetupNodeKind {
  switch (kind) {
    case "start":
    case "decision":
    case "end":
      return kind
    default:
      return "step"
  }
}

function normalizeCoordinate(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  throw new Error("Invalid setup node coordinate.")
}

function hasNestedPosition(node: TradingSetupNodeResponseDto): node is SetupDiagramNode {
  return "position" in node
    && typeof node.position === "object"
    && node.position !== null
    && "x" in node.position
    && "y" in node.position
}

function normalizeTradingSetupNode(node: TradingSetupNodeResponseDto): SetupDiagramNode {
  if (hasNestedPosition(node)) {
    return {
      id: node.id,
      kind: normalizeSetupNodeKind(node.kind),
      title: node.title,
      notes: node.notes ?? null,
      position: {
        x: normalizeCoordinate(node.position.x),
        y: normalizeCoordinate(node.position.y),
      },
    }
  }

  return {
    id: node.id,
    kind: normalizeSetupNodeKind(node.kind),
    title: node.title,
    notes: node.notes ?? null,
    position: {
      x: normalizeCoordinate(node.x),
      y: normalizeCoordinate(node.y),
    },
  }
}

export function normalizeTradingSetupDetail(detail: TradingSetupDetailResponseDto): TradingSetupDetailDto {
  return {
    ...detail,
    nodes: detail.nodes.map(normalizeTradingSetupNode),
    edges: detail.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? null,
    })),
  }
}

export async function getTradingSetups() {
  return api.get<ApiResponse<TradingSetupSummaryDto[]>>("/v1/trading-setups")
}

export async function getTradingSetupDetail(id: number): Promise<AxiosResponse<TradingSetupDetailApiResponse>> {
  const response = await api.get<TradingSetupDetailRawApiResponse>(`/v1/trading-setups/${id}`)

  if (!response.data.isSuccess) {
    return {
      ...response,
      data: response.data,
    }
  }

  return {
    ...response,
    data: {
      isSuccess: true,
      value: normalizeTradingSetupDetail(response.data.value),
    },
  }
}

export async function createTradingSetup(payload: TradingSetupPayload) {
  return api.post<ApiResponse<number>>("/v1/trading-setups", payload)
}

export async function updateTradingSetup(id: number, payload: TradingSetupPayload) {
  return api.put<ApiResponse<boolean>>("/v1/trading-setups", {
    id,
    ...payload,
  })
}

export async function deleteTradingSetup(id: number) {
  return api.delete<ApiResponse<boolean>>(`/v1/trading-setups/${id}`)
}