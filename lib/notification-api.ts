import { api } from "./api";

export enum NotificationType {
  System = 0,
  ScannerAlert = 1,
  TradeReminder = 2,
  AiInsight = 3,
  TiltWarning = 4,
  StreakAlert = 5,
}

export enum NotificationPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Critical = 3,
}

export interface NotificationDto {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string;
  metadata?: string;
  actionUrl?: string;
  createdDate: string;
}

type NotificationWireDto = Omit<NotificationDto, "type" | "priority"> & {
  type: NotificationType | string;
  priority: NotificationPriority | string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function normalizeNotification(notification: NotificationWireDto): NotificationDto {
  return {
    ...notification,
    type: parseNotificationType(notification.type),
    priority: parseNotificationPriority(notification.priority),
  }
}

export const notificationApi = {
  getNotifications: async (
    pageNumber: number = 1,
    pageSize: number = 20,
    unreadOnly: boolean = false
  ): Promise<PaginatedResult<NotificationDto>> => {
    const response = await api.get(
      `/v1/notifications?pageNumber=${pageNumber}&pageSize=${pageSize}&unreadOnly=${unreadOnly}`
    );
    const result = response.data?.value ?? response.data;
    return {
      ...result,
      items: (result.items ?? []).map(normalizeNotification),
    };
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get("/v1/notifications/unread-count");
    return response.data?.value ?? response.data;
  },

  markAsRead: async (id: number): Promise<void> => {
    await api.put(`/v1/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put("/v1/notifications/read-all");
  },

  deleteNotification: async (id: number): Promise<void> => {
    await api.delete(`/v1/notifications/${id}`);
  },
};

function parseNotificationType(value: NotificationType | string): NotificationType {
  if (typeof value === "number") return value

  switch (value.toLowerCase()) {
    case "system":
      return NotificationType.System
    case "scanneralert":
      return NotificationType.ScannerAlert
    case "tradereminder":
      return NotificationType.TradeReminder
    case "aiinsight":
      return NotificationType.AiInsight
    case "tiltwarning":
      return NotificationType.TiltWarning
    case "streakalert":
      return NotificationType.StreakAlert
    default:
      return NotificationType.System
  }
}

function parseNotificationPriority(value: NotificationPriority | string): NotificationPriority {
  if (typeof value === "number") return value

  switch (value.toLowerCase()) {
    case "critical":
      return NotificationPriority.Critical
    case "high":
      return NotificationPriority.High
    case "normal":
      return NotificationPriority.Normal
    case "low":
      return NotificationPriority.Low
    default:
      return NotificationPriority.Normal
  }
}
