import { create } from "zustand";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import {
  scannerApi,
  ScannerAlertDto,
  ScannerStatusDto,
  ScannerStatus,
  WatchlistDto,
} from "../scanner-api";

interface ScannerState {
  status: ScannerStatusDto;
  alerts: ScannerAlertDto[];
  watchlists: WatchlistDto[];
  connection: HubConnection | null;
  isLoading: boolean;
  newsWarnings: any[];
  newsReleases: any[];

  connect: (token: string) => Promise<void>;
  disconnect: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  startScanner: () => Promise<void>;
  stopScanner: () => Promise<void>;
  toggleWatchlistScanner: (watchlistId: number, start: boolean) => Promise<void>;
  dismissAlert: (id: number) => Promise<void>;
  dismissNewsWarning: (eventId: string) => void;
  dismissNewsRelease: (eventId: string) => void;
  createWatchlist: (name: string) => Promise<void>;
  deleteWatchlist: (id: number) => Promise<void>;
  toggleWatchlistActive: (id: number, isActive: boolean) => Promise<void>;
  addAsset: (watchlistId: number, symbol: string, displayName: string) => Promise<void>;
  removeAsset: (watchlistId: number, assetId: number) => Promise<void>;
}

export const useScannerStore = create<ScannerState>((set, get) => ({
  status: {
    status: ScannerStatus.Stopped,
    assetsScanned: 0,
    activeAlerts: 0,
  },
  alerts: [],
  watchlists: [],
  connection: null,
  isLoading: false,
  newsWarnings: [],
  newsReleases: [],

  connect: async (token: string) => {
    const { connection } = get();
    if (connection) {
      await connection.stop();
    }

    const newConnection = new HubConnectionBuilder()
      .withUrl(process.env.NEXT_PUBLIC_API_URL + "/hubs/scanner", {
        accessTokenFactory: () => token,
      })
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    newConnection.on("ScannerAlertDetected", (alert: ScannerAlertDto) => {
      set((state) => ({
        alerts: [alert, ...state.alerts],
        status: { ...state.status, activeAlerts: state.status.activeAlerts + 1 },
      }));
    });

    newConnection.on("ScannerStatusChanged", (data: { status: ScannerStatus; lastScanTime: string }) => {
      set((state) => ({
        status: { ...state.status, status: data.status, lastScanTime: data.lastScanTime },
      }));
    });

    newConnection.on("WatchlistScanCompleted", (data: { watchlistId: number; watchlistName: string; alertsFound: number; duration: number }) => {
      set((state) => ({
        status: { ...state.status, lastScanTime: new Date().toISOString() },
      }));
    });

    newConnection.on("WatchlistScannerError", (data: { watchlistId: number; watchlistName: string; error: string }) => {
      console.error(`Scanner error for watchlist ${data.watchlistName}:`, data.error);
    });

    newConnection.on("EconomicNewsWarning", (data: any) => {
      set((state) => ({
        newsWarnings: [data, ...state.newsWarnings.filter((w) => w.eventId !== data.eventId)],
      }));
    });

    newConnection.on("EconomicNewsReleased", (data: any) => {
      set((state) => ({
        newsReleases: [data, ...state.newsReleases.filter((r) => r.eventId !== data.eventId)],
      }));
    });

    newConnection.on("EconomicCalendarRefreshed", (data: any) => {
      // Optional: Could trigger a re-fetch of the calendar UI if it's currently open
      console.log("Economic calendar data refreshed from server", data);
    });

    try {
      await newConnection.start();
      set({ connection: newConnection });
      
      get().fetchInitialData();
    } catch (error) {
      console.error("Scanner Hub Connection Error: ", error);
    }
  },

  disconnect: async () => {
    const { connection } = get();
    if (connection) {
      await connection.stop();
      set({ connection: null });
    }
  },

  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      const [status, alerts, watchlists] = await Promise.all([
        scannerApi.getStatus().catch(() => ({ status: ScannerStatus.Stopped, assetsScanned: 0, activeAlerts: 0 })),
        scannerApi.getAlerts(1, 50, true).catch(() => ({ items: [], totalCount: 0 })),
        scannerApi.getWatchlists().catch(() => []),
      ]);

      set({
        status,
        alerts: alerts.items,
        watchlists,
      });
    } catch (error) {
      console.error("Failed to fetch scanner initial data:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  startScanner: async () => {
    try {
      await scannerApi.startScanner();
      // Refresh watchlists to get updated isScannerRunning state
      const watchlists = await scannerApi.getWatchlists().catch(() => []);
      set((state) => ({
        status: { ...state.status, status: ScannerStatus.Running },
        watchlists,
      }));
    } catch (error) {
      console.error("Failed to start scanner:", error);
    }
  },

  stopScanner: async () => {
    try {
      await scannerApi.stopScanner();
      // Refresh watchlists to get updated isScannerRunning state
      const watchlists = await scannerApi.getWatchlists().catch(() => []);
      set((state) => ({
        status: { ...state.status, status: ScannerStatus.Stopped },
        watchlists,
      }));
    } catch (error) {
      console.error("Failed to stop scanner:", error);
    }
  },

  toggleWatchlistScanner: async (watchlistId: number, start: boolean) => {
    try {
      const updatedWatchlist = start
        ? await scannerApi.startWatchlistScanner(watchlistId)
        : await scannerApi.stopWatchlistScanner(watchlistId);

      set((state) => {
        const newWatchlists = state.watchlists.map((w) =>
          w.id === watchlistId ? { ...w, isScannerRunning: updatedWatchlist.isScannerRunning } : w
        );
        const runningCount = newWatchlists.filter((w) => w.isScannerRunning).length;
        return {
          watchlists: newWatchlists,
          status: {
            ...state.status,
            status: runningCount > 0 ? ScannerStatus.Running : ScannerStatus.Stopped,
          },
        };
      });
    } catch (error) {
      console.error(`Failed to ${start ? "start" : "stop"} watchlist scanner:`, error);
    }
  },

  dismissAlert: async (id: number) => {
    try {
      await scannerApi.dismissAlert(id);
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id),
        status: { ...state.status, activeAlerts: Math.max(0, state.status.activeAlerts - 1) },
      }));
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
    }
  },

  dismissNewsWarning: (eventId: string) => {
    set((state) => ({
      newsWarnings: state.newsWarnings.filter((w) => w.eventId !== eventId),
    }));
  },

  dismissNewsRelease: (eventId: string) => {
    set((state) => ({
      newsReleases: state.newsReleases.filter((r) => r.eventId !== eventId),
    }));
  },

  createWatchlist: async (name: string) => {
    try {
      const newList = await scannerApi.createWatchlist(name);
      set((state) => ({ watchlists: [...state.watchlists, newList] }));
    } catch (error) {
      console.error("Failed to create watchlist:", error);
    }
  },

  deleteWatchlist: async (id: number) => {
    try {
      await scannerApi.deleteWatchlist(id);
      set((state) => ({
        watchlists: state.watchlists.filter((w) => w.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete watchlist:", error);
    }
  },

  toggleWatchlistActive: async (id: number, isActive: boolean) => {
    try {
      await scannerApi.updateWatchlist(id, { isActive });
      set((state) => ({
        watchlists: state.watchlists.map((w) => (w.id === id ? { ...w, isActive } : w)),
      }));
    } catch (error) {
      console.error("Failed to update watchlist:", error);
    }
  },

  addAsset: async (watchlistId: number, symbol: string, displayName: string) => {
    try {
      const asset = await scannerApi.addAsset(watchlistId, symbol, displayName);
      set((state) => ({
        watchlists: state.watchlists.map((w) =>
          w.id === watchlistId ? { ...w, assets: [...w.assets, asset] } : w
        ),
      }));
    } catch (error) {
      console.error("Failed to add asset:", error);
    }
  },

  removeAsset: async (watchlistId: number, assetId: number) => {
    try {
      await scannerApi.removeAsset(watchlistId, assetId);
      set((state) => ({
        watchlists: state.watchlists.map((w) =>
          w.id === watchlistId
            ? { ...w, assets: w.assets.filter((a) => a.id !== assetId) }
            : w
        ),
      }));
    } catch (error) {
      console.error("Failed to remove asset:", error);
    }
  },
}));
