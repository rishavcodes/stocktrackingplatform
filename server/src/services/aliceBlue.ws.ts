import crypto from "crypto";
import WebSocket from "ws";
import axios from "axios";
import { getAliceBlueBaseUrl } from "../config/aliceBlue.js";

const ALICE_BLUE_WS_URL = "wss://ws1.aliceblueonline.com/NorenWS/";
const HEARTBEAT_INTERVAL_MS = 50_000;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

/** Connection status from Alice Blue (cf) */
export type ConnectionStatus = "connected" | "disconnected" | "rejected" | "unknown";

/** Parsed feed message types: cf, tk, tf, dk, df */
export interface AliceBlueFeedMessage {
  t?: string;
  [key: string]: unknown;
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Generates susertoken as per Alice Blue: sha256(sha256(sessionId))
 */
export function generateSusertoken(sessionId: string): string {
  const firstHash = sha256Hex(sessionId);
  return sha256Hex(firstHash);
}

/**
 * Create WebSocket session via REST (required before connecting to WS).
 * POST /open-api/od/v1/profile/createWsSess
 */
async function createWsSess(sessionId: string, clientId: string): Promise<void> {
  const baseUrl = getAliceBlueBaseUrl();
  const endpoint = `${baseUrl}/open-api/od/v1/profile/createWsSess`;
  const res = await axios.post(
    endpoint,
    { source: "API", userId: clientId },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionId}`,
      },
      timeout: 10_000,
    }
  );
  const status = res.data?.status ?? res.data?.stat;
  if (status !== "Ok" && status !== "ok") {
    throw new Error(res.data?.message ?? res.data?.emsg ?? "createWsSess failed");
  }
}

/**
 * Invalidate WebSocket session via REST (call when disconnecting WS).
 * POST /open-api/od/v1/profile/invalidateWsSess
 */
async function invalidateWsSess(sessionId: string, clientId: string): Promise<void> {
  const baseUrl = getAliceBlueBaseUrl();
  const endpoint = `${baseUrl}/open-api/od/v1/profile/invalidateWsSess`;
  await axios.post(
    endpoint,
    { source: "API", userId: clientId },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionId}`,
      },
      timeout: 5_000,
    }
  );
}

export interface AliceBlueWSOptions {
  sessionId: string;
  clientId: string;
  onMessage: (data: AliceBlueFeedMessage) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

export class AliceBlueWS {
  private readonly sessionId: string;
  private readonly clientId: string;
  private readonly onMessage: (data: AliceBlueFeedMessage) => void;
  private readonly onConnectionChange?: (status: ConnectionStatus) => void;
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;
  private reconnectAttempt = 0;

  constructor(options: AliceBlueWSOptions) {
    this.sessionId = options.sessionId;
    this.clientId = options.clientId;
    this.onMessage = options.onMessage;
    this.onConnectionChange = options.onConnectionChange;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    this.clearReconnectTimer();
    this.isIntentionallyClosed = false;
    const susertoken = generateSusertoken(this.sessionId);
    const actid = `${this.clientId}_API`;
    const uid = `${this.clientId}_API`;

    createWsSess(this.sessionId, this.clientId)
      .then(() => {
        if (this.isIntentionallyClosed) return;
        try {
          this.ws = new WebSocket(ALICE_BLUE_WS_URL);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[AliceBlueWS] Failed to create WebSocket:", message);
          this.onConnectionChange?.("disconnected");
          this.scheduleReconnect();
          return;
        }

        this.ws.on("open", () => {
          console.log("[AliceBlueWS] Connected to Alice Blue, sending connection payload");
          const payload = {
            susertoken,
            t: "c",
            actid,
            uid,
            source: "API",
          };
          this.send(payload);
          this.startHeartbeat();
        });

        this.ws.on("message", (raw: Buffer | string) => {
          try {
            const text = typeof raw === "string" ? raw : raw.toString("utf8");
            const parsed = this.parseMessage(text);
            if (parsed) {
              // Log every message from Alice Blue (t=type: cf,tk,tf,dk,df etc.)
              // console.log("[AliceBlueWS] message", parsed.t ?? "?", JSON.stringify(parsed));
              this.handleFeedMessage(parsed);
              this.onMessage(parsed);
            }
          } catch (err) {
            console.error("[AliceBlueWS] Error parsing message:", err);
          }
        });

        this.ws.on("close", (code, reason) => {
          this.stopHeartbeat();
          this.ws = null;
          console.log("[AliceBlueWS] Connection closed", { code, reason: reason?.toString() });
          this.onConnectionChange?.("disconnected");
          if (!this.isIntentionallyClosed) {
            this.scheduleReconnect();
          }
        });

        this.ws.on("error", (err) => {
          console.error("[AliceBlueWS] WebSocket error:", err.message);
          this.onConnectionChange?.("disconnected");
        });
      })
      .catch((err) => {
        console.error("[AliceBlueWS] createWsSess failed:", err.message);
        this.onConnectionChange?.("disconnected");
        this.scheduleReconnect();
      });
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    invalidateWsSess(this.sessionId, this.clientId).catch((err) => {
      console.warn("[AliceBlueWS] invalidateWsSess failed:", err.message);
    });
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt),
      RECONNECT_MAX_MS
    );
    this.reconnectAttempt += 1;
    // console.log("[AliceBlueWS] Reconnecting in", delay, "ms (attempt", this.reconnectAttempt, ")");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isIntentionallyClosed) return;
      this.connect();
    }, delay);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Market data (LTP, OHLC, volume): request t="t", response tk (ack) + tf (feed) */
  subscribeMarket(tokens: string): void {
    // console.log("[AliceBlueWS] subscribeMarket", { t: "t", k: tokens });
    this.send({ t: "t", k: tokens });
  }

  /** Unsubscribe market: request t="u", no response */
  unsubscribeMarket(tokens: string): void {
    this.send({ t: "u", k: tokens });
  }

  /** Depth data (LTP, depth levels): request t="d", response dk (ack) + df (feed) */
  subscribeDepth(tokens: string): void {
    this.send({ t: "d", k: tokens });
  }

  /** Unsubscribe depth: request t="ud", no response */
  unsubscribeDepth(tokens: string): void {
    this.send({ t: "ud", k: tokens });
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn("[AliceBlueWS] Cannot send, socket not open");
      return;
    }
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (err) {
      console.error("[AliceBlueWS] Send error:", err);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ t: "h", k: "" });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private parseMessage(text: string): AliceBlueFeedMessage | null {
    if (!text?.trim()) return null;
    try {
      const data = JSON.parse(text) as unknown;
      if (data !== null && typeof data === "object") {
        return data as AliceBlueFeedMessage;
      }
      return null;
    } catch {
      return null;
    }
  }

  private handleFeedMessage(msg: AliceBlueFeedMessage): void {
    const t = msg.t;
    if (t === "cf") {
      const status = (msg.stat as string)?.toLowerCase();
      const connectionStatus: ConnectionStatus =
        status === "ok" ? "connected" : status === "not_ok" ? "rejected" : "unknown";
      if (connectionStatus === "connected") {
        this.reconnectAttempt = 0;
      }
      this.onConnectionChange?.(connectionStatus);
      console.log("[AliceBlueWS] Connection status:", connectionStatus, msg);
    } else if (t === "ck") {
      const s = (msg.s as string)?.toLowerCase();
      const connectionStatus: ConnectionStatus =
        s === "ok" ? "connected" : "rejected";
      if (connectionStatus === "connected") {
        this.reconnectAttempt = 0;
      }
      this.onConnectionChange?.(connectionStatus);
      console.log("[AliceBlueWS] Connection ack (ck):", connectionStatus, msg);
    }
    // tk / tf = market data, dk / df = depth data — all forwarded via onMessage
  }
}
