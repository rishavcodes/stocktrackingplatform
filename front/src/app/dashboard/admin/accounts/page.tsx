"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  CreditCard,
  BarChart2,
  ArrowDownToLine,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import fetcher from "@/lib/data/setup";
import TradeboxPlansTab from "@/components/Admin/Accounts/TradeboxPlansTab";
import ServicesSoldTab from "@/components/Admin/Accounts/ServicesSoldTab";
import RATransactionsTab from "@/components/Admin/Accounts/RATransactionsTab";
import WithdrawalsTab from "@/components/Admin/Accounts/WithdrawalsTab";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type MainTab = "tradebox-plans" | "services-sold" | "ra-transactions" | "withdrawals";

const MAIN_TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "tradebox-plans", label: "Tradebox Plans", icon: CreditCard },
  { key: "services-sold", label: "Services Sold", icon: ShoppingCart },
  { key: "ra-transactions", label: "RA Transactions", icon: BarChart2 },
  { key: "withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
];

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

const VALID_TABS: MainTab[] = ["tradebox-plans", "services-sold", "ra-transactions", "withdrawals"];

export default function AccountsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as MainTab | null;
  const [activeTab, setActiveTab] = useState<MainTab>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "tradebox-plans"
  );

  useEffect(() => {
    const t = searchParams.get("tab") as MainTab | null;
    if (t && VALID_TABS.includes(t)) setActiveTab(t);
  }, [searchParams]);

  function handleTabChange(tab: MainTab) {
    setActiveTab(tab);
    router.replace(`/dashboard/admin/accounts?tab=${tab}`, { scroll: false });
  }

  const token = (session?.user?.backendToken || (session as any)?.backendToken) ?? "";

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const { data: tradeboxRaw, isLoading: loadingTradebox } = useSWR<{ data: any[] }>(
    activeTab === "tradebox-plans" && token
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tradeboxwallet/tradeboxplans`
      : null,
    (url: string) => fetcher(url, { headers })
  );

  const { data: spPlansRaw, isLoading: loadingSP, mutate: mutateSpPlans } = useSWR<{ data: any[] }>(
    activeTab === "services-sold" && token
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tradeboxwallet/serviceproviderplans`
      : null,
    (url: string) => fetcher(url, { headers })
  );

  const shouldFetchWalletTransactions =
    (activeTab === "ra-transactions" || activeTab === "services-sold") && token;

  const { data: walletTransactionsRaw, isLoading: loadingWalletTransactions } = useSWR<{ data: any[] }>(
    shouldFetchWalletTransactions
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/rawallet/transaction-list`
      : null,
    (url: string) => fetcher(url, { headers })
  );

  const tradeboxPlans = useMemo(() => {
    return (tradeboxRaw?.data ?? []).map((item: any) => ({
      ...item,
      purchasedBy: item.orderdBy?.name,
      email: item.orderdBy?.email,
      serviceName: item?.planName,
      plan: item?.plan,
      status: item.status,
      amount: item.amount,
      GST: item.gst,
      total: item.total,
      createdAt: item.createdAt,
    }));
  }, [tradeboxRaw]);

  const spPlans = useMemo(() => {
    return (spPlansRaw?.data ?? []).map((item: any) => ({
      ...item,
      purchasedBy: item.orderdBy?.name,
      soldByName: item.soldBy?.name,
      createdAt: item.createdAt,
      validity: item.validity,
    }));
  }, [spPlansRaw]);

  const walletTransactions = walletTransactionsRaw?.data ?? [];
  const raTransactions = walletTransactions;

  return (
    <div className="px-4 max-w-7xl mx-auto space-y-6">
      <Toaster />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 ml-10">
            Platform revenue, service sales, RA transactions, GST & withdrawals
          </p>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "tradebox-plans" && (
          <TradeboxPlansTab plans={tradeboxPlans} isLoading={loadingTradebox} />
        )}

        {activeTab === "services-sold" && (
          <ServicesSoldTab
            sales={spPlans}
            isLoading={loadingSP}
            walletTransactions={walletTransactions}
            token={token}
            onInvoiceRegenerated={() => mutateSpPlans()}
          />
        )}

        {activeTab === "ra-transactions" && (
          <RATransactionsTab data={raTransactions} isLoading={loadingWalletTransactions} />
        )}

        {activeTab === "withdrawals" && <WithdrawalsTab token={token} />}
      </div>
    </div>
  );
}
