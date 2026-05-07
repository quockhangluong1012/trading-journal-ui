import { beforeEach, describe, expect, it, vi } from "vitest";

const getStatusMock = vi.fn();
const getAlertsMock = vi.fn();
const getWatchlistsMock = vi.fn();
const createWatchlistMock = vi.fn();
const startScannerMock = vi.fn();
const stopScannerMock = vi.fn();
const startWatchlistScannerMock = vi.fn();
const stopWatchlistScannerMock = vi.fn();

vi.mock("@/lib/scanner-api", () => ({
  ScannerStatus: {
    Stopped: 0,
    Running: 1,
    Error: 2,
  },
  scannerApi: {
    getStatus: (...args: unknown[]) => getStatusMock(...args),
    getAlerts: (...args: unknown[]) => getAlertsMock(...args),
    getWatchlists: (...args: unknown[]) => getWatchlistsMock(...args),
    createWatchlist: (...args: unknown[]) => createWatchlistMock(...args),
    startScanner: (...args: unknown[]) => startScannerMock(...args),
    stopScanner: (...args: unknown[]) => stopScannerMock(...args),
    startWatchlistScanner: (...args: unknown[]) => startWatchlistScannerMock(...args),
    stopWatchlistScanner: (...args: unknown[]) => stopWatchlistScannerMock(...args),
  },
}));

import { ScannerStatus } from "@/lib/scanner-api";
import { useScannerStore } from "@/lib/stores/scanner-store";

function createStatus(status: ScannerStatus) {
  return {
    status,
    assetsScanned: 0,
    activeAlerts: 0,
  };
}

function createWatchlist(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "FX majors",
    isActive: true,
    isScannerRunning: false,
    assets: [],
    ...overrides,
  };
}

describe("useScannerStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useScannerStore.setState({
      status: createStatus(ScannerStatus.Stopped),
      alerts: [],
      watchlists: [],
      connection: null,
      isLoading: false,
      newsWarnings: [],
      newsReleases: [],
    });
  });

  it("normalizes missing watchlist assets during the initial fetch", async () => {
    getStatusMock.mockResolvedValue(createStatus(ScannerStatus.Stopped));
    getAlertsMock.mockResolvedValue({ items: [], totalCount: 0 });
    getWatchlistsMock.mockResolvedValue([
      {
        id: 1,
        name: "FX majors",
        isActive: true,
        isScannerRunning: false,
      },
    ]);

    await useScannerStore.getState().fetchInitialData();

    expect(useScannerStore.getState().watchlists).toMatchObject([
      {
        id: 1,
        name: "FX majors",
        isActive: true,
        isScannerRunning: false,
        assets: [],
      },
    ]);
  });

  it("normalizes missing watchlist assets when creating a watchlist", async () => {
    createWatchlistMock.mockResolvedValue({
      id: 2,
      name: "Swing setups",
      isActive: true,
      isScannerRunning: false,
    });

    await useScannerStore.getState().createWatchlist("Swing setups");

    expect(useScannerStore.getState().watchlists).toMatchObject([
      {
        id: 2,
        name: "Swing setups",
        isActive: true,
        isScannerRunning: false,
        assets: [],
      },
    ]);
  });

  it("normalizes missing watchlist assets when starting the scanner", async () => {
    startScannerMock.mockResolvedValue(undefined);
    getWatchlistsMock.mockResolvedValue([
      {
        id: 3,
        name: "Index futures",
        isActive: true,
        isScannerRunning: true,
      },
    ]);

    await useScannerStore.getState().startScanner();

    expect(startScannerMock).toHaveBeenCalledTimes(1);
    expect(getWatchlistsMock).toHaveBeenCalledTimes(1);
    expect(useScannerStore.getState().status.status).toBe(ScannerStatus.Running);
    expect(useScannerStore.getState().watchlists).toMatchObject([
      {
        id: 3,
        name: "Index futures",
        isActive: true,
        isScannerRunning: true,
        assets: [],
      },
    ]);
  });

  it("normalizes missing watchlist assets when stopping the scanner", async () => {
    useScannerStore.setState({
      status: createStatus(ScannerStatus.Running),
    });
    stopScannerMock.mockResolvedValue(undefined);
    getWatchlistsMock.mockResolvedValue([
      {
        id: 4,
        name: "Commodities",
        isActive: true,
        isScannerRunning: false,
      },
    ]);

    await useScannerStore.getState().stopScanner();

    expect(stopScannerMock).toHaveBeenCalledTimes(1);
    expect(getWatchlistsMock).toHaveBeenCalledTimes(1);
    expect(useScannerStore.getState().status.status).toBe(ScannerStatus.Stopped);
    expect(useScannerStore.getState().watchlists).toMatchObject([
      {
        id: 4,
        name: "Commodities",
        isActive: true,
        isScannerRunning: false,
        assets: [],
      },
    ]);
  });

  it("sets global status to running when a watchlist scanner starts", async () => {
    useScannerStore.setState({
      watchlists: [createWatchlist()],
    });
    startWatchlistScannerMock.mockResolvedValue({
      id: 1,
      name: "FX majors",
      isActive: true,
      isScannerRunning: true,
    });

    await useScannerStore.getState().toggleWatchlistScanner(1, true);

    expect(startWatchlistScannerMock).toHaveBeenCalledWith(1);
    expect(useScannerStore.getState().status.status).toBe(ScannerStatus.Running);
    expect(useScannerStore.getState().watchlists).toMatchObject([
      createWatchlist({ isScannerRunning: true }),
    ]);
  });

  it("keeps global status running when another watchlist scanner is still active", async () => {
    useScannerStore.setState({
      status: createStatus(ScannerStatus.Running),
      watchlists: [
        createWatchlist({ id: 1, isScannerRunning: true }),
        createWatchlist({ id: 2, name: "Crypto majors", isScannerRunning: true }),
      ],
    });
    stopWatchlistScannerMock.mockResolvedValue({
      id: 1,
      name: "FX majors",
      isActive: true,
      isScannerRunning: false,
    });

    await useScannerStore.getState().toggleWatchlistScanner(1, false);

    expect(stopWatchlistScannerMock).toHaveBeenCalledWith(1);
    expect(useScannerStore.getState().status.status).toBe(ScannerStatus.Running);
    expect(useScannerStore.getState().watchlists).toMatchObject([
      createWatchlist({ id: 1, isScannerRunning: false }),
      createWatchlist({ id: 2, name: "Crypto majors", isScannerRunning: true }),
    ]);
  });

  it("sets global status to stopped when the last watchlist scanner stops", async () => {
    useScannerStore.setState({
      status: createStatus(ScannerStatus.Running),
      watchlists: [createWatchlist({ id: 1, isScannerRunning: true })],
    });
    stopWatchlistScannerMock.mockResolvedValue({
      id: 1,
      name: "FX majors",
      isActive: true,
      isScannerRunning: false,
    });

    await useScannerStore.getState().toggleWatchlistScanner(1, false);

    expect(stopWatchlistScannerMock).toHaveBeenCalledWith(1);
    expect(useScannerStore.getState().status.status).toBe(ScannerStatus.Stopped);
    expect(useScannerStore.getState().watchlists).toMatchObject([
      createWatchlist({ id: 1, isScannerRunning: false }),
    ]);
  });
});