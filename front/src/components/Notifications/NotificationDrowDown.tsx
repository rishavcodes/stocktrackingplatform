"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Notification,
  TYPE_CONFIG,
  DEFAULT_TYPE,
  resolveLink,
  resolveSourceLabel,
} from "@/components/Notifications/typeConfig";
import { getNotificationSocket } from "@/lib/notificationSocket";
import {
  FILTER_CATEGORIES,
  notificationMatchesFilter,
} from "@/components/Notifications/filterCategories";

function timeAgo(date?: string) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

// Bucket a notification by its createdAt date — returns both a stable key
// (YYYY-MM-DD) for grouping and a human-readable label ("Today", "Yesterday",
// or "06 Jun 2026") for the section heading.
function dateBucket(date?: string): { key: string; label: string } {
  if (!date) return { key: "unknown", label: "Earlier" };
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return { key: "unknown", label: "Earlier" };

  const startOfDay = (x: Date) => {
    const c = new Date(x);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const today = startOfDay(new Date());
  const that = startOfDay(d);
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86_400_000);

  const yyyy = that.getFullYear();
  const mm = String(that.getMonth() + 1).padStart(2, "0");
  const dd = String(that.getDate()).padStart(2, "0");
  const key = `${yyyy}-${mm}-${dd}`;

  let label: string;
  if (diffDays === 0) label = "Today";
  else if (diffDays === 1) label = "Yesterday";
  else if (diffDays < 7)
    label = d.toLocaleDateString("en-IN", { weekday: "long" });
  else
    label = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return { key, label };
}

export default function NotificationDropdown() {
  const { data: session } = useSession();
  const router = useRouter();
  const id = session?.user?.id;
  const role = session?.user?.role;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Active filter chip — "all" (default) or one of FILTER_CATEGORIES[].key.
  const [filterKey, setFilterKey] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spProfiles, setSpProfiles] = useState<Record<string, { profileUrl?: string }>>({});

  useEffect(() => {
    if (!id || !role) return;

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allnotifications?id=${id}&role=${role}`
        );
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications);
        } else {
          setError("Failed to fetch notifications");
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching notifications");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [id, role]);

  // Real-time push: prepend new notifications as they arrive on the
  // /notifications socket namespace. Polling-on-mount above remains the
  // fallback if the socket fails to connect.
  useEffect(() => {
    if (!id) return;
    const socket = getNotificationSocket(id);
    const onNew = (doc: Notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === doc._id)) return prev;
        return [doc, ...prev];
      });
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [id]);

  // Fetch SP profile pictures for unique senders
  useEffect(() => {
    const uniqueSenderIds = Array.from(
      new Set(notifications.map((n) => n.sentBy?.id).filter(Boolean) as string[])
    );
    if (uniqueSenderIds.length === 0) return;

    const fetchAll = async () => {
      const results: Record<string, { profileUrl?: string }> = {};
      await Promise.all(
        uniqueSenderIds.map(async (senderId) => {
          if (
            senderId === "admin" ||
            senderId === "system" ||
            senderId === "bigul" ||
            senderId === "aliceblue"
          )
            return;
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${senderId}`
            );
            const json = await res.json();
            if (json.success && json.data) {
              results[senderId] = { profileUrl: json.data.profileUrl };
            }
          } catch {
            // ignore
          }
        })
      );
      setSpProfiles((prev) => ({ ...prev, ...results }));
    };

    fetchAll();
  }, [notifications]);

  const goToNotification = (notification: Notification) => {
    const config = TYPE_CONFIG[notification.type || ""] || DEFAULT_TYPE;
    const link = resolveLink(notification, config);
    router.push(link);
  };

  const [bulkBusy, setBulkBusy] = useState(false);

  // Lightbox state — opens when the user taps the thumbnail on an image
  // notification.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const markAllRead = async () => {
    if (!id || !role || bulkBusy) return;
    if (notifications.every((n) => n.readBy?.some((r) => r.id === id))) return;

    setBulkBusy(true);
    // Optimistic — flip every row to read locally first so the UI feels instant.
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.readBy?.some((r) => r.id === id)) return n;
        return { ...n, readBy: [...(n.readBy ?? []), { id, readAt: nowIso }] };
      }),
    );

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/readnotifications/all`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, role }),
        },
      );
    } catch (err) {
      console.error("mark all read failed", err);
    } finally {
      setBulkBusy(false);
    }
  };

  // "Clear all" on the bell is a LOCAL clear — empties the dropdown's
  // in-memory list so the popup looks fresh, but the notifications stay on
  // the server.
  const clearAll = () => {
    if (bulkBusy || notifications.length === 0) return;
    setNotifications([]);
  };

  const markAsRead = async (
    e: React.MouseEvent | React.KeyboardEvent,
    notification: Notification,
  ) => {
    e.stopPropagation();
    if (!id) return;
    if (notification.readBy?.some((r) => r.id === id)) return;

    // Optimistic update so the row dims immediately and the badge can refresh.
    setNotifications((prev) =>
      prev.map((n) =>
        n._id === notification._id
          ? {
              ...n,
              readBy: [...(n.readBy ?? []), { id, readAt: new Date().toISOString() }],
            }
          : n,
      ),
    );

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/readnotifications/single`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notification._id, userId: id }),
        },
      );
      window.dispatchEvent(new Event("notifications:unread-changed"));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  return (
    <motion.div
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.1, duration: 0.2, ease: [0.12, 0, 0.39, 0] }}
      className="fixed sm:absolute top-[60px] sm:top-[30px] left-2 right-2 sm:left-auto sm:right-[30px] mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 w-auto sm:w-[350px] sm:max-w-[80vw] overflow-hidden"
      style={{ transformOrigin: "top right" }}
    >
      {/* Header — title + count on the left, all bulk actions
          (Mark all read · Clear all · View all) on the right in one row. */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            Notifications
          </h3>
          {/* Unread count — only the notifications the current user hasn't
              marked read. Caps the visible badge at 99+ so a backlog doesn't
              blow out the header layout. Hidden when there's nothing unread. */}
          {(() => {
            const unreadCount = id
              ? notifications.filter(
                  (n) => !n.readBy?.some((r) => r.id === id),
                ).length
              : 0;
            if (unreadCount === 0) return null;
            return (
              <span className="text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full flex-shrink-0">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={markAllRead}
            disabled={bulkBusy}
            className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Category filter — single dropdown so the 380px dropdown doesn't have
          to hide a horizontal scroll strip. Hidden when there are no
          notifications to filter. */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <label className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 shrink-0">
              Filter
            </span>
            <div className="relative flex-1">
              <select
                value={filterKey}
                onChange={(e) => setFilterKey(e.target.value)}
                className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-800 dark:text-gray-100 font-medium hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer"
              >
                {[{ key: "all", label: "All categories" }, ...FILTER_CATEGORIES].map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </label>
        </div>
      )}

      {/* Body */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading && (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-2 text-xs text-gray-500">Loading...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-sm text-red-500 text-center">{error}</div>
        )}

        {!loading && notifications.length === 0 && !error && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">You are all caught up</p>
          </div>
        )}

        {/* Filter mismatch — nothing matches the chosen category but there
            are notifications. Don't render the "all caught up" copy because
            it's wrong here. */}
        {!loading &&
          notifications.length > 0 &&
          notifications.filter((n) => notificationMatchesFilter(n, filterKey))
            .length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nothing in this category
              </p>
              <button
                type="button"
                onClick={() => setFilterKey("all")}
                className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Show all
              </button>
            </div>
          )}

        {(() => {
          // Group the visible notifications by their local-day bucket so we
          // can render a small "Today / Yesterday / …" heading above each
          // group. The list is already sorted newest-first by the API.
          const visible = notifications
            .filter((n) => notificationMatchesFilter(n, filterKey))
            .slice(0, 10);

          const groups = new Map<
            string,
            { label: string; items: typeof visible }
          >();
          for (const n of visible) {
            const { key, label } = dateBucket(n.createdAt);
            const g = groups.get(key);
            if (g) g.items.push(n);
            else groups.set(key, { label, items: [n] });
          }

          const rows: React.ReactNode[] = [];
          for (const [groupKey, group] of Array.from(groups.entries())) {
            rows.push(
              <div
                key={`hdr-${groupKey}`}
                className="px-4 py-1.5 sticky top-0 bg-gray-50/95 dark:bg-gray-800/90 backdrop-blur text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800"
              >
                {group.label}
              </div>,
            );
            for (const notification of group.items) {
              const config = TYPE_CONFIG[notification.type || ""] || DEFAULT_TYPE;
              const senderId = notification.sentBy?.id;
              const rawSourceLabel = resolveSourceLabel(notification);
              // Self-notification: render "You" instead of own name.
              const isSelf = !!id && !!senderId && String(senderId) === String(id);
              const sourceLabel = isSelf ? "You" : rawSourceLabel;
              const profileUrl = senderId ? spProfiles[senderId]?.profileUrl : undefined;
              const isRead = id
                ? notification.readBy?.some((r: { id: string }) => r.id === id) ?? false
                : false;

              // Strip any leading sender-name prefix from the body. The avatar
              // already conveys who sent it. Two-pass: exact name first, then
              // generic "Anything: " up to 60 chars (skipping trade-detail
              // labels and digit-containing prefixes).
              const senderName = (notification.sentBy?.name || "").trim();
              const cleanedMessage = (() => {
                // Collapse the blank lines the Telegram-formatted messages ship
                // with (e.g. "📉 Trade Exited␊␊PAYTM-EQ…"). The dropdown clamps
                // to 2 lines, so an empty line right after the title eats line 2
                // and the real detail (script / rate) gets clamped off, leaving
                // a bare "…". New-recommendation messages have no blank line so
                // they already preview correctly. Mirrors the notifications page.
                let raw = (notification.message || "")
                  .replace(/\n[ \t]*\n+/g, "\n")
                  .trim();
                if (senderName) {
                  const escaped = senderName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  const exact = new RegExp(`^${escaped}\\s*[:\\-–—]\\s*`, "i");
                  raw = raw.replace(exact, "");
                }
                const m = raw.match(/^([^:\n]{1,60})\s*[:\-–—]\s+/);
                if (m) {
                  const prefix = m[1].trim();
                  const looksLikeLabel = /\b(entry|target|sl|stoploss|stop loss|cmp|ltp|qty|quantity|price|note|notes|pnl|p\s*&\s*l)\b/i.test(prefix);
                  const looksNumeric = /\d/.test(prefix);
                  if (!looksLikeLabel && !looksNumeric) {
                    raw = raw.slice(m[0].length);
                  }
                }
                return raw.trim();
              })();

              // Split the cleaned message into a bold title (first line) + a
              // muted body (the rest), matching the reference card layout.
              const Icon = config.icon;
              const msgLines = cleanedMessage
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);
              const title = msgLines[0] || config.label;
              const body = msgLines.slice(1).join(" ");

              rows.push(
                <div
                  key={notification._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => goToNotification(notification)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToNotification(notification);
                    }
                  }}
                  className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors group ${
                    isRead ? "opacity-70" : "bg-indigo-50/30 dark:bg-indigo-900/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Sender avatar, or a colored type-icon tile when there's
                        no profile picture (system / admin notifications). */}
                    {profileUrl ? (
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarImage src={profileUrl} alt={sourceLabel} />
                        <AvatarFallback className={`${config.bg} ${config.color} text-xs font-semibold`}>
                          {sourceLabel.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 ${config.bg} ${config.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                    )}

                    {/* Content — bold title (first line) + muted body + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!isRead && (
                          <span
                            className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
                            aria-label="Unread"
                          />
                        )}
                        <p
                          className={`flex-1 min-w-0 truncate text-sm ${
                            isRead
                              ? "font-medium text-gray-700 dark:text-gray-300"
                              : "font-semibold text-gray-900 dark:text-white"
                          }`}
                        >
                          {title}
                        </p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {timeAgo(notification.createdAt)}
                        </span>
                      </div>

                      {body && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-2 whitespace-pre-line">
                          {body}
                        </p>
                      )}

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 truncate">
                          {sourceLabel}
                        </span>
                        {!isRead && (
                          <button
                            type="button"
                            onClick={(e) => markAsRead(e, notification)}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
                          >
                            <Check className="w-3 h-3" /> Mark read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Image thumbnail — opens the lightbox; stopPropagation
                        keeps the row's navigate-on-click from firing. */}
                    {notification.image && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLightboxUrl(notification.image!);
                        }}
                        className="group/img relative flex-shrink-0"
                        aria-label="View attached image"
                      >
                        <img
                          src={notification.image}
                          alt="attachment"
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700 group-hover/img:opacity-90 transition"
                        />
                      </button>
                    )}
                  </div>
                </div>,
              );
            }
          }
          return rows;
        })()}
      </div>

      {/* Lightbox is rendered through a portal to document.body so its
          fixed-position centering uses the viewport — not the dropdown's
          transformed parent (framer-motion's scaleY otherwise becomes the
          containing block and the lightbox would float at the top). */}
      {lightboxUrl && typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxUrl(null);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxUrl(null);
              }}
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
          </div>,
          document.body,
        )}
    </motion.div>
  );
}
