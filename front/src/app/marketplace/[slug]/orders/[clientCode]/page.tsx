"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Socket, io } from "socket.io-client";
import { Input } from "@/components/ui/input";
import {
  Search,
  Loader2,
  Briefcase,
  RefreshCw,
  X,
  FileText,
  Eye,
} from "lucide-react";
import { getBrokerSession } from "@/lib/brokerSession";
import MarketplaceNavbar from "@/components/Marketplace/MarketplaceNavbar";
import { useToast } from "@/components/ui/use-toast";

const ALICE_BLUE_SESSION_KEY = "aliceBlueSession";
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type OrderType = "BUY" | "SELL";

interface OrderRow {
  // Identity
  orderId?: string;
  // Display
  time: string;
  date?: string;
  type: OrderType;
  instrument: string;
  symbol: string;
  exchange: string;
  product: string;
  // Quantities
  qty: number;
  tradedQty: number;
  pendingQty?: number;
  disclosedQty?: number;
  // Prices
  price: string;
  triggerPrice: string;
  avgPrice?: string;
  ltp?: string;
  // Status / type
  status: string;
  orderType?: string;
  validity?: string;
  rejReason?: string;
  // External IDs
  xtsOrderId?: string;
  exchangeOrderNo?: string;
  // Trade-specific
  tradeId?: string;
  exchangeTimeStamp?: string;
}

interface PositionRow {
  key: string;
  symbol: string;
  exchange: string;
  product: string;
  buyQty: number;
  sellQty: number;
  netQty: number;
  buyAmt: string;
  sellAmt: string;
  // New fields
  ltp?: string;
  dayPnl?: string;
  netPnl?: string;
  netAvg?: string;
  buyAvgPrice?: string;
  netValue?: string;
  totalTurnover?: string;
  sellAvgPrice?: string;
  realizedMTM?: string;
  unrealizedMTM?: string;
  closePrice?: string;
}

interface HoldingRow {
  symbol: string;
  exchange: string;
  qty: number;
  avgPrice: string;
  ltp: string;
  pnl: string;
  pnlPct: string;
  currentValue: string;
  investedValue: string;
  // New fields
  t1Qty?: number;
  usedQty?: number;
  dayPnl?: string;
  dayPnlPct?: string;
  totalHoldingQty?: number;
  marketValue?: string;
  haircut?: string;
  collateralQty?: number;
  pledgeQty?: number;
  collateralValue?: string;
  pledgeCollateral?: string;
}

/* ==================== HELPERS ==================== */

function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ALICE_BLUE_SESSION_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data?.userSession ?? null;
  } catch {
    return null;
  }
}

function formatTime(value: unknown): string {
  if (value == null) return "—";
  const s = String(value).trim();
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
  const m = /^\d{2}-\w{3}-\d{4}\s+(\d{1,2}:\d{2}:\d{2})/.exec(s);
  if (m) return m[1];
  const m2 = /^\d{4}-\d{2}-\d{2}\s+(\d{1,2}:\d{2}:\d{2})/.exec(s);
  if (m2) return m2[1];
  const date = new Date(s);
  if (!Number.isNaN(date.getTime()))
    return date.toLocaleTimeString("en-IN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  return s;
}

function formatDate(value: unknown): string {
  if (value == null) return "—";
  const s = String(value).trim();
  // Match "01-Jan-2026 ..." or "01-Jan-2026"
  const m = /^(\d{2}-\w{3}-\d{4})/.exec(s);
  if (m) return m[1];
  // Match "2026-01-01 ..."
  const m2 = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m2) return m2[1];
  const date = new Date(s);
  if (!Number.isNaN(date.getTime()))
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return s;
}

function fmtNum(v: unknown): string {
  const n = Number(v);
  return Number.isNaN(n) ? String(v ?? "0") : n.toFixed(2);
}

function fmtMoney(v: unknown): string {
  const n = Number(v);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function mapBigulOrderToRow(d: Record<string, unknown>): OrderRow {
  const trnsTp = String(d.trnsTp ?? "B").toUpperCase();
  const qty = Number(d.qty ?? 0);
  const tradedQty = Number(d.fldQty ?? 0);
  return {
    orderId: String(d.nOrdNo ?? ""),
    time: formatTime(d.ordDtTm ?? d.hsUpTm),
    date: formatDate(d.ordDtTm ?? d.hsUpTm),
    type: trnsTp === "S" ? "SELL" : "BUY",
    instrument: String(d.trdSym ?? "—"),
    symbol: String(d.sym ?? d.trdSym ?? "—"),
    exchange: String(d.exSeg ?? "NSE").replace(/_/g, " ").toUpperCase(),
    product: String(d.prod ?? "—"),
    qty,
    tradedQty,
    pendingQty: Math.max(0, qty - tradedQty),
    disclosedQty: Number(d.dsQty ?? d.dscQty ?? 0),
    price: fmtNum(d.prc),
    triggerPrice: fmtNum(d.trgPrc),
    avgPrice: fmtNum(d.avgPrc),
    ltp: fmtNum(d.ltp ?? d.cncLtp ?? 0),
    status: String(d.ordSt ?? "—").toLowerCase(),
    orderType: String(d.prcTp ?? d.ordTyp ?? "LIMIT").toUpperCase(),
    validity: String(d.dur ?? d.vldty ?? d.validity ?? "DAY").toUpperCase(),
    rejReason:
      d.rejRsn && String(d.rejRsn) !== "--" ? String(d.rejRsn) : undefined,
    xtsOrderId: String(d.exOrdId ?? d.xtsOrdId ?? ""),
    exchangeOrderNo: String(d.exOrdId ?? d.exchOrdNo ?? ""),
  };
}

function mapBigulTradeToRow(d: Record<string, unknown>): OrderRow {
  const trnsTp = String(d.trnsTp ?? "B").toUpperCase();
  const fldQty = Number(d.fldQty ?? 0);
  return {
    orderId: String(d.nOrdNo ?? ""),
    tradeId: String(d.flId ?? d.nOrdNo ?? ""),
    time: formatTime(d.flTm ?? d.exTm),
    exchangeTimeStamp: formatTime(d.exTm ?? d.flTm),
    date: formatDate(d.flTm ?? d.exTm),
    type: trnsTp === "S" ? "SELL" : "BUY",
    instrument: String(d.trdSym ?? "—"),
    symbol: String(d.sym ?? d.trdSym ?? "—"),
    exchange: String(d.exSeg ?? "NSE").replace(/_/g, " ").toUpperCase(),
    product: String(d.prod ?? "—"),
    qty: fldQty,
    tradedQty: fldQty,
    price: fmtNum(d.avgPrc),
    avgPrice: fmtNum(d.avgPrc),
    ltp: fmtNum(d.ltp ?? d.cncLtp ?? 0),
    triggerPrice: "0.00",
    status: "traded",
    orderType: String(d.prcTp ?? d.ordTyp ?? "LIMIT").toUpperCase(),
    xtsOrderId: String(d.exOrdId ?? ""),
    exchangeOrderNo: String(d.exOrdId ?? d.exchOrdNo ?? ""),
  };
}

function mapBigulPositionToRow(d: Record<string, unknown>): PositionRow {
  const sym = String(d.trdSym ?? "—");
  const ex = String(d.exSeg ?? "NSE").replace(/_/g, " ").toUpperCase();
  const prod = String(d.prod ?? "—");
  const buyQty = Number(d.flBuyQty ?? d.cfBuyQty ?? 0);
  const sellQty = Number(d.flSellQty ?? d.cfSellQty ?? 0);
  const buyAmt = Number(d.buyAmt ?? d.flBuyAmt ?? 0);
  const sellAmt = Number(d.sellAmt ?? d.flSellAmt ?? 0);
  const buyAvg = buyQty > 0 ? buyAmt / buyQty : 0;
  const sellAvg = sellQty > 0 ? sellAmt / sellQty : 0;
  const netQty = buyQty - sellQty;
  const netValue = buyAmt - sellAmt;
  const totalTurnover = buyAmt + sellAmt;
  const ltp = Number(d.ltp ?? d.cncLtp ?? 0);
  const dayPnl = Number(d.dayMtoM ?? 0);
  const netPnl = Number(d.mtoM ?? 0);
  const realizedMTM = Number(d.rMtoM ?? d.realisedMtoM ?? 0);
  const unrealizedMTM = Number(d.urMtoM ?? d.unrealisedMtoM ?? 0);
  return {
    key: `${sym}|${ex}|${prod}`,
    symbol: sym,
    exchange: ex,
    product: prod,
    buyQty,
    sellQty,
    netQty,
    buyAmt: fmtNum(buyAmt),
    sellAmt: fmtNum(sellAmt),
    ltp: fmtNum(ltp),
    dayPnl: fmtNum(dayPnl),
    netPnl: fmtNum(netPnl),
    netAvg: fmtNum(netQty !== 0 ? netValue / netQty : 0),
    buyAvgPrice: fmtNum(buyAvg),
    sellAvgPrice: fmtNum(sellAvg),
    netValue: fmtNum(netValue),
    totalTurnover: fmtNum(totalTurnover),
    realizedMTM: fmtNum(realizedMTM),
    unrealizedMTM: fmtNum(unrealizedMTM),
    closePrice: fmtNum(d.clsPrc ?? d.cncLtp ?? 0),
  };
}

function mapBigulHoldingToRow(d: Record<string, unknown>): HoldingRow {
  const qty = Number(d.dpQty ?? d.qty ?? d.totalQty ?? 0);
  const t1Qty = Number(d.t1Qty ?? 0);
  const usedQty = Number(d.usedQty ?? d.holdQty ?? 0);
  const collateralQty = Number(d.colQty ?? d.collateralQty ?? 0);
  const pledgeQty = Number(d.pldgQty ?? d.pledgeQty ?? 0);
  const totalHoldingQty = qty + t1Qty;
  const avgPrice = Number(d.avgPrc ?? d.buyAvgPrc ?? 0);
  const ltp = Number(d.ltp ?? d.cncLtp ?? 0);
  const closePrice = Number(d.clsPrc ?? d.prevClose ?? 0);
  const invested = qty * avgPrice;
  const current = qty * ltp;
  const pnl = current - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  // Day's P&L: based on close vs ltp move on the held qty
  const dayPnl = closePrice > 0 ? (ltp - closePrice) * qty : 0;
  const dayPnlPct = closePrice > 0 ? ((ltp - closePrice) / closePrice) * 100 : 0;
  return {
    symbol: String(d.trdSym ?? d.sym ?? "—"),
    exchange: String(d.exSeg ?? d.exc ?? "NSE").replace(/_/g, " ").toUpperCase(),
    qty,
    t1Qty,
    usedQty,
    avgPrice: fmtNum(avgPrice),
    ltp: fmtNum(ltp),
    pnl: fmtNum(pnl),
    pnlPct: pnlPct.toFixed(2),
    dayPnl: fmtNum(dayPnl),
    dayPnlPct: dayPnlPct.toFixed(2),
    currentValue: fmtNum(current),
    investedValue: fmtNum(invested),
    marketValue: fmtNum(current),
    totalHoldingQty,
    haircut: fmtNum(d.haircut ?? 0),
    collateralQty,
    pledgeQty,
    collateralValue: fmtNum(d.colValue ?? d.collateralValue ?? 0),
    pledgeCollateral: fmtNum(d.pldgValue ?? d.pledgeCollateral ?? 0),
  };
}

function mapAliceOrderToRow(item: Record<string, unknown>): OrderRow {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = item[k];
      if (v !== undefined && v !== null) return v;
    }
    return null;
  };
  const type = String(
    get("transaction_type", "transactionType", "type") ?? "BUY"
  ).toUpperCase() as OrderType;
  const qty = Number(get("quantity", "qty") ?? 0);
  const tradedQty = Number(
    get("filled_quantity", "filledQuantity", "traded_qty", "tradedQty") ?? 0
  );
  return {
    time: formatTime(
      get("orderTime", "order_timestamp", "order_time", "time", "created_at")
    ),
    date: formatDate(
      get("orderTime", "order_timestamp", "order_time", "time", "created_at")
    ),
    type: type === "SELL" ? "SELL" : "BUY",
    instrument: String(
      get("trading_symbol", "tradingSymbol", "instrument", "symbol") ?? "—"
    ),
    symbol: String(
      get("trading_symbol", "tradingSymbol", "symbol") ?? "—"
    ),
    exchange: String(get("exchange") ?? "NSE"),
    product: String(get("product", "order_type") ?? "—"),
    qty,
    tradedQty,
    pendingQty: Math.max(0, qty - tradedQty),
    price: fmtNum(get("price", "order_price", "average_price")),
    avgPrice: fmtNum(get("average_price", "averagePrice", "avg_price")),
    triggerPrice: fmtNum(get("trigger_price", "triggerPrice")),
    status: String(
      get("order_status", "orderStatus", "status") ?? "—"
    ).toLowerCase(),
    orderType: String(get("order_type", "orderType") ?? "LIMIT").toUpperCase(),
    validity: String(get("validity", "duration") ?? "DAY").toUpperCase(),
  };
}

function normalizeAliceData(data: unknown): OrderRow[] {
  if (Array.isArray(data))
    return data.map((i) => mapAliceOrderToRow(i as Record<string, unknown>));
  if (data && typeof data === "object" && "orders" in data)
    return ((data as any).orders as unknown[]).map((i) =>
      mapAliceOrderToRow(i as Record<string, unknown>)
    );
  if (data && typeof data === "object" && "result" in data)
    return normalizeAliceData((data as any).result);
  return [];
}

/* ==================== STATUS HELPERS ==================== */

function statusColor(s: string) {
  const st = s.toLowerCase();
  if (st === "complete" || st === "traded")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (st === "rejected" || st === "cancelled")
    return "bg-red-50 text-red-700 border-red-200";
  if (st === "open" || st === "pending" || st.includes("trigger"))
    return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function isCancellable(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s === "open" ||
    s === "pending" ||
    s.includes("trigger") ||
    s === "received"
  );
}

function pnlClass(v: string | undefined): string {
  const n = Number(v ?? 0);
  if (n > 0) return "text-emerald-600";
  if (n < 0) return "text-red-600";
  return "text-slate-700";
}

/* ==================== TABLE COMPONENTS ==================== */

const TH_BASE =
  "px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-[10px]";
const TD_BASE = "px-3 py-2.5 whitespace-nowrap text-slate-700";

function SideBadge({ type }: { type: OrderType }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
        type === "BUY"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${statusColor(
        status
      )}`}
    >
      {status}
    </span>
  );
}

function OrderBookTable({
  rows,
  onCancel,
  cancelInProgressId,
}: {
  rows: OrderRow[];
  onCancel: (row: OrderRow) => void;
  cancelInProgressId: string | null;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={`${TH_BASE} sticky left-0 bg-slate-50 z-10`}>
                Instrument
              </th>
              <th className={TH_BASE}>Side</th>
              <th className={TH_BASE}>Qty/Filled</th>
              <th className={TH_BASE}>Pending Qty</th>
              <th className={TH_BASE}>Order Price</th>
              <th className={TH_BASE}>LTP</th>
              <th className={TH_BASE}>Product</th>
              <th className={TH_BASE}>Order Type</th>
              <th className={TH_BASE}>Order Status</th>
              <th className={TH_BASE}>Validity</th>
              <th className={TH_BASE}>Trigger Price</th>
              <th className={TH_BASE}>Avg Price</th>
              <th className={TH_BASE}>Disclosed Qty</th>
              <th className={TH_BASE}>XTS Order ID</th>
              <th className={TH_BASE}>Exchange OrderNo</th>
              <th className={TH_BASE}>Time</th>
              <th className={TH_BASE}>Date</th>
              <th className={`${TH_BASE} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr
                key={`${row.orderId || row.time}-${i}`}
                className="hover:bg-slate-50/60 transition-colors"
              >
                <td
                  className={`${TD_BASE} sticky left-0 bg-white hover:bg-slate-50/60 font-semibold text-slate-900`}
                >
                  <div className="flex flex-col">
                    <span className="truncate max-w-[180px]">
                      {row.instrument}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {row.exchange}
                    </span>
                  </div>
                </td>
                <td className={TD_BASE}>
                  <SideBadge type={row.type} />
                </td>
                <td className={TD_BASE}>
                  <span className="font-semibold">{row.qty}</span>
                  <span className="text-slate-400"> / {row.tradedQty}</span>
                </td>
                <td className={TD_BASE}>{row.pendingQty ?? 0}</td>
                <td className={TD_BASE}>{row.price}</td>
                <td className={TD_BASE}>{row.ltp ?? "—"}</td>
                <td className={TD_BASE}>
                  <span className="text-slate-600">{row.product}</span>
                </td>
                <td className={TD_BASE}>{row.orderType ?? "—"}</td>
                <td className={TD_BASE}>
                  <StatusBadge status={row.status} />
                </td>
                <td className={TD_BASE}>{row.validity ?? "DAY"}</td>
                <td className={TD_BASE}>{row.triggerPrice}</td>
                <td className={TD_BASE}>{row.avgPrice ?? "0.00"}</td>
                <td className={TD_BASE}>{row.disclosedQty ?? 0}</td>
                <td className={`${TD_BASE} font-mono text-[11px] text-slate-500`}>
                  {row.xtsOrderId || "—"}
                </td>
                <td className={`${TD_BASE} font-mono text-[11px] text-slate-500`}>
                  {row.exchangeOrderNo || "—"}
                </td>
                <td className={TD_BASE}>{row.time}</td>
                <td className={TD_BASE}>{row.date ?? "—"}</td>
                <td className={`${TD_BASE} text-right`}>
                  {isCancellable(row.status) && row.orderId ? (
                    <button
                      type="button"
                      onClick={() => onCancel(row)}
                      disabled={cancelInProgressId === row.orderId}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 hover:bg-orange-100 text-orange-700 text-[11px] font-semibold border border-orange-200 transition-colors disabled:opacity-50"
                    >
                      {cancelInProgressId === row.orderId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      Cancel
                    </button>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TradeBookTable({ rows }: { rows: OrderRow[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={`${TH_BASE} sticky left-0 bg-slate-50 z-10`}>
                Instrument
              </th>
              <th className={TH_BASE}>Side</th>
              <th className={TH_BASE}>Qty/Filled</th>
              <th className={TH_BASE}>Avg. Price</th>
              <th className={TH_BASE}>Product</th>
              <th className={TH_BASE}>Order Type</th>
              <th className={TH_BASE}>Trade ID</th>
              <th className={TH_BASE}>Order Status</th>
              <th className={TH_BASE}>Order No</th>
              <th className={TH_BASE}>Exchange OrderNo</th>
              <th className={TH_BASE}>LTP</th>
              <th className={TH_BASE}>Exchange Time Stamp</th>
              <th className={TH_BASE}>Date</th>
              <th className={`${TH_BASE} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr
                key={`${row.tradeId || row.time}-${i}`}
                className="hover:bg-slate-50/60 transition-colors"
              >
                <td
                  className={`${TD_BASE} sticky left-0 bg-white hover:bg-slate-50/60 font-semibold text-slate-900`}
                >
                  <div className="flex flex-col">
                    <span className="truncate max-w-[180px]">
                      {row.instrument}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {row.exchange}
                    </span>
                  </div>
                </td>
                <td className={TD_BASE}>
                  <SideBadge type={row.type} />
                </td>
                <td className={TD_BASE}>
                  <span className="font-semibold">{row.qty}</span>
                  <span className="text-slate-400"> / {row.tradedQty}</span>
                </td>
                <td className={TD_BASE}>{row.avgPrice ?? row.price}</td>
                <td className={TD_BASE}>{row.product}</td>
                <td className={TD_BASE}>{row.orderType ?? "—"}</td>
                <td className={`${TD_BASE} font-mono text-[11px] text-slate-500`}>
                  {row.tradeId || "—"}
                </td>
                <td className={TD_BASE}>
                  <StatusBadge status={row.status} />
                </td>
                <td className={`${TD_BASE} font-mono text-[11px] text-slate-500`}>
                  {row.orderId || "—"}
                </td>
                <td className={`${TD_BASE} font-mono text-[11px] text-slate-500`}>
                  {row.exchangeOrderNo || "—"}
                </td>
                <td className={TD_BASE}>{row.ltp ?? "—"}</td>
                <td className={TD_BASE}>{row.exchangeTimeStamp ?? row.time}</td>
                <td className={TD_BASE}>{row.date ?? "—"}</td>
                <td className={`${TD_BASE} text-right`}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    title="View trade details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PositionTable({ rows }: { rows: PositionRow[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={`${TH_BASE} sticky left-0 bg-slate-50 z-10`}>
                Instrument
              </th>
              <th className={TH_BASE}>Product</th>
              <th className={TH_BASE}>LTP</th>
              <th className={TH_BASE}>Day P&amp;L</th>
              <th className={TH_BASE}>Net P&amp;L</th>
              <th className={TH_BASE}>Net Avg</th>
              <th className={TH_BASE}>Buy Qty</th>
              <th className={TH_BASE}>Buy Avg Price</th>
              <th className={TH_BASE}>Buy Value</th>
              <th className={TH_BASE}>Net Qty</th>
              <th className={TH_BASE}>Net Value</th>
              <th className={TH_BASE}>Total Turnover</th>
              <th className={TH_BASE}>Sell Qty</th>
              <th className={TH_BASE}>Sell Avg Price</th>
              <th className={TH_BASE}>Sell Value</th>
              <th className={TH_BASE}>Realized MTM</th>
              <th className={TH_BASE}>Unrealized MTM</th>
              <th className={TH_BASE}>Close Price</th>
              <th className={`${TH_BASE} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50/60 transition-colors">
                <td
                  className={`${TD_BASE} sticky left-0 bg-white hover:bg-slate-50/60 font-semibold text-slate-900`}
                >
                  <div className="flex flex-col">
                    <span className="truncate max-w-[180px]">{row.symbol}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {row.exchange}
                    </span>
                  </div>
                </td>
                <td className={TD_BASE}>{row.product}</td>
                <td className={TD_BASE}>{row.ltp ?? "—"}</td>
                <td className={`${TD_BASE} ${pnlClass(row.dayPnl)}`}>
                  {row.dayPnl ?? "0.00"}
                </td>
                <td className={`${TD_BASE} ${pnlClass(row.netPnl)}`}>
                  {row.netPnl ?? "0.00"}
                </td>
                <td className={TD_BASE}>{row.netAvg ?? "—"}</td>
                <td className={TD_BASE}>{row.buyQty}</td>
                <td className={TD_BASE}>{row.buyAvgPrice ?? "—"}</td>
                <td className={TD_BASE}>{row.buyAmt}</td>
                <td
                  className={`${TD_BASE} font-semibold ${
                    row.netQty > 0
                      ? "text-emerald-600"
                      : row.netQty < 0
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {row.netQty}
                </td>
                <td className={TD_BASE}>{row.netValue ?? "—"}</td>
                <td className={TD_BASE}>{row.totalTurnover ?? "—"}</td>
                <td className={TD_BASE}>{row.sellQty}</td>
                <td className={TD_BASE}>{row.sellAvgPrice ?? "—"}</td>
                <td className={TD_BASE}>{row.sellAmt}</td>
                <td className={`${TD_BASE} ${pnlClass(row.realizedMTM)}`}>
                  {row.realizedMTM ?? "0.00"}
                </td>
                <td className={`${TD_BASE} ${pnlClass(row.unrealizedMTM)}`}>
                  {row.unrealizedMTM ?? "0.00"}
                </td>
                <td className={TD_BASE}>{row.closePrice ?? "—"}</td>
                <td className={`${TD_BASE} text-right`}>
                  {row.netQty !== 0 ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 hover:bg-orange-100 text-orange-700 text-[11px] font-semibold border border-orange-200"
                      title="Square-off coming soon"
                      disabled
                    >
                      Square-Off
                    </button>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HoldingsTable({ rows }: { rows: HoldingRow[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={`${TH_BASE} sticky left-0 bg-slate-50 z-10`}>
                Instrument
              </th>
              <th className={TH_BASE}>Quantity</th>
              <th className={TH_BASE}>T1 Quantity</th>
              <th className={TH_BASE}>Used Qty</th>
              <th className={TH_BASE}>Day&apos;s P&amp;L</th>
              <th className={TH_BASE}>Net P&amp;L</th>
              <th className={TH_BASE}>Buy Avg Price</th>
              <th className={TH_BASE}>LTP</th>
              <th className={TH_BASE}>Total Holding Q</th>
              <th className={TH_BASE}>Invested Value</th>
              <th className={TH_BASE}>Market Value</th>
              <th className={TH_BASE}>Haircut</th>
              <th className={TH_BASE}>Collateral Quantity</th>
              <th className={TH_BASE}>Pledge Quantity</th>
              <th className={TH_BASE}>Collateral Value</th>
              <th className={TH_BASE}>Pledge Collateral</th>
              <th className={`${TH_BASE} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr
                key={`${row.symbol}-${i}`}
                className="hover:bg-slate-50/60 transition-colors"
              >
                <td
                  className={`${TD_BASE} sticky left-0 bg-white hover:bg-slate-50/60 font-semibold text-slate-900`}
                >
                  <div className="flex flex-col">
                    <span className="truncate max-w-[180px]">{row.symbol}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {row.exchange}
                    </span>
                  </div>
                </td>
                <td className={TD_BASE}>{row.qty}</td>
                <td className={TD_BASE}>{row.t1Qty ?? 0}</td>
                <td className={TD_BASE}>{row.usedQty ?? 0}</td>
                <td className={`${TD_BASE} ${pnlClass(row.dayPnl)}`}>
                  {row.dayPnl ?? "0.00"}{" "}
                  <span className="text-[10px]">({row.dayPnlPct ?? "0.00"}%)</span>
                </td>
                <td className={`${TD_BASE} ${pnlClass(row.pnl)}`}>
                  {row.pnl} <span className="text-[10px]">({row.pnlPct}%)</span>
                </td>
                <td className={TD_BASE}>{row.avgPrice}</td>
                <td className={TD_BASE}>{row.ltp}</td>
                <td className={TD_BASE}>{row.totalHoldingQty ?? row.qty}</td>
                <td className={TD_BASE}>{row.investedValue}</td>
                <td className={TD_BASE}>{row.marketValue ?? row.currentValue}</td>
                <td className={TD_BASE}>{row.haircut ?? "0.00"}</td>
                <td className={TD_BASE}>{row.collateralQty ?? 0}</td>
                <td className={TD_BASE}>{row.pledgeQty ?? 0}</td>
                <td className={TD_BASE}>{row.collateralValue ?? "0.00"}</td>
                <td className={TD_BASE}>{row.pledgeCollateral ?? "0.00"}</td>
                <td className={`${TD_BASE} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      title="Details"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      title="View"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg py-16 text-center text-slate-400">
      <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
    </div>
  );
}

/* ==================== MAIN PAGE ==================== */

type TabKey =
  | "orderbook"
  | "tradebook"
  | "positions"
  | "holdings"
  | "strategy"
  | "gtt";

export default function MarketplaceOrdersPage() {
  const params = useParams();
  const marketplaceSlug = params?.slug as string;
  const clientCode = params?.clientCode as string;
  const { data: authSession } = useSession();
  const bigulSession = getBrokerSession(authSession);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>("orderbook");
  const [search, setSearch] = useState("");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tradeBook, setTradeBook] = useState<OrderRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);

  const [ordersLoading, setOrdersLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Cancel state
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Position product filter
  const [positionProductFilter, setPositionProductFilter] = useState<string>("ALL");

  const hasBigul = !!bigulSession;
  const cc = clientCode || bigulSession?.clientCode || "";

  /* ---- Bigul WebSocket ---- */
  useEffect(() => {
    if (!bigulSession || !BASE_URL) {
      setPositionsLoading(false);
      setHoldingsLoading(false);
      return;
    }

    const socket: Socket = io(`${BASE_URL}/bigulorderlive`);
    socket.on("connect", () =>
      socket.emit("init", { accessToken: bigulSession.accessToken })
    );
    socket.on("order:init", () => setWsConnected(true));

    socket.on("order:update", (data: Record<string, unknown>) => {
      const row = mapBigulOrderToRow(data);
      setOrders((prev) => {
        const idx = prev.findIndex((r) => r.orderId === row.orderId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = row;
          return next;
        }
        return [row, ...prev];
      });
    });

    socket.on("trade:update", (data: Record<string, unknown>) =>
      setTradeBook((prev) => [mapBigulTradeToRow(data), ...prev])
    );

    socket.on("position:update", (data: Record<string, unknown>) => {
      const row = mapBigulPositionToRow(data);
      setPositionsLoading(false);
      setPositions((prev) => {
        const idx = prev.findIndex((r) => r.key === row.key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = row;
          return next;
        }
        return [...prev, row];
      });
    });

    socket.on("connect_error", () => setWsConnected(false));
    return () => {
      socket.disconnect();
    };
  }, [bigulSession]);

  /* ---- REST: Bigul ---- */
  const fetchBigulOrders = useCallback(async () => {
    if (!BASE_URL || !bigulSession) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bigul/orders/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bigulSession.accessToken}`,
        },
        body: JSON.stringify({ source: "B2B", clientCode: cc }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data))
        setOrders(
          json.data.map((i: Record<string, unknown>) => mapBigulOrderToRow(i))
        );
    } catch {} finally {
      setOrdersLoading(false);
    }
  }, [bigulSession, cc]);

  const fetchBigulTrades = useCallback(async () => {
    if (!BASE_URL || !bigulSession) return;
    setTradesLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bigul/orders/trade-book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bigulSession.accessToken}`,
        },
        body: JSON.stringify({ source: "B2B", clientCode: cc }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data))
        setTradeBook(
          json.data.map((i: Record<string, unknown>) => mapBigulTradeToRow(i))
        );
    } catch {} finally {
      setTradesLoading(false);
    }
  }, [bigulSession, cc]);

  const fetchBigulPositions = useCallback(async () => {
    if (!BASE_URL || !bigulSession) return;
    setPositionsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bigul/orders/position-book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bigulSession.accessToken}`,
        },
        body: JSON.stringify({ source: "B2B", clientCode: cc }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data))
        setPositions(
          json.data.map((i: Record<string, unknown>) => mapBigulPositionToRow(i))
        );
    } catch {} finally {
      setPositionsLoading(false);
    }
  }, [bigulSession, cc]);

  const fetchBigulHoldings = useCallback(async () => {
    if (!BASE_URL || !bigulSession) return;
    setHoldingsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bigul/orders/holdings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bigulSession.accessToken}`,
        },
        body: JSON.stringify({ source: "B2B", clientCode: cc }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data))
        setHoldings(
          json.data.map((i: Record<string, unknown>) => mapBigulHoldingToRow(i))
        );
    } catch {} finally {
      setHoldingsLoading(false);
    }
  }, [bigulSession, cc]);

  /* ---- REST: Alice Blue ---- */
  const fetchAliceOrders = useCallback(async () => {
    const token = getBearerToken();
    if (!BASE_URL || !token) {
      setOrdersLoading(false);
      return;
    }
    setOrdersLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/aliceblue/orders/book`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setOrders(normalizeAliceData(json?.data ?? []));
    } catch {} finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchAliceTrades = useCallback(async () => {
    const token = getBearerToken();
    if (!BASE_URL || !token) {
      setTradesLoading(false);
      return;
    }
    setTradesLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/aliceblue/orders/trades`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setTradeBook(normalizeAliceData(json?.data ?? []));
    } catch {} finally {
      setTradesLoading(false);
    }
  }, []);

  /* ---- Initial load ---- */
  const initialFetched = useRef(false);
  useEffect(() => {
    if (initialFetched.current) return;
    initialFetched.current = true;
    if (bigulSession) {
      fetchBigulOrders();
      fetchBigulTrades();
      fetchBigulPositions();
      fetchBigulHoldings();
    } else {
      fetchAliceOrders();
      fetchAliceTrades();
      setPositionsLoading(false);
      setHoldingsLoading(false);
    }
  }, [
    bigulSession,
    fetchBigulOrders,
    fetchBigulTrades,
    fetchBigulPositions,
    fetchBigulHoldings,
    fetchAliceOrders,
    fetchAliceTrades,
  ]);

  /* ---- Cancel order handler ---- */
  const handleCancelOrder = useCallback(
    async (row: OrderRow) => {
      if (!bigulSession || !row.orderId) return;
      setCancellingId(row.orderId);
      try {
        const res = await fetch(`${BASE_URL}/api/bigul/orders/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bigulSession.accessToken}`,
          },
          body: JSON.stringify({
            source: "B2B",
            clientCode: cc,
            on: row.orderId,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          toast({
            title: "Order cancelled",
            description: `Order ${row.orderId} cancelled successfully.`,
          });
          fetchBigulOrders();
        } else {
          toast({
            title: "Cancel failed",
            description: json?.message || "Could not cancel the order.",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        toast({
          title: "Cancel failed",
          description: err?.message || "Network error",
          variant: "destructive",
        });
      } finally {
        setCancellingId(null);
      }
    },
    [bigulSession, cc, fetchBigulOrders, toast]
  );

  const handleRefresh = useCallback(() => {
    if (!bigulSession) {
      fetchAliceOrders();
      fetchAliceTrades();
      return;
    }
    if (activeTab === "orderbook") fetchBigulOrders();
    else if (activeTab === "tradebook") fetchBigulTrades();
    else if (activeTab === "positions") fetchBigulPositions();
    else if (activeTab === "holdings") fetchBigulHoldings();
  }, [
    activeTab,
    bigulSession,
    fetchBigulOrders,
    fetchBigulTrades,
    fetchBigulPositions,
    fetchBigulHoldings,
    fetchAliceOrders,
    fetchAliceTrades,
  ]);

  /* ---- Filter ---- */
  const q = search.trim().toLowerCase();
  const filteredOrders = q
    ? orders.filter(
        (r) =>
          r.instrument.toLowerCase().includes(q) ||
          r.symbol.toLowerCase().includes(q)
      )
    : orders;
  const filteredTrades = q
    ? tradeBook.filter(
        (r) =>
          r.instrument.toLowerCase().includes(q) ||
          r.symbol.toLowerCase().includes(q)
      )
    : tradeBook;
  const filteredPositions = useMemo(() => {
    let arr = q
      ? positions.filter((r) => r.symbol.toLowerCase().includes(q))
      : positions;
    if (positionProductFilter !== "ALL") {
      arr = arr.filter(
        (r) => (r.product || "").toUpperCase() === positionProductFilter
      );
    }
    return arr;
  }, [positions, q, positionProductFilter]);
  const filteredHoldings = q
    ? holdings.filter((r) => r.symbol.toLowerCase().includes(q))
    : holdings;

  /* ---- Position summary ---- */
  const positionSummary = useMemo(() => {
    let dayPnl = 0;
    let netPnl = 0;
    for (const p of positions) {
      dayPnl += Number(p.dayPnl ?? 0);
      netPnl += Number(p.netPnl ?? 0);
    }
    return { dayPnl, netPnl, count: positions.length };
  }, [positions]);

  /* ---- Holdings summary ---- */
  const holdingsSummary = useMemo(() => {
    let invested = 0;
    let current = 0;
    for (const h of holdings) {
      invested += Number(h.investedValue ?? 0);
      current += Number(h.currentValue ?? 0);
    }
    const pnl = current - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    return { invested, current, pnl, pnlPct, count: holdings.length };
  }, [holdings]);

  /* ---- Position product options ---- */
  const positionProductOptions = useMemo(() => {
    const set = new Set<string>();
    positions.forEach((p) => {
      if (p.product) set.add(p.product.toUpperCase());
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [positions]);

  const tabs: { key: TabKey; label: string; disabled?: boolean }[] = [
    { key: "orderbook", label: "ORDER BOOK" },
    { key: "tradebook", label: "TRADE BOOK" },
    { key: "positions", label: "POSITION" },
    { key: "holdings", label: "HOLDINGS" },
    { key: "strategy", label: "STRATEGY STATISTICS", disabled: true },
    { key: "gtt", label: "GTT BOOK", disabled: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketplaceNavbar marketplaceId={marketplaceSlug} />

      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 pt-24 pb-10">
        {/* Top header: title + search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900">Orders</h1>
            {cc && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-600">
                {cc}
              </span>
            )}
            {hasBigul && wsConnected && (
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live
              </div>
            )}
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search instrument..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-white border-slate-200"
            />
          </div>
        </div>

        {/* Tab nav: underlined style + per-tab action bar on the right */}
        <div className="bg-white border border-slate-200 rounded-t-lg flex items-center justify-between border-b-0">
          <div className="flex items-center overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => !tab.disabled && setActiveTab(tab.key)}
                disabled={tab.disabled}
                title={tab.disabled ? "Coming soon" : undefined}
                className={`relative px-4 py-3 text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "text-slate-900"
                    : tab.disabled
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-slate-900 rounded-t" />
                )}
              </button>
            ))}
          </div>

          {/* Right side: per-tab summary chips + actions */}
          <div className="flex items-center gap-2 px-4 py-2">
            {activeTab === "orderbook" && (
              <>
                <span className="text-[11px] font-bold text-slate-500">
                  ORDER : <span className="text-slate-900">{orders.length}</span>
                </span>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold disabled:opacity-50"
                  disabled
                  title="Bulk cancel coming soon"
                >
                  Cancel All
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {activeTab === "tradebook" && (
              <>
                <span className="text-[11px] font-bold text-slate-500">
                  TRADE : <span className="text-slate-900">{tradeBook.length}</span>
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {activeTab === "positions" && (
              <>
                <span className="text-[11px] font-bold text-slate-500">
                  NET P&amp;L :{" "}
                  <span className={pnlClass(positionSummary.netPnl.toFixed(2))}>
                    {fmtMoney(positionSummary.netPnl)}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  DAY P&amp;L :{" "}
                  <span className={pnlClass(positionSummary.dayPnl.toFixed(2))}>
                    {fmtMoney(positionSummary.dayPnl)}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  POSITION :{" "}
                  <span className="text-slate-900">{positionSummary.count}</span>
                </span>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold disabled:opacity-50"
                  disabled
                  title="Coming soon"
                >
                  Square-Off All
                </button>
                <select
                  value={positionProductFilter}
                  onChange={(e) => setPositionProductFilter(e.target.value)}
                  className="text-[11px] border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  {positionProductOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {activeTab === "holdings" && (
              <>
                <span className="text-[11px] font-bold text-slate-500">
                  INVESTED :{" "}
                  <span className="text-slate-900">
                    {fmtMoney(holdingsSummary.invested)}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  CURRENT :{" "}
                  <span className="text-slate-900">
                    {fmtMoney(holdingsSummary.current)}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  NET P/L :{" "}
                  <span className={pnlClass(holdingsSummary.pnl.toFixed(2))}>
                    {fmtMoney(holdingsSummary.pnl)} (
                    {holdingsSummary.pnlPct.toFixed(2)}%)
                  </span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  ALL HOLDINGS :{" "}
                  <span className="text-slate-900">{holdingsSummary.count}</span>
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="rounded-b-lg overflow-hidden">
          {activeTab === "orderbook" &&
            (ordersLoading ? (
              <LoadingState />
            ) : filteredOrders.length === 0 ? (
              <EmptyState message="No orders found" />
            ) : (
              <OrderBookTable
                rows={filteredOrders}
                onCancel={handleCancelOrder}
                cancelInProgressId={cancellingId}
              />
            ))}

          {activeTab === "tradebook" &&
            (tradesLoading ? (
              <LoadingState />
            ) : filteredTrades.length === 0 ? (
              <EmptyState message="No trades found" />
            ) : (
              <TradeBookTable rows={filteredTrades} />
            ))}

          {activeTab === "positions" &&
            (positionsLoading ? (
              <LoadingState />
            ) : filteredPositions.length === 0 ? (
              <EmptyState message="No open positions" />
            ) : (
              <PositionTable rows={filteredPositions} />
            ))}

          {activeTab === "holdings" &&
            (holdingsLoading ? (
              <LoadingState />
            ) : filteredHoldings.length === 0 ? (
              <EmptyState message="No holdings found" />
            ) : (
              <HoldingsTable rows={filteredHoldings} />
            ))}

          {activeTab === "strategy" && (
            <EmptyState message="Strategy Statistics — coming soon" />
          )}
          {activeTab === "gtt" && <EmptyState message="GTT Book — coming soon" />}
        </div>
      </div>
    </div>
  );
}
