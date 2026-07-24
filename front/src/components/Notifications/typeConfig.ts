import {
  TrendingUp,
  FileText,
  Calendar,
  CreditCard,
  Heart,
  Coins,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  CheckCheck,
  AlertTriangle,
  RefreshCw,
  Wallet,
  Banknote,
  Megaphone,
  XCircle,
  Briefcase,
  GraduationCap,
  Link2Off,
} from "lucide-react";

export type Category = "admin" | "sp" | "broker";

export type Notification = {
  _id: string;
  message: string;
  type?: string;
  postLink?: string;
  createdAt?: string;
  sentBy?: { id: string; name: string };
  category?: Category;
  ctaLabel?: string;
  broker?: string;
  readBy?: { id: string; readAt?: string }[];
  // Optional image attachment (Quick Message broadcasts). Bell shows a
  // thumbnail; notifications page shows a bigger view with a lightbox.
  image?: string;
};

export type TypeConfig = {
  icon: any;
  color: string;
  bg: string;
  label: string;
  defaultPath: string | undefined;
  ctaLabel: string;
};

export const TYPE_CONFIG: Record<string, TypeConfig> = {
  // Legacy
  service: {
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    label: "Service",
    defaultPath: "/dashboard/user/subscribedservices",
    ctaLabel: "View Service",
  },
  contact: {
    icon: Mail,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    label: "Contact",
    defaultPath: undefined,
    ctaLabel: "View",
  },
  event: {
    icon: Calendar,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    label: "Event",
    defaultPath: "/dashboard/user/events",
    ctaLabel: "View Event",
  },
  admin: {
    icon: Shield,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    label: "Admin",
    defaultPath: undefined,
    ctaLabel: "View",
  },
  "Post Like": {
    icon: Heart,
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-900/20",
    label: "Like",
    defaultPath: undefined,
    ctaLabel: "View Post",
  },
  "TradyCoin Credit": {
    icon: Coins,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    label: "TradyCoin",
    defaultPath: undefined,
    ctaLabel: "View Wallet",
  },
  membership: {
    icon: Shield,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    label: "Membership",
    defaultPath: "/dashboard/user/billing",
    ctaLabel: "View Membership",
  },
  "payment-verification": {
    icon: CreditCard,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    label: "Payment",
    defaultPath: "/dashboard/user/billing",
    ctaLabel: "View Receipt",
  },
  "payment-verified": {
    icon: CheckCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    label: "Verified",
    defaultPath: "/dashboard/user/billing",
    ctaLabel: "View Receipt",
  },
  "payment-rejected": {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    label: "Rejected",
    defaultPath: "/dashboard/user/billing",
    ctaLabel: "View Details",
  },

  // SP-sourced
  "recommendation-new": {
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    label: "Recommendation",
    defaultPath: "/dashboard/user/recommendations",
    ctaLabel: "View Recommendation",
  },
  "recommendation-closed": {
    icon: CheckCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    label: "Outcome",
    defaultPath: "/dashboard/user/recommendations",
    ctaLabel: "View Outcome",
  },
  "portfolio-update": {
    icon: Briefcase,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    label: "Portfolio",
    defaultPath: "/dashboard/user/portfolio",
    ctaLabel: "View Portfolio",
  },
  "content-added": {
    icon: GraduationCap,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    label: "Content",
    defaultPath: "/dashboard/user/subscribedservices",
    ctaLabel: "Open",
  },
  "event-update": {
    icon: Calendar,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    label: "Event",
    defaultPath: "/dashboard/user/events",
    ctaLabel: "View Event",
  },

  // Broker-sourced
  "trade-placed": {
    icon: TrendingUp,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    label: "Trade",
    defaultPath: "/dashboard/user/orders",
    ctaLabel: "View Order",
  },
  "trade-rejected": {
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    label: "Trade",
    defaultPath: "/dashboard/user/orders",
    ctaLabel: "Retry",
  },
  "trade-modified": {
    icon: RefreshCw,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    label: "Trade",
    defaultPath: "/dashboard/user/orders",
    ctaLabel: "View Order",
  },
  "trade-cancelled": {
    icon: XCircle,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/40",
    label: "Trade",
    defaultPath: "/dashboard/user/orders",
    ctaLabel: "View Order",
  },
  "broker-disconnected": {
    icon: Link2Off,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    label: "Broker",
    defaultPath: "/dashboard/user/broker",
    ctaLabel: "Reconnect Broker",
  },

  // Admin-sourced
  "renewal-success": {
    icon: CheckCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    label: "Renewal",
    defaultPath: "/dashboard/user/subscribedservices",
    ctaLabel: "View Subscription",
  },
  "renewal-failed": {
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    label: "Renewal",
    defaultPath: "/dashboard/user/subscribedservices",
    ctaLabel: "Retry Renewal",
  },
  "kyc-approved": {
    icon: ShieldCheck,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    label: "KYC",
    defaultPath: "/dashboard/user/kyc",
    ctaLabel: "View KYC",
  },
  "kyc-rejected": {
    icon: ShieldAlert,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    label: "KYC",
    defaultPath: "/dashboard/user/kyc",
    ctaLabel: "Resubmit",
  },
  "profile-incomplete": {
    icon: Wallet,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    label: "Profile",
    defaultPath: "/dashboard/user/myprofile",
    ctaLabel: "Complete Profile",
  },
  "bank-missing": {
    icon: Banknote,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    label: "Bank",
    defaultPath: "/dashboard/user/myprofile",
    ctaLabel: "Add Bank",
  },
  "plan-expiring": {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    label: "Expiring",
    defaultPath: "/dashboard/user/subscribedservices",
    ctaLabel: "Renew Now",
  },
  "plan-expired": {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    label: "Expired",
    defaultPath: "/dashboard/user/subscribedservices",
    ctaLabel: "Renew Now",
  },
  announcement: {
    icon: Megaphone,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    label: "Announcement",
    defaultPath: undefined,
    ctaLabel: "Read More",
  },
  system: {
    icon: FileText,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
    label: "System",
    defaultPath: undefined,
    ctaLabel: "View",
  },
};

export const DEFAULT_TYPE: TypeConfig = {
  icon: FileText,
  color: "text-slate-600 dark:text-slate-400",
  bg: "bg-slate-100 dark:bg-slate-800",
  label: "Notification",
  defaultPath: undefined,
  ctaLabel: "View",
};

export function resolveTypeConfig(type?: string): TypeConfig {
  if (!type) return DEFAULT_TYPE;
  return TYPE_CONFIG[type] || DEFAULT_TYPE;
}

export function resolveLink(notification: Notification, config: TypeConfig): string {
  const link = notification.postLink?.trim();
  if (link && (link.startsWith("/") || link.startsWith("http"))) {
    return link;
  }
  if (config.defaultPath) {
    return config.defaultPath;
  }
  const senderId = notification.sentBy?.id;
  if (
    senderId &&
    senderId !== "admin" &&
    senderId !== "system" &&
    senderId !== "bigul" &&
    senderId !== "aliceblue"
  ) {
    return `/dashboard/user/experts/${senderId}`;
  }
  return "/dashboard/notifications";
}

export function resolveCtaLabel(notification: Notification, config: TypeConfig): string {
  return notification.ctaLabel || config.ctaLabel || "View";
}

export function resolveSourceLabel(notification: Notification): string {
  if (notification.category === "broker") {
    if (notification.broker) {
      return notification.broker.charAt(0).toUpperCase() + notification.broker.slice(1);
    }
    return "Broker";
  }
  if (notification.category === "admin") return "Tradebox";
  if (notification.category === "sp") return notification.sentBy?.name || "Provider";
  return notification.sentBy?.name || "System";
}
