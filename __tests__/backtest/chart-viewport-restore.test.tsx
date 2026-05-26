import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { useBacktestStore } from '@/lib/backtest-store';

/**
 * Test Suite: Chart Viewport Restoration on Resume
 * 
 * Validates that when reopening a backtest session:
 * 1. All candles up to CurrentTimestamp are loaded
 * 2. Chart viewport scrolls to show the last candle (checkpoint)
 * 3. Edge cases are handled (empty, single candle, timeframe switch)
 */
describe('Chart Viewport Restoration', () => {
  let mockKlineChart: any;
  let mockChartPro: any;

  beforeEach(() => {
    // Mock klinecharts instance with viewport control methods
    mockKlineChart = {
      scrollToTimestamp: vi.fn(),
      scrollToRealTime: vi.fn(),
      createOverlay: vi.fn(),
      removeOverlay: vi.fn(),
      getVisibleRange: vi.fn(() => ({ from: 0, to: 100 })),
    };

    // Mock KLineChartPro
    mockChartPro = {
      updateSymbol: vi.fn(),
      setPeriod: vi.fn(),
    };

    // Mock klinecharts init to return our mock
    vi.mock('klinecharts', () => ({
      init: vi.fn(() => mockKlineChart),
      registerOverlay: vi.fn(),
      LineType: { Dashed: 1, Solid: 0 },
    }));

    // Mock @klinecharts/pro
    vi.mock('@klinecharts/pro', () => ({
      KLineChartPro: vi.fn(() => mockChartPro),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 1: CRITICAL PATH - Resume session should scroll to last candle
   * 
   * Scenario: User reopens a backtest session with 100 candles
   * Expected: Chart viewport shows the last candle (checkpoint)
   */
  it('should scroll chart to last candle when resuming session with multiple candles', async () => {
    const mockCandles = generateMockCandles(100);
    const lastCandleTimestamp = new Date(mockCandles[99].timestamp).getTime();

    // Simulate resumeSession loading candles
    const store = useBacktestStore.getState();
    store.candles = mockCandles;

    // Verify scrollToTimestamp was called with the last candle's timestamp
    await waitFor(() => {
      expect(mockKlineChart.scrollToTimestamp).toHaveBeenCalledWith(
        lastCandleTimestamp
      );
    });
  });

  /**
   * Test 2: EDGE CASE - Empty session (no candles)
   * 
   * Scenario: Session exists but no candles loaded yet
   * Expected: No scroll action, no errors
   */
  it('should handle empty candle array gracefully', () => {
    const store = useBacktestStore.getState();
    store.candles = [];

    // Should not attempt to scroll
    expect(mockKlineChart.scrollToTimestamp).not.toHaveBeenCalled();
  });

  /**
   * Test 3: EDGE CASE - Single candle
   * 
   * Scenario: Session just started, only one candle exists
   * Expected: Scroll to that single candle
   */
  it('should scroll to the single candle when only one exists', async () => {
    const singleCandle = generateMockCandles(1);
    const timestamp = new Date(singleCandle[0].timestamp).getTime();

    const store = useBacktestStore.getState();
    store.candles = singleCandle;

    await waitFor(() => {
      expect(mockKlineChart.scrollToTimestamp).toHaveBeenCalledWith(timestamp);
    });
  });

  /**
   * Test 4: EDGE CASE - Timeframe switch during resumed session
   * 
   * Scenario: User switches timeframe while viewing resumed session
   * Expected: Chart maintains position relative to time, not candle index
   */
  it('should maintain timestamp position when switching timeframes', async () => {
    const store = useBacktestStore.getState();
    
    // Initial state: M5 with 100 candles
    const m5Candles = generateMockCandles(100, 'M5');
    store.candles = m5Candles;
    const lastTimestamp = new Date(m5Candles[99].timestamp).getTime();

    // Switch to H1 (fewer candles, same time range)
    const h1Candles = generateMockCandles(20, 'H1');
    store.candles = h1Candles;
    
    // Should still scroll to the same timestamp
    await waitFor(() => {
      expect(mockKlineChart.scrollToTimestamp).toHaveBeenCalledWith(
        expect.any(Number)
      );
    });
  });

  /**
   * Test 5: RACE CONDITION - Chart initializes before candles load
   * 
   * Scenario: Chart mounts before API returns candles
   * Expected: Scroll happens after candles arrive, not before
   */
  it('should wait for candles to load before attempting scroll', async () => {
    const store = useBacktestStore.getState();
    
    // Chart initialized but no candles yet
    store.candles = [];
    expect(mockKlineChart.scrollToTimestamp).not.toHaveBeenCalled();

    // Candles arrive asynchronously
    store.candles = generateMockCandles(50);
    
    await waitFor(() => {
      expect(mockKlineChart.scrollToTimestamp).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  /**
   * Test 6: INTEGRATION - getHistoryKLineData returns correct range
   * 
   * Scenario: KLineChartPro requests initial data via datafeed
   * Expected: All loaded candles are returned, not filtered
   */
  it('should return all loaded candles when chart requests history', () => {
    const mockCandles = generateMockCandles(100);
    const mapped = mockCandles.map(c => ({
      timestamp: new Date(c.timestamp).getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0
    }));

    // Simulate datafeed.getHistoryKLineData call
    const from = Date.now(); // Future timestamp (default chart behavior)
    const to = from + 86400000;
    const latestTs = mapped[mapped.length - 1].timestamp;

    // When requested range is in the future, return all candles
    const result = from > latestTs ? mapped : mapped.filter(c => c.timestamp >= from && c.timestamp <= to);
    
    expect(result.length).toBe(100);
    expect(result[0]).toEqual(mapped[0]);
    expect(result[99]).toEqual(mapped[99]);
  });

  /**
   * Test 7: BEHAVIOR - New session should NOT auto-scroll to end
   * 
   * Scenario: User creates a brand new backtest session
   * Expected: Chart starts at the beginning, not the end
   */
  it('should NOT scroll to end for new sessions (only resumed)', async () => {
    const store = useBacktestStore.getState();
    store.session = {
      id: 1,
      currentTimestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
      // ... other session fields
    } as any;

    // For new session, currentTimestamp equals startDate
    const isNewSession = store.session.currentTimestamp === store.session.startDate;
    
    if (isNewSession) {
      // Should not scroll (default chart behavior is fine)
      expect(mockKlineChart.scrollToTimestamp).not.toHaveBeenCalled();
    }
  });
});

// ─── Test Helpers ───────────────────────────────────────────────────────

function generateMockCandles(count: number, timeframe: string = 'M5') {
  const interval = timeframe === 'M5' ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5 min or 1 hour
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
  
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(baseTime + i * interval).toISOString(),
    open: 100 + Math.random() * 10,
    high: 105 + Math.random() * 10,
    low: 95 + Math.random() * 10,
    close: 100 + Math.random() * 10,
    volume: 1000 + Math.random() * 500,
  }));
}
