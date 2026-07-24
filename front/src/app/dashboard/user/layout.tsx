"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import NavMenuDropDown from "@/components/Navbar/NavMenuDropDown";
import NotificationDrowdown from "@/components/Notifications/NotificationDrowDown";
import { useUnreadNotifications } from "@/components/Notifications/useUnreadNotifications";
import ImpersonationBanner from "@/components/Impersonation/ImpersonationBanner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BackButton from "@/components/ui/BackButton";
import DashboardSearch from "@/components/Dashboard/DashboardSearch";
import NotificationIcon from "@/icons/NotificationIcon";
import {
  BookOpen,
  Briefcase,
  Calendar,
  ChevronDown,
  CreditCard,
  Download,
  GraduationCap,
  LineChart,
  Menu,
  Newspaper,
  PieChart,
  Sparkles,
  Smartphone,
  TrendingUp,
  User as UserIcon,
  Users,
  Wallet,
  X,
} from "lucide-react";

// Chrome / Edge / Opera fire `beforeinstallprompt` on a `BeforeInstallPromptEvent`.
// TypeScript's default lib doesn't include it, so type it locally.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const ALICE_BLUE_SESSION_KEY = "aliceBlueSession";

type NavItem = {
  title: string;
  href: string;
  base: string;
  Icon: typeof Menu;
};

const baseSidebarItems: NavItem[] = [
  {
    title: "My Profile",
    href: "/dashboard/user/myprofile",
    base: "/dashboard/user/myprofile",
    Icon: UserIcon,
  },
  {
    title: "Plans",
    href: "/dashboard/user/subscribedservices",
    base: "/dashboard/user/subscribedservices",
    Icon: Briefcase,
  },
  {
    title: "Research Reports",
    href: "/dashboard/user/researchreports",
    base: "/dashboard/user/researchreports",
    Icon: Newspaper,
  },
  {
    title: "Experts",
    href: "/dashboard/user/experts",
    base: "/dashboard/user/experts",
    Icon: Users,
  },
  {
    title: "Recommendations",
    href: "/dashboard/user/recommendations",
    base: "/dashboard/user/recommendations",
    Icon: TrendingUp,
  },
  {
    title: "Model Portfolio",
    href: "/dashboard/user/subscribedmodelportfolio",
    base: "/dashboard/user/subscribedmodelportfolio",
    Icon: PieChart,
  },
  {
    title: "Events",
    href: "/dashboard/user/events",
    base: "/dashboard/user/events",
    Icon: Calendar,
  },
  {
    title: "Courses",
    href: "/dashboard/user/subscribedcourses",
    base: "/dashboard/user/subscribedcourses",
    Icon: GraduationCap,
  },
  
  {
    title: "Billing",
    href: "/dashboard/user/billing",
    base: "/dashboard/user/billing",
    Icon: CreditCard,
  },
  
  {
    title: "Brokers",
    href: "/dashboard/user/broker",
    base: "/dashboard/user/broker",
    Icon: BookOpen,
  },
];

const aliceBlueSidebarItems: NavItem[] = [
  {
    title: "Orders",
    href: "/dashboard/user/orders",
    base: "/dashboard/user/orders",
    Icon: LineChart,
  },
  {
    title: "Portfolio",
    href: "/dashboard/user/portfolio",
    base: "/dashboard/user/portfolio",
    Icon: PieChart,
  },
  {
    title: "Funds",
    href: "/dashboard/user/funds",
    base: "/dashboard/user/funds",
    Icon: Wallet,
  },
];

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasAliceBlueSession, setHasAliceBlueSession] = useState<boolean | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationBarOpen, setIsNotificationBarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);

  /* ---------- PWA install state ---------- */
  // `installPrompt` is the stashed beforeinstallprompt event we replay on
  // click. `isAppInstalled` hides the button when the app is already a PWA
  // (standalone display mode), so we don't pester users who already added it.
  // `showIosHint` opens a small modal when we detect iOS Safari, since Apple
  // doesn't fire beforeinstallprompt — users have to use Share → Add to
  // Home Screen manually, and they need a one-time nudge to find it.
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  // Detect iOS so the install button still shows a useful affordance on
  // iPhone/iPad. iOS Safari never fires beforeinstallprompt — we have to
  // walk the user through Share → Add to Home Screen.
  const isIos = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // If we're already running as an installed PWA, hide the install button.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS uses a non-standard navigator property for "added to home screen".
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setIsAppInstalled(true);

    const onBeforeInstall = (e: Event) => {
      // Stash the event so a later click can re-trigger the install prompt.
      // Browsers also fire `appinstalled` once the user accepts — see below.
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIsAppInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") {
          // Browser fires `appinstalled` and we'll flip isAppInstalled there;
          // we just clear the stashed prompt here so re-clicking does nothing.
        }
        setInstallPrompt(null);
      } catch {
        /* user dismissed system dialog — nothing to do */
      }
      return;
    }
    if (isIos) {
      setShowIosHint(true);
    }
  }, [installPrompt, isIos]);

  // Only render the button when the install path is possible: either we
  // have a stashed beforeinstallprompt, OR the user is on iOS Safari and
  // hasn't already installed.
  const showInstallButton = !isAppInstalled && (!!installPrompt || isIos);
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();

  const readAliceBlueSession = useCallback(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(ALICE_BLUE_SESSION_KEY);
    if (!raw) {
      setHasAliceBlueSession(false);
      return;
    }
    try {
      const data = JSON.parse(raw);
      if (
        data &&
        typeof data.expiresAt === "number" &&
        Date.now() > data.expiresAt
      ) {
        localStorage.removeItem(ALICE_BLUE_SESSION_KEY);
        setHasAliceBlueSession(false);
        return;
      }
    } catch {
      // legacy or non-JSON value: treat as valid session
    }
    setHasAliceBlueSession(true);
  }, []);
  console.log("this is the session value in the layout", session);

  useEffect(() => {
    readAliceBlueSession();
    const onStored = () => readAliceBlueSession();
    window.addEventListener("aliceBlueSessionStored", onStored);
    return () => window.removeEventListener("aliceBlueSessionStored", onStored);
  }, [readAliceBlueSession]);

  const tradingPaths = [
    "/dashboard/user/orders",
    "/dashboard/user/portfolio",
    "/dashboard/user/funds",
  ];
  const isTradingPath = tradingPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  useEffect(() => {
    if (hasAliceBlueSession === false && isTradingPath) {
      router.replace("/dashboard/user/overview");
    }
  }, [hasAliceBlueSession, isTradingPath, router]);

  const shouldHideTradingContent =
    isTradingPath && hasAliceBlueSession !== true;

  const navItems = useMemo(() => {
    return [
      baseSidebarItems[0], // My Profile first
      ...(hasAliceBlueSession ? aliceBlueSidebarItems : []),
      ...baseSidebarItems.slice(1),
    ];
  }, [hasAliceBlueSession]);

  // Auto-close drawer when route changes (so it doesn't linger after a click)
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock background scroll while drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  // Close the mobile drawer if the user resizes up to desktop — desktop has
  // its own permanent sidebar, so the drawer must stop occupying scroll-lock.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024 && drawerOpen) setDrawerOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawerOpen]);

  // Close the profile dropdown / notification dropdown when the user clicks
  // anywhere outside them — saves the user from having to tap the trigger
  // button again to dismiss the panel.
  useEffect(() => {
    if (!isMenuOpen && !isNotificationBarOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        isMenuOpen &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
      if (
        isNotificationBarOpen &&
        notifMenuRef.current &&
        !notifMenuRef.current.contains(e.target as Node)
      ) {
        setIsNotificationBarOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isMenuOpen, isNotificationBarOpen]);

  const handleProfileIconClick = () => setIsMenuOpen((p) => !p);
  const { count: unreadCount, refetch: refetchUnread } = useUnreadNotifications(
    session.data?.user?.id,
    session.data?.user?.role,
  );

  const handleNotificationIconClick = () => {
    setIsNotificationBarOpen((p) => {
      const next = !p;
      if (!next) refetchUnread();
      return next;
    });
  };

  const isActive = (item: NavItem) =>
    pathname === item.base || pathname.startsWith(item.base + "/");

  // First name only — strip out middle/last names + extra whitespace.
  const fullName =
    session.data?.user?.RegName || session.data?.user?.name || "";
  const firstName = fullName.trim().split(/\s+/)[0] || "User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <ImpersonationBanner />
      {/* ===================== DESKTOP SIDEBAR (lg+) ===================== */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-30 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col">
        {/* Greeting header — single line, avatar already lives in the navbar */}
        <div className="px-5 py-[18px] border-b border-gray-200 dark:border-gray-800 flex items-baseline gap-1.5">
          <span className="text-[23px] font-normal text-gray-500 dark:text-gray-400 tracking-tight shrink-0">
            Welcome,
          </span>
          <span className="text-[20px] font-semibold text-gray-900 dark:text-white truncate tracking-tight">
            {firstName}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.Icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
                />
                <span className="flex-1 truncate">{item.title}</span>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
            Tradebox · v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"} · {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      {/* ===================== TOP NAVBAR ===================== */}
      <header className="fixed top-0 left-0 lg:left-64 right-0 z-30 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3  sm:px-5">
        {/* Left: hamburger (mobile) + brand */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
          <Link
            href="/dashboard/user/myprofile"
            className="lg:hidden flex items-center gap-2 ml-1"
          >
            
            <span className="hidden sm:inline font-bold text-sm text-gray-900 dark:text-white tracking-tight">
              Tradebox
            </span>
          </Link>

          {/* Universal search — pill on desktop, icon on mobile */}
          <DashboardSearch />
        </div>

        {/* Right: notifications + avatar */}
        <div className="flex items-center gap-2">
          {/* PWA install — appears only when the browser supports installing
              (Chrome / Edge / Android) or when on iOS Safari. Hidden when
              the app already runs in standalone (already installed). */}
          {showInstallButton && (
            <button
              type="button"
              onClick={handleInstallClick}
              aria-label="Install Tradebox app"
              title="Install Tradebox as an app"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
          )}
          {/* Compact icon-only variant for mobile so it still fits next to
              the bell + avatar without crowding the row. */}
          {showInstallButton && (
            <button
              type="button"
              onClick={handleInstallClick}
              aria-label="Install Tradebox app"
              title="Install Tradebox as an app"
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}

          {/* Notifications cluster — both trigger + dropdown share a ref so
              outside-click closes them */}
          <div ref={notifMenuRef} className="relative">
            <button
              type="button"
              onClick={handleNotificationIconClick}
              aria-label="Notifications"
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <NotificationIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {isNotificationBarOpen && <NotificationDrowdown />}
            </AnimatePresence>
          </div>

          {/* Profile cluster — same pattern */}
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full lg:rounded-lg lg:pl-1 lg:pr-2 lg:py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              onClick={handleProfileIconClick}
              aria-label="Profile menu"
            >
              <Avatar className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700">
                <AvatarImage
                  src={session.data?.user.profileUrl}
                  alt={session.data?.user.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={"/images/avatar/avatar.jpg"}
                    alt="avatar"
                    width={64}
                    height={64}
                  />
                </AvatarFallback>
              </Avatar>
              <span className="hidden lg:block max-w-[120px] truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                {firstName}
              </span>
              <ChevronDown
                className={`hidden lg:block w-4 h-4 text-gray-400 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {isMenuOpen && <NavMenuDropDown />}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ===================== DRAWER (mobile / tablet only) ===================== */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* backdrop */}
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />

            {/* drawer panel */}
            <motion.aside
              key="drawer-panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="lg:hidden fixed top-0 left-0 z-50 h-screen w-72 max-w-[85vw] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col"
            >
              {/* Greeting header — single line, avatar already lives in the navbar */}
              <div className="px-3   border-b border-gray-200 dark:border-gray-800 flex items-baseline justify-between gap-3">
                <div className="min-w-0 mt-5 flex-1 flex items-baseline gap-1.5">
                  <span className="text-[23px] font-normal text-gray-500 dark:text-gray-400 tracking-tight shrink-0">
                    Hello,
                  </span>
                  <span className="text-[20px] font-semibold text-gray-900 dark:text-white truncate tracking-tight">
                    {firstName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.Icon;
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
                      />
                      <span className="flex-1 truncate">{item.title}</span>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                  Tradebox · v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"} · {new Date().getFullYear()}
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===================== MAIN CONTENT ===================== */}
      <main className="pt-14 lg:pl-64 min-h-screen">
        {shouldHideTradingContent ? null : (
          <>
            <div className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4">
              <BackButton />
            </div>
            {children}
          </>
        )}
      </main>

      {/* iOS install hint — fired by handleInstallClick on iPhone/iPad
          Safari where the JS install prompt isn't available. Walks the
          user through Share → Add to Home Screen, which is the only path
          to install a PWA on iOS. */}
      <AnimatePresence>
        {showIosHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowIosHint(false)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Install Tradebox on iPhone / iPad
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    iOS doesn&apos;t support one-tap install. Use Safari&apos;s share menu instead.
                  </p>
                </div>
              </div>
              <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2.5 pl-1">
                <li>
                  <span className="font-semibold mr-1">1.</span>
                  Tap the <strong>Share</strong> icon at the bottom of Safari (the square with an upward arrow).
                </li>
                <li>
                  <span className="font-semibold mr-1">2.</span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  <span className="font-semibold mr-1">3.</span>
                  Tap <strong>Add</strong> in the top-right corner.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIosHint(false)}
                className="mt-5 w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
