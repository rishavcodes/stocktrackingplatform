"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  ArrowUpDown,
  Store,
  Users,
  CheckCircle2,
  Globe,
  Archive,
} from "lucide-react";

type MarketplaceItem = {
  _id: string;
  name: string;
  description: string;
  slug: string;
  brokerSnapshot: { name: string; email?: string; profileUrl?: string };
  activeRaIds: string[];
  revokedRaIds?: string[];
  invitations?: { raId: string; status: string }[];
  status: string;
  createdByBrokerId?: string;
  createdAt: string;
  updatedAt?: string;
};

type SortKey = "name" | "creator" | "activeRAs" | "status" | "createdAt";
type SortDir = "asc" | "desc";

function fmt(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const fetcher = ([url, token]: [string, string]) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());

export default function AllMarketplacesPage() {
  const router = useRouter();
  const session = useSession();
  const token = session.data?.backendToken ?? "";

  const { data, isLoading } = useSWR(
    token ? [`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/allmarketplaces`, token] : null,
    fetcher
  );
  const marketplaces: MarketplaceItem[] = (data?.data as MarketplaceItem[]) ?? [];

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...marketplaces]
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          (m.brokerSnapshot?.name ?? "").toLowerCase().includes(q) ||
          (m.slug ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "name": aVal = a.name; bVal = b.name; break;
          case "creator": aVal = a.brokerSnapshot?.name ?? ""; bVal = b.brokerSnapshot?.name ?? ""; break;
          case "activeRAs": aVal = a.activeRaIds?.length ?? 0; bVal = b.activeRaIds?.length ?? 0; break;
          case "status": aVal = a.status; bVal = b.status; break;
          default:
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
        }
        if (typeof aVal === "number" && typeof bVal === "number")
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        return sortDir === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [marketplaces, search, sortKey, sortDir]);

  const totalActiveRAs = useMemo(
    () => {
      const unique = new Set<string>();
      marketplaces.forEach((m) => m.activeRaIds?.forEach((id) => unique.add(id)));
      return unique.size;
    },
    [marketplaces]
  );
  const activeCount = useMemo(() => marketplaces.filter((m) => m.status === "active").length, [marketplaces]);
  const archivedCount = useMemo(() => marketplaces.filter((m) => m.status === "archived").length, [marketplaces]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDir("asc"); }
    },
    [sortKey]
  );

  const handleExport = useCallback(() => {
    const rows = filtered.map((m) => ({
      Name: m.name,
      Slug: m.slug ?? "—",
      Creator: m.brokerSnapshot?.name ?? "—",
      "Active RAs": m.activeRaIds?.length ?? 0,
      Status: m.status ?? "—",
      "Created At": fmt(m.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marketplaces");
    XLSX.writeFile(wb, `Marketplaces_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filtered]);

  function SortableHeader({ label, field }: { label: string; field: SortKey }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap"
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-indigo-600" : "text-gray-300"}`} />
        </span>
      </th>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading marketplaces…</p>
      </div>
    );
  }

  if (!marketplaces.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <Store className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">No marketplaces found</h3>
          <p className="text-sm text-gray-400 mt-1">Marketplaces will appear here once created</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Globe className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Marketplaces</h1>
          <p className="text-sm text-gray-500">Overview of all marketplaces in the system</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Marketplaces" value={marketplaces.length} icon={Store} color="bg-indigo-50 text-indigo-600" />
        <KpiCard label="Active RAs" value={totalActiveRAs} sub="unique across all" icon={Users} color="bg-blue-50 text-blue-600" />
        <KpiCard label="Active" value={activeCount} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
        <KpiCard label="Archived" value={archivedCount} icon={Archive} color="bg-gray-100 text-gray-500" />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, creator, or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">No marketplaces match your search</p>
          <button onClick={() => setSearch("")} className="mt-2 text-xs text-indigo-600 hover:underline">
            Clear search
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="hidden md:block border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableHeader label="Name" field="name" />
                  <SortableHeader label="Creator" field="creator" />
                  <SortableHeader label="Active RAs" field="activeRAs" />
                  <SortableHeader label="Status" field="status" />
                  <SortableHeader label="Created" field="createdAt" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((m) => (
                  <tr
                    key={m._id}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/admin/marketplace/allmarketplaces/${m._id}`)}
                  >
                    <td className="px-4 py-3.5 max-w-[250px]">
                      <div className="font-medium text-sm text-gray-900 truncate">{m.name}</div>
                      <div className="text-xs text-gray-400 truncate">{m.slug}</div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[150px]">
                      <span className="text-sm text-gray-700 truncate block">{m.brokerSnapshot?.name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">{m.activeRaIds?.length ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                        m.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}>
                        {m.status === "active" ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-xs text-gray-600">{fmt(m.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((m) => (
            <div
              key={m._id}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm cursor-pointer"
              onClick={() => router.push(`/dashboard/admin/marketplace/allmarketplaces/${m._id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{m.name}</h3>
                  <p className="text-xs text-gray-400 truncate">{m.brokerSnapshot?.name ?? "—"}</p>
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ml-3 flex-shrink-0 ${
                  m.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {m.status === "active" ? "Active" : "Archived"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block">Slug</span>
                  <span className="text-gray-800 font-medium truncate block">{m.slug ?? "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Active RAs</span>
                  <span className="text-gray-800 font-medium">{m.activeRaIds?.length ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Created</span>
                  <span className="text-gray-800 font-medium">{fmt(m.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
