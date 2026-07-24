"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

const ALICE_BLUE_SESSION_KEY = "aliceBlueSession";
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type OrderType = "BUY" | "SELL";
type OrderStatus = "REJECTED" | "COMPLETE" | "PENDING" | "TRADED" | string;

interface OrderRow {
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

/** Format time from API (e.g. "2026-02-12 16:05:50", "16:05:50", or timestamp) */
function formatTime(value: unknown): string {
  if (value == null) return "—";
  const s = String(value).trim();
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
  // "YYYY-MM-DD HH:mm:ss" -> extract "HH:mm:ss"
  const dateTimeMatch = /^\d{4}-\d{2}-\d{2}\s+(\d{1,2}:\d{2}:\d{2})/.exec(s);
  if (dateTimeMatch) return dateTimeMatch[1];
  const date = new Date(s);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  return s;
}

/** Normalize API order/trade item to OrderRow */
function mapApiItemToOrderRow(item: Record<string, unknown>): OrderRow {
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

function normalizeApiData(data: unknown): OrderRow[] {
  if (Array.isArray(data)) return data.map((item) => mapApiItemToOrderRow(item as Record<string, unknown>));
  if (data && typeof data === "object" && "orders" in data)
    return (data as { orders: unknown[] }).orders.map((item) => mapApiItemToOrderRow(item as Record<string, unknown>));
  if (data && typeof data === "object" && "result" in data)
    return normalizeApiData((data as { result: unknown }).result);
  return [];
}

/** Orders in "open" status are considered pending */
function isPendingStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "open" || s === "pending" || s.includes("trigger") || s === "validation pending" || s === "put order received";
}

function OrdersTable({
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
                  <TableRow key={`${row.time}-${row.instrument}-${i}`}>
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

export default function OrdersPage() {
  const [pendingOrders, setPendingOrders] = useState<OrderRow[]>([]);
  const [executedOrders, setExecutedOrders] = useState<OrderRow[]>([]);
  const [tradeBook, setTradeBook] = useState<OrderRow[]>([]);
  const [orderBookLoading, setOrderBookLoading] = useState(true);
  const [tradeBookLoading, setTradeBookLoading] = useState(true);
  const [orderBookError, setOrderBookError] = useState<string | null>(null);
  const [tradeBookError, setTradeBookError] = useState<string | null>(null);

  const fetchOrderBook = useCallback(async () => {
    const token = getBearerToken();
    if (!BASE_URL || !token) {
      setOrderBookLoading(false);
      setOrderBookError("Session not found. Please log in with Alice Blue.");
      setPendingOrders([]);
      setExecutedOrders([]);
      return;
    }
    setOrderBookError(null);
    setOrderBookLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/aliceblue/orders/book`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setOrderBookError(json?.message ?? "Failed to load order book");
        setPendingOrders([]);
        setExecutedOrders([]);
        return;
      }
      const all = normalizeApiData(json?.data ?? []);
      setPendingOrders(all.filter((r) => isPendingStatus(r.status)));
      setExecutedOrders(all.filter((r) => !isPendingStatus(r.status)));
    } catch (e) {
      setOrderBookError(e instanceof Error ? e.message : "Failed to load order book");
      setPendingOrders([]);
      setExecutedOrders([]);
    } finally {
      setOrderBookLoading(false);
    }
  }, []);

  const fetchTradeBook = useCallback(async () => {
    const token = getBearerToken();
    if (!BASE_URL || !token) {
      setTradeBookLoading(false);
      setTradeBookError("Session not found. Please log in with Alice Blue.");
      return;
    }
    setTradeBookError(null);
    setTradeBookLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/aliceblue/orders/trades`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setTradeBookError(json?.message ?? "Failed to load trade book");
        setTradeBook([]);
        return;
      }
      setTradeBook(normalizeApiData(json?.data ?? []));
    } catch (e) {
      setTradeBookError(e instanceof Error ? e.message : "Failed to load trade book");
      setTradeBook([]);
    } finally {
      setTradeBookLoading(false);
    }
  }, []);

  const bookFetchedRef = useRef(false);
  const tradeFetchedRef = useRef(false);

  useEffect(() => {
    if (bookFetchedRef.current) return;
    bookFetchedRef.current = true;
    fetchOrderBook();
  }, [fetchOrderBook]);

  useEffect(() => {
    if (tradeFetchedRef.current) return;
    tradeFetchedRef.current = true;
    fetchTradeBook();
  }, [fetchTradeBook]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
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
            className="rounded-r-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Trade Book
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
      </Tabs>
    </div>
  );
}
