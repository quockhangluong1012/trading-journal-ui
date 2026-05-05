import { api } from "@/lib/api";
import { PositionType } from "@/lib/enum/PositionType";
import { TradeStatus } from "@/lib/enum/TradeStatus";

export enum ExportFormat {
  Csv = 0,
  Excel = 1,
}

export interface ExportTradesRequest {
  asset?: string;
  position?: PositionType | null;
  status?: TradeStatus | null;
  fromDate?: string | null;
  toDate?: string | null;
  format: ExportFormat;
}

export async function exportTrades(request: ExportTradesRequest): Promise<void> {
  const response = await api.post("/v1/trade-histories/export", request, {
    responseType: "blob",
  });

  const blob = new Blob([response.data], {
    type: response.headers["content-type"],
  });

  // Extract filename from Content-Disposition header or use a default
  const contentDisposition = response.headers["content-disposition"];
  let fileName = request.format === ExportFormat.Excel
    ? "trades_export.xlsx"
    : "trades_export.csv";

  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      fileName = match[1].replace(/['"]/g, "");
    }
  }

  // Trigger browser download
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
