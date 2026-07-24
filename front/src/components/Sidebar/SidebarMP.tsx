"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { SideBarIconsArr } from "./SideBarIconsArr";
import { cn } from "@/lib/utils";
import { usePreviousPath } from "@/hooks/usePreviousPath";

export type SidebarButtonMP = {
  title: string;
  href: string;
  base: string;
  badge?: number | string;
};

type SidebarProps = {
  buttonsArray: SidebarButtonMP[];
  iconIndex: number;
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  topBarHeight?: number;
  haveAvatar?: boolean;
  heading?: string;
  height?: string;
  /** When provided, back button navigates to marketplace homepage instead of router.back() */
  marketplaceId?: string;
  /** When false, show all tabs including Articles (for public SP profile view). When true, hide Articles if user lacks content subscription. */
  filterBySubscription?: boolean;
};

export default function SidebarMP({
  buttonsArray,
  iconIndex,
  collapsed = false,
  onToggle,
  topBarHeight = 10,
  marketplaceId: marketplaceIdProp,
  filterBySubscription = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prevPath = usePreviousPath();
  const marketplaceId = marketplaceIdProp || searchParams.get("marketplaceId") || undefined;
  const { data: session } = useSession();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [services, setServices] = useState<Record<string, boolean>>({});

  // -------------------------------
  // Fetch subscription (optional)
  // -------------------------------
  useEffect(() => {
    if (!session?.user?.id || session.user.role !== "provider") return;

    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/check-subscription?providerId=${session.user.id}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.isSubscription) {
          setServices(data.ser || {});
        }
      })
      .catch(console.error);
  }, [session?.user?.id, session?.user?.role]);

  // -------------------------------
  // Close sidebar on route change (mobile)
  // -------------------------------
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  }, [pathname]);

  // -------------------------------
  // Filter buttons
  // Only hide Articles when filterBySubscription=true AND user lacks content subscription
  // For public SP profile (marketplace/view), filterBySubscription=false so Articles always shows
  // -------------------------------
  const filteredButtons = useMemo(() => {
    if (!filterBySubscription) return buttonsArray;
    return buttonsArray.filter((btn) => {
      if (btn.title === "Articles" && !services.content) return false;
      return true;
    });
  }, [buttonsArray, services, filterBySubscription]);

  const sidebarHeight = `calc(100vh - ${topBarHeight}px)`;

  // -------------------------------
  // BACK BUTTON HANDLER (FIXED)
  // -------------------------------
  const handleBack = () => {
 const pathid = pathname.split("/").pop();
 router.push(`/marketplace/${marketplaceId}`);
};

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      <button
        className="fixed z-50 md:hidden p-2 bg-white rounded-lg shadow"
        style={{ top: topBarHeight + 16, left: 16 }}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative z-50 transition-all duration-300 bg-white dark:bg-gray-900 border-r",
          collapsed ? "w-20" : "w-[280px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ height: sidebarHeight, top: topBarHeight }}
      >
        {/* Back Button */}
        <div className={cn("border-b p-3", collapsed && "px-2")}>
          <button
            onClick={handleBack}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800",
              collapsed && "justify-center"
            )}
          >
            <span className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <ArrowLeft className="w-4 h-4 text-green-600" />
            </span>

            {!collapsed && (
              <div className="flex flex-col text-left">
                <span className="text-xs text-gray-500">Back to</span>
                <span className="text-sm font-semibold">{marketplaceId ? "Marketplace" : "Previous Page"}</span>
              </div>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {filteredButtons.map((btn, idx) => {
            const Icon = SideBarIconsArr[iconIndex]?.[idx];
            const active = pathname.includes(btn.base);
            const hrefWithMarketplace = marketplaceId
              ? `${btn.href}${btn.href.includes("?") ? "&" : "?"}marketplaceId=${marketplaceId}`
              : btn.href;

            return (
              <Link
                key={btn.title}
                href={hrefWithMarketplace}
                className={cn(
                  "mx-2 flex items-center gap-3 p-3 rounded-lg transition-all",
                  active
                    ? "bg-green-100 text-green-700"
                    : "hover:bg-gray-100 text-gray-600"
                )}
              >
                {Icon && <Icon className="w-5 h-5" />}
                {!collapsed && <span className="text-sm">{btn.title}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Spacer */}
      <div className={cn("hidden md:block", collapsed ? "w-20" : "w-[280px]")} />
    </>
  );
}
