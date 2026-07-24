"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import * as XLSX from "xlsx";
import Image from "next/image";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Globe,
  Users,
  DollarSign,
  Tag,
  Mail,
  ExternalLink,
  Download,
  ArrowUpDown,
  Clock,
  Languages,
  Ticket,
  FileText,
  AlertCircle,
  User,
  Monitor,
  UserCircle,
  Search,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type EventData = {
  _id: string;
  title: string;
  description: string;
  schedule: string;
  location?: string;
  link?: string;
  category: string[];
  image?: string;
  tags?: string[];
  disclaimer: string;
  eventEmail: string;
  eventType: string;
  eventCostType: string;
  price: number;
  language: string;
  approvalStatus: boolean;
  targetAudience?: "user" | "provider";
  createdAt: string;
  updatedAt?: string;
  authorData: {
    id: string;
    email: string;
    name: string;
    authorImage: string;
    type: string;
    aboutAuthor?: string;
    isVerified?: boolean;
  };
};

type RegistrationEntry = {
  _id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  eventMode: string;
  createdAt: string;
};

type SortKey = "name" | "email" | "registrationDate" | "eventMode";
type SortDir = "asc" | "desc";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmt(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCurrency(n?: number): string {
  if (n == null || isNaN(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function isUpcoming(schedule?: string): boolean {
  if (!schedule) return false;
  return new Date(schedule) > new Date();
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ─────────────────────────────────────────────────────────────
// Info Card
// ─────────────────────────────────────────────────────────────

function InfoCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const session = useSession();
  const [id, setId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>("registrationDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { id } = await params;
      setId(id);
    })();
  }, [params]);

  const { data, isLoading } = useSWR(
    id ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/eventdetails/?id=${id}` : null,
    fetcher
  );

  const event: EventData | null = data?.event || null;

  useEffect(() => {
    if (!id || !session.data?.backendToken) return;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/registeredusers/?id=${id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.data?.backendToken}`,
            },
          }
        );
        const json = await res.json();
        setRegistrations(json || []);
      } catch {
        setRegistrations([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [id, session.data?.backendToken]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return [...registrations]
      .filter((u) => !q || (u.userName ?? "").toLowerCase().includes(q) || (u.userEmail ?? "").toLowerCase().includes(q))
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "name": aVal = a.userName ?? ""; bVal = b.userName ?? ""; break;
          case "email": aVal = a.userEmail ?? ""; bVal = b.userEmail ?? ""; break;
          case "eventMode": aVal = a.eventMode; bVal = b.eventMode; break;
          default:
            aVal = new Date(a.createdAt || 0).getTime();
            bVal = new Date(b.createdAt || 0).getTime();
        }
        if (typeof aVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
      });
  }, [registrations, userSearch, sortKey, sortDir]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDir("asc"); }
    },
    [sortKey]
  );

  const handleExport = useCallback(() => {
    const rows = filteredUsers.map((u, idx) => ({
      "#": idx + 1,
      Name: u.userName ?? "—",
      Email: u.userEmail ?? "—",
      "Registration Date": fmt(u.createdAt),
      "Event Mode": u.eventMode,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registered Users");
    XLSX.writeFile(wb, `RegisteredUsers_${event?.title ?? "Event"}_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filteredUsers, event]);

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

  // ── Loading ──
  if (isLoading || !event) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading event details…</p>
      </div>
    );
  }

  const upcoming = isUpcoming(event.schedule);
  const isPaid = event.eventCostType === "Paid";
  const regCount = data?.registrationCount ?? 0;
  const onlineCount = data?.onlineCount ?? 0;
  const offlineCount = data?.offlineCount ?? 0;

  return (
    <div className="space-y-6 py-10">
      {/* ── Back + Header ── */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.push("/dashboard/admin/events/allevents")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
          {/* Event image */}
          {event.image && (
            <div className="relative w-full lg:w-60 h-40 lg:h-36 rounded-2xl overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50">
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                upcoming
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-gray-50 text-gray-500 border border-gray-200"
              }`}>
                {upcoming ? "Upcoming" : "Past"}
              </span>
              <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                isPaid
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                {isPaid ? `Paid · ${fmtCurrency(event.price)}` : "Free"}
              </span>
              {event.approvalStatus && (
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                  Approved
                </span>
              )}
              <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-medium bg-violet-50 text-violet-600 border border-violet-200 capitalize">
                {event.targetAudience === "provider" ? "For Providers" : "For Users"}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">{event.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {fmtDateTime(event.schedule)}
              </span>
              {event.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {event.location}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  Online
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {regCount} registered
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <InfoCard label="Event Date" value={fmt(event.schedule)} icon={CalendarDays} color="bg-indigo-50 text-indigo-600" />
        <InfoCard label="Registrations" value={regCount} icon={Users} color="bg-blue-50 text-blue-600" />
        <InfoCard
          label="Online / Offline"
          value={`${onlineCount} / ${offlineCount}`}
          icon={Monitor}
          color="bg-cyan-50 text-cyan-600"
        />
        <InfoCard
          label="Price"
          value={isPaid ? fmtCurrency(event.price) : "Free"}
          icon={DollarSign}
          color="bg-amber-50 text-amber-600"
        />
        <InfoCard label="Language" value={event.language ?? "—"} icon={Languages} color="bg-violet-50 text-violet-600" />
        <InfoCard label="Event Type" value={event.eventType ?? "—"} icon={Ticket} color="bg-rose-50 text-rose-600" />
      </div>

      {/* ── Details Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Description */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">Description</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {event.description || "No description provided."}
          </p>

          {event.disclaimer && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Disclaimer</h4>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{event.disclaimer}</p>
            </div>
          )}
        </div>

        {/* Author card + Event meta */}
        <div className="space-y-4">
          {/* Author */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <UserCircle className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-700">Author</h3>
            </div>
            <div className="flex items-center gap-3 mb-3">
              {event.authorData?.authorImage ? (
                <Image
                  src={event.authorData.authorImage}
                  alt={event.authorData.name}
                  width={44}
                  height={44}
                  className="rounded-full object-cover border border-gray-200"
                  unoptimized
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{event.authorData?.name ?? "—"}</p>
                <p className="text-xs text-gray-400 capitalize">{event.authorData?.type ?? "—"}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              {event.authorData?.email && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{event.authorData.email}</span>
                </div>
              )}
              {event.authorData?.aboutAuthor && (
                <p className="text-gray-500 leading-relaxed pt-1 border-t border-gray-100 mt-2">
                  {event.authorData.aboutAuthor}
                </p>
              )}
            </div>
          </div>

          {/* Event Meta */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-700">Details</h3>
            </div>
            <div className="space-y-3">
              {(event.category?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[11px] text-gray-400 font-medium uppercase mb-1">Categories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {event.category.map((c) => (
                      <span key={c} className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {event.eventEmail && (
                <div>
                  <p className="text-[11px] text-gray-400 font-medium uppercase mb-0.5">Event Email</p>
                  <a href={`mailto:${event.eventEmail}`} className="text-sm text-indigo-600 hover:underline break-all">
                    {event.eventEmail}
                  </a>
                </div>
              )}

              {event.link && (
                <div>
                  <p className="text-[11px] text-gray-400 font-medium uppercase mb-0.5">Event Link</p>
                  <a href={event.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline break-all">
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    {event.link}
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div>
                  <p className="text-[11px] text-gray-400 font-medium uppercase">Created</p>
                  <p className="text-xs text-gray-600">{fmt(event.createdAt)}</p>
                </div>
                {event.updatedAt && (
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400 font-medium uppercase">Updated</p>
                    <p className="text-xs text-gray-600">{fmt(event.updatedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Event Image (full view) ── */}
      {event.image && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Event Banner</h3>
            <a
              href={event.image}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Open Full Image
            </a>
          </div>
          <div className="relative w-full max-w-2xl h-64 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mx-auto">
            <Image
              src={event.image}
              alt={event.title}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* ── Registered Users Section ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-700">
                Registered Users
                <span className="ml-2 text-xs font-medium text-gray-400">({registrations.length})</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all w-56"
                />
              </div>
              <button
                onClick={handleExport}
                disabled={!filteredUsers.length}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading users…</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {registrations.length === 0 ? "No users registered yet" : "No users match your search"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                    <SortableHeader label="Name" field="name" />
                    <SortableHeader label="Email" field="email" />
                    <SortableHeader label="Registered On" field="registrationDate" />
                    <SortableHeader label="Mode" field="eventMode" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((u, idx) => (
                    <tr key={u._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-indigo-600">
                              {u.userName?.charAt(0)?.toUpperCase() ?? "?"}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate">{u.userName ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{u.userEmail ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {fmt(u.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold capitalize ${
                          u.eventMode === "online"
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : u.eventMode === "offline"
                            ? "bg-orange-50 text-orange-600 border border-orange-200"
                            : "bg-gray-50 text-gray-500 border border-gray-200"
                        }`}>
                          {u.eventMode === "online" ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                          {u.eventMode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredUsers.map((u, idx) => (
                <div key={u._id} className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-600">
                      {u.userName?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">{u.userName ?? "—"}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">#{idx + 1}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-1.5">{u.userEmail ?? "—"}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {fmt(u.createdAt)}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        u.eventMode === "online"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-orange-50 text-orange-600"
                      }`}>
                        {u.eventMode}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
