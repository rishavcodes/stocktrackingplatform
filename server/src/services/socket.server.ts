import type { Socket } from "socket.io";
import { AliceBlueWS } from "./aliceBlue.ws.js";

const TOKEN_SEP = "#";

/** Normalize tokens string to set of individual tokens (no empty) */
function tokenSet(tokens: string): Set<string> {
  if (typeof tokens !== "string" || !tokens.trim()) return new Set();
  return new Set(tokens.split(TOKEN_SEP).map((s) => s.trim()).filter(Boolean));
}

/** Single shared Alice Blue WS; created on first init, closed when no clients */
let aliceBlueWS: AliceBlueWS | null = null;
const subscribedMarketTokens = new Set<string>();
const subscribedDepthTokens = new Set<string>();

/** Callbacks to run when Alice Blue WS becomes connected (emit market:init to waiting clients) */
const pendingInitCallbacks: (() => void)[] = [];

function flushPendingInits(): void {
  while (pendingInitCallbacks.length > 0) {
    const cb = pendingInitCallbacks.shift();
    try {
      cb?.();
    } catch (err) {
      console.warn("[MarketDataSocket] pending init callback error:", err);
    }
  }
}

function getOrCreateAliceBlueWS(
  sessionId: string,
  clientId: string,
  broadcast: (data: unknown) => void,
  onReady?: () => void
): AliceBlueWS {
  if (onReady) {
    pendingInitCallbacks.push(onReady);
  }
  if (aliceBlueWS) {
    if (aliceBlueWS.isConnected()) {
      flushPendingInits();
    }
    return aliceBlueWS;
  }
  aliceBlueWS = new AliceBlueWS({
    sessionId,
    clientId,
    onMessage: (data) => {
      broadcast(data);
    },
    onConnectionChange: (status) => {
      console.log("[MarketDataSocket] Alice Blue connection status:", status);
      if (status === "connected" && aliceBlueWS?.isConnected()) {
        resubscribeAll();
        flushPendingInits();
      }
    },
  });
  aliceBlueWS.connect();
  return aliceBlueWS;
}

function resubscribeAll(): void {
  if (!aliceBlueWS?.isConnected()) return;
  const marketList = [...subscribedMarketTokens];
  const depthList = [...subscribedDepthTokens];
  if (marketList.length) {
    aliceBlueWS.subscribeMarket(marketList.join(TOKEN_SEP));
    console.log("[MarketDataSocket] Re-subscribed market after reconnect:", marketList.length, "tokens");
  }
  if (depthList.length) {
    aliceBlueWS.subscribeDepth(depthList.join(TOKEN_SEP));
    console.log("[MarketDataSocket] Re-subscribed depth after reconnect:", depthList.length, "tokens");
  }
}

function closeAliceBlueWS(): void {
  if (aliceBlueWS) {
    aliceBlueWS.disconnect();
    aliceBlueWS = null;
    subscribedMarketTokens.clear();
    subscribedDepthTokens.clear();
    pendingInitCallbacks.length = 0;
    console.log("[MarketDataSocket] Alice Blue WebSocket closed (no clients)");
  }
}

function ensureTokensString(tokens: unknown): string {
  if (typeof tokens === "string") return tokens.trim();
  if (Array.isArray(tokens)) return tokens.map(String).filter(Boolean).join(TOKEN_SEP);
  return "";
}

/** Get tokens string from event payload: { tokens: "a#b" } or raw "a#b" */
function getTokensFromPayload(payload: unknown): string {
  if (typeof payload === "string") return payload.trim();
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return ensureTokensString(body?.tokens);
}

/**
 * Alice Blue market & depth feed – streamed via Socket.IO.
 * Connect to namespace "/marketdata", then emit init / subscribe:market / subscribe:depth.
 */
export function handleAliceBlueMarketDataSocket(socket: Socket): void {
  const nsp = socket.nsp;
  const clientId = socket.id;
  console.log("[MarketDataSocket] Alice Blue client connected:", clientId);

  const broadcast = (data: unknown) => {
    nsp.emit("market:data", data);
  };

  socket.on("init", (payload: unknown) => {
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const clientIdFromPayload = typeof body.clientId === "string" ? body.clientId : "";

    if (!sessionId || !clientIdFromPayload) {
      console.warn("[MarketDataSocket] init missing sessionId or clientId");
      socket.emit("market:error", { message: "init requires sessionId and clientId" });
      return;
    }

    try {
      const emitInit = () => socket.emit("market:init", { ok: true });
      getOrCreateAliceBlueWS(sessionId, clientIdFromPayload, broadcast, emitInit);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[MarketDataSocket] init failed:", message);
      socket.emit("market:error", { message });
    }
  });

  socket.on("subscribe:market", (payload: unknown) => {
    const tokens = getTokensFromPayload(payload);
    if (!tokens) return;

    const incoming = tokenSet(tokens);
    const toAdd: string[] = [];
    for (const t of incoming) {
      if (!subscribedMarketTokens.has(t)) {
        subscribedMarketTokens.add(t);
        toAdd.push(t);
      }
    }
    if (toAdd.length && aliceBlueWS?.isConnected()) {
      aliceBlueWS.subscribeMarket(toAdd.join(TOKEN_SEP));
      // console.log("[MarketDataSocket] Subscribed market:", toAdd.join(", "));
    }
    // If WS not connected yet, tokens are in set; resubscribeAll() will send them on connect
  });

  socket.on("unsubscribe:market", (payload: unknown) => {
    const tokens = getTokensFromPayload(payload);
    if (!tokens) return;

    const incoming = tokenSet(tokens);
    const toRemove: string[] = [];
    for (const t of incoming) {
      if (subscribedMarketTokens.has(t)) {
        subscribedMarketTokens.delete(t);
        toRemove.push(t);
      }
    }
    if (toRemove.length && aliceBlueWS?.isConnected()) {
      aliceBlueWS.unsubscribeMarket(toRemove.join(TOKEN_SEP));
      // console.log("[MarketDataSocket] Unsubscribed market:", toRemove.join(", "));
    }
  });

  socket.on("subscribe:depth", (payload: unknown) => {
    const tokens = getTokensFromPayload(payload);
    if (!tokens) return;

    const incoming = tokenSet(tokens);
    const toAdd: string[] = [];
    for (const t of incoming) {
      if (!subscribedDepthTokens.has(t)) {
        subscribedDepthTokens.add(t);
        toAdd.push(t);
      }
    }
    if (toAdd.length && aliceBlueWS?.isConnected()) {
      aliceBlueWS.subscribeDepth(toAdd.join(TOKEN_SEP));
      // console.log("[MarketDataSocket] Subscribed depth:", toAdd.join(", "));
    }
    // If WS not connected yet, tokens are in set; resubscribeAll() will send them on connect
  });

  socket.on("unsubscribe:depth", (payload: unknown) => {
    const tokens = getTokensFromPayload(payload);
    if (!tokens) return;

    const incoming = tokenSet(tokens);
    const toRemove: string[] = [];
    for (const t of incoming) {
      if (subscribedDepthTokens.has(t)) {
        subscribedDepthTokens.delete(t);
        toRemove.push(t);
      }
    }
    if (toRemove.length && aliceBlueWS?.isConnected()) {
      aliceBlueWS.unsubscribeDepth(toRemove.join(TOKEN_SEP));
      // console.log("[MarketDataSocket] Unsubscribed depth:", toRemove.join(", "));
    }
  });

  socket.on("disconnect", () => {
    console.log("[MarketDataSocket] Alice Blue client disconnected:", clientId);
    if (nsp.sockets.size === 0) {
      closeAliceBlueWS();
    }
  });
}
