import { api, type ApiResponse } from "./api"

// Uploads trade screenshots as a real multipart request and returns the hosted
// URLs the backend stored them at. This replaces inlining base64 data URLs into
// the trade PUT payload (which ballooned request size and risked hitting
// request-size limits).
export async function uploadTradeScreenshots(files: File[]): Promise<string[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))

  const response = await api.post<ApiResponse<string[]>>(
    "/v1/trade-histories/screenshots",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  )

  if (!response.data.isSuccess) {
    throw new Error("Failed to upload screenshots.")
  }

  return response.data.value ?? []
}
