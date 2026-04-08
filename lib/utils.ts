import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TradeStatus } from "./enum/TradeStatus";
import { PositionType } from "./enum/PositionType";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getTradeStatusLabel = (status: TradeStatus) => {
  switch (status) {
    case TradeStatus.Open:
      return "Open";
    case TradeStatus.Closed:
      return "Closed";
    default:
      return "All";
  }
};

export const getPositionTypeLabel = (position: PositionType) => {
  switch (position) {
    case PositionType.Long:
      return "Long";
    case PositionType.Short:
      return "Short";
    default:
      return "All";
  }
};
