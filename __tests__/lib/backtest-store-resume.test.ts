import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBacktestStore } from '@/lib/backtest-store';
import { api } from '@/lib/api';

/**
 * Test Suite: Backtest Store - Resume Session Integration
 * 
 * Validates that resumeSession correctly:
 * 1. Clears previous session state
 * 2. Loads playback state from backend
 * 3. Loads all candles up to CurrentTimestamp
 * 4. Restores positions, orders, and drawings
 */
describe('BacktestStore - resumeSession', () => {
  beforeEach(() => {
    // Reset store to initial state
    useBacktestStore.getState().reset();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  /**
   * Test 1: Resume should clear previous session to prevent bleeding
   */
  it('should clear previous session state before loading new session', async () => {
    // Setup: Store has data from a previous session
    const store = useBacktestStore.getState();
    store.candles = [{ timestamp: '2024-01-01T00:00:00Z', open: 100, high: 105, low: 95, close: 102, volume: 1000 }] as any;
    store.pendingOrders = [{ id: 1 }] as any;
    store.activePositions = [{ id: 2 }] as any;

    // Mock API responses
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/backtest-playback/')) {
        return {
          data: {
            value: {
              currentTimestamp: '2024-01-02T00:00:00Z',
              activeTimeframe: 'M5',
              balance: 10000,
              equity: 10000,
              unrealizedPnl: 0,
              pendingOrders: [],
              activePositions: [],
              drawingsJson: '[]',
            }
          }
        } as any;
      }
      if (url.includes('/backtest-sessions/')) {
        return {
          data: {
            value: {
              id: 1,
              asset: 'EURUSD',
              startDate: '2024-01-01T00:00:00Z',
              currentBalance: 10000,
              activeTimeframe: 'M5',
            }
          }
        } as any;
      }
      if (url.includes('/backtest-market-data/')) {
        return {
          data: {
            value: [
              { timestamp: '2024-01-02T00:00:00Z', open: 110, high: 115, low: 108, close: 112, volume: 1500 }
            ]
          }
        } as any;
      }
      return { data: { value: [] } } as any;
    });

    // Execute
    await store.resumeSession(1);

    // Assert: Old data should be cleared, new data loaded
    const finalState = useBacktestStore.getState();
    expect(finalState.candles).toHaveLength(1);
    expect(finalState.candles[0].timestamp).toBe('2024-01-02T00:00:00Z');
    expect(finalState.pendingOrders).toHaveLength(0);
    expect(finalState.activePositions).toHaveLength(0);
  });

  /**
   * Test 2: Resume should load all candles from StartDate to CurrentTimestamp
   */
  it('should load all candles up to CurrentTimestamp', async () => {
    const mockCandles = [
      { timestamp: '2024-01-01T00:00:00Z', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: '2024-01-01T00:05:00Z', open: 102, high: 106, low: 100, close: 104, volume: 1200 },
      { timestamp: '2024-01-01T00:10:00Z', open: 104, high: 108, low: 103, close: 107, volume: 1100 },
    ];

    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/backtest-playback/')) {
        return {
          data: {
            value: {
              currentTimestamp: '2024-01-01T00:10:00Z',
              activeTimeframe: 'M5',
              balance: 10500,
              equity: 10500,
              unrealizedPnl: 0,
              pendingOrders: [],
              activePositions: [],
              drawingsJson: '[]',
            }
          }
        } as any;
      }
      if (url.includes('/backtest-sessions/')) {
        return {
          data: {
            value: {
              id: 1,
              asset: 'EURUSD',
              startDate: '2024-01-01T00:00:00Z',
              currentBalance: 10500,
              activeTimeframe: 'M5',
            }
          }
        } as any;
      }
      if (url.includes('/backtest-market-data/')) {
        return { data: { value: mockCandles } } as any;
      }
      return { data: { value: [] } } as any;
    });

    const store = useBacktestStore.getState();
    await store.resumeSession(1);

    const finalState = useBacktestStore.getState();
    expect(finalState.candles).toHaveLength(3);
    expect(finalState.candles[0].timestamp).toBe('2024-01-01T00:00:00Z');
    expect(finalState.candles[2].timestamp).toBe('2024-01-01T00:10:00Z');
  });

  /**
   * Test 3: Resume should restore active positions
   */
  it('should restore active positions from playback state', async () => {
    const mockPosition = {
      id: 10,
      orderType: 'Market',
      side: 'Long',
      status: 'Active',
      entryPrice: 1.1000,
      filledPrice: 1.1000,
      positionSize: 1.0,
      stopLoss: 1.0950,
      takeProfit: 1.1100,
      filledAt: '2024-01-01T00:05:00Z',
    };

    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/backtest-playback/')) {
        return {
          data: {
            value: {
              currentTimestamp: '2024-01-01T00:10:00Z',
              activeTimeframe: 'M5',
              balance: 10000,
              equity: 10050,
              unrealizedPnl: 50,
              pendingOrders: [],
              activePositions: [mockPosition],
              drawingsJson: '[]',
            }
          }
        } as any;
      }
      if (url.includes('/backtest-sessions/')) {
        return {
          data: { value: { id: 1, asset: 'EURUSD', activeTimeframe: 'M5', currentBalance: 10000 } }
        } as any;
      }
      // resumeSession finishes by calling loadOrders(), which fetches the full
      // order book. The session-orders endpoint returns the active position too,
      // so it must be mocked or loadOrders would overwrite the restored state.
      if (url.includes('/backtest-orders/session/')) {
        return { data: { value: [mockPosition] } } as any;
      }
      if (url.includes('/backtest-market-data/')) {
        return { data: { value: [] } } as any;
      }
      return { data: { value: [] } } as any;
    });

    const store = useBacktestStore.getState();
    await store.resumeSession(1);

    const finalState = useBacktestStore.getState();
    expect(finalState.activePositions).toHaveLength(1);
    expect(finalState.activePositions[0].id).toBe(10);
    expect(finalState.activePositions[0].side).toBe('Long');
    expect(finalState.unrealizedPnl).toBe(50);
  });

  /**
   * Test 4: EDGE CASE - Empty session (no candles, no positions)
   */
  it('should handle empty session gracefully', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/backtest-playback/')) {
        return {
          data: {
            value: {
              currentTimestamp: '2024-01-01T00:00:00Z',
              activeTimeframe: 'M5',
              balance: 10000,
              equity: 10000,
              unrealizedPnl: 0,
              pendingOrders: [],
              activePositions: [],
              drawingsJson: '[]',
            }
          }
        } as any;
      }
      if (url.includes('/backtest-sessions/')) {
        return {
          data: { value: { id: 1, asset: 'EURUSD', activeTimeframe: 'M5', currentBalance: 10000 } }
        } as any;
      }
      if (url.includes('/backtest-market-data/')) {
        return { data: { value: [] } } as any;
      }
      return { data: { value: [] } } as any;
    });

    const store = useBacktestStore.getState();
    await store.resumeSession(1);

    const finalState = useBacktestStore.getState();
    expect(finalState.candles).toHaveLength(0);
    expect(finalState.pendingOrders).toHaveLength(0);
    expect(finalState.activePositions).toHaveLength(0);
    expect(finalState.balance).toBe(10000);
  });

  /**
   * Test 5: Resume should restore chart drawings
   */
  it('should restore chart drawings from JSON', async () => {
    const mockDrawings = [
      { id: 'draw1', type: 'trendline', points: [{ x: 0, y: 100 }, { x: 10, y: 110 }] },
      { id: 'draw2', type: 'rectangle', points: [{ x: 5, y: 95 }, { x: 15, y: 105 }] },
    ];

    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/backtest-playback/')) {
        return {
          data: {
            value: {
              currentTimestamp: '2024-01-01T00:10:00Z',
              activeTimeframe: 'M5',
              balance: 10000,
              equity: 10000,
              unrealizedPnl: 0,
              pendingOrders: [],
              activePositions: [],
              drawingsJson: JSON.stringify(mockDrawings),
            }
          }
        } as any;
      }
      if (url.includes('/backtest-sessions/')) {
        return {
          data: { value: { id: 1, asset: 'EURUSD', activeTimeframe: 'M5', currentBalance: 10000 } }
        } as any;
      }
      if (url.includes('/backtest-market-data/')) {
        return { data: { value: [] } } as any;
      }
      return { data: { value: [] } } as any;
    });

    const store = useBacktestStore.getState();
    await store.resumeSession(1);

    const finalState = useBacktestStore.getState();
    expect(finalState.drawings).toHaveLength(2);
    expect(finalState.drawings[0].id).toBe('draw1');
    expect(finalState.drawings[1].type).toBe('rectangle');
  });
});
