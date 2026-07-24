"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LucideMenu, Menu, MenuSquare, X } from "lucide-react";
import { SideBarIconsArr } from "./SideBarIconsArr";

export type sidebarButton = {
  title: string;
  href: string;
  base: string;
  permission?: string;
};

type SidebarProps = {
  haveAvatar: boolean;
  heading?: string;
  haveCategory?: boolean;
  iconIndex: number;
  buttonsArray: sidebarButton[];
  height?: string;
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
};

export default function Sidebar({
  haveAvatar,
  heading,
  buttonsArray,
  iconIndex,
  haveCategory = false,
  height = "h-full",
  collapsed = false,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [subscription, setSubscription] = useState(false);
  const [services, setServices] = useState<Record<string, boolean>>({});
  const [lmsEnabled, setLmsEnabled] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // ✅ Fetch subscription status (runs only when provider logged in)
  useEffect(() => {
    if (!session?.user?.id || session?.user?.role !== "provider") return;

    const fetchSubscription = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/check-subscription?providerId=${session.user.id}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (data?.isSubscription) {
          setSubscription(true);
          setServices(data.services || {});
          setLmsEnabled(data?.lms?.enabled === true);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      }
    };

    fetchSubscription();
  }, [session?.user?.id, session?.user?.role]);

  // ✅ Poll wallet balance for providers — drives the low-balance red-dot
  // indicator next to the "Wallet" sidebar item. Refreshes every 60s so the
  // indicator updates after a top-up without a page reload.
  useEffect(() => {
    if (!session?.user?.id || session?.user?.role !== "provider") return;

    let cancelled = false;
    const fetchWallet = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/walletbalance?id=${session.user.id}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const amt = Number(data?.data?.amount ?? 0);
        if (!cancelled && Number.isFinite(amt)) setWalletBalance(amt);
      } catch (error) {
        // silent — sidebar shouldn't break on transient fetch failures
      }
    };

    fetchWallet();
    const id = setInterval(fetchWallet, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session?.user?.id, session?.user?.role]);

  const isWalletLow = walletBalance !== null && walletBalance < 500;

  // ✅ Handle collapse toggle
  const handleToggle = () => onToggle?.(!collapsed);

  // ✅ Filter menu items based on services (only for providers)
  const isProvider = session?.user?.role === "provider";
  const filteredButtons = useMemo(() => {
    if (!isProvider) return buttonsArray;

    return buttonsArray.filter((button) => {
      const { title } = button;

      const hiddenByContent =
        ["Research Reports", "Videos", "Podcasts", "Events"].includes(title) &&
        !services.content;
      const hiddenByOnboarding =
        ["My Plans", "Subscribers", "Coupon Codes"].includes(title) &&
        !services.onboarding;
      const hiddenByRecommendations =
        title === "Recommendations" && !services.recommendations;
      const hiddenByPortfolio =
        title === "Portfolios" && !services.modelPortfolio;

      const hiddenByLMS =
        ["Courses", "LMS"].includes(title) && !lmsEnabled;

      return !(
        hiddenByContent ||
        hiddenByOnboarding ||
        hiddenByRecommendations ||
        hiddenByPortfolio ||
        hiddenByLMS
      );
    });
  }, [buttonsArray, services, isProvider]);

  return (
    <aside
      className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 
      fixed h-screen top-0 left-0 flex flex-col transition-all duration-300
      ${collapsed ? "w-16" : "w-[280px]"}`}
    >
      {/* ---- Header ---- */}
      <header className="border-2 border-gray-100 dark:border-gray-100  flex items-center justify-between">
        {!collapsed && (
          <div className="p-6 flex items-center space-x-3">
            {/* <Link href="/">
              <img
                src="https://tradeboxfintech.s3.ap-south-1.amazonaws.com/Images/only-logo.png"
                alt="Logo"
                className="w-8 h-8 rounded dark:border-gray-600"
              />
            </Link> */}
            <h1 className="text-xl font-bold dark:text-white">Hello, {session?.user.RegName?.split(" ")[0] || "User"}
            </h1>
          </div>
        )}

        <button
          className="mx-auto py-4 hidden md:block dark:text-gray-300"
          onClick={handleToggle}
          aria-label="Toggle sidebar"
        >
          {collapsed && <Menu size={20} />}
        </button>
      </header>

      {/* ---- Sidebar Links ---- */}
      <nav className="mt-6 flex-grow overflow-y-auto">
        {filteredButtons.map((button, idx) => {
          const Icon = SideBarIconsArr[iconIndex]?.[idx];
          const active = pathname.includes(button.base);

          const linkClasses = [
            "py-3 flex items-center transition-colors",
            collapsed ? "justify-center" : "justify-between px-6",
            active
              ? "border-l-4 border-green-500 text-green-500 dark:border-green-400 dark:text-green-400"
              : "text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-gray-800",
          ].join(" ");

          const showWalletAlert = button.title === "Wallet" && isWalletLow;

          return (
            <Link
              key={button.title}
              href={button.href}
              title={
                collapsed
                  ? showWalletAlert
                    ? `${button.title} — low balance, please recharge`
                    : button.title
                  : ""
              }
              className={linkClasses}
            >
              <div className="flex items-center relative">
                {Icon ? (
                  <Icon
                    className={`${collapsed ? "mx-auto" : "mr-3"} dark:text-gray-300`}
                  />
                ) : (
                  <span className={`${collapsed ? "mx-auto" : "mr-3"} w-5 h-5 dark:text-gray-300`} aria-hidden />
                )}
                {!collapsed && (
                  <span className="dark:text-gray-200 text-lg">
                    {button.title}
                  </span>
                )}
                {showWalletAlert && (
                  <span
                    className={`absolute flex h-2.5 w-2.5 ${
                      collapsed ? "top-0 right-0" : "left-3 top-0"
                    }`}
                    aria-label="Low wallet balance"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
