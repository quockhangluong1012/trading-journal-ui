import { api, clearAuthAndRedirectToLogin, type ApiResponse } from "./api"

const AUTH_STORAGE_KEY = "trading-journey-auth-user"
const COACH_STREAM_PATH = "/v1/ai-coach/chat/stream"

interface CoachStreamEvent {
  type: "chunk" | "done" | "error"
  content?: string
  message?: string
}

interface StoredAuthUser {
  token?: string
}

export type CoachMode = "coach" | "research"

export interface CoachMessage {
  role: "user" | "assistant"
  content: string
}

export interface CoachResponse {
  reply: string
}

export interface StreamCoachReplyOptions {
  onChunk?: (partialReply: string, chunk: string) => void
  signal?: AbortSignal
}

export async function chatWithCoach(
  messages: CoachMessage[],
  mode: CoachMode = "coach"
): Promise<CoachResponse> {
  const response = await api.post<ApiResponse<CoachResponse>>("/v1/ai-coach/chat", { messages, mode })
  return response.data.value
}

function getCoachApiUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL}/api${path}`
}

function getStoredAuthToken(): string | undefined {
  if (typeof localStorage === "undefined") {
    return undefined
  }

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)

    if (!stored) {
      return undefined
    }

    const user = JSON.parse(stored) as StoredAuthUser
    return typeof user.token === "string" && user.token.length > 0 ? user.token : undefined
  } catch {
    return undefined
  }
}

function getAuthorizationHeader(): string | undefined {
  const defaultAuthorization = api.defaults.headers.common.Authorization

  if (typeof defaultAuthorization === "string" && defaultAuthorization.length > 0) {
    return defaultAuthorization
  }

  const token = getStoredAuthToken()
  return token ? `Bearer ${token}` : undefined
}

function createStreamHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  }

  const authorization = getAuthorizationHeader()

  if (authorization) {
    headers.Authorization = authorization
  }

  return headers
}

function parseCoachStreamEvent(rawEvent: string): CoachStreamEvent | null {
  const dataLines = rawEvent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())

  if (dataLines.length === 0) {
    return null
  }

  const payload = dataLines.join("\n")

  if (!payload) {
    return null
  }

  try {
    return JSON.parse(payload) as CoachStreamEvent
  } catch {
    throw new Error("Malformed coach stream event")
  }
}

export async function streamCoachReply(
  messages: CoachMessage[],
  mode: CoachMode = "coach",
  options: StreamCoachReplyOptions = {}
): Promise<CoachResponse> {
  const response = await fetch(getCoachApiUrl(COACH_STREAM_PATH), {
    method: "POST",
    headers: createStreamHeaders(),
    body: JSON.stringify({ messages, mode }),
    signal: options.signal,
  })

  if (response.status === 401 && typeof window !== "undefined") {
    clearAuthAndRedirectToLogin()
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(errorText || `Coach stream request failed with status ${response.status}`)
  }

  if (!response.body) {
    throw new Error("Coach stream response body is empty")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let reply = ""

  const flushBuffer = (): void => {
    const events = buffer.split("\n\n")
    buffer = events.pop() ?? ""

    for (const rawEvent of events) {
      const event = parseCoachStreamEvent(rawEvent)

      if (!event) {
        continue
      }

      if (event.type === "error") {
        throw new Error(event.message || "Coach stream failed")
      }

      if (event.type !== "chunk") {
        continue
      }

      const chunk = event.content ?? ""

      if (!chunk) {
        continue
      }

      reply += chunk
      options.onChunk?.(reply, chunk)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
    flushBuffer()

    if (done) {
      break
    }
  }

  if (buffer.trim().length > 0) {
    const trailingEvent = parseCoachStreamEvent(buffer)

    if (trailingEvent?.type === "error") {
      throw new Error(trailingEvent.message || "Coach stream failed")
    }

    if (trailingEvent?.type === "chunk" && trailingEvent.content) {
      reply += trailingEvent.content
      options.onChunk?.(reply, trailingEvent.content)
    }
  }

  return { reply }
}
