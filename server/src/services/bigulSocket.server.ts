import type { Socket } from "socket.io";
import { BigulWS, type BigulFeedMessage } from "./bigul.ws.js";

/**
 * Market data channel numbers used in Bigul WebSocket subscriptions.
 * Channel 1 = market watch (LTP), Channel 2 = depth (bid/ask).
 */
const MARKET_CHANNEL = 1;
const DEPTH_CHANNEL = 2;

let bigulWS: BigulWS | null = null;
const subscribedMarketScrips = new Set<string>();
const subscribedDepthScrips = new Set<string>();
const pendingInitCallbacks: (() => void)[] = [];

function flushPendingInits(): void {
  while (pendingInitCallbacks.length > 0) {
    const cb = pendingInitCallbacks.shift();
    try { cb?.(); } catch (err) {
      console.warn("[BigulMarketData] pending init callback error:", err);
    }
  }
}

function getOrCreateBigulWS(
  accessToken: string,
  broadcast: (data: unknown) => void,
  onReady?: () => void,
): BigulWS {
  if (onReady) pendingInitCallbacks.push(onReady);

  if (bigulWS) {
    if (bigulWS.isConnected()) flushPendingInits();
    return bigulWS;
  }

  bigulWS = new BigulWS({
    accessToken,
    onMessage: (msg) => {
      const normalized = normalizeBigulMessage(msg);
      if (normalized) broadcast(normalized);
    },
    onConnectionChange: (status) => {
      console.log("[BigulMarketData] connection status:", status);
      if (status === "connected" && bigulWS?.isConnected()) {
        resubscribeAll();
        flushPendingInits();
      }
    },
  });
  bigulWS.connect();
  return bigulWS;
}

/**
 * Normalize Bigul binary-parsed market data into Alice Blue-compatible format
 * so the frontend can use the same handler for both brokers.
 *
 * Binary feed types:
 *   sf (scrips) → { t:"tf", lp, tk, e, v, ... }
 *   dp (depth)  → { t:"df", bp1-5, sp1-5, bq1-5, sq1-5, ... }
 *   if (index)  → { t:"tf", lp, pc, tk, e, ... }
 */
function normalizeBigulMessage(msg: BigulFeedMessage): Record<string, unknown> | null {
  const ft = msg._feedType;
  const tk = msg.exchange_token as string;
  const e = msg.exchange as string;

  if (ft === "sf") {
    return {
      t: "tf",
      lp: msg.ltp,
      tk, e,
      v: msg.vol_traded_today,
      op: msg.open_price,
      c: msg.close_price,
      h: msg.high_price,
      lo: msg.low_price,
      bp1: msg.bidPrice,
      sp1: msg.askPrice,
      bq1: msg.bidSize,
      sq1: msg.askSize,
      ltq: msg.last_traded_qty,
      tbq: msg.tot_buy_qty,
      tsq: msg.tot_sell_qty,
      ap: msg.avg_trade_price,
    };
  }

  if (ft === "dp") {
    return {
      t: "df", tk, e,
      bp1: msg.bidPrice1, bp2: msg.bidPrice2, bp3: msg.bidPrice3, bp4: msg.bidPrice4, bp5: msg.bidPrice5,
      sp1: msg.askPrice1, sp2: msg.askPrice2, sp3: msg.askPrice3, sp4: msg.askPrice4, sp5: msg.askPrice5,
      bq1: msg.bidsize1, bq2: msg.bidsize2, bq3: msg.bidsize3, bq4: msg.bidsize4, bq5: msg.bidsize5,
      sq1: msg.askSize1, sq2: msg.askSize2, sq3: msg.askSize3, sq4: msg.askSize4, sq5: msg.askSize5,
      bo1: msg.bidorder1, bo2: msg.bidorder2, bo3: msg.bidorder3, bo4: msg.bidorder4, bo5: msg.bidorder5,
      so1: msg.askorder1, so2: msg.askorder2, so3: msg.askorder3, so4: msg.askorder4, so5: msg.askorder5,
    };
  }

  if (ft === "if") {
    return {
      t: "tf",
      lp: msg.ltp,
      tk, e,
      c: msg.close_price,
      h: msg.high_price,
      lo: msg.low_price,
      op: msg.open_price,
    };
  }

  return null;
}

function resubscribeAll(): void {
  if (!bigulWS?.isConnected()) return;
  for (const scrip of subscribedMarketScrips) {
    bigulWS.subscribeMarket(scrip, MARKET_CHANNEL);
  }
  if (subscribedMarketScrips.size) {
    console.log("[BigulMarketData] Re-subscribed market:", subscribedMarketScrips.size, "scrips");
  }
  for (const scrip of subscribedDepthScrips) {
    bigulWS.subscribeDepth(scrip, DEPTH_CHANNEL);
  }
  if (subscribedDepthScrips.size) {
    console.log("[BigulMarketData] Re-subscribed depth:", subscribedDepthScrips.size, "scrips");
  }
}

function closeBigulWS(): void {
  if (bigulWS) {
    bigulWS.disconnect();
    bigulWS = null;
    subscribedMarketScrips.clear();
    subscribedDepthScrips.clear();
    pendingInitCallbacks.length = 0;
    console.log("[BigulMarketData] WebSocket closed (no clients)");
  }
}

function getScripsFromPayload(payload: unknown): string {
  if (typeof payload === "string") return payload.trim();
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const val = body?.scrips ?? body?.tokens;
  if (typeof val === "string") return val.trim();
  return "";
}

/**
 * Bigul market & depth feed – streamed via Socket.IO namespace "/marketdatabigul".
 *
 * Events:
 *   init              → { accessToken }
 *   subscribe:market  → { scrips: "nse_cm|11536" }
 *   unsubscribe:market
 *   subscribe:depth   → { scrips: "nse_cm|11536" }
 *   unsubscribe:depth
 *
 * Emits:
 *   market:init   → { ok: true }
 *   market:error  → { message }
 *   market:data   → normalized data (Alice Blue-compatible fields)
 */
export function handleBigulMarketDataSocket(socket: Socket): void {
  const nsp = socket.nsp;
  const clientId = socket.id;
  console.log("[BigulMarketData] client connected:", clientId);

  const broadcast = (data: unknown) => {
    nsp.emit("market:data", data);
  };

  socket.on("init", (payload: unknown) => {
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";

    if (!accessToken) {
      console.warn("[BigulMarketData] init missing accessToken");
      socket.emit("market:error", { message: "init requires accessToken" });
      return;
    }

    try {
      let initResolved = false;
      const emitInit = () => {
        if (initResolved) return;
        initResolved = true;
        socket.emit("market:init", { ok: true });
      };
      getOrCreateBigulWS(accessToken, broadcast, emitInit);

      setTimeout(() => {
        if (!initResolved) {
          initResolved = true;
          console.warn("[BigulMarketData] init timed out — Bigul WS did not connect within 10s");
          socket.emit("market:error", {
            message: "Bigul WebSocket connection timed out. Market data unavailable.",
          });
        }
      }, 10_000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[BigulMarketData] init failed:", message);
      socket.emit("market:error", { message });
    }
  });

  socket.on("subscribe:market", (payload: unknown) => {
    const scrips = getScripsFromPayload(payload);
    if (!scrips) return;

    if (!subscribedMarketScrips.has(scrips)) {
      subscribedMarketScrips.add(scrips);
      if (bigulWS?.isConnected()) {
        bigulWS.subscribeMarket(scrips, MARKET_CHANNEL);
      }
    }
  });

  socket.on("unsubscribe:market", (payload: unknown) => {
    const scrips = getScripsFromPayload(payload);
    if (!scrips) return;

    if (subscribedMarketScrips.has(scrips)) {
      subscribedMarketScrips.delete(scrips);
      if (bigulWS?.isConnected()) {
        bigulWS.unsubscribeMarket(scrips, MARKET_CHANNEL);
      }
    }
  });

  socket.on("subscribe:depth", (payload: unknown) => {
    const scrips = getScripsFromPayload(payload);
    if (!scrips) return;

    if (!subscribedDepthScrips.has(scrips)) {
      subscribedDepthScrips.add(scrips);
      if (bigulWS?.isConnected()) {
        bigulWS.subscribeDepth(scrips, DEPTH_CHANNEL);
      }
    }
  });

  socket.on("unsubscribe:depth", (payload: unknown) => {
    const scrips = getScripsFromPayload(payload);
    if (!scrips) return;

    if (subscribedDepthScrips.has(scrips)) {
      subscribedDepthScrips.delete(scrips);
      if (bigulWS?.isConnected()) {
        bigulWS.unsubscribeDepth(scrips, DEPTH_CHANNEL);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("[BigulMarketData] client disconnected:", clientId);
    if (nsp.sockets.size === 0) {
      closeBigulWS();
    }
  });
}
