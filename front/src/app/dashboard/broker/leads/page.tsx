"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from "xlsx";

type BrokerLead = {
  _id: string;
  type: string;
  status: string;
  serviceName: string;
  serviceProviderName: string;
  user: {
    id: string;
    name: string;
    email: string;
    number: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export default function BrokerLeadsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [leads, setLeads] = useState<BrokerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!session?.backendToken) return;

    (async () => {
      try {
        const res = await authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/broker/leads`,
          {
            headers: {
              Authorization: `Bearer ${session.backendToken}`,
            },
          }
        );
        const data = await res.json();
        setLeads(data.data || []);
      } catch (err) {
        console.error("Failed to load leads", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.backendToken]);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      (l.user?.name || "").toLowerCase().includes(q) ||
      (l.user?.email || "").toLowerCase().includes(q) ||
      l.serviceName.toLowerCase().includes(q) ||
      l.serviceProviderName.toLowerCase().includes(q)
    );
  });

  const exportToExcel = () => {
    if (!filtered.length) {
      toast({ title: "No Data", description: "Nothing to export", variant: "destructive" });
      return;
    }

    const exportData = filtered.map((l) => ({
      "User Name": l.user?.name || "N/A",
      "Email": l.user?.email || "N/A",
      "Phone": l.user?.number || "N/A",
      "Service": l.serviceName,
      "RA Name": l.serviceProviderName,
      "Status": l.status,
      "Date": new Date(l.createdAt).toLocaleDateString(),
      "Time": new Date(l.createdAt).toLocaleTimeString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(
      workbook,
      `Broker_Leads_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`
    );

    toast({ title: "Export Successful", description: `${filtered.length} leads exported` });
  };

  if (loading) return <p className="p-6 text-gray-500">Loading leads...</p>;

  return (
    <div className="pb-20 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm m-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                Leads
              </h1>
              <p className="text-muted-foreground mt-1">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                  {filtered.length} leads
                </span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Search by name, email, service, RA..."
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
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Service</th>
                  <th className="px-4 py-3 text-left font-medium">RA Name</th>
                  <th className="px-4 py-3 text-left font-medium">Step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((lead) => (
                  <tr
                    key={lead._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(lead.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium">
                      {lead.user?.name || "N/A"}
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                      {lead.user?.email || "N/A"}
                    </td>
                    <td className="px-4 py-4">
                      {lead.user?.number || "N/A"}
                    </td>
                    <td className="px-4 py-4">{lead.serviceName}</td>
                    <td className="px-4 py-4">{lead.serviceProviderName}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden mt-5 space-y-4">
            {filtered.map((lead) => (
              <div
                key={lead._id}
                className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{lead.user?.name || "N/A"}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {lead.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{lead.user?.email || "N/A"}</p>
                <p className="text-sm mt-1">{lead.serviceName}</p>
                <p className="text-sm text-gray-400">RA: {lead.serviceProviderName}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(lead.createdAt).toLocaleDateString()} &middot;{" "}
                  {new Date(lead.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <h3 className="text-lg font-medium text-gray-500 mb-1">
                No leads found
              </h3>
              <p className="text-sm">
                Leads from marketplace services will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
