import { create } from "zustand";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { notificationApi, NotificationDto } from "../notification-api";

interface NotificationState {
  notifications: NotificationDto[];
  unreadCount: number;
  connection: HubConnection | null;
  isLoading: boolean;

  connect: (token: string) => Promise<void>;
  disconnect: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  connection: null,
  isLoading: false,

  connect: async (token: string) => {
    const { connection } = get();
    if (connection) {
      await connection.stop();
    }

    const newConnection = new HubConnectionBuilder()
      .withUrl(process.env.NEXT_PUBLIC_API_URL + "/hubs/notifications", {
        accessTokenFactory: () => token,
      })
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    newConnection.on("NewNotification", (notification: NotificationDto) => {
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));
    });

    newConnection.on("NotificationRead", (data: { id: number }) => {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === data.id ? { ...n, isRead: true } : n
        ),
      }));
    });

    newConnection.on("UnreadCountChanged", (data: { count: number }) => {
      set({ unreadCount: data.count });
    });

    try {
      await newConnection.start();
      set({ connection: newConnection });
      
      // Fetch initial data after connecting
      get().fetchNotifications();
    } catch (error) {
      console.error("SignalR Connection Error: ", error);
    }
  },

  disconnect: async () => {
    const { connection } = get();
    if (connection) {
      await connection.stop();
      set({ connection: null });
    }
  },

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const [notificationsResult, unreadCount] = await Promise.all([
        notificationApi.getNotifications(1, 50, false),
        notificationApi.getUnreadCount()
      ]);

      set({
        notifications: notificationsResult.items,
        unreadCount: unreadCount,
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  },

  deleteNotification: async (id: number) => {
    try {
      await notificationApi.deleteNotification(id);
      set((state) => {
        const notif = state.notifications.find((n) => n.id === id);
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: notif && !notif.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  },
}));
