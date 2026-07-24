"use client";

import { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Bell,
  Trash2,
  Search,
  ArrowUp,
  ArrowDown,
  Users,
  Send,
  Tag,
  ExternalLink,
  Briefcase,
  UserCheck,
  Landmark,
  Megaphone,
  X,
} from "lucide-react";

// Static reference for the notification taxonomy. Maps each sender→recipient
// flow to the notification types that flow through it. Currently used by the
// All Notifications page as a legend; swap to live counts if/when we wire
// each item to a real `notification.type` enum on the backend.
const NOTIFICATION_TAXONOMY: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  bg: string;
  color: string;
  dot: string;
  items: string[];
}[] = [
  {
    title: "Tradebox → Expert",
    subtitle: "Sent from Tradebox to service providers",
    icon: Briefcase,
    bg: "bg-indigo-50",
    color: "text-indigo-600",
    dot: "bg-indigo-400",
    items: [
      "Service renewal",
      "Wallet top-up / balance update",
      "New subscriber, lead",
      "Birthday notification",
    ],
  },
  {
    title: "RA → Subscriber",
    subtitle: "Sent from research analysts to customers",
    icon: UserCheck,
    bg: "bg-emerald-50",
    color: "text-emerald-600",
    dot: "bg-emerald-400",
    items: [
      "Purchase complete, renewal reminder, subscription end",
      "Recommendation",
      "Model portfolio rebalance",
      "Article post, rational update",
      "Birthday notification",
    ],
  },
  {
    title: "Broker → Customer",
    subtitle: "Sent from brokers to their customers",
    icon: Landmark,
    bg: "bg-amber-50",
    color: "text-amber-600",
    dot: "bg-amber-400",
    items: [
      "Login confirmation",
      "Order placed, executed, modified, cancelled",
    ],
  },
];

type Recipient = { id: string; name: string };

// Composer audience modes. "all" / "providers" / "customers" are broadcasts;
// "specific-provider" / "specific-customer" require picking one recipient.
type ComposerAudience =
  | "all"
  | "providers"
  | "customers"
  | "specific-provider"
  | "specific-customer";

type PickerOption = { id: string; name: string; email?: string };

// Sender→recipient flow filter. Heuristics live in FLOW_PREDICATES below — the
// notification model has no explicit flow tag today, so we infer from sentBy.id
// markers ("admin" / "system") and notification type. Broker→Customer requires
// backend tagging (no reliable signal in current data) and currently returns
// no matches.
type FlowKey = "all" | "tradebox-expert" | "ra-subscriber" | "broker-customer";

type NotificationData = {
  _id: string;
  message: string;
  postLink?: string;
  type?: string;
  sentBy: { id: string; name: string };
  sendTo: Recipient[];
  createdAt: string;
};

// Heuristic flow predicates — see FlowKey doc-comment for why this is
// inferred rather than read from a field on the notification record.
const SYSTEM_SENDERS = new Set(["admin", "system"]);
const FLOW_PREDICATES: Record<FlowKey, (n: NotificationData) => boolean> = {
  all: () => true,
  // Tradebox-originated: wallet topups, plan activations, auto-renewal cron,
  // lead notifications, admin broadcasts. All flow through sentBy.id of
  // "admin" or "system".
  "tradebox-expert": (n) => SYSTEM_SENDERS.has(n.sentBy?.id),
  // SP-originated to customers — anything from a real SP id that isn't a
  // platform/system broadcast. Includes recommendations, articles, events,
  // model-portfolio rebalances, and purchase/renewal notifications.
  "ra-subscriber": (n) => !SYSTEM_SENDERS.has(n.sentBy?.id),
  // Requires a backend tag (e.g. notification.flow === "broker") or a join
  // against ServiceProvider.category to be accurate. Returns nothing for now
  // so it doesn't mislead — clearer than matching the wrong rows.
  "broker-customer": () => false,
};
const FLOW_CHIPS: { key: FlowKey; label: string }[] = [
  { key: "all", label: "All flows" },
  { key: "tradebox-expert", label: "Tradebox → Expert" },
  { key: "ra-subscriber", label: "RA → Subscriber" },
  { key: "broker-customer", label: "Broker → Customer" },
];

const TYPE_META: Record<string, { label: string; color: string }> = {
  admin:                 { label: "Admin",              color: "bg-indigo-100 text-indigo-700" },
  service:               { label: "Service",            color: "bg-blue-100 text-blue-700" },
  contact:               { label: "Contact",            color: "bg-amber-100 text-amber-700" },
  event:                 { label: "Event",              color: "bg-emerald-100 text-emerald-700" },
  "Post Like":           { label: "Post Like",          color: "bg-pink-100 text-pink-700" },
  "TradyCoin Credit":    { label: "TradyCoin",          color: "bg-yellow-100 text-yellow-700" },
  membership:            { label: "Membership",         color: "bg-violet-100 text-violet-700" },
  "payment-verification":{ label: "Payment Verify",    color: "bg-orange-100 text-orange-700" },
  "payment-verified":    { label: "Payment Verified",   color: "bg-green-100 text-green-700" },
  wallet:                { label: "Wallet",              color: "bg-cyan-100 text-cyan-700" },
  birthday:              { label: "Birthday",            color: "bg-rose-100 text-rose-700" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
}

async function deleteNotification(id: string, token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/deletenotification`,
    {
      method: "POST",
      body: JSON.stringify({ id }),
      headers: { "Content-type": "application/json", Authorization: `Bearer ${token}` },
    }
  );
  const json = await res.json();
  return json.success === true;
}

function KPICard({
  label, value, sub, icon: Icon, bg, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; bg: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-indigo-600 font-bold">{payload[0].value} notifications</p>
    </div>
  );
};

export default function AllNotificationsPage() {
  const session = useSession();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [flowFilter, setFlowFilter] = useState<FlowKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Notify composer state. `audience` is the toolbar choice; `apiAudience`
  // and `recipientIds` get derived from it at send time.
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerAudience, setComposerAudience] = useState<ComposerAudience>("all");
  const [composerMessage, setComposerMessage] = useState("");
  const [composerPostLink, setComposerPostLink] = useState("");
  const [composerSending, setComposerSending] = useState(false);
  // Picker state for "specific RA" / "specific customer"
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerOptions, setPickerOptions] = useState<PickerOption[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickedRecipient, setPickedRecipient] = useState<PickerOption | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.data?.backendToken}`,
  };

  const { data, mutate, isLoading } = useSWR<{ notifications: NotificationData[] }>(
    session.status === "authenticated"
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/allnotifications`
      : null,
    (url: string) => fetcher(url, { headers })
  );

  // Stabilise the reference so downstream useMemo deps don't re-run every render.
  const notifications = useMemo(() => data?.notifications ?? [], [data]);

  // ── Analytics ──
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    notifications.forEach((n) => {
      const t = n.type || "admin";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({
        name: TYPE_META[type]?.label ?? type,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [notifications]);

  const trendData = useMemo(() => {
    const counts: Record<string, number> = {};
    notifications.forEach((n) => {
      if (!n.createdAt) return;
      const key = new Date(n.createdAt).toLocaleDateString("en-IN", {
        month: "short", year: "2-digit",
      });
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => {
        const parse = (s: string) => {
          const [m, y] = s.split(" ");
          return new Date(`${m} 20${y}`).getTime();
        };
        return parse(a.month) - parse(b.month);
      })
      .slice(-12);
  }, [notifications]);

  const uniqueSenders = useMemo(
    () => new Set(notifications.map((n) => n.sentBy?.name)).size,
    [notifications]
  );
  const broadcastCount = useMemo(
    () => notifications.filter((n) => !n.sendTo?.length || n.sendTo.length > 1).length,
    [notifications]
  );

  // ── Types for filter chips ──
  const allTypes = useMemo(() => {
    const types = new Set(notifications.map((n) => n.type || "admin"));
    return ["All", ...Array.from(types).sort()];
  }, [notifications]);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const flowPredicate = FLOW_PREDICATES[flowFilter];
    return notifications.filter((n) => {
      const matchSearch =
        n.message?.toLowerCase().includes(q) ||
        n.sentBy?.name?.toLowerCase().includes(q) ||
        n.sendTo?.some((r) => r.name?.toLowerCase().includes(q));
      const matchType =
        typeFilter === "All" || (n.type || "admin") === typeFilter;
      return matchSearch && matchType && flowPredicate(n);
    });
  }, [notifications, search, typeFilter, flowFilter]);

  // Lazy-load the picker list when the user switches to a "specific" audience.
  // Cached per audience switch (cleared when audience changes back to a
  // broadcast mode) — for org sizes we have today, a single fetch is fine.
  useEffect(() => {
    const isSpecific =
      composerAudience === "specific-provider" ||
      composerAudience === "specific-customer";
    if (!isSpecific || !composerOpen) return;

    const token =
      session.data?.user?.backendToken || (session.data as any)?.backendToken;
    if (!token) return;

    // `/api/admin/serviceproviders` requires ?verified=true|false and
    // returns the list under `serviceProviders`; the customers endpoint
    // returns under `data`. Both differences are normalised here.
    const url =
      composerAudience === "specific-provider"
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/serviceproviders?verified=true`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/customerstable`;

    setPickerLoading(true);
    setPickerOptions([]);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => {
        const rows: any[] =
          composerAudience === "specific-provider"
            ? json?.serviceProviders || []
            : json?.data || [];
        const options: PickerOption[] = rows.map((r) =>
          composerAudience === "specific-provider"
            ? {
                id: String(r._id),
                name: r.RegName || r.companyName || r.name || "Unnamed",
                email: r.email,
              }
            : {
                id: String(r._id),
                name: r.name || "Unnamed",
                email: r.email,
              }
        );
        setPickerOptions(options);
      })
      .catch(() => setPickerOptions([]))
      .finally(() => setPickerLoading(false));
  }, [composerAudience, composerOpen, session.data]);

  // Reset picker selection when switching modes so a stale RA pick can't
  // accidentally ride along to a "customers" send.
  useEffect(() => {
    setPickedRecipient(null);
    setPickerSearch("");
  }, [composerAudience]);

  const filteredPickerOptions = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return pickerOptions.slice(0, 50);
    return pickerOptions
      .filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.email ?? "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [pickerOptions, pickerSearch]);

  // ── Broadcast handler ──
  async function handleBroadcast() {
    if (!composerMessage.trim()) {
      toast({ title: "Message required", description: "Please enter a message before sending.", variant: "destructive" });
      return;
    }

    // Map composer audience → API audience + recipientIds.
    let apiAudience: "all" | "providers" | "customers";
    let recipientIds: string[] | undefined;
    if (composerAudience === "specific-provider") {
      if (!pickedRecipient) {
        toast({ title: "Pick a recipient", description: "Select a specific RA to send to.", variant: "destructive" });
        return;
      }
      apiAudience = "providers";
      recipientIds = [pickedRecipient.id];
    } else if (composerAudience === "specific-customer") {
      if (!pickedRecipient) {
        toast({ title: "Pick a recipient", description: "Select a specific customer to send to.", variant: "destructive" });
        return;
      }
      apiAudience = "customers";
      recipientIds = [pickedRecipient.id];
    } else {
      apiAudience = composerAudience;
    }

    const token =
      session.data?.user?.backendToken || (session.data as any)?.backendToken;
    setComposerSending(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/notify-broadcast`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            audience: apiAudience,
            recipientIds,
            message: composerMessage.trim(),
            postLink: composerPostLink.trim() || undefined,
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        toast({
          title: "Failed",
          description: json?.message ?? "Could not send notification.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Sent",
        description: `Delivered to ${json.recipientCount.toLocaleString()} recipient(s).`,
      });
      // Reset and close
      setComposerMessage("");
      setComposerPostLink("");
      setComposerAudience("all");
      setPickedRecipient(null);
      setPickerSearch("");
      setComposerOpen(false);
      mutate();
    } catch {
      toast({ title: "Error", description: "Network error while sending.", variant: "destructive" });
    } finally {
      setComposerSending(false);
    }
  }

  // ── Delete handler ──
  async function handleDelete(id: string) {
    const token = session.data?.user?.backendToken || (session.data as any)?.backendToken;
    const ok = await deleteNotification(id, token);
    if (ok) {
      toast({ title: "Deleted", description: "Notification removed." });
      mutate();
    } else {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  }

  if (isLoading || session.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading notifications…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pb-6">
      <Toaster />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" />
            All Notifications
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform-wide notification history</p>
        </div>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
        >
          <Megaphone className="w-4 h-4" />
          Notify
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Sent"
          value={notifications.length.toLocaleString()}
          icon={Bell}
          bg="bg-indigo-50" color="text-indigo-600"
        />
        <KPICard
          label="Unique Senders"
          value={uniqueSenders}
          sub="admins & providers"
          icon={Send}
          bg="bg-amber-50" color="text-amber-600"
        />
        <KPICard
          label="Broadcast"
          value={broadcastCount}
          sub="multi-recipient"
          icon={Users}
          bg="bg-emerald-50" color="text-emerald-600"
        />
        <KPICard
          label="Types"
          value={allTypes.length - 1}
          sub="distinct categories"
          icon={Tag}
          bg="bg-violet-50" color="text-violet-600"
        />
      </div>

      {/* ── Notification Taxonomy (reference) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {NOTIFICATION_TAXONOMY.map((group) => (
          <div
            key={group.title}
            className="bg-white rounded-2xl border border-gray-200 p-5"
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${group.bg}`}
              >
                <group.icon className={`w-5 h-5 ${group.color}`} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 leading-tight">
                  {group.title}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {group.subtitle}
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="text-xs text-gray-600 flex items-start gap-2"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${group.dot}`}
                  />
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      {notifications.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Notification Trend</h3>
            <p className="text-xs text-gray-400 mb-4">Monthly volume (last 12 months)</p>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="notiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip content={<BarTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2}
                  fill="url(#notiGrad)" dot={{ r: 3, fill: "#6366f1" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* By Type */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">By Type</h3>
            <p className="text-xs text-gray-400 mb-4">Breakdown by category</p>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={typeBreakdown} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Notification List ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">History</h3>
              <p className="text-xs text-gray-400">{filtered.length} of {notifications.length} notification{notifications.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search message, sender or recipient…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>
          {/* Flow filter chips — sender → recipient */}
          <div className="flex flex-wrap gap-2">
            {FLOW_CHIPS.map((c) => {
              const count =
                c.key === "all"
                  ? notifications.length
                  : notifications.filter(FLOW_PREDICATES[c.key]).length;
              return (
                <button
                  key={c.key}
                  onClick={() => setFlowFilter(c.key)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all inline-flex items-center gap-1.5 ${
                    flowFilter === c.key
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
                  }`}
                >
                  <span>{c.label}</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[1.5rem] px-1 rounded-full text-[10px] font-semibold ${
                      flowFilter === c.key
                        ? "bg-emerald-700/40 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Type filter chips */}
          <div className="flex flex-wrap gap-2">
            {allTypes.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                  typeFilter === t
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700"
                }`}
              >
                {t === "All" ? "All" : (TYPE_META[t]?.label ?? t)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Bell className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">No notifications found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((n) => {
              const typeMeta = TYPE_META[n.type ?? "admin"] ?? { label: n.type ?? "Admin", color: "bg-gray-100 text-gray-600" };
              const isExpanded = expandedId === n._id;
              const recipientNames = n.sendTo?.map((r) => r.name).filter(Boolean) ?? [];

              return (
                <div key={n._id} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bell className="w-4 h-4 text-indigo-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: type badge + date + delete */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeMeta.color}`}>
                            {typeMeta.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(n.createdAt)} · {formatTime(n.createdAt)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(n._id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Message */}
                      <p
                        className={`text-sm text-gray-700 leading-relaxed cursor-pointer ${!isExpanded ? "line-clamp-2" : ""}`}
                        onClick={() => setExpandedId(isExpanded ? null : n._id)}
                      >
                        {n.message}
                      </p>
                      {n.message.length > 120 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : n._id)}
                          className="text-xs text-indigo-500 hover:text-indigo-700 mt-0.5"
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      )}

                      {/* Meta row: Sent By + Sent To */}
                      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
                        {/* Sent By */}
                        <div className="flex items-center gap-1.5">
                          <Send className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500">
                            <span className="text-gray-400">From:</span>{" "}
                            <span className="font-medium text-gray-700">{n.sentBy?.name || "—"}</span>
                          </span>
                        </div>

                        {/* Sent To */}
                        {recipientNames.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500">
                              <span className="text-gray-400">To:</span>{" "}
                              {recipientNames.length <= 3 ? (
                                <span className="font-medium text-gray-700">{recipientNames.join(", ")}</span>
                              ) : (
                                <span className="font-medium text-gray-700">
                                  {recipientNames.slice(0, 2).join(", ")}
                                  <span className="text-gray-400"> +{recipientNames.length - 2} more</span>
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {/* Post link */}
                        {n.postLink && (
                          <a
                            href={n.postLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Post
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Notify Composer Modal ── */}
      {composerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => !composerSending && setComposerOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Send Notification</h2>
                  <p className="text-xs text-gray-400">
                    Broadcast to all RAs, all customers, or everyone
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                disabled={composerSending}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audience */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Audience
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "all", label: "Everyone" },
                  { key: "providers", label: "All RAs" },
                  { key: "customers", label: "All Customers" },
                  { key: "specific-provider", label: "Specific RA" },
                  { key: "specific-customer", label: "Specific Customer" },
                ] as { key: ComposerAudience; label: string }[]).map((opt) => {
                  const active = composerAudience === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setComposerAudience(opt.key)}
                      className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                        active
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient picker (only for specific-* modes) */}
            {(composerAudience === "specific-provider" ||
              composerAudience === "specific-customer") && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Recipient
                </label>
                {pickedRecipient ? (
                  <div className="flex items-center justify-between gap-3 px-3 py-2 border border-indigo-200 bg-indigo-50 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-indigo-800 truncate">
                        {pickedRecipient.name}
                      </p>
                      {pickedRecipient.email && (
                        <p className="text-xs text-indigo-600/70 truncate">
                          {pickedRecipient.email}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickedRecipient(null)}
                      className="text-xs text-indigo-700 hover:underline whitespace-nowrap"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder={
                          composerAudience === "specific-provider"
                            ? "Search RAs by name or email…"
                            : "Search customers by name or email…"
                        }
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                      {pickerLoading ? (
                        <div className="px-3 py-4 text-xs text-gray-400 text-center">
                          Loading…
                        </div>
                      ) : filteredPickerOptions.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-gray-400 text-center">
                          No matches
                        </div>
                      ) : (
                        filteredPickerOptions.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setPickedRecipient(o)}
                            className="w-full text-left px-3 py-2 hover:bg-indigo-50/60 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {o.name}
                            </p>
                            {o.email && (
                              <p className="text-xs text-gray-400 truncate">
                                {o.email}
                              </p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Message */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Message
              </label>
              <textarea
                value={composerMessage}
                onChange={(e) => setComposerMessage(e.target.value)}
                placeholder="What do you want to tell them?"
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
              />
            </div>

            {/* Optional link */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Link (optional)
              </label>
              <input
                type="url"
                value={composerPostLink}
                onChange={(e) => setComposerPostLink(e.target.value)}
                placeholder="https://…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                disabled={composerSending}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBroadcast}
                disabled={composerSending || !composerMessage.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
                {composerSending ? "Sending…" : "Send Notification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
