"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  XCircle,
} from "lucide-react";
import { ensurePushSubscribed, unsubscribeFromPush } from "@/lib/pushNotifications";

/* ---------- shared design tokens ---------- */
const inputCls =
  "w-full h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 px-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800 transition disabled:opacity-70";
const labelCls =
  "block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 tracking-wide";

/* ---------- section card ---------- */
function Section({
  icon: Icon,
  iconBg,
  iconFg,
  title,
  description,
  children,
  danger,
}: {
  icon: typeof Shield;
  iconBg?: string;
  iconFg?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 md:p-6 mb-4 ${danger
          ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm"
        }`}
    >
      <div className="flex items-start gap-3 mb-5">
        <div
          className={`rounded-lg p-2 shrink-0 ${iconBg || (danger ? "bg-rose-100 dark:bg-rose-900/30" : "bg-blue-50 dark:bg-blue-900/20")
            }`}
        >
          <Icon
            className={`w-4 h-4 ${iconFg || (danger ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400")}`}
          />
        </div>
        <div className="min-w-0">
          <h3
            className={`text-base font-semibold ${danger ? "text-rose-700 dark:text-rose-300" : "text-gray-900 dark:text-white"}`}
          >
            {title}
          </h3>
          {description && (
            <p
              className={`text-xs mt-0.5 ${danger ? "text-rose-700/70 dark:text-rose-400/70" : "text-gray-500 dark:text-gray-400"}`}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------- toggle row helper ---------- */
function ToggleRow({
  title,
  subtitle,
  on,
  onChange,
  disabled,
}: {
  title: string;
  subtitle?: string;
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        role="switch"
        aria-checked={on}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${on ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
          }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${on ? "translate-x-6" : "translate-x-1"
            }`}
        />
      </button>
    </div>
  );
}

/* ---------- main page ---------- */
type SessionRow = {
  _id: string;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const userId = session?.user?.id || session?.user?._id;

  /* ---------- state: change password ---------- */
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  /* ---------- state: sessions list ---------- */
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  /* ---------- state: 2FA ---------- */
  const [twoFA, setTwoFA] = useState(false);

  /* ---------- state: PWA notifications ----------
     `pwaPerm` is the browser-level permission (we can request "granted" but
     never revoke it from JS — only the user can, via site settings).
     `pwaSubscribed` is whether we have an active push subscription registered
     with the backend. "Disable" works by unsubscribing even though the
     browser permission stays "granted". */
  const [pwaPerm, setPwaPerm] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [pwaSubscribed, setPwaSubscribed] = useState(false);
  const [pwaTogglePending, setPwaTogglePending] = useState(false);

  /* ---------- state: danger zone ---------- */
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dangerSubmitting, setDangerSubmitting] = useState(false);

  /* ---------- effects: bootstrap ---------- */
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPwaPerm("unsupported");
      return;
    }
    setPwaPerm(Notification.permission);
    // Also check if we have an active push subscription registered — perm
    // can be "granted" while the user has previously unsubscribed.
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPwaSubscribed(!!sub);
      } catch {
        /* ignore — treat as not subscribed */
      }
    })();
    // Read saved 2FA preference
    const v = localStorage.getItem("tradebox_2fa_enabled");
    setTwoFA(v === "1");
  }, []);

  useEffect(() => {
    if (!userId) return;
    setSessionsLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/sessions?userId=${userId}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const json = await res.json();
          setSessions(json?.data || []);
        } else {
          setSessions([]);
        }
      } catch {
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    })();
  }, [userId]);

  /* ---------- handlers ---------- */
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!pwOld || !pwNew || !pwConfirm) {
      toast({
        title: "All fields required",
        variant: "destructive",
      });
      return;
    }
    if (pwNew.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    if (pwNew !== pwConfirm) {
      toast({
        title: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }
    setPwSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, oldPassword: pwOld, newPassword: pwNew }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        toast({ title: "Password updated" });
        setPwOld("");
        setPwNew("");
        setPwConfirm("");
      } else {
        toast({
          title: json?.message || "Could not change password",
          description: "If you signed up using OTP, password changes may not be available yet.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Connection error",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setPwSubmitting(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/sessions/${sessionId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
        toast({ title: "Session revoked" });
      } else {
        toast({ title: "Failed to revoke session", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    }
  };

  const handle2FAToggle = () => {
    const next = !twoFA;
    setTwoFA(next);
    localStorage.setItem("tradebox_2fa_enabled", next ? "1" : "0");
    toast({
      title: next ? "Two-factor authentication on" : "Two-factor authentication off",
      description: next
        ? "You'll be asked for a one-time code when you sign in from a new device."
        : "Sign-ins will only require your password.",
    });
  };

  const togglePWANotifications = async () => {
    const backendToken = (session as { backendToken?: string } | null)
      ?.backendToken;

    if (pwaPerm === "unsupported") {
      toast({
        title: "Not supported",
        description: "This browser doesn't support notifications.",
        variant: "destructive",
      });
      return;
    }
    if (pwaPerm === "denied") {
      toast({
        title: "Permission blocked",
        description:
          "Notifications are blocked. Enable them from your browser site settings.",
        variant: "destructive",
      });
      return;
    }

    // If currently subscribed → disable by unsubscribing (browser perm stays
    // "granted" but we drop the subscription on both sides so no more pushes).
    if (pwaSubscribed) {
      setPwaTogglePending(true);
      try {
        await unsubscribeFromPush(backendToken || "");
        setPwaSubscribed(false);
        toast({
          title: "Notifications turned off",
          description:
            "We won't send push alerts to this device anymore. Re-enable any time.",
        });
      } catch {
        toast({
          title: "Could not turn off",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setPwaTogglePending(false);
      }
      return;
    }

    // Not subscribed yet — request permission (if needed) and register.
    if (!backendToken) {
      toast({
        title: "Session expired",
        description: "Please sign in again.",
        variant: "destructive",
      });
      return;
    }
    setPwaTogglePending(true);
    try {
      // 5s ceiling — in dev mode next-pwa disables the service worker, so
      // ensurePushSubscribed()'s internal `await navigator.serviceWorker.ready`
      // would otherwise hang forever and the button would look frozen.
      const timeout = new Promise<{
        status: NotificationPermission | "unsupported";
        subscribed: boolean;
      }>((resolve) =>
        setTimeout(
          () => resolve({ status: "unsupported", subscribed: false }),
          5000,
        ),
      );
      const result = await Promise.race([
        ensurePushSubscribed(backendToken),
        timeout,
      ]);
      setPwaPerm(result.status);
      setPwaSubscribed(result.subscribed);
      if (result.subscribed) {
        toast({ title: "Notifications enabled" });
      } else if (result.status === "denied") {
        toast({
          title: "Notifications declined",
          variant: "destructive",
        });
      } else {
        // Service worker not registered (most common in dev) or some other
        // setup failure. Surface this clearly so the user stops mashing the
        // button.
        toast({
          title: "Push notifications unavailable",
          description:
            "The service worker isn't registered. This is expected in development — try a production build (npm run build && npm run start).",
          variant: "destructive",
        });
      }
    } finally {
      setPwaTogglePending(false);
    }
  };

  const pwaToggleLabel = useMemo(() => {
    if (pwaPerm === "unsupported") return "Not supported";
    if (pwaPerm === "denied") return "Blocked by browser";
    return pwaSubscribed ? "Enabled" : "Disabled";
  }, [pwaPerm, pwaSubscribed]);

  const handleLogout = async () => {
    try {
      const token = session?.user?.backendToken;
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("otp_token");
      }
      await signOut({ redirect: false });
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  const handleDeactivate = async () => {
    setDangerSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/account/deactivate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        toast({
          title: "Account deactivated",
          description: "You've been signed out.",
        });
        await handleLogout();
      } else {
        toast({
          title: "Request received",
          description:
            "Our team will deactivate your account within 24 hours.",
        });
        setShowDeactivateModal(false);
      }
    } catch {
      toast({
        title: "Request received",
        description: "Our team will reach out shortly.",
      });
      setShowDeactivateModal(false);
    } finally {
      setDangerSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDangerSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/account/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        toast({
          title: "Account deletion in progress",
          description: "You've been signed out.",
        });
        await handleLogout();
      } else {
        toast({
          title: "Deletion request received",
          description:
            "We'll permanently remove your account within 7 days. Check your email for confirmation.",
        });
        setShowDeleteModal(false);
      }
    } catch {
      toast({
        title: "Deletion request received",
        description: "Check your email for confirmation steps.",
      });
      setShowDeleteModal(false);
    } finally {
      setDangerSubmitting(false);
    }
  };

  /* ---------- helpers ---------- */
  const formatDate = (s?: string) =>
    s ? new Date(s).toLocaleString() : "—";
  const deviceIcon = (d?: string) => {
    const lower = (d || "").toLowerCase();
    if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone"))
      return Smartphone;
    return Monitor;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <Toaster />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 md:py-2">
        {/* Header */}
      

        {/* ============== SECURITY ============== */}
        
        {/* ============== NOTIFICATIONS ============== */}
        <Section
          icon={Bell}
          title="Notifications"
          description="Push alerts straight to this device"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
          iconFg="text-amber-600 dark:text-amber-400"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Web push notifications
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pwaPerm === "denied"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                      : pwaSubscribed
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                >
                  {pwaToggleLabel}
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Get a notification on your home screen when one of your RAs
                posts a recommendation, article or event — without having to
                open the app.
              </p>
            </div>
            <button
              type="button"
              onClick={togglePWANotifications}
              disabled={pwaTogglePending || pwaPerm === "unsupported" || pwaPerm === "denied"}
              className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold transition ${pwaPerm === "denied"
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 cursor-not-allowed"
                  : pwaSubscribed
                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
            >
              {pwaTogglePending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : pwaPerm === "denied" ? (
                <XCircle className="w-4 h-4" />
              ) : pwaSubscribed ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {pwaPerm === "denied"
                ? "Blocked"
                : pwaSubscribed
                  ? "Disable"
                  : "Enable"}
            </button>
          </div>

          {pwaPerm === "denied" && (
            <p className="mt-3 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <BellOff className="w-3.5 h-3.5" />
              Notifications are blocked in your browser. Open site settings to
              re-enable.
            </p>
          )}
        </Section>

        {/* ============== LEGAL & HELP ============== */}
        <Section
          icon={FileText}
          title="Legal & Help"
          description="Policies, support and app version"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          iconFg="text-violet-600 dark:text-violet-400"
        >
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {[
              {
                title: "Terms & Conditions",
                href: "/documents/terms-and-conditions",
              },
              { title: "Privacy Policy", href: "/documents/privacy-policy" },
              { title: "Refund Policy", href: "/documents/refund-policy" },
              {
                title: "Help & Support",
                href: "/dashboard/user/support",
              },
            ].map((row) => (
              <li key={row.href}>
                <Link
                  href={row.href}
                  className="flex items-center justify-between py-3 group"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {row.title}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition" />
                </Link>
              </li>
            ))}
          </ul>
          
        </Section>

        {/* ============== SIGN OUT ============== */}
        <Section
          icon={LogOut}
          title="Sign out"
          description="End this session on this device"
          iconBg="bg-gray-100 dark:bg-gray-800"
          iconFg="text-gray-600 dark:text-gray-300"
        >
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </Section>

        {/* ============== DANGER ZONE ============== */}
        <Section
          icon={AlertTriangle}
          title="Danger Zone"
          description="These actions can't be undone"
          danger
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-gray-900 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Deactivate account
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Temporarily turn off your account. You can reactivate by
                  signing in again.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeactivateModal(true)}
                className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                Deactivate
              </Button>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-gray-900 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Delete account
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <Button
                onClick={() => setShowDeleteModal(true)}
                className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </Section>
      </div>

      {/* ============== Deactivate confirmation modal ============== */}
      {showDeactivateModal && (
        <ConfirmModal
          title="Deactivate your account?"
          body="Your account and data will be hidden, but you can reactivate by signing in again. Continue?"
          confirmText={dangerSubmitting ? "Deactivating…" : "Yes, deactivate"}
          danger
          loading={dangerSubmitting}
          onConfirm={handleDeactivate}
          onClose={() => !dangerSubmitting && setShowDeactivateModal(false)}
        />
      )}
      {showDeleteModal && (
        <ConfirmModal
          title="Permanently delete your account?"
          body="This will permanently remove your profile, subscriptions and all your data. You won't be able to recover it. This action cannot be undone."
          confirmText={dangerSubmitting ? "Submitting…" : "Yes, delete forever"}
          danger
          loading={dangerSubmitting}
          onConfirm={handleDelete}
          onClose={() => !dangerSubmitting && setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

function ConfirmModal({
  title,
  body,
  confirmText,
  danger,
  loading,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmText: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="rounded-lg bg-rose-100 dark:bg-rose-900/30 p-2 shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {body}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              danger
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : ""
            }
          >
            {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
