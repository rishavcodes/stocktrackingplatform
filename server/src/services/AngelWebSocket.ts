import WebSocket from "ws";
import { smart_api } from "../config/smart-api";
import { setCachedPriceBulk } from "./PriceCache";

/**
 * ANGEL ONE WEBSOCKET2 CLIENT
 *
 * Connects to Angel One's WebSocket Streaming 2.0 endpoint for
 * real-time LTP data. Replaces REST API polling with push-based updates.
 *
 * Flow:
 *   WebSocket2 binary push → parse LTP → write to Redis (PriceCache)
 *
 * Features:
 * - Binary data parsing (little-endian)
 * - Auto-reconnection with exponential backoff
 * - Heartbeat ping to keep connection alive
 * - Dynamic token subscription/unsubscription
 * - Max 1000 tokens per session
 */

const WS_URL = "wss://smartapisocket.angelone.in/smart-stream";
const HEARTBEAT_INTERVAL_MS = 30_000; // 30s ping
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;
const MAX_SUBSCRIPTIONS = 1000;
const REDIS_FLUSH_INTERVAL_MS = 500; // Batch Redis writes every 500ms

// WebSocket subscription modes
const LTP_MODE = 1;

// Exchange string → WebSocket2 numeric code mapping
const EXCHANGE_TO_WS_CODE: Record<string, number> = {
  NSE: 1,  // NSE_CM
  NFO: 2,  // NSE_FO
  BSE: 3,  // BSE_CM
  BFO: 4,  // BSE_FO
  MCX: 5,  // MCX_FO
  NCX: 7,  // NCX_FO
  CDS: 13, // CDE_FO
};

// Reverse: WebSocket2 numeric code → exchange string
const WS_CODE_TO_EXCHANGE: Record<number, string> = {};
for (const [exchange, code] of Object.entries(EXCHANGE_TO_WS_CODE)) {
  WS_CODE_TO_EXCHANGE[code] = exchange;
}

// Token subscription info
interface TokenSubscription {
  exchange: string; // DB exchange code e.g. "NSE", "NFO"
  token: string;    // Symbol token e.g. "3045"
}

// Parsed LTP tick from binary data
interface LTPTick {
  exchange: string;
  token: string;
  ltp: number;
}

// Subscription request payload
interface SubscriptionPayload {
  correlationID: string;
  action: 1 | 0; // 1 = subscribe, 0 = unsubscribe
  params: {
    mode: number;
    tokenList: Array<{
      exchangeType: number;
      tokens: string[];
    }>;
  };
}

class AngelWebSocketClient {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isIntentionallyClosed = false;
  private reconnectAttempt = 0;
  private debugTickCount = 0; // Log first N ticks for debugging

  // Current active subscriptions: Set<"exchange:token">
  private activeSubscriptions = new Set<string>();

  // Buffered ticks for batched Redis writes
  private tickBuffer: LTPTick[] = [];

  // Callback for when ticks arrive (used by MarketPriceFetcher to resolve pending)
  private onTickCallback: ((ticks: LTPTick[]) => void) | null = null;

  /**
   * Register a callback that fires with each batch of ticks flushed to Redis.
   * Used by MarketPriceFetcher to resolve pending GetCmp requests.
   */
  onTick(callback: (ticks: LTPTick[]) => void): void {
    this.onTickCallback = callback;
  }

  /**
   * Connect to Angel One WebSocket2
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[AngelWebSocket] Already connected");
      return;
    }

    this.isIntentionallyClosed = false;
    this.clearReconnectTimer();
    this.debugTickCount = 0; // Reset debug counter on new connection

    // Get auth credentials from SmartAPI session
    const accessToken = smart_api?.getAccessToken?.();
    const feedToken = smart_api?.getFeedToken?.();
    const clientCode = smart_api?.getClientCode?.();
    const apiKey = smart_api?.getApiKey?.();

    if (!accessToken || !feedToken || !clientCode || !apiKey) {
      console.warn(
        "[AngelWebSocket] Missing auth credentials — will retry in 5s",
        {
          hasAccessToken: !!accessToken,
          hasFeedToken: !!feedToken,
          hasClientCode: !!clientCode,
          hasApiKey: !!apiKey,
        }
      );
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": apiKey,
          "x-client-code": clientCode,
          "x-feed-token": feedToken,
        },
      });

      this.ws.binaryType = "arraybuffer";

      this.ws.on("open", () => {
        console.log("[AngelWebSocket] Connected to Angel One WebSocket2");
        this.reconnectAttempt = 0;
        this.startHeartbeat();
        this.startFlushTimer();

        // Re-subscribe all previously active tokens on reconnect
        if (this.activeSubscriptions.size > 0) {
          const tokens = this.subscriptionSetToTokenList();
          console.log(
            `[AngelWebSocket] Re-subscribing ${this.activeSubscriptions.size} tokens after reconnect`
          );
          this.sendSubscription(tokens, true);
        }
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        try {
          this.handleMessage(data);
        } catch (err) {
          console.error("[AngelWebSocket] Error handling message:", err);
        }
      });

      this.ws.on("close", (code, reason) => {
        this.stopHeartbeat();
        this.stopFlushTimer();
        this.ws = null;
        console.log("[AngelWebSocket] Connection closed", {
          code,
          reason: reason?.toString(),
        });
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      });

      this.ws.on("error", (err) => {
        console.error("[AngelWebSocket] WebSocket error:", err.message);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[AngelWebSocket] Failed to create WebSocket:", message);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.stopFlushTimer();
    this.flushToRedis(); // Flush remaining ticks

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.activeSubscriptions.clear();
    console.log("[AngelWebSocket] Disconnected");
  }

  /**
   * Subscribe to tokens for LTP updates.
   * Accepts array of {exchange, token} pairs (using DB exchange strings).
   */
  subscribe(tokens: TokenSubscription[]): void {
    if (tokens.length === 0) return;

    // Filter out already-subscribed tokens and enforce limit
    const newTokens = tokens.filter(
      (t) => !this.activeSubscriptions.has(`${t.exchange}:${t.token}`)
    );

    if (newTokens.length === 0) return;

    // Check subscription limit
    const available = MAX_SUBSCRIPTIONS - this.activeSubscriptions.size;
    if (newTokens.length > available) {
      console.warn(
        `[AngelWebSocket] Subscription limit: need ${newTokens.length}, only ${available} slots available. Subscribing first ${available}.`
      );
      newTokens.splice(available);
    }

    // Add to active set
    newTokens.forEach((t) =>
      this.activeSubscriptions.add(`${t.exchange}:${t.token}`)
    );

    // Send to WebSocket
    this.sendSubscription(newTokens, true);

    console.log(
      `[AngelWebSocket] Subscribed to ${newTokens.length} new tokens (total: ${this.activeSubscriptions.size})`
    );
  }

  /**
   * Unsubscribe from tokens
   */
  unsubscribe(tokens: TokenSubscription[]): void {
    if (tokens.length === 0) return;

    const toRemove = tokens.filter((t) =>
      this.activeSubscriptions.has(`${t.exchange}:${t.token}`)
    );

    if (toRemove.length === 0) return;

    toRemove.forEach((t) =>
      this.activeSubscriptions.delete(`${t.exchange}:${t.token}`)
    );

    this.sendSubscription(toRemove, false);

    console.log(
      `[AngelWebSocket] Unsubscribed ${toRemove.length} tokens (total: ${this.activeSubscriptions.size})`
    );
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get count of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.activeSubscriptions.size;
  }

  /**
   * Get copy of all active subscription keys
   */
  getActiveSubscriptions(): Set<string> {
    return new Set(this.activeSubscriptions);
  }

  // ============================================================
  //  PRIVATE METHODS
  // ============================================================

  /**
   * Handle incoming WebSocket message (binary data)
   */
  private handleMessage(data: WebSocket.Data): void {
    if (!(data instanceof ArrayBuffer)) {
      // Could be a text message (heartbeat ack, etc.)
      return;
    }

    const buffer = data as ArrayBuffer;

    // Minimum LTP packet size:
    //   1 (mode) + 1 (exchange) + 25 (token) + 8 (seq) + 8 (timestamp) + 8 (ltp) = 51 bytes
    if (buffer.byteLength < 51) {
      return;
    }

    const tick = this.parseLTPBinary(buffer);
    if (tick) {
      this.tickBuffer.push(tick);

      // Log first 10 ticks per connection for debugging
      if (this.debugTickCount < 10) {
        console.log(
          `[AngelWebSocket] Tick #${this.debugTickCount + 1}: ${tick.exchange}:${tick.token} LTP=${tick.ltp} (buffer ${buffer.byteLength} bytes)`
        );
        this.debugTickCount++;
      }
    }
  }

  /**
   * Parse binary LTP data from Angel One WebSocket2
   *
   * Binary format (little-endian):
   *   Offset 0   (1 byte):   subscription mode (1=LTP, 2=Quote, 3=SnapQuote)
   *   Offset 1   (1 byte):   exchange type (1=NSE_CM, 2=NSE_FO, etc.)
   *   Offset 2   (25 bytes): token (null-terminated ASCII string)
   *   Offset 27  (8 bytes):  sequence number (int64)
   *   Offset 35  (8 bytes):  exchange timestamp (int64)
   *   Offset 43  (8 bytes):  LTP (int64, divide by 100)
   */
  private parseLTPBinary(buffer: ArrayBuffer): LTPTick | null {
    try {
      const view = new DataView(buffer);

      // Mode check — we only care about LTP mode
      const mode = view.getUint8(0);
      if (mode !== LTP_MODE) return null;

      // Exchange type
      const exchangeCode = view.getUint8(1);
      const exchange = WS_CODE_TO_EXCHANGE[exchangeCode];
      if (!exchange) return null;

      // Token: 25 bytes starting at offset 2, null-terminated ASCII
      const tokenBytes = new Uint8Array(buffer, 2, 25);
      let tokenStr = "";
      for (let i = 0; i < 25; i++) {
        if (tokenBytes[i] === 0) break;
        tokenStr += String.fromCharCode(tokenBytes[i]);
      }

      if (!tokenStr) return null;

      // LTP at offset 43, 8 bytes, little-endian int64
      // Angel One sends LTP multiplied by 100 (paisa for Indian stocks)
      // Read as two 32-bit parts since JS doesn't have native int64
      const ltpLow = view.getUint32(43, true);  // lower 32 bits
      const ltpHigh = view.getInt32(47, true);   // upper 32 bits (signed)
      const ltpRaw = ltpHigh * 0x100000000 + ltpLow;
      const ltp = ltpRaw / 100;

      if (isNaN(ltp) || ltp <= 0) return null;

      return { exchange, token: tokenStr, ltp };
    } catch {
      return null;
    }
  }

  /**
   * Build and send subscription/unsubscription payload
   */
  private sendSubscription(
    tokens: TokenSubscription[],
    isSubscribe: boolean
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Group tokens by exchange code
    const grouped = new Map<number, string[]>();
    for (const { exchange, token } of tokens) {
      const wsCode = EXCHANGE_TO_WS_CODE[exchange];
      if (wsCode === undefined) {
        console.warn(
          `[AngelWebSocket] Unknown exchange: ${exchange}, skipping token ${token}`
        );
        continue;
      }
      const list = grouped.get(wsCode) || [];
      list.push(token);
      grouped.set(wsCode, list);
    }

    if (grouped.size === 0) return;

    const tokenList = Array.from(grouped.entries()).map(
      ([exchangeType, tokenArr]) => ({
        exchangeType,
        tokens: tokenArr,
      })
    );

    const payload: SubscriptionPayload = {
      correlationID: `tradebox_${Date.now()}`,
      action: isSubscribe ? 1 : 0,
      params: {
        mode: LTP_MODE,
        tokenList,
      },
    };

    try {
      this.ws.send(JSON.stringify(payload));
    } catch (err) {
      console.error("[AngelWebSocket] Failed to send subscription:", err);
    }
  }

  /**
   * Convert active subscription set to TokenSubscription array
   */
  private subscriptionSetToTokenList(): TokenSubscription[] {
    return Array.from(this.activeSubscriptions).map((key) => {
      const [exchange, token] = key.split(":");
      return { exchange, token };
    });
  }

  /**
   * Flush buffered ticks to Redis via PriceCache
   */
  private async flushToRedis(): Promise<void> {
    if (this.tickBuffer.length === 0) return;

    // Drain the buffer
    const ticks = this.tickBuffer.splice(0, this.tickBuffer.length);

    // Deduplicate — keep only the latest tick per token
    const latestByToken = new Map<string, LTPTick>();
    for (const tick of ticks) {
      latestByToken.set(tick.token, tick);
    }

    const uniqueTicks = Array.from(latestByToken.values());

    try {
      await setCachedPriceBulk(uniqueTicks);

      // Notify callback (for pending request resolution)
      if (this.onTickCallback) {
        this.onTickCallback(uniqueTicks);
      }
    } catch (err) {
      console.error("[AngelWebSocket] Redis flush error:", err);
    }
  }

  /**
   * Start periodic flush timer for batched Redis writes
   */
  private startFlushTimer(): void {
    this.stopFlushTimer();
    this.flushTimer = setInterval(() => {
      this.flushToRedis();
    }, REDIS_FLUSH_INTERVAL_MS);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Send heartbeat ping to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt),
      RECONNECT_MAX_MS
    );
    this.reconnectAttempt += 1;
    console.log(
      `[AngelWebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isIntentionallyClosed) return;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton instance
export const angelWebSocket = new AngelWebSocketClient();

export type { TokenSubscription, LTPTick };
