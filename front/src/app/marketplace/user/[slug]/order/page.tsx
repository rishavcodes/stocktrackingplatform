"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { getBrokerSession } from "@/lib/brokerSession";
import {
  BigulOrders,
  OrdersTable,
  normalizeApiData,
  isPendingStatus,
  type OrderRow,
} from "@/components/Orders/BigulOrders";

const ALICE_BLUE_SESSION_KEY = "aliceBlueSession";
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

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

function BackToMarketplace({ marketplaceId }: { marketplaceId?: string }) {
  return (
    <Link
      href={marketplaceId ? `/marketplace/${marketplaceId}` : "/marketplace"}
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Marketplace
    </Link>
  );
}

/** Alice Blue order/trade view (no live socket, no positions). */
function AliceBlueOrders({ marketplaceId }: { marketplaceId?: string }) {
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
      setOrderBookError("Session not found. Please log in.");
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
      setTradeBookError("Session not found. Please log in.");
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

  const initialFetched = useRef(false);
  useEffect(() => {
    if (initialFetched.current) return;
    initialFetched.current = true;
    fetchOrderBook();
    fetchTradeBook();
  }, [fetchOrderBook, fetchTradeBook]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-6">
        <BackToMarketplace marketplaceId={marketplaceId} />
      </div>
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
            Trade Book ({tradeBook.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {orderBookError && (
            <p className="text-sm text-destructive mb-4">{orderBookError}</p>
          )}
          <OrdersTable rows={pendingOrders} sectionTitle="Pending Orders" loading={orderBookLoading} />
        </TabsContent>
        <TabsContent value="executed" className="mt-6">
          {orderBookError && (
            <p className="text-sm text-destructive mb-4">{orderBookError}</p>
          )}
          <OrdersTable rows={executedOrders} sectionTitle="Executed Orders" loading={orderBookLoading} />
        </TabsContent>
        <TabsContent value="tradebook" className="mt-6">
          {tradeBookError && (
            <p className="text-sm text-destructive mb-4">{tradeBookError}</p>
          )}
          <OrdersTable rows={tradeBook} sectionTitle="Trade Book" loading={tradeBookLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MarketplaceUserOrderPage() {
  const params = useParams();
  const marketplaceId = params?.slug as string;
  const { data: authSession } = useSession();

  // Defer the broker-session read to the client to avoid a hydration mismatch
  // between the Bigul and Alice Blue branches (getBrokerSession reads localStorage).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="max-w-7xl mx-auto px-4 py-10" />;
  }

  const bigulSession = getBrokerSession(authSession);
  if (bigulSession) {
    return (
      <BigulOrders
        session={authSession}
        header={<BackToMarketplace marketplaceId={marketplaceId} />}
      />
    );
  }

  return <AliceBlueOrders marketplaceId={marketplaceId} />;
}
