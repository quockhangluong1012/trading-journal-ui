import { api, type ApiResponse } from "./api"

export interface CoachMessage {
  role: "user" | "assistant"
  content: string
}

export interface CoachResponse {
  reply: string
}

export async function chatWithCoach(messages: CoachMessage[]): Promise<CoachResponse> {
  const response = await api.post<ApiResponse<CoachResponse>>("/v1/ai-coach/chat", { messages })
  return response.data.value
}
