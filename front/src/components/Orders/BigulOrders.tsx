"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { Session } from "next-auth";
import { Socket, io } from "socket.io-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Search, Download, Settings, Loader2 } from "lucide-react";
import { getBrokerSession } from "@/lib/brokerSession";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export type OrderType = "BUY" | "SELL";
export type OrderStatus = "REJECTED" | "COMPLETE" | "PENDING" | "TRADED" | string;

export interface OrderRow {
  orderId?: string;
  time: string;
  type: OrderType;
  instrument: string;
  exchange: string;
  product: string;
  qty: number;
  tradedQty: number;
  price: string;
  status: OrderStatus;
}

export interface PositionRow {
  key: string;
  symbol: string;
  exchange: string;
  product: string;
  buyQty: number;
  sellQty: number;
  netQty: number;
  buyAmt: string;
  sellAmt: string;
}

export function formatTime(value: unknown): string {
  if (value == null) return "—";
  const s = String(value).trim();
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
  const dateTimeMatch = /^\d{4}-\d{2}-\d{2}\s+(\d{1,2}:\d{2}:\d{2})/.exec(s);
  if (dateTimeMatch) return dateTimeMatch[1];
  const date = new Date(s);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  return s;
}

export function mapApiItemToOrderRow(item: Record<string, unknown>): OrderRow {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = item[k];
      if (v !== undefined && v !== null) return v;
    }
    return null;
  };
  const type = (String(get("transaction_type", "transactionType", "type") ?? "BUY").toUpperCase()) as OrderType;
  const qty = Number(get("quantity", "qty") ?? 0);
  const tradedQty = Number(get("filled_quantity", "filledQuantity", "traded_qty", "tradedQty") ?? 0);
  const price = String(get("price", "order_price", "average_price") ?? "0");
  const status = String(get("order_status", "orderStatus", "status") ?? "—");
  const product = String(get("product", "order_type") ?? "—");
  const exchange = String(get("exchange") ?? "NSE");
  const instrument = String(get("trading_symbol", "tradingSymbol", "instrument", "symbol") ?? "—");
  const time = formatTime(get("orderTime", "order_timestamp", "order_time", "time", "created_at"));
  return {
    time,
    type: type === "SELL" ? "SELL" : "BUY",
    instrument,
    exchange,
    product,
    qty,
    tradedQty,
    price: Number.isNaN(Number(price)) ? price : Number(price).toFixed(2),
    status,
  };
}

function mapBigulOrderToRow(d: Record<string, unknown>): OrderRow {
  const trnsTp = String(d.trnsTp ?? "B").toUpperCase();
  const price = String(d.avgPrc ?? d.prc ?? "0");
  return {
    orderId: String(d.nOrdNo ?? ""),
    time: formatTime(d.ordDtTm ?? d.hsUpTm),
    type: trnsTp === "S" ? "SELL" : "BUY",
    instrument: String(d.trdSym ?? "—"),
    exchange: String(d.exSeg ?? "NSE"),
    product: String(d.prod ?? "—"),
    qty: Number(d.qty ?? 0),
    tradedQty: Number(d.fldQty ?? 0),
    price: Number.isNaN(Number(price)) ? price : Number(price).toFixed(2),
    status: String(d.ordSt ?? "—"),
  };
}

function mapBigulTradeToRow(d: Record<string, unknown>): OrderRow {
  const trnsTp = String(d.trnsTp ?? "B").toUpperCase();
  const price = String(d.avgPrc ?? "0");
  const fldQty = Number(d.fldQty ?? 0);
  return {
    orderId: String(d.flId ?? d.nOrdNo ?? ""),
    time: formatTime(d.flTm ?? d.exTm),
    type: trnsTp === "S" ? "SELL" : "BUY",
    instrument: String(d.trdSym ?? "—"),
    exchange: String(d.exSeg ?? "NSE"),
    product: String(d.prod ?? "—"),
    qty: fldQty,
    tradedQty: fldQty,
    price: Number.isNaN(Number(price)) ? price : Number(price).toFixed(2),
    status: "TRADED",
  };
}

function mapBigulPositionToRow(d: Record<string, unknown>): PositionRow {
  const sym = String(d.trdSym ?? "—");
  const ex = String(d.exSeg ?? "NSE");
  const prod = String(d.prod ?? "—");
  const buyQty = Number(d.flBuyQty ?? 0);
  const sellQty = Number(d.flSellQty ?? 0);
  const buyAmt = String(d.buyAmt ?? "0");
  const sellAmt = String(d.sellAmt ?? "0");
  return {
    key: `${sym}|${ex}|${prod}`,
    symbol: sym,
    exchange: ex,
    product: prod,
    buyQty,
    sellQty,
    netQty: buyQty - sellQty,
    buyAmt: Number.isNaN(Number(buyAmt)) ? buyAmt : Number(buyAmt).toFixed(2),
    sellAmt: Number.isNaN(Number(sellAmt)) ? sellAmt : Number(sellAmt).toFixed(2),
  };
}

export function normalizeApiData(data: unknown): OrderRow[] {
  if (Array.isArray(data)) return data.map((item) => mapApiItemToOrderRow(item as Record<string, unknown>));
  if (data && typeof data === "object" && "orders" in data)
    return (data as { orders: unknown[] }).orders.map((item) => mapApiItemToOrderRow(item as Record<string, unknown>));
  if (data && typeof data === "object" && "result" in data)
    return normalizeApiData((data as { result: unknown }).result);
  return [];
}

export function isPendingStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "open" || s === "pending" || s.includes("trigger") || s === "validation pending" || s === "put order req received";
}

export function OrdersTable({
  rows,
  sectionTitle,
  loading,
}: {
  rows: OrderRow[];
  sectionTitle: string;
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filteredRows = search
    ? rows.filter(
        (r) =>
          r.instrument.toLowerCase().includes(search.toLowerCase()) ||
          r.product.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{sectionTitle}</h2>
          <button type="button" className="rounded-full p-0.5 hover:bg-muted" aria-label="Info">
            <Info className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[180px]"
            />
          </div>
          <Button variant="default" size="sm">
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </Button>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Instrument</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Traded Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row, i) => (
                  <TableRow key={`${row.orderId || row.time}-${row.instrument}-${i}`}>
                    <TableCell className="font-medium">{row.time}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          row.type === "BUY"
                            ? "bg-green-600 hover:bg-green-600 text-white border-0"
                            : "bg-red-600 hover:bg-red-600 text-white border-0"
                        }
                      >
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{row.instrument}</span>
                      <span className="text-muted-foreground text-xs ml-1">{row.exchange}</span>
                    </TableCell>
                    <TableCell>{row.product}</TableCell>
                    <TableCell className="text-right">{row.qty}</TableCell>
                    <TableCell className="text-right">{row.tradedQty}</TableCell>
                    <TableCell className="text-right">{row.price}</TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === "REJECTED" ? "destructive" : "secondary"}
                        className={
                          row.status === "COMPLETE" || row.status === "TRADED" || row.status === "complete"
                            ? "bg-green-600 hover:bg-green-600 text-white border-0"
                            : undefined
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function PositionsTable({
  rows,
  loading,
}: {
  rows: PositionRow[];
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filteredRows = search
    ? rows.filter(
        (r) =>
          r.symbol.toLowerCase().includes(search.toLowerCase()) ||
          r.product.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Positions</h2>
          <button type="button" className="rounded-full p-0.5 hover:bg-muted" aria-label="Info">
            <Info className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[180px]"
            />
          </div>
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Exchange</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Buy Qty</TableHead>
                <TableHead className="text-right">Sell Qty</TableHead>
                <TableHead className="text-right">Net Qty</TableHead>
                <TableHead className="text-right">Buy Amt</TableHead>
                <TableHead className="text-right">Sell Amt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No positions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.symbol}</TableCell>
                    <TableCell>{row.exchange}</TableCell>
                    <TableCell>{row.product}</TableCell>
                    <TableCell className="text-right">{row.buyQty}</TableCell>
                    <TableCell className="text-right">{row.sellQty}</TableCell>
                    <TableCell className={`text-right font-semibold ${row.netQty > 0 ? "text-green-600" : row.netQty < 0 ? "text-red-600" : ""}`}>
                      {row.netQty}
                    </TableCell>
                    <TableCell className="text-right">{row.buyAmt}</TableCell>
                    <TableCell className="text-right">{row.sellAmt}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

interface BigulOrdersProps {
  /** NextAuth session; the component derives the Bigul broker session from it. */
  session: Session | null;
  /** Optional content rendered in the top row (e.g. a back-link), alongside the Live badge. */
  header?: ReactNode;
  /** Container className. Defaults to the marketplace order page layout. */
  className?: string;
}

/**
 * Live Bigul order/trade/position view. Self-contained — drives off the Bigul
 * broker session (`getBrokerSession(session)`), opens the `/bigulorderlive`
 * socket, and loads the order/trade/position books over REST. Reused by the
 * marketplace order page and the dashboard broker section.
 */
export function BigulOrders({ session, header, className }: BigulOrdersProps) {
  const broker = getBrokerSession(session);
  const accessToken = broker?.accessToken ?? null;
  const clientCode = broker?.clientCode ?? "";
  const hasBigulSession = !!accessToken;

  const [pendingOrders, setPendingOrders] = useState<OrderRow[]>([]);
  const [executedOrders, setExecutedOrders] = useState<OrderRow[]>([]);
  const [tradeBook, setTradeBook] = useState<OrderRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [orderBookLoading, setOrderBookLoading] = useState(true);
  const [tradeBookLoading, setTradeBookLoading] = useState(true);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [orderBookError, setOrderBookError] = useState<string | null>(null);
  const [tradeBookError, setTradeBookError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // --- Bigul real-time WebSocket via Socket.IO ---
  useEffect(() => {
    if (!accessToken || !BASE_URL) {
      setPositionsLoading(false);
      return;
    }

    const socket: Socket = io(`${BASE_URL}/bigulorderlive`);

    socket.on("connect", () => {
      socket.emit("init", { accessToken });
    });

    socket.on("order:init", () => {
      setWsConnected(true);
    });

    socket.on("order:error", (data: { message: string }) => {
      console.warn("[BigulOrders] WebSocket error:", data.message);
    });

    socket.on("order:update", (data: Record<string, unknown>) => {
      const row = mapBigulOrderToRow(data);
      const orderId = row.orderId;
      if (!orderId) return;

      if (isPendingStatus(row.status)) {
        setPendingOrders((prev) => {
          const idx = prev.findIndex((r) => r.orderId === orderId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = row;
            return next;
          }
          return [row, ...prev];
        });
        setExecutedOrders((prev) => prev.filter((r) => r.orderId !== orderId));
      } else {
        setExecutedOrders((prev) => {
          const idx = prev.findIndex((r) => r.orderId === orderId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = row;
            return next;
          }
          return [row, ...prev];
        });
        setPendingOrders((prev) => prev.filter((r) => r.orderId !== orderId));
      }
    });

    socket.on("trade:update", (data: Record<string, unknown>) => {
      const row = mapBigulTradeToRow(data);
      setTradeBook((prev) => [row, ...prev]);
    });

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

    socket.on("connect_error", () => {
      setWsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  // --- REST initial load (order book + trade book + positions) ---
  const fetchBigulOrderBook = useCallback(async () => {
    if (!BASE_URL || !accessToken) return;
    setOrderBookError(null);
    setOrderBookLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bigul/orders/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ source: "B2B", clientCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        setOrderBookError(json?.message ?? "Failed to load order book");
        return;
      }
      const rawOrders = json?.data;
      const all = Array.isArray(rawOrders)
        ? rawOrders.map((item: Record<string, unknown>) => mapBigulOrderToRow(item))
        : normalizeApiData(rawOrders);
      setPendingOrders(all.filter((r) => isPendingStatus(r.status)));
      setExecutedOrders(all.filter((r) => !isPendingStatus(r.status)));
    } catch (e) {
      setOrderBookError(e instanceof Error ? e.message : "Failed to load order book");
    } finally {
      setOrderBookLoading(false);
    }
  }, [accessToken, clientCode]);

  const fetchBigulTradeBook = useCallback(async () => {
    if (!BASE_URL || !accessToken) return;
    setTradeBookError(null);
    setTradeBookLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bigul/orders/trade-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ source: "B2B", clientCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTradeBookError(json?.message ?? "Failed to load trade book");
        return;
      }
      const rawTrades = json?.data;
      setTradeBook(
        Array.isArray(rawTrades)
          ? rawTrades.map((item: Record<string, unknown>) => mapBigulTradeToRow(item))
          : normalizeApiData(rawTrades)
      );
    } catch (e) {
      setTradeBookError(e instanceof Error ? e.message : "Failed to load trade book");
    } finally {
      setTradeBookLoading(false);
    }
  }, [accessToken, clientCode]);

  const fetchBigulPositions = useCallback(async () => {
    if (!BASE_URL || !accessToken) return;
    setPositionsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bigul/orders/position-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ source: "B2B", clientCode }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data)) {
        setPositions(json.data.map((item: Record<string, unknown>) => mapBigulPositionToRow(item)));
      }
    } catch {
      // positions are optional; WebSocket will provide live updates
    } finally {
      setPositionsLoading(false);
    }
  }, [accessToken, clientCode]);

  // --- Initial data load once a session is available ---
  const initialFetched = useRef(false);
  useEffect(() => {
    if (initialFetched.current) return;
    if (!accessToken) return;
    initialFetched.current = true;
    fetchBigulOrderBook();
    fetchBigulTradeBook();
    fetchBigulPositions();
  }, [accessToken, fetchBigulOrderBook, fetchBigulTradeBook, fetchBigulPositions]);

  if (!hasBigulSession) {
    return (
      <div className={className ?? "max-w-7xl mx-auto px-4 py-10"}>
        <p className="text-sm text-muted-foreground">No Bigul session found.</p>
      </div>
    );
  }

  return (
    <div className={className ?? "max-w-7xl mx-auto px-4 py-10"}>
      {(header || wsConnected) && (
        <div className="flex items-center gap-4 mb-6">
          {header}
          {wsConnected && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              <span className="relative flex h-2 w-2 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </Badge>
          )}
        </div>
      )}
      <h1 className="text-3xl font-semibold mb-6">Orders</h1>

      <Tabs defaultValue="executed" className="w-full">
        <TabsList className="bg-muted/50 h-11 p-0 gap-0 rounded-lg">
          <TabsTrigger
            value="pending"
            className="rounded-l-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Pending ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger
            value="executed"
            className="rounded-none px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Executed ({executedOrders.length})
          </TabsTrigger>
          <TabsTrigger
            value="tradebook"
            className="rounded-none px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Trade Book ({tradeBook.length})
          </TabsTrigger>
          <TabsTrigger
            value="positions"
            className="rounded-r-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Positions ({positions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {orderBookError && (
            <p className="text-sm text-destructive mb-4">{orderBookError}</p>
          )}
          <OrdersTable
            rows={pendingOrders}
            sectionTitle="Pending Orders"
            loading={orderBookLoading}
          />
        </TabsContent>
        <TabsContent value="executed" className="mt-6">
          {orderBookError && (
            <p className="text-sm text-destructive mb-4">{orderBookError}</p>
          )}
          <OrdersTable
            rows={executedOrders}
            sectionTitle="Executed Orders"
            loading={orderBookLoading}
          />
        </TabsContent>
        <TabsContent value="tradebook" className="mt-6">
          {tradeBookError && (
            <p className="text-sm text-destructive mb-4">{tradeBookError}</p>
          )}
          <OrdersTable
            rows={tradeBook}
            sectionTitle="Trade Book"
            loading={tradeBookLoading}
          />
        </TabsContent>
        <TabsContent value="positions" className="mt-6">
          <PositionsTable
            rows={positions}
            loading={positionsLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
