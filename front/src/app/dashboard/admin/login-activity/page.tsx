"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Activity,
  Search,
  RefreshCw,
  Monitor,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type LoginActivityRow = {
  _id: string;
  subjectId: string;
  subjectType: "user" | "provider" | "admin";
  name?: string;
  email?: string;
  number?: string;
  category?: string;
  event: string;
  ipAddress?: string;
  deviceInfo?: string;
  createdAt: string;
};

type FeedResponse = {
  success: boolean;
  data: LoginActivityRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

const SUBJECT_META: Record<
  string,
  { label: string; cls: string }
> = {
  user: { label: "Subscriber", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  provider: {
    label: "Service Provider",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  admin: { label: "Admin", cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

const SUBJECT_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All types" },
  { value: "user", label: "Subscribers" },
  { value: "provider", label: "Service Providers" },
  { value: "admin", label: "Admins" },
];

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fullTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 20;

export default function LoginActivityPage() {
  const session = useSession();

  const [rows, setRows] = useState<LoginActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [subjectType, setSubjectType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    const token =
      session.data?.user?.backendToken || (session.data as any)?.backendToken;
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (subjectType) params.set("subjectType", subjectType);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/login-activity?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const json: FeedResponse = await res.json();
      if (json?.success) {
        setRows(json.data || []);
        setTotal(json.total || 0);
        setPages(json.pages || 1);
      }
    } catch {
      // swallow — feed simply stays as-is
    } finally {
      setLoading(false);
    }
  }, [session.data, page, subjectType, search]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [subjectType, search]);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Login Activity</h1>
            <p className="text-xs text-gray-500">
              Recent successful logins across subscribers, service providers and admins
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchFeed()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput);
          }}
          className="relative flex-1 min-w-[220px]"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone or IP…"
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
          />
        </form>
        <select
          value={subjectType}
          onChange={(e) => setSubjectType(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        >
          {SUBJECT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    No login activity yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const meta = SUBJECT_META[r.subjectType] || {
                    label: r.subjectType,
                    cls: "bg-gray-100 text-gray-600 border-gray-200",
                  };
                  return (
                    <tr key={r._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {r.name || "—"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {r.email || r.number || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                        {r.category && (
                          <div className="mt-1 text-xs text-gray-400">
                            {r.category}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-gray-400" />
                          {r.ipAddress || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[280px]">
                        <span className="inline-flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate" title={r.deviceInfo || ""}>
                            {r.deviceInfo || "—"}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-gray-700" title={fullTime(r.createdAt)}>
                          {relativeTime(r.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">
            {total} login{total === 1 ? "" : "s"} · page {page} of {pages}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
