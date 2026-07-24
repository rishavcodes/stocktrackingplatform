"use client";

import { useMemo, useEffect, useState } from "react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  TrendingUp,
  FileText,
  Calendar,
  CreditCard,
  Heart,
  Coins,
  Shield,
  Mail,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FILTER_CATEGORIES,
  notificationMatchesFilter,
} from "@/components/Notifications/filterCategories";

type Notification = {
  _id: string;
  message: string;
  type?: string;
  postLink?: string;
  ctaLabel?: string;
  createdAt?: string;
  sentBy?: { id: string; name: string };
  // Optional image attachment (Quick Message broadcasts). Click to expand
  // via the lightbox below.
  image?: string;
};

type TypeConfig = {
  icon: any;
  color: string;
  bg: string;
  label: string;
  defaultPath: string | undefined;
  ctaLabel?: string;
};

// Map notification type → icon, color, label
const TYPE_CONFIG: Record<string, TypeConfig> = {
  service: {
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    label: "Service",
    defaultPath: "/dashboard/user/subscribedservices",
  },
  contact: {
    icon: Mail,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    label: "Contact",
    defaultPath: undefined,
  },
  event: {
    icon: Calendar,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    label: "Event",
    defaultPath: "/dashboard/user/events",
  },
  admin: {
    icon: Shield,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    label: "Admin",
    defaultPath: undefined,
  },
  "Post Like": {
    icon: Heart,
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-900/20",
    label: "Like",
    defaultPath: undefined,
  },
  "TradyCoin Credit": {
    icon: Coins,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    label: "TradyCoin",
    defaultPath: undefined,
  },
  membership: {
    icon: Shield,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    label: "Membership",
    defaultPath: "/dashboard/user/billing",
  },
  "payment-verification": {
    icon: CreditCard,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    label: "Payment",
    defaultPath: "/dashboard/user/billing",
  },
  "payment-verified": {
    icon: CheckCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    label: "Payment Verified",
    defaultPath: "/dashboard/user/billing",
  },
};

const DEFAULT_TYPE: TypeConfig = {
  icon: FileText,
  color: "text-slate-600 dark:text-slate-400",
  bg: "bg-slate-100 dark:bg-slate-800",
  label: "Notification",
  defaultPath: undefined,
};

/**
 * Resolve the redirect URL for a notification.
 * Priority:
 *   1. notification.postLink (if it looks like a real URL/path)
 *   2. type-specific default path
 *   3. The sender's RA profile page (if we have a senderId)
 *   4. Notifications page itself
 */
function resolveLink(notification: Notification, config: TypeConfig): string {
  const link = notification.postLink?.trim();
  if (link && (link.startsWith("/") || link.startsWith("http"))) {
    return link;
  }
  if (config.defaultPath) {
    return config.defaultPath;
  }
  const senderId = notification.sentBy?.id;
  if (senderId && senderId !== "admin" && senderId !== "system") {
    return `/dashboard/user/experts/${senderId}`;
  }
  return "/dashboard/notifications";
}

function timeAgo(date?: string) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Absolute timestamp (e.g. "9 Jun 26, 3:42 PM") — rendered alongside the
// relative "5m ago" so the user can see exactly when something landed
// without having to hover for a tooltip.
function formatDateTime(date?: string) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = d.toLocaleString("en-IN", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} ${month} ${year}, ${time}`;
}

export default function NotificationPage() {
  const session = useSession();
  const router = useRouter();
  const [spProfiles, setSpProfiles] = useState<Record<string, { profileUrl?: string; RegName?: string }>>({});

  const userId = session.data?.user._id || session.data?.user.id;
  const role = session.data?.user.role;

  const { data, isLoading, mutate } = useSWR<{
    notifications: Notification[];
  }>(
    userId
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allnotifications?id=${userId}&role=${role}`
      : null,
    fetcher
  );

  const notifications = useMemo(() => data?.notifications ?? [], [data]);
  // Active filter chip — "all" or one of FILTER_CATEGORIES[].key.
  const [filterKey, setFilterKey] = useState<string>("all");
  const filteredNotifications = useMemo(
    () =>
      notifications.filter((n: { type?: string }) =>
        notificationMatchesFilter(n, filterKey),
      ),
    [notifications, filterKey],
  );

  // Fetch SP profiles for the unique senders
  useEffect(() => {
    const uniqueSenderIds = Array.from(
      new Set(notifications.map((n) => n.sentBy?.id).filter(Boolean) as string[])
    );
    if (uniqueSenderIds.length === 0) return;

    const fetchAll = async () => {
      const results: Record<string, { profileUrl?: string; RegName?: string }> = {};
      await Promise.all(
        uniqueSenderIds.map(async (id) => {
          if (id === "admin" || id === "system") return;
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${id}`
            );
            const json = await res.json();
            if (json.success && json.data) {
              results[id] = {
                profileUrl: json.data.profileUrl,
                RegName: json.data.RegName,
              };
            }
          } catch {
            // ignore failures
          }
        })
      );
      setSpProfiles((prev) => ({ ...prev, ...results }));
    };

    fetchAll();
  }, [notifications]);

  const [bulkBusy, setBulkBusy] = useState(false);

  // Lightbox state for image attachments — clicking the bigger image in a
  // notification row opens the full-size view via this URL.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  async function handleMarkAllAsRead() {
    if (!userId || !role || bulkBusy) return;
    setBulkBusy(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/readnotifications/all`,
        {
          method: "POST",
          body: JSON.stringify({ id: userId, role }),
          headers: { "Content-type": "application/json" },
        }
      );

      if (response.status === 200) {
        // Update local cache: keep the notifications but flag each one as read
        // by this user. Old code wiped the list, which made "Mark all as read"
        // look like "Hide all" — confusing because the docs still exist.
        const nowIso = new Date().toISOString();
        mutate(
          (prev) =>
            prev
              ? {
                  ...prev,
                  notifications: prev.notifications.map((n) => ({
                    ...n,
                    readBy: [
                      ...((n as Notification & { readBy?: { id: string; readAt?: string }[] }).readBy ?? []),
                      { id: String(userId), readAt: nowIso },
                    ],
                  })),
                }
              : prev,
          false
        );
      }
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleClearAll() {
    if (!userId || !role || bulkBusy || notifications.length === 0) return;
    if (!window.confirm("Clear all notifications? This cannot be undone.")) return;

    setBulkBusy(true);
    const ids = notifications.map((n) => n._id);
    // Optimistic — wipe locally first so the page feels instant. Roll back on error.
    const prevSnapshot = notifications;
    mutate({ notifications: [] }, false);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/deletenotifications`,
        {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({ id: userId, role, notificationIds: ids }),
        }
      );
      if (!res.ok) throw new Error("delete failed");
    } catch (err) {
      console.error("clear all failed", err);
      mutate({ notifications: prevSnapshot }, false);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-blackShade py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header — stacks on mobile, single row on sm+ */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
            {/* Cool circular back button — soft glow + slide-on-hover arrow */}
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="group relative shrink-0 mt-0.5 sm:mt-1 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 flex items-center justify-center overflow-hidden"
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:-translate-x-0.5 transition-all relative" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                  Notifications
                </h1>
                {notifications.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.5rem] sm:min-w-[1.75rem] h-6 sm:h-7 px-1.5 sm:px-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] sm:text-xs font-bold shadow-sm">
                    {notifications.length}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                Stay updated with the latest from your subscribed services
              </p>
            </div>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
              <button
                onClick={handleMarkAllAsRead}
                disabled={bulkBusy}
                aria-label="Mark all as read"
                className="inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">Mark all as read</span>
                <span className="xs:hidden sm:hidden">Read all</span>
              </button>
              <button
                onClick={handleClearAll}
                disabled={bulkBusy}
                aria-label="Clear all"
                className="inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/40 rounded-lg text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Category filter chips — horizontal scroll on mobile to keep the
            chips in one row, wrap freely from sm+. Hidden when nothing to
            filter (loading or empty list). */}
        {!isLoading && notifications.length > 0 && (
          <div className="mb-4 -mx-3 sm:mx-0 px-3 sm:px-0 flex sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible scrollbar-hide">
            {[{ key: "all", label: "All" }, ...FILTER_CATEGORIES].map((cat) => {
              const active = filterKey === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setFilterKey(cat.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          /* Empty state */
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 sm:p-12 text-center shadow-sm">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Bell className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
              No notifications yet
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              When your service providers post updates, recommendations, or articles, they will appear here.
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Filter matched nothing — there ARE notifications, just not in
              the chosen category. */
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 sm:p-10 text-center shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Nothing in this category
            </h3>
            <button
              type="button"
              onClick={() => setFilterKey("all")}
              className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Show all notifications
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const config = TYPE_CONFIG[notification.type || ""] || DEFAULT_TYPE;
              const Icon = config.icon;
              const senderId = notification.sentBy?.id;
              const rawSenderName = notification.sentBy?.name || "System";
              // Self-notification → render as "You" instead of the user's
              // own name (e.g. RA who posted the rec or had a trade exit).
              const isSelf =
                !!userId &&
                !!senderId &&
                String(senderId) === String(userId);
              const senderName = isSelf ? "You" : rawSenderName;
              const spProfile = senderId ? spProfiles[senderId] : null;
              const profileUrl = spProfile?.profileUrl;
              const link = resolveLink(notification, config);

              return (
                <a
                  key={notification._id}
                  href={link}
                  onClick={(e) => {
                    e.preventDefault();
                    console.log("[Notification] Clicked, navigating to:", link);
                    router.push(link);
                  }}
                  className="block group cursor-pointer no-underline text-inherit"
                  style={{ userSelect: "none", WebkitUserSelect: "none" }}
                >
                  <div
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                    style={{ userSelect: "none", WebkitUserSelect: "none" }}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      {/* Avatar — slightly smaller on mobile to give the
                          message text more breathing room. */}
                      <Avatar className="w-9 h-9 sm:w-11 sm:h-11 flex-shrink-0">
                        {profileUrl ? <AvatarImage src={profileUrl} alt={senderName} /> : null}
                        <AvatarFallback className={`${config.bg} ${config.color} text-xs sm:text-sm font-semibold`}>
                          {senderName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content (left) — message + CTA. Image sits on the
                          right side as a bigger thumbnail. */}
                      <div className="flex-1 min-w-0">
                        {/* Top row: name + type badge + time. On mobile, time
                            drops to its own row below to avoid name/badge
                            getting squeezed. */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-full">
                              {senderName}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color} flex-shrink-0`}
                            >
                              <Icon className="w-2.5 h-2.5" />
                              {config.label}
                            </span>
                          </div>
                          {/* Time block — single line so the right column
                              stays the same height as the sender name on
                              the left, no vertical gap. */}
                          <span className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                            {timeAgo(notification.createdAt)}
                            {formatDateTime(notification.createdAt) && (
                              <>
                                <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                                {formatDateTime(notification.createdAt)}
                              </>
                            )}
                          </span>
                        </div>

                        {/* Image + message side-by-side. The image sits on
                            the left at its small thumbnail size and the
                            message text flows in the remaining column to its
                            right, the same way it would normally fill the
                            content area when no image is attached. */}
                        <div className="flex items-start gap-3">
                          {notification.image && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setLightboxUrl(notification.image!);
                              }}
                              className="flex-shrink-0 group/img relative"
                              aria-label="View attached image"
                            >
                              <img
                                src={notification.image}
                                alt="attachment"
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-gray-200 dark:border-gray-700 group-hover/img:opacity-90 transition"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl opacity-0 group-hover/img:opacity-100 transition text-white text-[10px] font-semibold">
                                View
                              </span>
                            </button>
                          )}

                          {/* Message — whitespace-pre-line preserves the
                              multi-line formatting that some notifications
                              ship. Trade-update messages from the backend
                              arrive with double blank lines between fields
                              which blew the row apart vertically; we collapse
                              any run of 2+ blank lines into a single break. */}
                          <p className="flex-1 min-w-0 text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                            {notification.message?.replace(/\n[ \t]*\n+/g, "\n").trim()}
                          </p>
                        </div>

                        {/* CTA — uses the notification's own ctaLabel if set,
                            otherwise the per-type default ("View Receipt",
                            "View Lead", etc.), and only falls back to
                            "View details" when both are empty. Pushed to the
                            right so the row reads message-left, CTA-right. */}
                        <div className="mt-2 flex items-center justify-end">
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline inline-flex items-center gap-1">
                            {notification.ctaLabel || config.ctaLabel || "View details"}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Full-size image lightbox — opens when an attached image is clicked.
          Click outside or the close button to dismiss. */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
            aria-label="Close image"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt="full size"
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
