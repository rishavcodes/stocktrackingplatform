import WebSocket from "ws";
import { getBigulWsUrl } from "../config/bigul.js";

const BIGUL_WS_URL = getBigulWsUrl() || "wss://cbc.bigul.co/broadcast/socket";
const PING_INTERVAL_MS = 10_000;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;
const MSG_QUEUE_DELAY_MS = 600;
const SOURCE = "NodeJS-1.0.0";

// ── Field maps from Bigul binary protocol (map.json) ────────────────────────

const SCRIP_FIELDS = [
  "ltp","vol_traded_today","last_traded_time","ExFeedTime","bidSize","askSize",
  "bidPrice","askPrice","last_traded_qty","tot_buy_qty","tot_sell_qty",
  "avg_trade_price","OI","low_price","high_price","Yhigh","Ylow",
  "lowCircuit","upCircuit","open_price","close_price",
];
const DEPTH_FIELDS = [
  "bidPrice1","bidPrice2","bidPrice3","bidPrice4","bidPrice5",
  "askPrice1","askPrice2","askPrice3","askPrice4","askPrice5",
  "bidsize1","bidsize2","bidsize3","bidsize4","bidsize5",
  "askSize1","askSize2","askSize3","askSize4","askSize5",
  "bidorder1","bidorder2","bidorder3","bidorder4","bidorder5",
  "askorder1","askorder2","askorder3","askorder4","askorder5",
];
const INDEX_FIELDS = [
  "ltp","close_price","ExFeedTime","high_price","low_price","open_price","Yhigh","Ylow",
];

const SCRIP_PRICE_IDX = new Set([0, 6, 7, 11, 13, 14, 17, 18, 19, 20]);
const DEPTH_PRICE_IDX = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const INDEX_PRICE_IDX = new Set([0, 1, 3, 4, 5, 6, 7]);

// ── Binary message types ─────────────────────────────────────────────────────

const MSG_AUTH = 1;
const MSG_ACK = 3;
const MSG_SUB = 4;
const MSG_UNSUB = 5;
const MSG_DATA = 6;
const MSG_MODE = 12;

const REC_SNAPSHOT = 83; // 'S'
const REC_UPDATE = 85;   // 'U'
const REC_LITE = 76;     // 'L'

// ── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus = "connected" | "disconnected" | "rejected" | "unknown";

export interface BigulFeedMessage {
  _feedType?: "sf" | "dp" | "if";
  type?: string;
  [key: string]: unknown;
}

export interface BigulWSOptions {
  accessToken: string;
  onMessage: (data: BigulFeedMessage) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

// ── Binary message builders ──────────────────────────────────────────────────

function buildAuthMsg(token: string): Buffer {
  const tokenBuf = Buffer.from(token, "utf8");
  const srcBuf = Buffer.from(SOURCE, "utf8");
  const payloadLen = 2 + (3 + tokenBuf.length) + 4 + 4 + (3 + srcBuf.length);
  const buf = Buffer.alloc(2 + payloadLen);
  let o = 0;
  buf.writeUInt16BE(payloadLen, o); o += 2;
  buf[o++] = MSG_AUTH;
  buf[o++] = 4; // field count

  buf[o++] = 1; buf.writeUInt16BE(tokenBuf.length, o); o += 2;
  tokenBuf.copy(buf, o); o += tokenBuf.length;

  buf[o++] = 2; buf.writeUInt16BE(1, o); o += 2; buf[o++] = 78; // 'N'
  buf[o++] = 3; buf.writeUInt16BE(1, o); o += 2; buf[o++] = 1;
  buf[o++] = 4; buf.writeUInt16BE(srcBuf.length, o); o += 2;
  srcBuf.copy(buf, o);
  return buf;
}

function buildSubscribeMsg(symbols: string[], channel: number): Buffer {
  const sd: number[] = [(symbols.length >> 8) & 0xFF, symbols.length & 0xFF];
  for (const s of symbols) {
    const b = Buffer.from(s, "ascii");
    sd.push(b.length, ...b);
  }
  const scrips = Buffer.from(sd);
  const payloadLen = 2 + (3 + scrips.length) + 4;
  const buf = Buffer.alloc(2 + payloadLen);
  let o = 0;
  buf.writeUInt16BE(payloadLen, o); o += 2;
  buf[o++] = MSG_SUB; buf[o++] = 2;
  buf[o++] = 1; buf.writeUInt16BE(scrips.length, o); o += 2;
  scrips.copy(buf, o); o += scrips.length;
  buf[o++] = 2; buf.writeUInt16BE(1, o); o += 2; buf[o++] = channel;
  return buf;
}

function buildUnsubscribeMsg(symbols: string[], channel: number): Buffer {
  const sd: number[] = [(symbols.length >> 8) & 0xFF, symbols.length & 0xFF];
  for (const s of symbols) {
    const b = Buffer.from(s, "ascii");
    sd.push(b.length, ...b);
  }
  const scrips = Buffer.from(sd);
  const payloadLen = 2 + (3 + scrips.length) + 4;
  const buf = Buffer.alloc(2 + payloadLen);
  let o = 0;
  buf.writeUInt16BE(payloadLen, o); o += 2;
  buf[o++] = MSG_UNSUB; buf[o++] = 2;
  buf[o++] = 1; buf.writeUInt16BE(scrips.length, o); o += 2;
  scrips.copy(buf, o); o += scrips.length;
  buf[o++] = 2; buf.writeUInt16BE(1, o); o += 2; buf[o++] = channel;
  return buf;
}

function buildFullModeMsg(channels: number[]): Buffer {
  let bitmask = BigInt(0);
  for (const ch of channels) {
    if (ch > 0 && ch < 64) bitmask |= BigInt(1) << BigInt(ch);
  }
  const buf = Buffer.alloc(2 + 2 + 11 + 4);
  let o = 0;
  buf.writeUInt16BE(0, o); o += 2;
  buf[o++] = MSG_MODE; buf[o++] = 2;
  buf[o++] = 1; buf.writeUInt16BE(8, o); o += 2;
  buf.writeBigUInt64BE(bitmask, o); o += 8;
  buf[o++] = 2; buf.writeUInt16BE(1, o); o += 2; buf[o++] = 70; // 'F'
  return buf;
}

function buildAckMsg(seqNum: number): Buffer {
  const buf = Buffer.alloc(11);
  let o = 0;
  buf.writeUInt16BE(9, o); o += 2;
  buf[o++] = MSG_ACK; buf[o++] = 1;
  buf[o++] = 1; buf.writeUInt16BE(4, o); o += 2;
  buf.writeUInt32BE(seqNum, o);
  return buf;
}

// ── Symbol state for incremental updates ─────────────────────────────────────

interface SymState {
  feedType: "sf" | "dp" | "if";
  symbol: string;
  exchange: string;
  exchangeToken: string;
  multiplier: number;
  precision: number;
  values: Record<string, number>;
}

// ── BigulWS class ────────────────────────────────────────────────────────────

export class BigulWS {
  private readonly accessToken: string;
  private readonly onMessage: (data: BigulFeedMessage) => void;
  private readonly onConnectionChange?: (status: ConnectionStatus) => void;
  private ws: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;
  private reconnectAttempt = 0;
  private msgQueue: Buffer[] = [];
  private queueTimer: ReturnType<typeof setTimeout> | null = null;

  private ackCount = 0;
  private updateCount = 0;

  private scripsSym = new Map<number, string>();
  private dpSym = new Map<number, string>();
  private indexSym = new Map<number, string>();
  private states = new Map<string, SymState>();

  constructor(options: BigulWSOptions) {
    this.accessToken = options.accessToken;
    this.onMessage = options.onMessage;
    this.onConnectionChange = options.onConnectionChange;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.clearReconnectTimer();
    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(BIGUL_WS_URL);
    } catch (err) {
      console.error("[BigulWS] Failed to create WebSocket:", err instanceof Error ? err.message : err);
      this.onConnectionChange?.("disconnected");
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      console.log("[BigulWS] Connected to", BIGUL_WS_URL);
      const authMsg = buildAuthMsg(this.accessToken);
      console.log("[BigulWS] Sending BINARY auth, length:", authMsg.length, "hex:", authMsg.subarray(0, 20).toString("hex"));
      this.sendBinary(authMsg);
      const fullMode = buildFullModeMsg([1, 2]);
      this.enqueue(fullMode);
      this.startPing();
    });

    this.ws.on("message", (raw: Buffer | string) => {
      const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as string, "utf8");
      if (data.length < 3) return;

      console.log("[BigulWS] MSG received, len:", data.length, "type:", data[2], "hex:", data.subarray(0, Math.min(30, data.length)).toString("hex"));

      try {
        this.handleBinaryResponse(data);
      } catch (err) {
        console.error("[BigulWS] Parse error:", err instanceof Error ? err.message : err);
      }
    });

    this.ws.on("close", (code, reason) => {
      this.stopPing();
      this.ws = null;
      console.log("[BigulWS] Closed, code:", code, "reason:", reason?.toString());
      this.onConnectionChange?.("disconnected");
      if (!this.isIntentionallyClosed) this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      console.error("[BigulWS] Error:", err.message);
      this.onConnectionChange?.("disconnected");
    });
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearReconnectTimer();
    this.stopPing();
    this.stopQueue();
    if (this.ws) { this.ws.close(); this.ws = null; }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  subscribeMarket(scrips: string, channelnum = 1): void {
    const symbols = scrips.split("&").map((s) => `sf|${s.trim()}`);
    console.log("[BigulWS] Subscribe market:", symbols);
    this.enqueue(buildSubscribeMsg(symbols, channelnum));
  }

  unsubscribeMarket(scrips: string, channelnum = 1): void {
    const symbols = scrips.split("&").map((s) => `sf|${s.trim()}`);
    this.enqueue(buildUnsubscribeMsg(symbols, channelnum));
  }

  subscribeDepth(scrips: string, channelnum = 2): void {
    const symbols = scrips.split("&").map((s) => `dp|${s.trim()}`);
    console.log("[BigulWS] Subscribe depth:", symbols);
    this.enqueue(buildSubscribeMsg(symbols, channelnum));
  }

  unsubscribeDepth(scrips: string, channelnum = 2): void {
    const symbols = scrips.split("&").map((s) => `dp|${s.trim()}`);
    this.enqueue(buildUnsubscribeMsg(symbols, channelnum));
  }

  // ── Binary response parsing ────────────────────────────────────────────────

  private handleBinaryResponse(data: Buffer): void {
    const msgType = data[2];

    switch (msgType) {
      case MSG_AUTH: this.parseAuthResp(data); break;
      case MSG_SUB: this.parseSubResp(data, "subscribe"); break;
      case MSG_UNSUB: this.parseSubResp(data, "unsubscribe"); break;
      case MSG_DATA: this.parseDataFeed(data); break;
      case MSG_MODE: this.parseModeResp(data); break;
      default: console.log("[BigulWS] Unknown msg type:", msgType);
    }
  }

  private parseAuthResp(data: Buffer): void {
    try {
      let pos = 4;
      pos += 1; // field tag
      const vLen = data.readUInt16BE(pos); pos += 2;
      const status = data.subarray(pos, pos + vLen).toString("utf8");
      pos += vLen;

      if (status === "K") {
        console.log("[BigulWS] Auth SUCCESS");
        pos += 1; // field tag
        const aLen = data.readUInt16BE(pos); pos += 2;
        if (aLen === 4) {
          this.ackCount = data.readUInt32BE(pos);
          console.log("[BigulWS] ackCount:", this.ackCount);
        }
        this.reconnectAttempt = 0;
        this.onConnectionChange?.("connected");
      } else {
        console.error("[BigulWS] Auth FAILED, status:", status);
        this.onConnectionChange?.("rejected");
      }
    } catch (err) {
      console.error("[BigulWS] Auth parse error:", err);
    }
  }

  private parseSubResp(data: Buffer, action: string): void {
    try {
      let pos = 5;
      const vLen = data.readUInt16LE(pos); pos += 2;
      const status = data.subarray(pos, pos + 1).toString("latin1");
      if (status === "K") {
        console.log(`[BigulWS] ${action} SUCCESS`);
      } else {
        console.warn(`[BigulWS] ${action} FAILED`);
      }
    } catch (err) {
      console.error(`[BigulWS] ${action} parse error:`, err);
    }
  }

  private parseModeResp(data: Buffer): void {
    try {
      let pos = 3;
      const fieldCount = data[pos]; pos += 1;
      if (fieldCount >= 1) {
        pos += 1; // tag
        const vLen = data.readUInt16BE(pos); pos += 2;
        const status = data.subarray(pos, pos + vLen).toString("utf8");
        console.log("[BigulWS] Mode change:", status === "K" ? "SUCCESS" : "FAILED");
      }
    } catch (err) {
      console.error("[BigulWS] Mode parse error:", err);
    }
  }

  private parseDataFeed(data: Buffer): void {
    try {
      if (this.ackCount > 0) {
        this.updateCount += 1;
        const seqNum = data.readUInt32BE(3);
        if (this.updateCount >= this.ackCount) {
          this.enqueue(buildAckMsg(seqNum));
          this.updateCount = 0;
        }
      }

      const recordCount = data.readUInt16BE(7);
      let pos = 9;

      for (let r = 0; r < recordCount && pos < data.length; r++) {
        const recType = data[pos];

        if (recType === REC_SNAPSHOT) {
          pos = this.parseSnapshot(data, pos + 1);
        } else if (recType === REC_UPDATE) {
          pos = this.parseUpdate(data, pos + 1);
        } else if (recType === REC_LITE) {
          pos = this.parseLite(data, pos + 1);
        } else {
          console.warn("[BigulWS] Unknown record type:", recType, "at pos:", pos);
          break;
        }
      }
    } catch (err) {
      console.error("[BigulWS] DataFeed parse error:", err);
    }
  }

  private parseSnapshot(data: Buffer, pos: number): number {
    const symId = data.readUInt16LE(pos); pos += 2;
    const nameLen = data[pos]; pos += 1;
    const symName = data.subarray(pos, pos + nameLen).toString("utf8"); pos += nameLen;

    const prefix = symName.substring(0, 2);
    let fields: string[];
    let priceIdx: Set<number>;
    let feedType: "sf" | "dp" | "if";

    if (prefix === "dp") {
      fields = DEPTH_FIELDS; priceIdx = DEPTH_PRICE_IDX; feedType = "dp";
      this.dpSym.set(symId, symName);
    } else if (prefix === "if") {
      fields = INDEX_FIELDS; priceIdx = INDEX_PRICE_IDX; feedType = "if";
      this.indexSym.set(symId, symName);
    } else {
      fields = SCRIP_FIELDS; priceIdx = SCRIP_PRICE_IDX; feedType = "sf";
      this.scripsSym.set(symId, symName);
    }

    const fieldCount = data[pos]; pos += 1;
    const values: Record<string, number> = {};
    for (let i = 0; i < fieldCount && i < fields.length; i++) {
      values[fields[i]] = data.readUInt32BE(pos); pos += 4;
    }

    pos += 2; // skip 2 bytes
    const multiplier = data.readUInt16LE(pos); pos += 2;
    const precision = data[pos]; pos += 1;

    const strFields = ["exchange", "exchange_token", "symbol"];
    const strValues: Record<string, string> = {};
    for (const sf of strFields) {
      const sLen = data[pos]; pos += 1;
      strValues[sf] = data.subarray(pos, pos + sLen).toString("utf8"); pos += sLen;
    }

    const state: SymState = {
      feedType, symbol: symName,
      exchange: strValues.exchange, exchangeToken: strValues.exchange_token,
      multiplier, precision, values,
    };
    this.states.set(symName, state);
    this.emitState(state, fields, priceIdx);
    return pos;
  }

  private parseUpdate(data: Buffer, pos: number): number {
    const symId = data.readUInt16LE(pos); pos += 2;
    const fieldCount = data[pos]; pos += 1;

    let symName: string | undefined;
    let fields: string[];
    let priceIdx: Set<number>;

    if (fieldCount === 21) {
      symName = this.scripsSym.get(symId);
      fields = SCRIP_FIELDS; priceIdx = SCRIP_PRICE_IDX;
    } else if (fieldCount === 8) {
      symName = this.indexSym.get(symId);
      fields = INDEX_FIELDS; priceIdx = INDEX_PRICE_IDX;
    } else {
      symName = this.dpSym.get(symId);
      fields = DEPTH_FIELDS; priceIdx = DEPTH_PRICE_IDX;
    }

    if (!symName) {
      pos += fieldCount * 4;
      return pos;
    }

    const state = this.states.get(symName);
    if (!state) {
      pos += fieldCount * 4;
      return pos;
    }

    for (let i = 0; i < fieldCount && i < fields.length; i++) {
      state.values[fields[i]] = data.readUInt32BE(pos); pos += 4;
    }

    this.emitState(state, fields, priceIdx);
    return pos;
  }

  private parseLite(data: Buffer, pos: number): number {
    const symId = data.readUInt16LE(pos); pos += 2;
    const ltp = data.readUInt32BE(pos); pos += 4;

    const symName = this.scripsSym.get(symId) ?? this.indexSym.get(symId);
    if (!symName) return pos;

    const state = this.states.get(symName);
    if (!state) return pos;

    state.values.ltp = ltp;
    const fields = state.feedType === "if" ? INDEX_FIELDS : SCRIP_FIELDS;
    const priceIdx = state.feedType === "if" ? INDEX_PRICE_IDX : SCRIP_PRICE_IDX;
    this.emitState(state, fields, priceIdx);
    return pos;
  }

  private emitState(state: SymState, fields: string[], priceIdx: Set<number>): void {
    const out: BigulFeedMessage = { _feedType: state.feedType };
    const div = Math.pow(10, state.precision);

    for (let i = 0; i < fields.length; i++) {
      const key = fields[i];
      const raw = state.values[key];
      if (raw === undefined) continue;
      out[key] = priceIdx.has(i) ? raw / div : raw;
    }

    out.exchange = state.exchange;
    out.exchange_token = state.exchangeToken;
    out.symbol = state.symbol;
    out.multiplier = state.multiplier;
    out.precision = state.precision;

    this.onMessage(out);
  }

  // ── Send helpers ───────────────────────────────────────────────────────────

  private sendBinary(buf: Buffer): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  }

  private enqueue(buf: Buffer): void {
    this.msgQueue.push(buf);
    if (!this.queueTimer) this.processQueue();
  }

  private processQueue(): void {
    if (this.msgQueue.length === 0) { this.queueTimer = null; return; }
    const msg = this.msgQueue.shift()!;
    this.sendBinary(msg);
    this.queueTimer = setTimeout(() => this.processQueue(), MSG_QUEUE_DELAY_MS);
  }

  private stopQueue(): void {
    if (this.queueTimer) { clearTimeout(this.queueTimer); this.queueTimer = null; }
    this.msgQueue = [];
  }

  // ── Ping / reconnect ──────────────────────────────────────────────────────

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send("Ping");
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt), RECONNECT_MAX_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isIntentionallyClosed) this.connect();
    }, delay);
  }
}
