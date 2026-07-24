"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from "xlsx";

type Subscriber = {
  _id: string;
  serviceName: string;
  userId?: string | null;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  userName: string;
  userEmail: string;
  userPhone: string;
  amount: number;
  subtotal: number;
  brokerCommission: number;
  marketplaceName: string;
  purchaseDate: string;
  startDate: string;
  endDate: string;
  isExpired: boolean;
  validity: string;
  soldBy: { name: string; id: string };
};

function lastSeenLabel(iso?: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleDateString("en-IN");
}

export default function BrokerSubscribersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!session?.backendToken) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/broker/subscribers`,
          {
            headers: {
              Authorization: `Bearer ${session.backendToken}`,
            },
          }
        );
        const data = await res.json();
        if (!cancelled) setSubscribers(data.data || []);
      } catch (err) {
        console.error("Failed to load subscribers", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    // Poll so the online dots stay roughly in step with the 5-min window.
    const interval = setInterval(load, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session?.backendToken]);

  const onlineCount = subscribers.filter((s) => s.isOnline).length;

  const filtered = subscribers.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.userName.toLowerCase().includes(q) ||
      s.userEmail.toLowerCase().includes(q) ||
      s.serviceName.toLowerCase().includes(q) ||
      s.marketplaceName.toLowerCase().includes(q)
    );
  });

  const exportToExcel = () => {
    if (!filtered.length) {
      toast({ title: "No Data", description: "Nothing to export", variant: "destructive" });
      return;
    }

    const exportData = filtered.map((s) => ({
      "User Name": s.userName,
      "Email": s.userEmail,
      "Phone": s.userPhone,
      "Service": s.serviceName,
      "Amount": `₹${s.amount}`,
      "Broker Commission": `₹${s.brokerCommission?.toFixed(2) || "0"}`,
      "Marketplace": s.marketplaceName,
      "Purchase Date": new Date(s.purchaseDate).toLocaleDateString(),
      "End Date": s.endDate ? new Date(s.endDate).toLocaleDateString() : "N/A",
      "Expired": s.isExpired ? "Yes" : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subscribers");
    XLSX.writeFile(
      workbook,
      `Broker_Subscribers_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`
    );

    toast({ title: "Export Successful", description: `${filtered.length} subscribers exported` });
  };

  if (loading) return <p className="p-6 text-gray-500">Loading subscribers...</p>;

  return (
    <div className="pb-20 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm m-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                Subscribers
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                  {filtered.length} subscribers
                </span>
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {onlineCount} online now
                </span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Search by name, email, service..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 dark:border-gray-600 text-sm outline-none w-full sm:w-64"
              />
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition shadow-md hover:shadow-lg text-sm"
              >
                Export Excel
              </button>
            </div>
          </div>

          <div className="hidden md:block rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Online</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Service</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Commission</th>
                  <th className="px-4 py-3 text-left font-medium">Marketplace</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((s) => (
                  <tr
                    key={s._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-4 font-medium">{s.userName}</td>
                    <td className="px-4 py-4">
                      <span
                        className="inline-flex items-center gap-1.5"
                        title={
                          s.lastSeenAt
                            ? `Last seen ${lastSeenLabel(s.lastSeenAt)}`
                            : "No recent activity"
                        }
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            s.isOnline ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        <span
                          className={
                            s.isOnline
                              ? "text-green-600 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {s.isOnline ? "Online" : "Offline"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                      {s.userEmail}
                    </td>
                    <td className="px-4 py-4">{s.serviceName}</td>
                    <td className="px-4 py-4">₹{s.amount}</td>
                    <td className="px-4 py-4 text-green-600 font-semibold">
                      ₹{s.brokerCommission?.toFixed(2) || "0"}
                    </td>
                    <td className="px-4 py-4">{s.marketplaceName}</td>
                    <td className="px-4 py-4 text-gray-500">
                      {new Date(s.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.isExpired
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {s.isExpired ? "Expired" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden mt-5 space-y-4">
            {filtered.map((s) => (
              <div
                key={s._id}
                className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        s.isOnline ? "bg-green-500" : "bg-gray-300"
                      }`}
                      title={
                        s.isOnline
                          ? "Online now"
                          : `Last seen ${lastSeenLabel(s.lastSeenAt)}`
                      }
                    />
                    {s.userName}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.isExpired
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {s.isExpired ? "Expired" : "Active"}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{s.userEmail}</p>
                <p className="text-sm mt-1">
                  {s.serviceName} &middot; ₹{s.amount}
                </p>
                <p className="text-sm text-green-600 font-semibold">
                  Commission: ₹{s.brokerCommission?.toFixed(2) || "0"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {s.marketplaceName} &middot;{" "}
                  {new Date(s.purchaseDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <h3 className="text-lg font-medium text-gray-500 mb-1">
                No subscribers found
              </h3>
              <p className="text-sm">
                Subscribers from marketplace purchases will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
