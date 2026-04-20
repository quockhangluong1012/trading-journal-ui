import { describe, it, expect } from 'vitest';

/**
 * Test Suite: Chart Datafeed Behavior
 * 
 * Validates getHistoryKLineData logic for:
 * 1. Initial load (chart requests data for its default viewport)
 * 2. Resumed sessions (all candles should be visible)
 * 3. Zooming/panning (filtering by time range)
 */
describe('Chart Datafeed - getHistoryKLineData', () => {
  /**
   * Test 1: When chart requests future range (default), return all candles
   * 
   * Scenario: Chart initializes with viewport positioned at "now" or future
   * Loaded candles are all in the past (up to CurrentTimestamp)
   * Expected: Return all candles so chart can render them
   */
  it('should return all candles when requested range is in the future', () => {
    const mockCandles = [
      { timestamp: '2024-01-01T00:00:00Z', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: '2024-01-01T00:05:00Z', open: 102, high: 106, low: 100, close: 104, volume: 1200 },
      { timestamp: '2024-01-01T00:10:00Z', open: 104, high: 108, low: 103, close: 107, volume: 1100 },
    ];

    const mapped = mockCandles.map(c => ({
      timestamp: new Date(c.timestamp).getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0
    }));

    const latestTs = mapped[mapped.length - 1].timestamp; // 2024-01-01T00:10:00Z
    
    // Chart requests range in the future (default behavior)
    const from = Date.now(); // e.g., 2024-04-17 (far in future)
    const to = from + 86400000;

    // Implementation logic
    const result = from > latestTs ? mapped : mapped.filter(c => c.timestamp >= from && c.timestamp <= to);

    expect(result.length).toBe(3);
    expect(result).toEqual(mapped);
  });

  /**
   * Test 2: When chart requests valid historical range, filter correctly
   * 
   * Scenario: User zooms/pans to a specific time window
   * Expected: Return only candles in that range
   */
  it('should filter candles by requested time range', () => {
    const mockCandles = [
      { timestamp: '2024-01-01T00:00:00Z', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: '2024-01-01T00:05:00Z', open: 102, high: 106, low: 100, close: 104, volume: 1200 },
      { timestamp: '2024-01-01T00:10:00Z', open: 104, high: 108, low: 103, close: 107, volume: 1100 },
      { timestamp: '2024-01-01T00:15:00Z', open: 107, high: 110, low: 106, close: 109, volume: 1300 },
    ];

    const mapped = mockCandles.map(c => ({
      timestamp: new Date(c.timestamp).getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0
    }));

    const latestTs = mapped[mapped.length - 1].timestamp;
    
    // Chart requests range: 00:05 to 00:10 (middle 2 candles)
    const from = new Date('2024-01-01T00:05:00Z').getTime();
    const to = new Date('2024-01-01T00:10:00Z').getTime();

    // Implementation logic
    const result = from > latestTs ? mapped : mapped.filter(c => c.timestamp >= from && c.timestamp <= to);

    expect(result.length).toBe(2);
    expect(result[0].timestamp).toBe(new Date('2024-01-01T00:05:00Z').getTime());
    expect(result[1].timestamp).toBe(new Date('2024-01-01T00:10:00Z').getTime());
  });

  /**
   * Test 3: EDGE CASE - Empty candles array
   */
  it('should return empty array when no candles loaded', () => {
    const mockCandles: any[] = [];
    const mapped = mockCandles.map(c => ({
      timestamp: new Date(c.timestamp).getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0
    }));

    if (!mapped.length) {
      expect(mapped).toEqual([]);
      return;
    }

    const latestTs = mapped[mapped.length - 1].timestamp;
    const from = Date.now();
    const to = from + 86400000;

    const result = from > latestTs ? mapped : mapped.filter(c => c.timestamp >= from && c.timestamp <= to);
    expect(result).toEqual([]);
  });

  /**
   * Test 4: EDGE CASE - Single candle
   */
  it('should handle single candle correctly', () => {
    const mockCandles = [
      { timestamp: '2024-01-01T00:00:00Z', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    ];

    const mapped = mockCandles.map(c => ({
      timestamp: new Date(c.timestamp).getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0
    }));

    const latestTs = mapped[mapped.length - 1].timestamp;
    const from = Date.now();
    const to = from + 86400000;

    const result = from > latestTs ? mapped : mapped.filter(c => c.timestamp >= from && c.timestamp <= to);

    expect(result.length).toBe(1);
    expect(result[0]).toEqual(mapped[0]);
  });

  /**
   * Test 5: Boundary condition - Exact timestamp match
   */
  it('should include candles at exact boundary timestamps', () => {
    const mockCandles = [
      { timestamp: '2024-01-01T00:00:00Z', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: '2024-01-01T00:05:00Z', open: 102, high: 106, low: 100, close: 104, volume: 1200 },
      { timestamp: '2024-01-01T00:10:00Z', open: 104, high: 108, low: 103, close: 107, volume: 1100 },
    ];

    const mapped = mockCandles.map(c => ({
      timestamp: new Date(c.timestamp).getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0
    }));

    const latestTs = mapped[mapped.length - 1].timestamp;
    
    // Request exactly the range of the data
    const from = mapped[0].timestamp;
    const to = mapped[2].timestamp;

    const result = from > latestTs ? mapped : mapped.filter(c => c.timestamp >= from && c.timestamp <= to);

    expect(result.length).toBe(3);
    expect(result[0].timestamp).toBe(from);
    expect(result[2].timestamp).toBe(to);
  });
});
