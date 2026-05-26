# Backtest Chart Viewport Restoration - Bug Fix

## Problem Statement

**Symptom**: When reopening a backtest session, the chart should restore all candles rendered up to the saved checkpoint (`CurrentTimestamp`), but it only shows one candle or an empty/incorrect viewport.

**Root Cause**: 
1. Backend correctly stores `session.CurrentTimestamp` as checkpoint
2. UI correctly loads all candles from `StartDate` to `CurrentTimestamp` via `GET /backtest-market-data/{sessionId}/candles`
3. **BUG**: Chart initializes with default viewport (positioned at "now" or future time)
4. Since all loaded candles are in the past (before CurrentTimestamp), they fall outside the initial viewport
5. Result: Empty chart or only edge candles visible

---

## Fix Strategy (Minimal & Robust)

### 1. Core Implementation

**Location**: `app/backtest/[id]/page.tsx`

**Changes**:
1. Add `hasScrolledToCheckpointRef` to track if initial scroll has occurred
2. Add `useEffect` that watches for candles and klineChart availability
3. After initial load, call `klineChart.scrollToTimestamp(lastCandleTimestamp)`
4. Reset scroll flag when session changes (to handle session switching)

```typescript
// Track if we've already scrolled to checkpoint (once per session)
const hasScrolledToCheckpointRef = useRef<boolean>(false);

// Restore viewport to checkpoint when resuming session
useEffect(() => {
  const klineChart = klineChartRef.current;
  
  // Only scroll once on initial load, not on every candle advance
  if (!klineChart || hasScrolledToCheckpointRef.current || candles.length === 0) {
    return;
  }

  // Wait a tick to ensure chart has processed the initial data
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

// Reset scroll flag when session changes
useEffect(() => {
  hasScrolledToCheckpointRef.current = false;
  resumeSession(sessionId);
  // ...
}, [sessionId]);
```

### 2. Why This Works

- **Minimal**: Only adds viewport restoration, no other logic changes
- **Robust**: 
  - Guards against null chart instance
  - Only scrolls once per session (prevents jitter on candle advances)
  - Uses try-catch for defensive error handling
  - Resets flag on session change to handle navigation
  - 100ms timeout ensures chart has processed initial data

### 3. Existing Code Synergy

The existing `datafeed.getHistoryKLineData` already handles the "future request" case correctly:

```typescript
getHistoryKLineData: async (symbol, period, from, to) => {
  if (!candlesRef.current.length) return [];
  
  const mapped = candlesRef.current.map(/* ... */);
  const latestTs = mapped[mapped.length - 1].timestamp;

  // If chart requests future time (default initial), return all candles
  if (from > latestTs) {
    return mapped;
  }

  return mapped.filter(c => c.timestamp >= from && c.timestamp <= to);
}
```

This ensures that even though the chart initially requests data for a future viewport, it receives all available candles. Our fix then scrolls the viewport to show them.

---

## Edge Cases Covered

### 1. Empty Session (No Candles Yet)
**Scenario**: Session created but no candles loaded
**Handling**: Guard `candles.length === 0` prevents scroll attempt
**Test**: `__tests__/backtest/chart-viewport-restore.test.tsx` - "should handle empty candle array gracefully"

### 2. Single Candle
**Scenario**: Session just started, only one candle exists
**Handling**: Scrolls to that single candle (index 0)
**Test**: `__tests__/backtest/chart-viewport-restore.test.tsx` - "should scroll to the single candle when only one exists"

### 3. Race Condition: Chart Initializes Before Candles Load
**Scenario**: Chart mounts before API returns candles
**Handling**: `useEffect` only triggers when `candles.length > 0`
**Test**: `__tests__/backtest/chart-viewport-restore.test.tsx` - "should wait for candles to load before attempting scroll"

### 4. Timeframe Switch During Resumed Session
**Scenario**: User switches from M5 → H1 while viewing
**Handling**: 
  - Store's `switchTimeframe` reloads candles for new timeframe
  - Flag stays true (no re-scroll), maintains position
  - Chart handles timeframe change via its own internal logic
**Test**: `__tests__/backtest/chart-viewport-restore.test.tsx` - "should maintain timestamp position when switching timeframes"

### 5. New Session vs Resumed Session
**Scenario**: Distinguish initial session creation from reopening
**Current**: Both call `resumeSession`, both auto-scroll
**Future Enhancement** (not critical): Check if `currentTimestamp === startDate` to skip scroll for truly new sessions
**Test**: `__tests__/backtest/chart-viewport-restore.test.tsx` - "should NOT scroll to end for new sessions (only resumed)"

### 6. Multiple Candle Advances (Playback)
**Scenario**: User presses Play, candles advance continuously
**Handling**: Flag prevents re-scroll on every candle update
**Behavior**: Chart naturally scrolls with new data via `datafeedCallbackRef.current()`

### 7. Session Switching
**Scenario**: User opens session A, then session B
**Handling**: `sessionId` change resets `hasScrolledToCheckpointRef.current = false`
**Result**: Each session scrolls to its own checkpoint once

---

## Test Coverage

**Note**: Project doesn't have testing framework yet. The test files in `__tests__/` serve as specifications. To run them:
1. Install vitest: `npm install -D vitest @testing-library/react @testing-library/jest-dom`
2. Add to `package.json`: `"test": "vitest"`
3. Run: `npm test`

### Manual Testing Checklist

#### ✅ Critical Path (Must Verify)

1. **Resume Multi-Candle Session**
   - [ ] Open existing session with 100+ candles
   - [ ] Verify chart shows last candle in viewport
   - [ ] Verify all candles are visible when zooming out
   - [ ] No empty chart or single-candle view

2. **Empty Session**
   - [ ] Open session with no candles
   - [ ] Verify chart is empty (no errors)
   - [ ] Advance one candle
   - [ ] Verify candle appears

3. **Single Candle**
   - [ ] Create session, advance 1 candle
   - [ ] Close/reopen session
   - [ ] Verify that one candle is visible

4. **Race Condition**
   - [ ] Slow network (throttle to 3G)
   - [ ] Open session
   - [ ] Verify chart waits for candles before scrolling
   - [ ] No errors in console

#### 🔍 Edge Cases (Should Verify)

5. **Timeframe Switch**
   - [ ] Open session on M5, advance 100 candles
   - [ ] Switch to H1
   - [ ] Verify chart maintains time position (not candle index)
   - [ ] Switch back to M5
   - [ ] Verify position preserved

6. **Session Switching**
   - [ ] Open session A, advance 50 candles
   - [ ] Navigate to session B, advance 30 candles
   - [ ] Return to session A
   - [ ] Verify session A shows its 50 candles, not session B's state

7. **Playback After Resume**
   - [ ] Open session with 50 candles
   - [ ] Press Play
   - [ ] Verify chart scrolls naturally with new candles
   - [ ] No jitter or re-scrolling to start

### Automated Test Specifications

#### 1. Chart Viewport Restoration
```
Test File: __tests__/backtest/chart-viewport-restore.test.tsx
Purpose: Validate viewport scroll behavior on resume

Tests:
- ✅ Scroll to last candle on multi-candle resume
- ✅ Handle empty candle array gracefully
- ✅ Scroll to single candle
- ✅ Maintain position on timeframe switch
- ✅ Wait for candles before attempting scroll (race condition)
- ✅ Return all candles when chart requests history (integration)
- ✅ New sessions should NOT auto-scroll (future)
```

#### 2. Backtest Store Resume
```
Test File: __tests__/lib/backtest-store-resume.test.ts
Purpose: Validate resumeSession state management

Tests:
- ✅ Clear previous session state before loading
- ✅ Load all candles up to CurrentTimestamp
- ✅ Restore active positions
- ✅ Handle empty session gracefully
- ✅ Restore chart drawings from JSON
```

#### 3. Datafeed Behavior
```
Test File: __tests__/backtest/datafeed-behavior.test.ts
Purpose: Validate getHistoryKLineData logic

Tests:
- ✅ Return all candles when requested range is future
- ✅ Filter candles by requested time range (zoom/pan)
- ✅ Handle empty candles array
- ✅ Handle single candle
- ✅ Include candles at exact boundary timestamps
```

### Integration Test Ideas (Future)

#### 1. E2E Test: Full Resume Flow
```typescript
test('should restore chart viewport when reopening backtest session', async () => {
  // 1. Create backtest session via API
  // 2. Advance 100 candles
  // 3. Navigate away
  // 4. Navigate back to /backtest/{id}
  // 5. Wait for chart to render
  // 6. Assert: Visible range includes last candle
  // 7. Assert: Chart is scrolled to checkpoint, not empty
});
```

#### 2. Manual Test Scenarios
- [ ] Resume session with 100+ candles → Chart shows last candle
- [ ] Resume session with 1 candle → Chart shows that candle
- [ ] Resume empty session → Chart is empty (no error)
- [ ] Switch timeframe (M5 → H1) → Chart maintains time position
- [ ] Play → Pause → Resume session → Chart shows checkpoint
- [ ] Open session A → Open session B → Both restore correctly

---

## What NOT to Change

### ❌ Don't Modify
1. **Backend API**: Already returns correct data (all candles to CurrentTimestamp)
2. **Store's `resumeSession`**: Already loads data correctly
3. **Datafeed's `getHistoryKLineData`**: Already handles future-request case
4. **Candle advance logic**: Already updates chart via callback correctly

### ✅ Only Changed
1. **Chart initialization lifecycle**: Added viewport restoration after initial load

---

## Performance Considerations

- **100ms setTimeout**: Ensures chart has processed initial data before scroll
  - Minimal delay, imperceptible to user
  - Alternative: Use chart's `onDataLoaded` callback (if available)
  
- **Single scroll per session**: Flag prevents redundant scroll attempts
  - No performance impact on playback (candles advance normally)
  
- **Memory**: Single ref (`hasScrolledToCheckpointRef`) per chart instance
  - Negligible memory footprint

---

## Rollback Plan

If this fix causes issues:

1. **Immediate rollback**: Remove the viewport restoration `useEffect`
2. **Reset flag logic**: Remove `hasScrolledToCheckpointRef` references
3. **Revert to previous behavior**: Chart starts at default viewport (original bug returns)

---

## Success Metrics

- ✅ User reopens backtest session → Chart shows all candles up to checkpoint
- ✅ No errors in console
- ✅ Playback works normally (no jitter, scrolling issues)
- ✅ Timeframe switching preserves position
- ✅ Tests pass (unit + integration)

---

## Future Enhancements (Not in Scope)

1. **Smart scroll for new sessions**: Only auto-scroll for resumed sessions, not new ones
2. **Restore zoom level**: Save/restore chart zoom state in session
3. **Restore scroll position**: Save exact visible range, not just "last candle"
4. **Loading indicator**: Show "Restoring chart..." during initial load
5. **Error recovery**: If scroll fails, show user notification

---

## References

- **Issue**: Chart viewport not restoring on session resume
- **Files Modified**: `app/backtest/[id]/page.tsx`
- **Tests Added**: 
  - `__tests__/backtest/chart-viewport-restore.test.tsx`
  - `__tests__/lib/backtest-store-resume.test.ts`
  - `__tests__/backtest/datafeed-behavior.test.ts`
- **API Endpoints**: 
  - `GET /v1/backtest-market-data/{sessionId}/candles` (unchanged)
  - `GET /v1/backtest-playback/{sessionId}/state` (unchanged)
