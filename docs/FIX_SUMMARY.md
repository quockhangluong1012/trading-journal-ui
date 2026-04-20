# Backtest Chart Viewport Bug - Fix Summary

## 1️⃣ Smallest Robust Fix Strategy

### The 3-Line Solution

**Problem**: Chart initializes with default viewport positioned at "now" (future), but all loaded candles are in the past (up to `CurrentTimestamp`), so they fall outside the viewport.

**Fix**: After chart initializes and candles load, scroll viewport to the last candle.

### Implementation (in `app/backtest/[id]/page.tsx`)

```typescript
// Add ref to track if we've scrolled (prevent re-scroll on every candle)
const hasScrolledToCheckpointRef = useRef<boolean>(false);

// Add useEffect to restore viewport after initial load
useEffect(() => {
  const klineChart = klineChartRef.current;
  
  if (!klineChart || hasScrolledToCheckpointRef.current || candles.length === 0) {
    return;
  }

  const timeoutId = setTimeout(() => {
    const lastCandle = candles[candles.length - 1];
    const lastTimestamp = new Date(lastCandle.timestamp).getTime();
    
    try {
      klineChart.scrollToTimestamp(lastTimestamp);
      hasScrolledToCheckpointRef.current = true;
    } catch (error) {
      console.warn('Failed to scroll to checkpoint:', error);
    }
  }, 100);

  return () => clearTimeout(timeoutId);
}, [candles, klineChartRef.current]);

// Reset flag when session changes
useEffect(() => {
  hasScrolledToCheckpointRef.current = false;
  resumeSession(sessionId);
  // ... rest of code
}, [sessionId]);
```

### Why This Works

✅ **Minimal**: Only adds viewport restoration, doesn't change data loading
✅ **Robust**: 
- Guards against null/undefined
- Only scrolls once (prevents jitter during playback)
- 100ms delay ensures chart has processed data
- Resets on session change
- Try-catch for defensive error handling

---

## 2️⃣ Edge Cases to Cover

### Critical Edge Cases

| Edge Case | Symptom | Handling |
|-----------|---------|----------|
| **Empty session** | No candles loaded | Guard: `candles.length === 0` prevents scroll |
| **Single candle** | Only 1 candle exists | Scrolls to index 0 (works correctly) |
| **Race condition** | Chart mounts before candles load | `useEffect` only triggers when `candles.length > 0` |
| **Timeframe switch** | User changes M5 → H1 | Flag stays true (no re-scroll), position maintained |
| **Session switch** | User opens Session A → Session B | `sessionId` change resets flag, each session scrolls once |
| **Playback** | User presses Play, candles advance | Flag prevents re-scroll, chart scrolls naturally |

### Edge Case Validation

**1. Empty Session**
```typescript
// candles = []
if (!klineChart || candles.length === 0) {
  return; // ✅ No scroll attempt
}
```

**2. Single Candle**
```typescript
// candles = [{ timestamp: '2024-01-01T00:00:00Z', ... }]
const lastTimestamp = new Date(candles[0].timestamp).getTime();
klineChart.scrollToTimestamp(lastTimestamp); // ✅ Scrolls to that candle
```

**3. Race Condition**
```typescript
// Chart mounts → candles = []
// ... 500ms later ...
// candles = [100 items from API]
// useEffect triggers → scrolls to last candle ✅
```

**4. Timeframe Switch**
```typescript
// hasScrolledToCheckpointRef.current = true (already scrolled)
// User switches M5 → H1
// useEffect sees flag is true → no re-scroll ✅
// Chart handles timeframe change internally
```

**5. Session Switch**
```typescript
// Session A: hasScrolledToCheckpointRef.current = true
// sessionId changes from 1 → 2
// useEffect resets: hasScrolledToCheckpointRef.current = false
// Session B loads → scrolls to its checkpoint ✅
```

**6. Playback (Continuous Candle Advance)**
```typescript
// hasScrolledToCheckpointRef.current = true (scrolled on initial load)
// User presses Play → advanceCandle() → candles array grows
// useEffect sees flag is true → no re-scroll ✅
// Existing callback handles new candles:
datafeedCallbackRef.current({
  timestamp: latest.timestamp,
  // ... chart scrolls naturally
});
```

---

## 3️⃣ Unit/Integration Test Ideas

### A. Unit Tests (Pure Logic)

#### Test 1: `getHistoryKLineData` - Future Request
```typescript
// When chart requests data for future viewport (default initial)
// Should return ALL candles (so scroll can position them)

const candles = [100 items from StartDate to CurrentTimestamp];
const latestTs = candles[99].timestamp; // e.g., 2024-01-10

const from = Date.now(); // e.g., 2024-04-17 (future)
const to = from + 86400000;

// Implementation:
const result = from > latestTs ? candles : candles.filter(...);

// Assert:
expect(result.length).toBe(100); // ✅ All candles returned
```

#### Test 2: `getHistoryKLineData` - Historical Range
```typescript
// When user zooms/pans to specific time window
// Should filter to that range

const from = new Date('2024-01-01T00:05:00Z').getTime();
const to = new Date('2024-01-01T00:10:00Z').getTime();

const result = candles.filter(c => c.timestamp >= from && c.timestamp <= to);

// Assert:
expect(result.length).toBe(2); // ✅ Only candles in range
```

#### Test 3: Scroll Flag Logic
```typescript
// Should only scroll once per session

let scrollCalls = 0;
const mockChart = { scrollToTimestamp: () => scrollCalls++ };

// First load: candles = [100 items]
hasScrolledToCheckpointRef.current = false;
if (!hasScrolledToCheckpointRef.current && candles.length > 0) {
  mockChart.scrollToTimestamp(lastTimestamp);
  hasScrolledToCheckpointRef.current = true;
}

// Candle advance: candles = [101 items]
if (!hasScrolledToCheckpointRef.current && candles.length > 0) {
  mockChart.scrollToTimestamp(lastTimestamp); // Not called
}

// Assert:
expect(scrollCalls).toBe(1); // ✅ Scrolled only once
```

### B. Integration Tests (API + State)

#### Test 4: Resume Session Flow
```typescript
// Full flow: API → Store → Chart

// 1. Mock API: GET /backtest-playback/{id}/state
//    Returns: { currentTimestamp: '2024-01-10', ... }

// 2. Mock API: GET /backtest-market-data/{id}/candles
//    Returns: [100 candles from StartDate to '2024-01-10']

// 3. Call resumeSession(1)
await useBacktestStore.getState().resumeSession(1);

// 4. Assert: Store state
const state = useBacktestStore.getState();
expect(state.candles.length).toBe(100);
expect(state.candles[99].timestamp).toBe('2024-01-10T...');

// 5. Assert: Chart scrolled
expect(mockChart.scrollToTimestamp).toHaveBeenCalledWith(
  new Date('2024-01-10T...').getTime()
);
```

#### Test 5: Empty Session Handling
```typescript
// API returns no candles

vi.spyOn(api, 'get').mockResolvedValue({ 
  data: { value: [] } // Empty candles
});

await useBacktestStore.getState().resumeSession(1);

const state = useBacktestStore.getState();
expect(state.candles).toEqual([]);
expect(mockChart.scrollToTimestamp).not.toHaveBeenCalled(); // ✅ No scroll
```

#### Test 6: Session State Isolation
```typescript
// Switching sessions should clear previous state

// Load Session A
await resumeSession(1);
expect(useBacktestStore.getState().candles.length).toBe(100);

// Load Session B
await resumeSession(2);
const state = useBacktestStore.getState();

// Assert: Session A data cleared
expect(state.session?.id).toBe(2);
expect(state.candles.length).toBe(50); // Session B's candles
expect(state.pendingOrders.length).toBe(0); // Cleared
```

### C. Manual Test Scenarios

#### Scenario 1: Critical Path (Must Work)
```
1. Create backtest session, advance 100 candles
2. Close browser tab
3. Reopen: /backtest/{id}
4. ✅ Chart shows last candle (checkpoint)
5. ✅ All 100 candles visible when zooming out
6. ✅ No empty chart or single-candle bug
```

#### Scenario 2: Playback After Resume
```
1. Open session with 50 candles
2. ✅ Chart shows candle #50
3. Press Play
4. ✅ Chart scrolls naturally with new candles
5. ✅ No jitter or re-scrolling to start
```

#### Scenario 3: Timeframe Switching
```
1. Open session on M5, 100 candles
2. ✅ Chart shows last candle
3. Switch to H1 (fewer candles, same time)
4. ✅ Chart maintains time position (not index)
5. Switch back to M5
6. ✅ Position preserved
```

---

## Implementation Checklist

- [x] Add `hasScrolledToCheckpointRef` ref
- [x] Add viewport restoration `useEffect`
- [x] Add timeout for chart data processing
- [x] Add try-catch for error handling
- [x] Reset flag on session change
- [x] Guard against null chart
- [x] Guard against empty candles
- [ ] Manual test: Resume 100-candle session
- [ ] Manual test: Empty session
- [ ] Manual test: Timeframe switch
- [ ] Manual test: Playback after resume

---

## Files Modified

✅ **app/backtest/[id]/page.tsx**
- Added `hasScrolledToCheckpointRef` ref
- Added viewport restoration `useEffect`
- Reset flag on `sessionId` change

📝 **docs/BACKTEST_CHART_VIEWPORT_FIX.md**
- Full technical documentation
- Edge case analysis
- Test specifications

📝 **Test Specifications** (in `__tests__/`)
- `chart-viewport-restore.test.tsx` - Viewport behavior
- `backtest-store-resume.test.ts` - Store integration
- `datafeed-behavior.test.ts` - Datafeed logic

---

## Success Criteria

✅ User reopens session → Chart shows all candles to checkpoint  
✅ No console errors  
✅ Playback works normally (no jitter)  
✅ Timeframe switching preserves position  
✅ Session switching works correctly  

---

## Rollback Plan

If issues occur:
1. Remove viewport restoration `useEffect` (lines ~150-175)
2. Remove `hasScrolledToCheckpointRef` declaration
3. Remove flag reset in session change `useEffect`
4. Chart returns to default viewport (original bug)
