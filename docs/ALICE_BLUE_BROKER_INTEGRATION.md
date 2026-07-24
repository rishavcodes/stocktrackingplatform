# Alice Blue Broker Integration – Business & Technical Guide

This document describes the **Alice Blue** broker integration in Tradebox from a **business perspective** and provides step-by-step guidance for broker details, API development, and frontend integration.

---

## Executive Summary

| Item | Description |
|------|-------------|
| **What** | Integrate Alice Blue as a trading broker so Tradebox users can log in with their Alice Blue account, view live market data, and place/manage orders from one app. |
| **Why** | Single sign-on (SSO) with the broker, unified order and market data experience, and compliance with broker API and security requirements. |
| **How** | Four phases: (1) Broker onboarding & details, (2) Backend API development, (3) Frontend integration, (4) Environment, testing & go-live. |
| **Who** | Business/Product (requirements, broker agreement), Backend (API proxy, session, WebSocket), Frontend (login, orders, market data UI), DevOps (env, redirect URL). |

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [Integration Steps – High-Level Roadmap](#2-integration-steps--high-level-roadmap)
3. [Broker Details & Prerequisites](#3-broker-details--prerequisites)
4. [API Development](#4-api-development)
5. [Frontend Integration](#5-frontend-integration)
6. [End-to-End User Flow](#6-end-to-end-user-flow)
7. [Environment & Deployment](#7-environment--deployment)
8. [Risks & Considerations](#8-risks--considerations)
9. [Checklist for New Broker Integration](#9-checklist-for-new-broker-integration)
10. [Reference: Key Files](#10-reference-key-files-in-this-repo)

---

## 1. Business Overview

### Purpose

- Allow end-users to **log in with their Alice Blue trading account** (SSO) and use Tradebox to view recommendations, place orders, and see orders/portfolio/funds.
- Provide **live market data** (LTP, depth) and **order management** (place, modify, cancel, order book, trade book) via a single app experience.

### Scope

| Area | Description |
|------|-------------|
| **Authentication** | SSO link → user redirects to Alice Blue → returns with `authCode` and `userId` → backend exchanges for `userSession`. |
| **Orders** | Place, modify, cancel, order book, order history, trade book, margin check, basket margin, exit bracket order. |
| **Market Data** | Real-time LTP and depth via WebSocket (Alice Blue WS → server → Socket.IO → frontend). |
| **Instruments** | Contract master (NSE, BSE, MCX) to resolve symbol → token (`instrumentId`) for order APIs. |

### Key Stakeholders

- **Product / Business**: Define which broker features to expose (e.g. only equity, or F&O; which order types).
- **Backend**: Implement and maintain Alice Blue API proxy, session handling, and WebSocket bridge.
- **Frontend**: Login entry points, session storage, order UI, and market data consumption.
- **Broker (Alice Blue)**: Provide App Key, App Secret, SSO URL pattern, and API/WS documentation.

---

## 2. Integration Steps – High-Level Roadmap

Required steps to integrate a broker like Alice Blue, in order:

| Phase | Step | Description | Owner |
|-------|------|-------------|--------|
| **1** | **Broker details & onboarding** | Get agreement, credentials (App Key, App Secret), SSO/login URLs, API base URLs, redirect URL whitelisting, and broker API/WS documentation. | Business, DevOps |
| **2** | **API development** | Server config, auth (SSO URL + get-session), session middleware, order proxy endpoints, contract/instrument resolution, optional WebSocket bridge for market data. | Backend |
| **3** | **Frontend integration** | SSO redirect, return-URL handler, session storage & event, conditional nav (Orders/Portfolio/Funds), place-order flow, market data Socket.IO, Orders/Portfolio/Funds pages. | Frontend |
| **4** | **Environment & go-live** | Set env vars (APP_KEY, APP_SECRET, BASE_URL, SSO_LINK), configure redirect URL with broker, CORS, end-to-end testing (login → place order → order book). | DevOps, QA |

Sections below detail each phase.

---

## 3. Broker Details & Prerequisites

### 3.1 Broker Information

| Item | Value / Source |
|------|----------------|
| **Broker name** | Alice Blue (Alice Blue Online) |
| **SSO / Login** | `https://ant.aliceblueonline.com/?appcode={appCode}` |
| **REST API base** | Configurable; default `https://a3.aliceblueonline.com` |
| **Session exchange** | `https://ant.aliceblueonline.com/open-api/od/v1/vendor/getUserDetails` (POST, with checksum) |
| **WebSocket (market)** | `wss://ws1.aliceblueonline.com/NorenWS/` |
| **Contract master** | `https://v2api.aliceblueonline.com/restpy/static/contract_master/V2/{NSE|BSE|MCX}` |

### 3.2 Credentials Required

You must obtain from Alice Blue (e.g. via their partner/vendor portal):

| Credential | Env variable | Purpose |
|------------|---------------|---------|
| **App Key** | `ALICE_BLUE_APP_KEY` | Used in SSO URL as `appcode`; identifies your application. |
| **App Secret** | `ALICE_BLUE_APP_SECRET` | Used to compute checksum when exchanging `userId` + `authCode` for session. |

Optional overrides:

- `ALICE_BLUE_BASE_URL` – REST API base (default: `https://a3.aliceblueonline.com`).
- `ALICE_BLUE_SSO_LINK` – SSO base (default: `https://ant.aliceblueonline.com/?appcode=`).

### 3.3 Business Prerequisites

- **Agreement** with Alice Blue for API access and use of their SSO.
- **Redirect URL** (or allowed origins) configured with the broker so that after login, users are redirected back to your app with `authCode` and `userId` (e.g. `https://yourapp.com/dashboard/user/overview?authCode=...&userId=...`).
- **Documentation** from broker: REST endpoints, request/response shapes, WebSocket message formats, and any rate limits.

---

## 4. API Development

### 4.1 Configuration (Server)

**File:** `server/src/config/aliceBlue.ts`

- Reads `ALICE_BLUE_APP_KEY`, `ALICE_BLUE_APP_SECRET`, `ALICE_BLUE_BASE_URL`, `ALICE_BLUE_SSO_LINK`.
- Exposes: `getAliceBlueConfig()`, `getAliceBlueSSOUrl(appCode?)`, `getAliceBlueBaseUrl()`, `getAliceBlueCredentials()`.

**Steps:**

1. Add env vars to your deployment (see [Environment & Deployment](#6-environment--deployment)).
2. Ensure no secrets are logged or exposed to the frontend (only SSO URL and session exchange are used from client; session is obtained server-side).

### 4.2 Authentication & Session

| Step | Endpoint / component | Description |
|------|----------------------|-------------|
| 1 | `GET /api/aliceblue/sso-url` | Returns SSO URL (with optional `?appCode=...`). Frontend redirects user here to log in with Alice Blue. |
| 2 | User logs in on Alice Blue and is redirected back with `authCode` and `userId` in the URL. | Redirect URL must be whitelisted with the broker. |
| 3 | `POST /api/aliceblue/get-session` | Body: `{ userId, authCode }`. Server computes `checksum = SHA256(userId + authCode + appSecret)` and calls broker’s getUserDetails. Returns `userSession`, `userId`, `clientId` for the client to store. |

**Session handling:**

- Frontend stores `userSession` (and optionally `userId`, `clientId`, `expiresAt`) in `localStorage` under a single key (e.g. `aliceBlueSession`).
- All **order** and **market-data WS** calls use this `userSession` (e.g. as `Authorization: Bearer <userSession>` for REST; for WS, server needs `sessionId` + `clientId` to create WS session).

### 4.3 Public API Routes (No Session)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/aliceblue/sso-url` | Get SSO login URL. |
| POST | `/api/aliceblue/get-session` | Exchange `userId` + `authCode` for `userSession`. |
| GET | `/api/aliceblue/contract?exchange=NSE|BSE|MCX&symbol=RELIANCE` | Resolve symbol to contract (token/instrumentId) using contract master. |

### 4.4 Protected Order API Routes (Session Required)

All order routes require header: `Authorization: Bearer <userSession>`.

**Middleware:** `verifyAliceBlueSessionMiddleware` (in `server/src/middleware/AliceBlueAuth.ts`) – reads Bearer token and attaches `aliceBlueSession` to the request.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/aliceblue/orders/place-order` | Place order(s). Body: array of order objects (exchange, instrumentId, transactionType, quantity, product, orderComplexity, orderType, validity, price, etc.). |
| GET | `/api/aliceblue/orders/book` | Order book (open orders). |
| POST | `/api/aliceblue/orders/history` | Order history (body e.g. `{ brokerOrderId }`). |
| POST | `/api/aliceblue/orders/modify` | Modify order. |
| POST | `/api/aliceblue/orders/cancel` | Cancel order (body: `brokerOrderId`). |
| GET | `/api/aliceblue/orders/trades` | Trade book (executed trades). |
| POST | `/api/aliceblue/orders/checkMargin` | Single-order margin. |
| POST | `/api/aliceblue/orders/basket/margin` | Basket margin. |
| POST | `/api/aliceblue/orders/exit/sno` | Exit bracket order. |

Backend forwards requests to Alice Blue REST API (base URL from config) and returns a normalized response (e.g. `{ success, message, data }`).

### 4.5 Contract Master

**File:** `server/src/helpers/contractMaster.ts`

- Fetches contract master JSON from Alice Blue (NSE, BSE, MCX).
- Caches by exchange (e.g. 1 hour TTL).
- `getContractBySymbol(exchange, symbol)` returns contract including `token` (used as `instrumentId` in order APIs).
- Used by `GET /api/aliceblue/contract` to resolve symbol → token for the frontend.

### 4.6 Market Data (WebSocket)

**Flow:**

1. **Alice Blue WebSocket** (`server/src/services/aliceBlue.ws.ts`):
   - Connect to `wss://ws1.aliceblueonline.com/NorenWS/`.
   - Before connecting: create WS session via REST `createWsSess` (requires `sessionId` + `clientId`).
   - Send `susertoken = SHA256(SHA256(sessionId))` for WS auth.
   - Subscribe to market (LTP) and depth by token; broker sends messages (e.g. `t: tf/tk` for market, `dk/df` for depth).

2. **Socket.IO bridge** (`server/src/services/socket.server.ts`):
   - Namespace: `/marketdata`.
   - Client sends `init` with `{ sessionId, clientId }` → server creates or reuses one shared Alice Blue WS connection and creates WS session if needed.
   - Client sends `subscribe:market` / `subscribe:depth` with `tokens` (e.g. `NSE|12345`) → server subscribes on Alice Blue WS.
   - Server broadcasts broker messages to the namespace as `market:data`; on connection ready, `market:init` is emitted so clients can subscribe.

**Mount:** In `server/src/index.ts`, `io.of("/marketdata").on("connection", handleAliceBlueMarketDataSocket)`.

---

## 5. Frontend Integration

### 5.1 Session Storage & Lifecycle

- **Storage key:** e.g. `aliceBlueSession`.
- **Stored value:** JSON with `userSession`, `userId`, `clientId`, and optionally `expiresAt` (e.g. 24 hours).
- **Event:** After storing session, dispatch `aliceBlueSessionStored` so other components (e.g. dashboard layout) can update UI (show/hide Orders, Portfolio, Funds).

**Where session is set:**

- After redirect from Alice Blue with `authCode` and `userId`, a page (e.g. dashboard user overview) calls `POST /api/aliceblue/get-session` with `{ userId, authCode }` and stores the returned session in `localStorage` and dispatches the event.

### 5.2 Login Entry Points

- **SSO link:** Call `GET /api/aliceblue/sso-url` to get the URL, then redirect the user (e.g. window.location or link) to that URL.
- **Return URL:** Configure with broker so that after login, user is sent to your app with query params `authCode` and `userId` (e.g. `/dashboard/user/overview?authCode=...&userId=...`).
- **Post-login:** On the page that handles the return URL, read `authCode` and `userId`, call `get-session`, store session, then replace URL (e.g. remove query params) and show dashboard.

### 5.3 Conditional UI Based on Session

- **Dashboard layout** (`front/src/app/dashboard/user/layout.tsx`):
  - Reads `aliceBlueSession` from `localStorage` and listens for `aliceBlueSessionStored`.
  - If session valid: show sidebar items **Orders**, **Portfolio**, **Funds**.
  - If no session and user is on Orders/Portfolio/Funds: redirect to overview (or My Profile).
- **Marketplace / recommendations:** Can show “Login with Alice Blue” or “Place order” depending on session; place order should require session.

### 5.4 Placing an Order (e.g. from Recommendation)

**Example flow (e.g. in `BuyOrderModal`):**

1. Read `userSession` from `localStorage` (key `aliceBlueSession`). If missing, show “Please log in with Alice Blue” and optionally link to SSO.
2. Resolve **instrumentId**: call `GET /api/aliceblue/contract?exchange=...&symbol=...` to get token for the selected exchange/symbol.
3. Build order payload per broker spec (exchange, instrumentId, transactionType, quantity, product, orderComplexity, orderType, validity, price, slTriggerPrice, etc.).
4. Call `POST /api/aliceblue/orders/place-order` with `Authorization: Bearer <userSession>` and body as array of orders.
5. Show success/error from response (e.g. `brokerOrderId`).

### 5.5 Live Market Data (Socket.IO)

- Connect to Socket.IO namespace **`/marketdata`** (base URL = backend URL).
- On `connect`, emit **`init`** with `{ sessionId: userSession, clientId }` (from localStorage).
- On **`market:init`**, emit **`subscribe:market`** and **`subscribe:depth`** with `tokens` (e.g. `NSE|token`).
- Listen to **`market:data`** for LTP/depth (e.g. `t === 'tf' | 'tk'` for LTP/pc; `dk/df` for depth).
- Use this for live price display and order form (e.g. default limit price, stop loss).

### 5.6 Orders / Portfolio / Funds Pages

- **Orders page:** Fetch order book and trade book via `GET /api/aliceblue/orders/book` and `GET /api/aliceblue/orders/trades` with `Authorization: Bearer <userSession>`.
- **Portfolio / Funds:** If implemented, call corresponding Alice Blue APIs via your backend with the same session.
- All these pages should only be accessible when `aliceBlueSession` is present (enforced by layout redirect).

---

## 6. End-to-End User Flow

1. **User chooses “Login with Alice Blue”** (e.g. from dashboard or marketplace).
2. **Frontend** gets SSO URL from `GET /api/aliceblue/sso-url` and redirects user.
3. **User** logs in on Alice Blue and is redirected back to your app with `authCode` and `userId` in the URL.
4. **Frontend** (e.g. overview page) calls `POST /api/aliceblue/get-session` with `userId` and `authCode`, receives `userSession`, and stores it in `localStorage`; dispatches `aliceBlueSessionStored`.
5. **Layout** shows Orders / Portfolio / Funds in sidebar; user can open Orders, Portfolio, Funds.
6. **Recommendation flow:** User opens “Place order” (e.g. BuyOrderModal) → frontend gets contract (instrumentId), optionally subscribes to market data via Socket.IO, builds order, calls `POST /api/aliceblue/orders/place-order` with Bearer session → order placed.
7. **Orders page:** Lists open orders and trades via `/api/aliceblue/orders/book` and `/api/aliceblue/orders/trades`.

---

## 7. Environment & Deployment

### 7.1 Server Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ALICE_BLUE_APP_KEY` | Yes (for SSO) | App code for SSO URL. |
| `ALICE_BLUE_APP_SECRET` | Yes (for session) | Used to compute checksum for get-session. |
| `ALICE_BLUE_BASE_URL` | No | Default: `https://a3.aliceblueonline.com`. |
| `ALICE_BLUE_SSO_LINK` | No | Default: `https://ant.aliceblueonline.com/?appcode=` |

### 7.2 Frontend

- `NEXT_PUBLIC_BACKEND_URL`: Backend base URL for API and Socket.IO (e.g. `https://api.yourapp.com`).

### 7.3 Broker-Side Configuration

- Redirect URL (or allowed origin) for post-SSO redirect with `authCode` and `userId`.
- Ensure IP/domain allowlisting if required by the broker.

---

## 8. Risks & Considerations

| Risk / Consideration | Mitigation |
|----------------------|------------|
| **Broker API changes** | Pin to broker API docs version; monitor release notes; abstract broker calls behind your own API so only backend needs updates. |
| **Session expiry** | Frontend stores `expiresAt` (e.g. 24h); redirect to SSO or show “Reconnect” when expired. |
| **Redirect URL mismatch** | Confirm exact redirect URL (including path and query) with broker; use same URL in dev/staging if broker allows multiple. |
| **Secrets in frontend** | Never expose App Secret to frontend; only SSO URL and get-session (with authCode/userId) are client-triggered; session is issued server-side. |
| **Rate limits** | Ask broker for limits on REST and WebSocket; implement backoff and user-facing messages if limits are hit. |
| **Market data latency** | WebSocket bridge adds one hop; acceptable for retail; for ultra-low latency consider direct broker WS from frontend if broker supports it. |

---

## 9. Checklist for New Broker Integration

Use this as a template when integrating **another** broker (or validating Alice Blue):

| # | Item | Owner |
|---|------|--------|
| 1 | Obtain broker agreement and API credentials (app key, secret). | Business |
| 2 | Document broker endpoints: SSO URL, session exchange, order APIs, contract/instrument API, WebSocket URL and message format. | Backend / Tech lead |
| 3 | Configure redirect URL with broker for post-login callback. | DevOps / Backend |
| 4 | Add server config module (env-based) for base URL and credentials. | Backend |
| 5 | Implement auth: SSO URL endpoint, get-session (with broker-specific checksum/signing). | Backend |
| 6 | Implement session middleware and attach session to request for protected routes. | Backend |
| 7 | Implement order proxy endpoints (place, modify, cancel, book, history, trades, margin, etc.). | Backend |
| 8 | Implement instrument/contract resolution (symbol → token) and expose one contract endpoint. | Backend |
| 9 | If live market data needed: implement WebSocket client to broker, Socket.IO namespace, subscribe/unsubscribe and broadcast to frontend. | Backend |
| 10 | Frontend: SSO redirect, return-URL handler, session storage and event, conditional nav (Orders/Portfolio/Funds). | Frontend |
| 11 | Frontend: Order placement flow (contract fetch, order payload, place-order API with Bearer session). | Frontend |
| 12 | Frontend: Market data Socket.IO connect, init, subscribe, and display LTP/depth. | Frontend |
| 13 | Frontend: Orders/Portfolio/Funds pages calling corresponding backend APIs. | Frontend |
| 14 | Set env vars in all environments; verify redirect URL and CORS. | DevOps |
| 15 | Test end-to-end: login → session → place order → order book / trades. | QA / Product |

---

## 10. Reference: Key Files in This Repo

| Layer | File(s) |
|-------|--------|
| Config | `server/src/config/aliceBlue.ts` |
| Routes | `server/src/routes/AliceBlueRoutes.ts` |
| Auth | `server/src/controllers/AliceBlue/loginController.ts`, `server/src/middleware/AliceBlueAuth.ts` |
| Orders | `server/src/controllers/AliceBlue/orderController.ts` |
| Contract | `server/src/helpers/contractMaster.ts` |
| Market data WS | `server/src/services/aliceBlue.ws.ts`, `server/src/services/socket.server.ts` |
| App mount | `server/src/index.ts` (routes + Socket.IO `/marketdata`) |
| Frontend session & nav | `front/src/app/dashboard/user/layout.tsx`, `front/src/app/dashboard/user/overview/page.tsx` |
| Place order UI | `front/src/app/marketplace/[id]/BuyOrderModal.tsx` |
| Orders page | `front/src/app/dashboard/user/orders/page.tsx` |

---

*This document reflects the current Alice Blue integration in Tradebox. For broker-specific API changes, refer to Alice Blue’s official API documentation and update this guide accordingly.*
