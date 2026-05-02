# Frontend Technical Specification: Trading Journal UI

## 1. Introduction

This document outlines the technical architecture, technology stack, and structural conventions of the `trading-journal-ui` application. The application is a modern, responsive, and real-time frontend built to interface with the Trading Journal Backend, providing traders with tools for trade logging, real-time market scanning, psychological tracking, and analytics.

## 2. Technology Stack

### Core Technologies
*   **Framework:** Next.js (App Router architecture)
*   **Library:** React 19
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (with PostCSS)

### State Management & Data Fetching
*   **Global State Management:** Zustand
*   **Form Management:** React Hook Form
*   **Validation:** Zod
*   **HTTP Client:** Axios (with interceptors for authentication)

### Real-time Communication
*   **WebSockets:** SignalR (`@microsoft/signalr`) for real-time market alerts and system notifications.

### UI & UX Components
*   **Component Library:** shadcn/ui (Built on Radix UI primitives)
*   **Animations:** Framer Motion & Tailwind Animate
*   **Charting:** Recharts (Analytics), Lightweight Charts / Klinecharts (Financial Data & Market Charts)
*   **Rich Text Editor:** CKEditor 5

### Testing & Tooling
*   **Unit Testing:** Vitest & React Testing Library
*   **Package Manager:** npm (configured with bun.lock for optimized environments)

## 3. Project Structure

The project follows a feature-based organization combined with Next.js App Router conventions.

```text
trading-journal-ui/
├── app/                  # Next.js App Router root (Pages, Layouts, Routing)
│   ├── admin/            # Administrative dashboard and user management
│   ├── analytics/        # Performance metrics and charting

│   ├── history/          # Historical trade logs
│   ├── review/           # Trade review workflows and PDF exports
│   ├── scanner/          # Real-time algorithmic market scanner
│   ├── setup/            # Trading setups and playbook management
│   └── trade/            # Live trade execution logging
├── components/           # Reusable UI and Domain-specific components
│   ├── ui/               # shadcn/ui primitive components (buttons, dialogs, etc.)
│   ├── scanner/          # Scanner specific components (controls, watchlists)
│   ├── trade/            # Trade entry forms, position calculators
│   └── dashboard/        # Layout and dashboard specific wrappers
├── lib/                  # Core logic, API wrappers, and Stores
│   ├── stores/           # Zustand state slices (e.g., scanner-store.ts)
│   ├── *-api.ts          # Domain-specific API service wrappers (Axios calls)
│   └── utils.ts          # Helper functions and UI utilities
├── hooks/                # Custom React hooks
├── types/                # Global TypeScript definitions and domain models
└── __tests__/            # Vitest unit and integration tests
```

## 4. Architecture Patterns

### 4.1. Authentication & Route Guards
The application utilizes a **Client-Side Auth Guard** pattern to secure routes.
*   **`useAuth` / `AuthContext`:** Manages user session state and token validation.
*   **`AppShellLoader`:** A global hydration wrapper that intercepts protected routes during initial load or refresh, preventing layout flicker and handling redirection (via `auth-redirect.ts`) seamlessly before rendering child components.

### 4.2. API Integration Strategy
*   **Modular API Clients:** API calls are decoupled from UI components. Files like `scanner-api.ts`, `trade-api.ts`, and `analytics-api.ts` handle endpoint definitions, payload formatting, and error handling.
*   **Interceptors:** Axios instances are configured with request interceptors to attach Bearer tokens automatically, and response interceptors to handle 401 Unauthorized responses by triggering refresh flows or re-authentication.

### 4.3. State Management (Zustand)
Global state is divided into bounded contexts (slices) to prevent unnecessary re-renders and maintain organization:
*   **`useSessionStore`:** Manages user profile and preferences.
*   **`scanner-store`:** Manages real-time scanner configurations, active watchlists, and algorithmic pattern detections.
*   **`trade-store`:** Manages live trade execution context.
*   **`notification-store`:** Buffers and dispatches toast notifications from SignalR events.

### 4.4. Real-Time Infrastructure
The frontend establishes persistent WebSocket connections to the backend using SignalR.
*   **Connection Hubs:** Primarily used in the Scanner module to receive instant alerts on ICT patterns (FVG, Order Blocks) and in the Notification module for cross-system alerts.
*   **Store Integration:** SignalR event handlers dispatch directly to Zustand stores, which update the UI reactively.

## 5. UI/UX Design System

*   **Design Tokens:** Managed via Tailwind CSS variables (defined in `app/globals.css`), enabling seamless light/dark mode switching via `next-themes`.
*   **Components:** Built with an emphasis on accessibility and modularity using Radix UI primitives. Complex composites (like Data Tables with filtering and pagination) are constructed from these primitives.
*   **Micro-interactions:** Framer Motion is utilized for layout transitions, expandable rows, and modal dialog animations, ensuring a premium and dynamic feel.

## 6. Key Modules Overview

1.  **Scanner:** Provides real-time algorithmic tracking of assets. Features dynamic watchlists, timeframe confluence configuration, and integration with Economic Calendars.
2.  **Trades & Setups:** Allows granular logging of entries/exits, R-multiple calculations, and tagging trades to predefined strategies (Setups). Includes a rich-text integrated "Trading Playbook".
3.  **Analytics & Review:** Consolidates data into performance heatmaps, win-rate distributions, and psychological discipline scoring. Supports exporting reviews to PDF via `jspdf`.

## 7. Build and Deployment

*   **Commands:** `npm run dev` (Local), `npm run build` (Production Optimized Build).
*   **Optimization:** Configured with `@vercel/analytics` and `@vercel/speed-insights` for monitoring Core Web Vitals. Font and image optimization are handled inherently by Next.js components (`next/font`, `next/image`).
