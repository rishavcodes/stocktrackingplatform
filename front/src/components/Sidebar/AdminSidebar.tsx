"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Menu,
    ChevronDown,
    Globe,
    BarChart3,
    Users,
    Bell,
    Phone,
    Wallet,
    CalendarDays,
    Briefcase,
    PieChart,
    Package,
    Store,
    ShieldCheck,
    LifeBuoy,
    AlertTriangle,
    Activity,
} from "lucide-react";

// ───────────────────────── Types ─────────────────────────
export type AdminSidebarChild = {
    title: string;
    href: string;
};

export type AdminSidebarItem = {
    title: string;
    icon: React.ElementType;
    permission: string;
    href?: string; // direct link (no children)
    base: string;
    children?: AdminSidebarChild[];
};

// ───────────────────────── Sidebar Config ─────────────────────────
const adminSidebarConfig: AdminSidebarItem[] = [
    {
        title: "Service Providers",
        icon: Globe,
        permission: "service_providers",
        base: "/dashboard/admin/serviceprovider",
        children: [
            { title: "Approval", href: "/dashboard/admin/serviceprovider/approval" },
            { title: "Approved", href: "/dashboard/admin/serviceprovider/approved" },
        ],
    },
    {
        title: "Experts Stats",
        icon: BarChart3,
        permission: "Experts Stats",
        base: "/dashboard/admin/contentstats",
        children: [
            {
                title: "Content Statistics",
                href: "/dashboard/admin/contentstats/contentstatistics",
            },
            {
                title: "Recommendation Leaderboard",
                href: "/dashboard/admin/contentstats/leaderboard",
            },
        ],
    },
    {
        title: "Customers Data",
        icon: Users,
        permission: "customers",
        base: "/dashboard/admin/customers",
        href: "/dashboard/admin/customers",
    },
    {
        title: "Login Activity",
        icon: Activity,
        permission: "login_activity",
        base: "/dashboard/admin/login-activity",
        href: "/dashboard/admin/login-activity",
    },
    {
        title: "All Notifications",
        icon: Bell,
        permission: "all_notifications",
        base: "/dashboard/admin/allnotifications",
        href: "/dashboard/admin/allnotifications",
    },
    {
        title: "Contact Leads",
        icon: Phone,
        permission: "contact_leads",
        base: "/dashboard/admin/contactleads",
        href: "/dashboard/admin/contactleads",
    },
    {
        title: "Onboarding Issues",
        icon: AlertTriangle,
        permission: "onboarding_issues",
        base: "/dashboard/admin/onboarding-issues",
        href: "/dashboard/admin/onboarding-issues",
    },
    {
        title: "Accounts",
        icon: Wallet,
        permission: "wallet",
        base: "/dashboard/admin/accounts",
        children: [
            { title: "Tradebox Plans", href: "/dashboard/admin/accounts?tab=tradebox-plans" },
            { title: "Services Sold", href: "/dashboard/admin/accounts?tab=services-sold" },
            { title: "RA Transactions", href: "/dashboard/admin/accounts?tab=ra-transactions" },
            { title: "Withdrawals", href: "/dashboard/admin/accounts?tab=withdrawals" },
        ],
    },
    {
        title: "Events",
        icon: CalendarDays,
        permission: "events",
        base: "/dashboard/admin/events",
        children: [
            { title: "All Events", href: "/dashboard/admin/events/allevents" },
            { title: "Create Event", href: "/dashboard/admin/events/create" },
        ],
    },
    {
        title: "Services",
        icon: Briefcase,
        permission: "services",
        base: "/dashboard/admin/services",
        children: [
            {
                title: "All Services",
                href: "/dashboard/admin/services/allservices",
            },
        ],
    },
    {
        title: "Model Portfolio",
        icon: PieChart,
        permission: "model_portfolio",
        base: "/dashboard/admin/modelportfolio",
        children: [
            {
                title: "All Portfolios",
                href: "/dashboard/admin/modelportfolio/allportfolios",
            },
        ],
    },
    {
        title: "Packages",
        icon: Package,
        permission: "packages",
        base: "/dashboard/admin/packages",
        children: [
            {
                title: "All Packages",
                href: "/dashboard/admin/packages/allpackages",
            },
        ],
    },
    {
        title: "Marketplace",
        icon: Store,
        permission: "marketplace",
        base: "/dashboard/admin/marketplace",
        children: [
            {
                title: "All Marketplaces",
                href: "/dashboard/admin/marketplace/allmarketplaces",
            },
            {
                title: "Admin Marketplace",
                href: "/dashboard/admin/marketplace/admin-marketplace",
            },
            {
                title: "Create Marketplace",
                href: "/dashboard/admin/marketplace/create",
            },
        ],
    },
    {
        title: "Sub Admin",
        icon: ShieldCheck,
        permission: "sub_admin_manage",
        base: "/dashboard/admin/subadmin",
        children: [
            { title: "Create Sub Admin", href: "/dashboard/admin/subadmin/create" },
            { title: "All Sub Admins", href: "/dashboard/admin/subadmin/list" },
        ],
    },
    {
        title: "Support Tickets",
        icon: LifeBuoy,
        permission: "support_tickets",
        base: "/dashboard/admin/support",
        href: "/dashboard/admin/support",
    },
];

// ───────────────────────── Props ─────────────────────────
type AdminSidebarProps = {
    collapsed: boolean;
    onToggle: (collapsed: boolean) => void;
};

// ───────────────────────── Component ─────────────────────────
export default function AdminSidebar({
    collapsed,
    onToggle,
}: AdminSidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    const role = session?.user?.role;
    const permissions: string[] = session?.user?.permissions || [];

    // ── Filter items by role/permission ──
    const filteredItems = useMemo(() => {
        return adminSidebarConfig.filter((item) => {
            if (role === "admin" || role === "super_admin") return true;
            if (role === "sub_admin") return permissions.includes(item.permission);
            return false;
        });
    }, [role, permissions]);

    // ── Track which sections are expanded ──
    const [openSections, setOpenSections] = useState<Set<string>>(new Set());

    // Auto-expand the section matching current pathname on mount / route change
    useEffect(() => {
        const activeSection = filteredItems.find((item) =>
            pathname.startsWith(item.base)
        );
        if (activeSection?.children) {
            setOpenSections((prev) => {
                const next = new Set(prev);
                next.add(activeSection.title);
                return next;
            });
        }
    }, [pathname, filteredItems]);

    const toggleSection = (title: string) => {
        setOpenSections((prev) => {
            const next = new Set(prev);
            if (next.has(title)) next.delete(title);
            else next.add(title);
            return next;
        });
    };

    return (
        <aside
            className={`fixed top-0 left-0 h-screen flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-50 ${collapsed ? "w-16" : "w-[280px]"
                }`}
        >
            {/* ──── Header ──── */}
            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-5 min-h-[72px]">
                {!collapsed && (
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">TB</span>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold text-gray-800 truncate">
                                {session?.user?.RegName ?? "Admin"}
                            </h1>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                Admin
                            </span>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => onToggle(!collapsed)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    aria-label="Toggle sidebar"
                >
                    <Menu size={20} />
                </button>
            </header>

            {/* ──── Navigation ──── */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
                {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.base);
                    const isOpen = openSections.has(item.title);
                    const hasChildren = !!item.children?.length;

                    // ── Direct link (no children) ──
                    if (!hasChildren) {
                        return (
                            <Link
                                key={item.title}
                                href={item.href!}
                                title={collapsed ? item.title : undefined}
                                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${isActive
                                        ? "bg-emerald-50 text-emerald-700 border-l-[3px] border-emerald-500"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent"
                                    } ${collapsed ? "justify-center px-0" : ""}`}
                            >
                                <Icon
                                    size={20}
                                    className={`flex-shrink-0 transition-colors ${isActive
                                            ? "text-emerald-600"
                                            : "text-gray-400 group-hover:text-gray-600"
                                        }`}
                                />
                                {!collapsed && (
                                    <span className="text-[13px] font-medium truncate">
                                        {item.title}
                                    </span>
                                )}
                            </Link>
                        );
                    }

                    // ── Section with children (dropdown) ──
                    return (
                        <div key={item.title}>
                            <button
                                onClick={() => {
                                    if (collapsed) {
                                        onToggle(false);
                                        // Expand this section after sidebar opens
                                        setTimeout(() => {
                                            setOpenSections((prev) => {
                                                const next = new Set(prev);
                                                next.add(item.title);
                                                return next;
                                            });
                                        }, 150);
                                    } else {
                                        toggleSection(item.title);
                                    }
                                }}
                                title={collapsed ? item.title : undefined}
                                className={`w-full group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${isActive
                                        ? "bg-emerald-50 text-emerald-700 border-l-[3px] border-emerald-500"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent"
                                    } ${collapsed ? "justify-center px-0" : ""}`}
                            >
                                <Icon
                                    size={20}
                                    className={`flex-shrink-0 transition-colors ${isActive
                                            ? "text-emerald-600"
                                            : "text-gray-400 group-hover:text-gray-600"
                                        }`}
                                />
                                {!collapsed && (
                                    <>
                                        <span className="text-[13px] font-medium truncate flex-1 text-left">
                                            {item.title}
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""
                                                }`}
                                        />
                                    </>
                                )}
                            </button>

                            {/* ── Dropdown children ── */}
                            {!collapsed && (
                                <div
                                    className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                                        }`}
                                >
                                    <div className="ml-5 pl-4 border-l-[2px] border-gray-200 py-1 space-y-0.5">
                                        {item.children!.map((child) => {
                                            const [childPath, childQuery] = child.href.split("?");
                                            const childTab = childQuery ? new URLSearchParams(childQuery).get("tab") : null;
                                            const currentTab = searchParams.get("tab");
                                            const childActive = childTab
                                                ? pathname === childPath && currentTab === childTab
                                                : pathname === child.href;
                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-all duration-150 ${childActive
                                                            ? "text-emerald-700 bg-emerald-50 font-semibold"
                                                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${childActive ? "bg-emerald-500" : "bg-gray-300"
                                                            }`}
                                                    />
                                                    {child.title}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* ──── Footer ──── */}
            {!collapsed && (
                <div className="border-t border-gray-100 px-4 py-3">
                    <p className="text-[11px] text-gray-400 text-center">
                        Tradebox Admin Panel
                    </p>
                </div>
            )}
        </aside>
    );
}
