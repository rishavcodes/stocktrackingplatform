"use client";

import { useMemo, useState, useEffect } from "react";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Bell, Trash2, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Notification,
  TYPE_CONFIG,
  DEFAULT_TYPE,
  resolveLink,
  resolveCtaLabel,
  resolveSourceLabel,
} from "@/components/Notifications/typeConfig";

// Filter pills shown on the page. Pills with zero matches are hidden at
// render time, so listing every known type here is fine.
const NOTIFICATION_TYPES: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "service", label: "Service" },
  { key: "recommendation-new", label: "Recommendations" },
  { key: "recommendation-closed", label: "Outcomes" },
  { key: "trade-placed", label: "Trades" },
  { key: "trade-rejected", label: "Trade Rejected" },
  { key: "broker-disconnected", label: "Broker" },
  { key: "event", label: "Events" },
  { key: "event-update", label: "Event Updates" },
  { key: "portfolio-update", label: "Portfolio" },
  { key: "content-added", label: "Content" },
  { key: "payment-verification", label: "Verification Pending" },
  { key: "payment-verified", label: "Payment Verified" },
  { key: "payment-rejected", label: "Payment Rejected" },
  { key: "renewal-success", label: "Renewal" },
  { key: "renewal-failed", label: "Renewal Failed" },
  { key: "kyc-approved", label: "KYC" },
  { key: "kyc-rejected", label: "KYC Rejected" },
  { key: "profile-incomplete", label: "Profile" },
  { key: "bank-missing", label: "Bank" },
  { key: "plan-expiring", label: "Expiring" },
  { key: "plan-expired", label: "Expired" },
  { key: "membership", label: "Membership" },
  { key: "announcement", label: "Announcement" },
  { key: "Post Like", label: "Post Like" },
  { key: "TradyCoin Credit", label: "TradyCoin" },
  { key: "contact", label: "Contact" },
  { key: "admin", label: "Admin" },
];

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

export default function UserNotificationsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [spProfiles, setSpProfiles] = useState<Record<string, { profileUrl?: string }>>({});

  const { data, isLoading, mutate } = useSWR<{ notifications: Notification[] }>(
    session?.user?.id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allnotifications?id=${session.user.id}&role=user`
      : null,
    fetcher
  );

  const notifications = useMemo(() => data?.notifications || [], [data]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return notifications;
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notifications.length };
    notifications.forEach((n) => {
      if (!n.type) return;
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  const visibleFilters = NOTIFICATION_TYPES.filter(
    (t) => t.key === "all" || (typeCounts[t.key] || 0) > 0
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((n) => selected.has(n._id));

  // Fetch SP profile pictures
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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((n) => next.delete(n._id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((n) => next.add(n._id));
        return next;
      });
    }
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/deletenotifications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: session?.user?.id,
            role: "user",
            notificationIds: Array.from(selected),
          }),
        }
      );
      if (res.ok) {
        toast({ title: `${selected.size} notification(s) deleted` });
        setSelected(new Set());
        mutate();
      } else {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  function handleNotificationClick(notification: Notification) {
    const config = TYPE_CONFIG[notification.type || ""] || DEFAULT_TYPE;
    const link = resolveLink(notification, config);
    router.push(link);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
            {notifications.length > 0 && (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-12">
            All notifications related to your purchases, services, and account activity
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {visibleFilters.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveFilter(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              activeFilter === t.key
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow"
                : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {t.label}
            {(typeCounts[t.key] || 0) > 0 && (
              <span className="ml-1.5 text-xs opacity-75">
                ({typeCounts[t.key]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Action Bar (only when items are present) */}
      {!isLoading && filtered.length > 0 && (
        <div className="mb-3 px-2 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
            />
            <span className="text-muted-foreground">
              {allFilteredSelected ? "Deselect all" : "Select all"}
            </span>
          </label>

          {selected.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selected.size} selected
              </span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 transition"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-pulse"
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              No notifications
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {activeFilter === "all"
                ? "When your service providers post updates, recommendations, or articles, they will appear here."
                : `No ${NOTIFICATION_TYPES.find((t) => t.key === activeFilter)?.label?.toLowerCase() || ""} notifications found.`}
            </p>
          </div>
        ) : (
          filtered.map((notification) => {
            const config = TYPE_CONFIG[notification.type || ""] || DEFAULT_TYPE;
            const Icon = config.icon;
            const isSelected = selected.has(notification._id);
            const senderId = notification.sentBy?.id;
            const sourceLabel = resolveSourceLabel(notification);
            const ctaLabel = resolveCtaLabel(notification, config);
            const profileUrl = senderId ? spProfiles[senderId]?.profileUrl : undefined;

            return (
              <div
                key={notification._id}
                className={`bg-white dark:bg-gray-900 rounded-xl border ${
                  isSelected
                    ? "border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-100 dark:ring-indigo-900/30"
                    : "border-gray-200 dark:border-gray-800"
                } hover:shadow-md transition-all`}
              >
                <div className="p-4 flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(notification._id)}
                    className="w-4 h-4 mt-3 rounded border-gray-300 accent-indigo-600 cursor-pointer flex-shrink-0"
                  />

                  {/* Avatar */}
                  <Avatar className="w-11 h-11 flex-shrink-0">
                    {profileUrl ? <AvatarImage src={profileUrl} alt={sourceLabel} /> : null}
                    <AvatarFallback
                      className={`${config.bg} ${config.color} text-sm font-semibold`}
                    >
                      {sourceLabel.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content area */}
                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {sourceLabel}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color} flex-shrink-0`}
                        >
                          <Icon className="w-2.5 h-2.5" />
                          {config.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>

                    {/* CTA button */}
                    <div className="mt-2 flex items-center">
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
                      >
                        {ctaLabel}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
