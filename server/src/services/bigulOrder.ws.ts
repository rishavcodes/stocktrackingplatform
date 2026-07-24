import WebSocket from "ws";
import { getBigulOrderWsUrl } from "../config/bigul.js";

const HEARTBEAT_INTERVAL_MS = 25_000;
const PING_INTERVAL_MS = 45_000;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

export type OrderWSStatus =
  | "connected"
  | "authenticated"
  | "auth_failed"
  | "disconnected";

export interface BigulOrderWSOptions {
  accessToken: string;
  onOrder: (data: Record<string, unknown>) => void;
  onTrade: (data: Record<string, unknown>) => void;
  onPosition: (data: Record<string, unknown>) => void;
  onConnectionChange?: (status: OrderWSStatus) => void;
}

export class BigulOrderWS {
  private opts: BigulOrderWSOptions;
  private ws: WebSocket | null = null;
  private authenticated = false;
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: BigulOrderWSOptions) {
    this.opts = opts;
  }

  connect(): void {
    this.intentionalClose = false;
    const url = getBigulOrderWsUrl();
    console.log("[BigulOrderWS] Connecting to", url);

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error("[BigulOrderWS] Failed to create WebSocket:", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      console.log("[BigulOrderWS] Connected, sending auth");
      this.reconnectAttempt = 0;
      this.opts.onConnectionChange?.("connected");
      this.sendAuth();
    });

    this.ws.on("message", (raw: WebSocket.Data) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleMessage(msg);
      } catch {
        // non-JSON message, ignore
      }
    });

    this.ws.on("error", (err) => {
      console.error("[BigulOrderWS] WebSocket error:", err.message);
    });

    this.ws.on("close", () => {
      console.log("[BigulOrderWS] Connection closed");
      this.cleanup();
      this.opts.onConnectionChange?.("disconnected");
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    });
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.cleanup();
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  private sendAuth(): void {
    this.send({
      type: "cn",
      "x-access-token": this.opts.accessToken,
      src: "WEB",
    });
  }

  private send(obj: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  private handleMessage(msg: Record<string, unknown>): void {
    const type = msg.type as string;

    if (type === "cn") {
      if (msg.ak === "ok") {
        console.log("[BigulOrderWS] Authenticated successfully");
        this.authenticated = true;
        this.opts.onConnectionChange?.("authenticated");
        this.startHeartbeat();
        this.startPing();
      } else {
        console.error("[BigulOrderWS] Auth failed:", msg.msg);
        this.authenticated = false;
        this.opts.onConnectionChange?.("auth_failed");
      }
      return;
    }

    if (type === "pong") return;

    if (type === "order") {
      this.opts.onOrder((msg.data as Record<string, unknown>) || msg);
      return;
    }

    if (type === "trade") {
      this.opts.onTrade((msg.data as Record<string, unknown>) || msg);
      return;
    }

    if (type === "position") {
      this.opts.onPosition((msg.data as Record<string, unknown>) || msg);
      return;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "hb" });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private cleanup(): void {
    this.authenticated = false;
    this.stopHeartbeat();
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt),
      RECONNECT_MAX_MS,
    );
    this.reconnectAttempt++;
    console.log(`[BigulOrderWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
