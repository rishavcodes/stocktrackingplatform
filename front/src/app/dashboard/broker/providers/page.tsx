"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as XLSX from "xlsx";

type Provider = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  profileUrl: string;
  regNumber: string;
  type: string;
  category: string;
  city: string;
  state: string;
  verified: boolean;
  approved: boolean;
  subscriberCount: number;
  serviceCount: number;
  marketplaces: string[];
  createdAt: string;
};

export default function BrokerProvidersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!session?.backendToken) return;

    (async () => {
      try {
        const res = await authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/broker/providers`,
          {
            headers: {
              Authorization: `Bearer ${session.backendToken}`,
            },
          }
        );
        const data = await res.json();
        setProviders(data.data || []);
      } catch (err) {
        console.error("Failed to load providers", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.backendToken]);

  const filtered = providers.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.regNumber || "").toLowerCase().includes(q) ||
      p.marketplaces.some((m) => m.toLowerCase().includes(q))
    );
  });

  const exportToExcel = () => {
    if (!filtered.length) {
      toast({ title: "No Data", description: "Nothing to export", variant: "destructive" });
      return;
    }

    const exportData = filtered.map((p) => ({
      "Name": p.name,
      "Email": p.email,
      "Phone": p.phone || "N/A",
      "SEBI Reg No.": p.regNumber || "N/A",
      "Category": p.category,
      "Type": p.type,
      "Subscribers": p.subscriberCount,
      "Services": p.serviceCount,
      "Marketplaces": p.marketplaces.join(", "),
      "Joined": new Date(p.createdAt).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Providers");
    XLSX.writeFile(
      workbook,
      `Broker_Providers_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`
    );

    toast({ title: "Export Successful", description: `${filtered.length} providers exported` });
  };

  if (loading) return <p className="p-6 text-gray-500">Loading providers...</p>;

  return (
    <div className="pb-20 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm m-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                Providers
              </h1>
              <p className="text-muted-foreground mt-1">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                  {filtered.length} providers
                </span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Search by name, email, SEBI no..."
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div
                key={p._id}
                className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={p.profileUrl} alt={p.name} />
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold">
                      {p.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                      {p.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{p.email}</p>
                  </div>
                  {p.verified && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Verified
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {p.regNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">SEBI Reg No.</span>
                      <span className="font-medium">{p.regNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category</span>
                    <span className="font-medium">{p.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subscribers</span>
                    <span className="font-medium">{p.subscriberCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Services</span>
                    <span className="font-medium">{p.serviceCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Marketplace(s)</span>
                    <span className="font-medium text-right truncate max-w-[150px]">
                      {p.marketplaces.join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <h3 className="text-lg font-medium text-gray-500 mb-1">
                No providers found
              </h3>
              <p className="text-sm">
                Research Analysts associated with your marketplaces will appear
                here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
