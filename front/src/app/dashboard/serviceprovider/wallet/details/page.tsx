"use client";
import { WithdrawButton } from "@/components";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useToast } from "@/components/ui/use-toast";
import Script from "next/script";
import * as XLSX from "xlsx";
import { 
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components";
import AddMoney from "@/components/Wallet/AddMoney";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Receipt, AlertTriangle } from "lucide-react";

type Transaction = {
  _id: string;
  amount: number;
  type: string;
  paymentId: string;
  orderId: string;
  orderdBy: {
    _id: string;
    name: string;
    email: string;
  };
  serviceName?: string | null;
  createdAt: string;
};

// Human-readable label for the wallet transaction type.
const TYPE_LABEL: Record<string, string> = {
  topup: "Top-up",
  "manual-topup": "Manual Top-up",
  withdraw: "Withdrawal",
  additional_charge: "Additional Charge",
  "subscription-charge": "Subscription Charge",
  "Onboarding-Charge": "Onboarding Charge",
  "Renewal-Charge": "Renewal Charge",
  deduction: "Deduction",
  "model-portfolio-charge": "Portfolio Charge",
  "course-sale": "Course Sale",
  "marketplace-broker-commission": "Broker Commission",
};

// Where the money flowed for each wallet entry, from the SP's perspective.
const DEBITED_TO: Record<string, string> = {
  topup: "Wallet (Credit)",
  "manual-topup": "Wallet (Credit)",
  "course-sale": "Wallet (Credit)",
  withdraw: "Bank Account",
  additional_charge: "Tradebox",
  "subscription-charge": "Tradebox",
  "Onboarding-Charge": "Tradebox",
  "Renewal-Charge": "Tradebox",
  deduction: "Tradebox",
  "model-portfolio-charge": "Tradebox",
  "marketplace-broker-commission": "Marketplace Broker",
};

// Wallet entries that are credits (money in) vs debits (money out).
const CREDIT_TYPES = new Set(["topup", "manual-topup", "course-sale"]);

type WalletBalanceType = {
  amount: number; // Updated key from API response
  transactions: Transaction[];
};

export default function Wallet() {
  const session = useSession();
  const { toast } = useToast();
  const [walletbalance, setWalletBalance] = useState<WalletBalanceType>({
    amount: 0,
    transactions: [],
  });
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [amount, setAmount] = useState("");

  /* ---------- Filters & sorting ---------- */
  type SortField = "date" | "type" | "customer" | "plan" | "debitedTo" | "amount";
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const visibleTransactions = useMemo(() => {
    let rows = [...(walletbalance?.transactions || [])];

    // Date range filter (inclusive)
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      rows = rows.filter((t) => new Date(t.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter((t) => new Date(t.createdAt) <= to);
    }

    // Type filter
    if (typeFilter !== "all") {
      rows = rows.filter((t) => t.type === typeFilter);
    }

    // Sort
    rows.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortField) {
        case "date":
          av = new Date(a.createdAt).getTime();
          bv = new Date(b.createdAt).getTime();
          break;
        case "type":
          av = TYPE_LABEL[a.type] || a.type;
          bv = TYPE_LABEL[b.type] || b.type;
          break;
        case "customer":
          av = a?.orderdBy?.name || "";
          bv = b?.orderdBy?.name || "";
          break;
        case "plan":
          av = a.serviceName || "";
          bv = b.serviceName || "";
          break;
        case "debitedTo":
          av = DEBITED_TO[a.type] || "";
          bv = DEBITED_TO[b.type] || "";
          break;
        case "amount":
          av = a.amount;
          bv = b.amount;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [walletbalance.transactions, dateFrom, dateTo, typeFilter, sortField, sortDir]);

  // Distinct types currently present in the data — feeds the type filter dropdown.
  const availableTypes = useMemo(() => {
    const set = new Set(walletbalance.transactions.map((t) => t.type));
    return Array.from(set);
  }, [walletbalance.transactions]);

  // Summary metrics for the wallet header card.
  const walletSummary = useMemo(() => {
    let credits = 0;
    let debits = 0;
    for (const t of walletbalance.transactions) {
      if (CREDIT_TYPES.has(t.type)) credits += t.amount;
      else debits += t.amount;
    }
    return {
      credits,
      debits,
      count: walletbalance.transactions.length,
    };
  }, [walletbalance.transactions]);

  const formatINR = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hasActiveFilters = !!(dateFrom || dateTo || typeFilter !== "all");
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setTypeFilter("all");
  };

  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
    }
  }, []);

  const { data } = useSWR<{ data: WalletBalanceType }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/walletbalance?id=${session.data?.user.id}`,
    fetcher
  );

  useEffect(() => {
    if (data?.data) {
      setWalletBalance(data?.data);
    }
  }, [data?.data]);

  const exportToExcel = () => {
    // Export what the user is currently seeing (respects filters + sort).
    if (!visibleTransactions.length) {
      toast({
        title: "No Data",
        description: "No transactions match the current filters",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for excel export
    const exportData = visibleTransactions
      .map((transaction) => {
        const created = new Date(transaction.createdAt);
        const isCredit = CREDIT_TYPES.has(transaction.type);
        return {
          Date: created.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          Time: created.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          Type: TYPE_LABEL[transaction.type] || transaction.type,
          "Customer Name": transaction?.orderdBy?.name || "—",
          Plan: transaction.serviceName || "—",
          "Debited to": DEBITED_TO[transaction.type] || "—",
          Amount: `${isCredit ? "+" : "-"}${transaction.amount.toFixed(2)}`,
        };
      });

    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const columnWidths = [
      { wch: 14 }, // Date
      { wch: 10 }, // Time
      { wch: 22 }, // Type
      { wch: 22 }, // Customer Name
      { wch: 28 }, // Plan
      { wch: 20 }, // Debited to
      { wch: 14 }, // Amount
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    // Generate filename with current date
    const fileName = `Wallet_Transactions_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export Successful",
      description: `${visibleTransactions.length} transactions exported to Excel`,
      variant: "default",
    });
  };

  const checkout = async () => {
    if (!session?.data?.user) {
      alert("Please log in to continue.");
      return;
    }

    if (!razorpayLoaded) {
      alert("Razorpay is still loading. Please wait a moment.");
      return;
    }
    const spId = session?.data?.user?.id;
    const finalPrice = Number(amount);
    const amountInPaise = finalPrice * 100;

    // const amount = parseInt(price.replace("₹", ""));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amountInPaise,
            spId: spId,

          }),
        }
      ); 

      const order = await response.json();

      if (!response.ok) throw new Error(order.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_API_KEY,
        amount: order.checkout.amount,
        currency: "INR",
        name: "Wallet Topup",
        description: `Wallet topup done with amount: ${amount}`,
        order_id: order.checkout.id,
        handler: function (response: any) {
          toast({
            title: "Wallet Recharged",
            description: `Wallet Topup ${amount}`,
            variant: "default",
          });
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        },
        notes: {
          buyerName: session?.data?.user?.RegName?.replaceAll("/", " "),
          buyerId: session?.data?.user?._id,
          orderedByEmail: session?.data?.user?.email,
          amount: amount,
          transactionType: "topup",
        },
        prefill: {
          name: session.data.user.name,
          email: session.data.user.email,
        },
        theme: { color: "#01E3A1" },
      };

      const _window = window as any;
      const paymentObj = new _window.Razorpay(options);
      paymentObj.open();

      paymentObj.on("payment.failed", function (response: any) {
        toast({
          title: "Payment Failed",
          description: `Payment failed: ${response.error.description}`,
          variant: "destructive",
        });
      });
    } catch (error) {
      console.error("Payment Error:", error);
      alert("Payment failed. Please try again.");
    }
  };

  const isLowBalance = walletbalance.amount < 500;

  return (
    <div>
      {isLowBalance && (
        <div className="mx-5 mt-5 flex items-start gap-3 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <span className="relative flex h-3 w-3 mt-1.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
              Your wallet balance is low
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-red-700 dark:text-red-400">
              Current balance: <span className="font-semibold">{walletbalance.amount.toFixed(2)}</span>.
              New customer purchases may be blocked once the balance drops below the commission threshold.
              Please recharge to keep accepting new subscribers without interruption.
            </p>
          </div>
        </div>
      )}

      <div className="m-5 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="grid sm:grid-cols-5">
          {/* Left: header, stats, actions */}
          <div className="sm:col-span-3 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <WalletIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Wallet Overview
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Manage credits, withdrawals, and commission history.
                  </div>
                </div>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <TrendingUp className="w-3 h-3 text-green-500" /> Credits
                </div>
                <div className="mt-1.5 text-base sm:text-lg font-bold text-green-600 dark:text-green-400 tabular-nums truncate">
                  ₹{formatINR(walletSummary.credits)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <TrendingDown className="w-3 h-3 text-red-500" /> Debits
                </div>
                <div className="mt-1.5 text-base sm:text-lg font-bold text-red-600 dark:text-red-400 tabular-nums truncate">
                  ₹{formatINR(walletSummary.debits)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <Receipt className="w-3 h-3 text-blue-500" /> Transactions
                </div>
                <div className="mt-1.5 text-base sm:text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                  {walletSummary.count}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <AddMoney />
              <WithdrawButton balance={walletbalance.amount} />
            </div>
          </div>

          {/* Right: balance display */}
          <div className="sm:col-span-2 relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 dark:from-emerald-600 dark:to-teal-800 text-white p-8 flex flex-col justify-center items-center overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-white/80 mb-3">
                <WalletIcon className="w-3.5 h-3.5" />
                Available Balance
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-medium text-white/80">₹</span>
                <span className="md:text-5xl text-4xl font-bold tabular-nums leading-none">
                  {formatINR(walletbalance.amount)}
                </span>
              </div>

              {isLowBalance && (
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-200/40 text-[11px] font-medium text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-300" />
                  </span>
                  Low balance — please recharge
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Transaction History</h2>
          <button
            onClick={exportToExcel}
            disabled={!visibleTransactions.length}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900"
            >
              <option value="all">All</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t] || t}
                </option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
            >
              Clear filters
            </button>
          )}
          <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold">{visibleTransactions.length}</span> of {walletbalance.transactions.length}
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
          {walletbalance?.transactions.length ? (
            visibleTransactions.length ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-left">
                    {([
                      { label: "Date", field: "date" as const },
                      { label: "Time", field: "date" as const },
                      { label: "Type", field: "type" as const },
                      { label: "Customer Name", field: "customer" as const },
                      { label: "Plan", field: "plan" as const },
                      { label: "Debited to", field: "debitedTo" as const },
                      { label: "Amount", field: "amount" as const },
                    ]).map(({ label, field }) => (
                      <th
                        key={label}
                        onClick={() => toggleSort(field)}
                        className="p-3 cursor-pointer select-none hover:bg-gray-300 dark:hover:bg-gray-700 transition whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          <span className="text-xs text-gray-500">
                            {sortField === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions.map((transaction) => {
                    const created = new Date(transaction.createdAt);
                    const isCredit = CREDIT_TYPES.has(transaction.type);
                    return (
                      <tr key={transaction._id} className="border-b">
                        <td className="p-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {created.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-3 text-gray-500 whitespace-nowrap">
                          {created.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3 font-semibold">
                          {TYPE_LABEL[transaction.type] || transaction.type}
                        </td>
                        <td className="p-3">
                          {transaction?.orderdBy?.name || "—"}
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          {transaction.serviceName || "—"}
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          {DEBITED_TO[transaction.type] || "—"}
                        </td>
                        <td
                          className={`p-3 font-bold whitespace-nowrap ${
                            isCredit ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {isCredit ? "+" : "−"}{transaction.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-center py-6">
                No transactions match the selected filters.
              </p>
            )
          ) : (
            <p className="text-gray-500 text-center py-3">
              No transactions found.
            </p>
          )}
        </div>
      </div>

      <div>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
          onLoad={() => setRazorpayLoaded(true)}
        />
      </div>
    </div>
  );
}
