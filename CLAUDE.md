# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Trading Journal — a Next.js 16 (App Router, React 19) front-end for a trading journal / backtesting platform. It is purely a client UI: all data comes from a separate .NET backend reached over `NEXT_PUBLIC_API_URL`. There is no Next.js server-side data layer, API routes, or database here.

## Commands

```bash
npm run dev      # start dev server
npm run build    # next build (NOTE: TS errors are ignored at build time — see below)
npm run lint     # eslint .
npm test         # vitest run (all tests, headless)
npx vitest run __tests__/lib/setup-flow.test.ts   # run a single test file
npx vitest                                         # watch mode
```

- `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so `npm run build` will **not** catch type errors. Type safety is only enforced through the editor / `tsc` — be careful, broken types still ship.
- Path alias `@/*` maps to the repo root (configured in both `tsconfig.json` and `vitest.config.ts`).
- `NEXT_PUBLIC_API_URL` is set in `.env` (deployed backend) and `.env.development` (`https://localhost:7177`). The client appends `/api` to this base.

## Architecture

### API layer (`lib/api.ts` + `lib/*-api.ts`)
- A single shared axios instance lives in `lib/api.ts` and is exported as `api`. **All HTTP traffic goes through it** — do not create new axios instances for API calls.
- Auth is token-based. The JWT lives in `localStorage` under `trading-journey-auth-user`, and is also mirrored into cookies (`trading-journey-token`, `trading-journey-role`) so route/role logic can read it. `attachToken()` re-applies the `Authorization` header from storage; call it before making authenticated requests from a store that may run before hydration.
- The response interceptor in `lib/api.ts` handles **401 → silent refresh**: it calls `/v1/auth/refresh`, queues concurrent requests while one refresh is in flight, retries the original request, and on failure clears auth and redirects to the correct login page (`/login` vs `/admin/login`, preserving a `?next=` path). `lib/auth-redirect.ts` holds the (sanitized) redirect helpers.
- Backend responses are wrapped: `ApiResponse<T>` = `{ isSuccess, value }`, and paginated endpoints return `ApiPaginatedResponse<T>` = `{ isSuccess, value: { values, totalItems, hasMore } }`. Always unwrap `.value`.
- Each feature has a dedicated `lib/<feature>-api.ts` module (e.g. `trade`, `analytics`, `backtest` endpoints in `api.ts`, plus `risk-api`, `playbook-api`, `coach-api`, `scanner-api`, etc.) holding its request/response DTOs and typed `api.get/post` calls.

### State management
Two coexisting patterns — prefer **Zustand stores** for new work:
- **Zustand stores** (`lib/stores/` and assorted `lib/*-store.ts`) are the primary state layer. Stores own both state and the async API actions that mutate it, and surface user-facing errors via `toast` (sonner). Notable: `use-trade-api-store`, `use-session-store`, `use-psychology-api-store` (re-exported from `lib/stores/index.ts`), and the large `lib/backtest-store.ts`.
- **React Contexts** (`lib/auth-context.tsx`, `lib/trade-context.tsx`) are legacy/compatibility layers. `trade-context` explicitly delegates to the Zustand stores and exists only so older consumers of `useTrades()` keep working — migrate to the stores directly when touching this code. `auth-context` is the real auth state (hydrates from localStorage, exposes `useAuth()`).

### Routing & layout
- App Router under `app/`. `app/layout.tsx` wraps everything in `ThemeProvider → AuthProvider → TradeProvider → LayoutWrapper`.
- There is **no `middleware.ts`**; route gating is client-side. `components/layout-wrapper.tsx` decides chrome: public routes (`/login`, `/register`, `/forgot-password`) and any `/admin/*` route render bare; everything else gets the `AppSidebar` shell.
- Admin area lives under `app/admin/*` with its own login and role cookie.

### Real-time (SignalR)
`lib/stores/notification-store.ts` and `lib/stores/scanner-store.ts` open `@microsoft/signalr` hub connections to `${NEXT_PUBLIC_API_URL}/hubs/...` using an `accessTokenFactory`. These stores own connection lifecycle (`connect`/`disconnect`) — don't open hub connections elsewhere.

### Backtesting workspace
The most complex feature. `components/backtest/tradingview-platform.tsx` is a custom charting/drawing/playback UI built directly on `lightweight-charts` (also `klinecharts` is a dependency). `lib/backtest-store.ts` (~1000 lines) drives session state, candle datafeed, timeframe switching, playback, and order placement. Pure logic is extracted into `*.utils.ts` siblings (`order-panel.utils.ts`, `backtest-workspace-header.utils.ts`) and covered by focused tests in `__tests__/backtest/` and `__tests__/lib/backtest-*`.

### UI components
- `components/ui/` is shadcn/ui (New York style, Radix primitives, `cn()` from `lib/utils.ts`, Tailwind v4 with CSS variables in `app/globals.css`). Add primitives via the shadcn CLI rather than hand-rolling.
- Feature components are grouped by domain folder under `components/` (`dashboard/`, `analytics/`, `psychology/`, `trade/`, `review/`, `backtest/`, etc.). Domain-specific pure helpers and overview/aggregation logic live in `lib/*-overview.ts` and are unit-tested.

### Domain enums
Backend enum values are integers. The TS mirrors live in `lib/enum/` (`PositionType`, `TradeStatus`, `EmotionType`, `TradeEnum`). DTOs use the numeric form when talking to the API — use these enums, don't hardcode magic numbers.

## Testing
- Vitest + Testing Library + jsdom. Globals are enabled (no need to import `describe/it/expect`). Setup in `__tests__/setup.ts` stubs `matchMedia` and `ResizeObserver`.
- Tests mirror source structure under `__tests__/`. The strongest coverage is on pure logic in `lib/` (overview/aggregation/format helpers, backtest utils) and on form/section components — follow that pattern: extract testable logic out of large components into `lib/` or `*.utils.ts` and test it there.
