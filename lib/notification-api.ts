import { api } from "./api";

export enum NotificationType {
  System = 0,
  ScannerAlert = 1,
  TradeReminder = 2,
  AiInsight = 3,
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

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
    return response.data?.value ?? response.data;
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
