"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImpersonationBanner from "@/components/Impersonation/ImpersonationBanner";
import SessionExpiryWatcher from "@/components/Auth/SessionExpiryWatcher";
import NavMenuDropDown from "@/components/Navbar/NavMenuDropDown";
import NotificationDrowdown from "@/components/Notifications/NotificationDrowDown";
import { useUnreadNotifications } from "@/components/Notifications/useUnreadNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationIcon from "@/icons/NotificationIcon";
import NProgress from "@/lib/nprogress-config";
import {
	can,
	isReadOnlySubProfile,
	type PermissionKey,
} from "@/lib/subProfilePermissions";
import {
	Briefcase,
	Calendar,
	GraduationCap,
	LayoutDashboard,
	Menu,
	Newspaper,
	Package,
	PieChart,
	Store,
	Ticket,
	TrendingUp,
	User as UserIcon,
	UserCog,
	UserPlus,
	Users,
	Wallet,
	X,
} from "lucide-react";

// permKey tags each sidebar item with the permission module it depends on.
// Items without a permKey are always shown (Overview, Coupons, Courses — none
// are gated by sub-profile permissions in MVP).
type ProviderNavItem = {
	title: string;
	href: string;
	base: string;
	permKey?: PermissionKey;
	Icon: typeof Menu;
};

const ProviderSideBar: ProviderNavItem[] = [
	{
		title: "Overview",
		base: "/dashboard/serviceprovider/overview",
		href: "/dashboard/serviceprovider/overview",
		Icon: LayoutDashboard,
	},
	{
		title: "Profile",
		href: "/dashboard/serviceprovider/myprofile",
		base: "/dashboard/serviceprovider/myprofile",
		permKey: "profile",
		Icon: UserIcon,
	},
	{
		title: "Wallet",
		base: "/dashboard/serviceprovider/wallet",
		href: "/dashboard/serviceprovider/wallet",
		permKey: "wallet",
		Icon: Wallet,
	},
	{
		title: "Research Reports",
		base: "/dashboard/serviceprovider/content/researchreports/",
		href: "/dashboard/serviceprovider/content/researchreports/postresearchreport",
		permKey: "articles",
		Icon: Newspaper,
	},
	{
		title: "Events",
		base: "/dashboard/serviceprovider/content/events/",
		href: "/dashboard/serviceprovider/content/events/postevent",
		permKey: "events",
		Icon: Calendar,
	},
	{
		title: "My Plans",
		base: "/dashboard/serviceprovider/services/",
		href: "/dashboard/serviceprovider/services/createplan",
		permKey: "services",
		Icon: Briefcase,
	},
	{
		title: "Subscribers",
		href: "/dashboard/serviceprovider/subscribers",
		base: "/dashboard/serviceprovider/subscribers",
		permKey: "services",
		Icon: Users,
	},
	{
		title: "Leads",
		href: "/dashboard/serviceprovider/leads",
		base: "/dashboard/serviceprovider/leads",
		permKey: "leads",
		Icon: UserPlus,
	},
	{
		title: "Coupon Codes",
		href: "/dashboard/serviceprovider/content/createcoupon",
		base: "/dashboard/serviceprovider/content/createcoupon/addcoupon",
		permKey: "services",
		Icon: Ticket,
	},
	{
		title: "Recommendations",
		href: "/dashboard/serviceprovider/recommendations/create",
		base: "/dashboard/serviceprovider/recommendations",
		permKey: "recommendation",
		Icon: TrendingUp,
	},
	{
		title: "Portfolios",
		href: "/dashboard/serviceprovider/portfolio/create",
		base: "/dashboard/serviceprovider/portfolio",
		permKey: "portfolios",
		Icon: PieChart,
	},
	{
		title: "Marketplace",
		href: "/dashboard/serviceprovider/marketplace/my-marketplaces",
		base: "/dashboard/serviceprovider/marketplace",
		permKey: "marketplace",
		Icon: Store,
	},
	{
		title: "Courses",
		href: "/dashboard/serviceprovider/lms/createcourse",
		base: "/dashboard/serviceprovider/lsm",
		Icon: GraduationCap,
	},
	{
		title: "Packages",
		href: "/dashboard/serviceprovider/packages/create",
		base: "/dashboard/serviceprovider/packages",
		permKey: "services",
		Icon: Package,
	},
];

export default function Providerlayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = useSession();
	const pathname = usePathname();

	const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
	const [isNotificationBarOpen, setIsNotificationBarOpen] =
		useState<boolean>(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [unreadSupport, setUnreadSupport] = useState<number>(0);

	const profileMenuRef = useRef<HTMLDivElement | null>(null);
	const notifMenuRef = useRef<HTMLDivElement | null>(null);
	// Tracks the pathname we last ran session.update() for, so the sub-profile
	// refresh fires at most ONCE per navigation. Without this guard, update()
	// toggles useSession().status ("authenticated" → "loading" → "authenticated"),
	// which re-triggers the effect below in an infinite loop — leaving any page
	// that blocks on status === "loading" (e.g. My Recommendations) stuck on its
	// spinner for sub-profiles.
	const subProfileSyncedPathRef = useRef<string | null>(null);

	const spId = session?.data?.user?.id;
	const { count: unreadCount } = useUnreadNotifications(
		spId,
		session?.data?.user?.role,
	);

	// Refresh sub-profile permission gates on auth-ready AND on every tab switch,
	// so tabs the master just granted/removed (e.g. ticking "Wallet") show up
	// without a re-login — no full page refresh needed, switching tabs is enough.
	// session.update() triggers the jwt callback (trigger="update"), which
	// re-reads permissions from the DB and rewrites the session. It fires only
	// when auth becomes ready and when the route (pathname) changes — both are
	// user-paced events, NOT a focus/poll loop, so it can't amplify traffic.
	// Only sub-profiles need it.
	useEffect(() => {
		if (
			session.status === "authenticated" &&
			(session.data?.user as any)?.addedby?.isSubProfile &&
			// Run once per navigation. update() flips status to "loading" and back,
			// which re-fires this effect; without this guard that becomes an
			// infinite update() loop (see subProfileSyncedPathRef note above).
			subProfileSyncedPathRef.current !== pathname
		) {
			subProfileSyncedPathRef.current = pathname;
			session.update();
		}
		// session.data is intentionally excluded from deps — update() mutates it,
		// and including it would loop. pathname drives the per-navigation refresh.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pathname, session.status]);

	const isImpersonating = session?.data?.isImpersonation === true;
	// Banner is ~40px tall; shift the fixed sidebar + topbar down by that height
	// when present so nothing is occluded.
	const bannerOffset = isImpersonating ? 40 : 0;

	// Poll the support-ticket unread count for this SP. Drives the red dot on
	// the avatar and inside the dropdown — also updates when the user
	// navigates back to this layout (the route-change effect already fires).
	const fetchUnreadSupport = useCallback(async () => {
		if (!spId) return;
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets/stats?submittedById=${spId}&_=${Date.now()}`,
				{ cache: "no-store" },
			);
			const json = await res.json();
			if (res.ok && json?.success) {
				setUnreadSupport(Number(json?.data?.unreadForSP) || 0);
			}
		} catch (e) {
			console.error("unread support fetch failed", e);
		}
	}, [spId]);

	useEffect(() => {
		if (!spId) return;
		fetchUnreadSupport();
		const id = setInterval(fetchUnreadSupport, 30_000);
		return () => clearInterval(id);
	}, [spId, fetchUnreadSupport]);

	// Refresh the count when the user navigates (e.g. they just left the
	// support page after reading messages — clear the dot fast).
	useEffect(() => {
		fetchUnreadSupport();
	}, [pathname, fetchUnreadSupport]);

	useEffect(() => {
		// Start progress bar whenever route starts changing
		NProgress.start();
		// Stop when route fully loaded
		const timeout = setTimeout(() => {
			NProgress.done();
		}, 500);
		return () => clearTimeout(timeout);
	}, [pathname]);

	// Auto-close the mobile drawer whenever the route changes.
	useEffect(() => {
		setDrawerOpen(false);
	}, [pathname]);

	// Lock background scroll while the drawer is open.
	useEffect(() => {
		if (drawerOpen) {
			const prev = document.body.style.overflow;
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = prev;
			};
		}
	}, [drawerOpen]);

	// Close the drawer if the viewport grows to desktop — desktop has its own
	// permanent sidebar, so the drawer must release the scroll lock.
	useEffect(() => {
		const onResize = () => {
			if (window.innerWidth >= 1024 && drawerOpen) setDrawerOpen(false);
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [drawerOpen]);

	// Close the profile / notification dropdowns on an outside click.
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

	const handleProfileIconClick = () => setIsMenuOpen((prev) => !prev);
	const handleNotificationIconClick = () =>
		setIsNotificationBarOpen((prev) => !prev);

	// 1) Master Non Individual sees the new Team page; everyone else doesn't.
	// 2) Sub profiles (user role) get their sidebar filtered down to only the
	//    modules the master ticked. Admin role + master + Individual SPs see
	//    everything (can() returns true for them).
	const isMasterNonIndividual =
		session.data?.user.type === "Non Individual" &&
		!(session.data?.user as any)?.addedby?.isSubProfile;

	const providerButtons: ProviderNavItem[] = useMemo(() => {
		const readOnly = isReadOnlySubProfile(session.data);
		const base = ProviderSideBar.filter(
			(b) =>
				(!b.permKey || can(session.data, b.permKey)) &&
				// Coupon Codes has no permKey (shown to everyone by default), but
				// view-only admin sub profiles must not see the coupon section.
				!(
					readOnly &&
					b.href === "/dashboard/serviceprovider/content/createcoupon"
				),
		).map((b) => {
			// The Recommendations tab links to the create form by default. A
			// view-only admin sub can't post, so point their tab at the read-only
			// list instead of the create page.
			if (
				readOnly &&
				b.href === "/dashboard/serviceprovider/recommendations/create"
			) {
				return {
					...b,
					href: "/dashboard/serviceprovider/recommendations/myrecommendations",
				};
			}
			return b;
		});
		if (isMasterNonIndividual) {
			base.push({
				title: "Team",
				href: "/dashboard/serviceprovider/team",
				base: "/dashboard/serviceprovider/team",
				Icon: UserCog,
			});
		}
		return base;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session.data, isMasterNonIndividual]);

	// Trailing slashes in some `base` values would break a naive startsWith,
	// so normalise before comparing.
	const isActive = (item: ProviderNavItem) => {
		const base = item.base.replace(/\/+$/, "");
		return pathname === base || pathname.startsWith(base + "/");
	};

	// First name / firm name only — strip extra whitespace.
	const fullName =
		session.data?.user?.RegName || session.data?.user?.name || "";
	const firstName = fullName.trim().split(/\s+/)[0] || "User";

	const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
		<>
			{providerButtons.map((item) => {
				const Icon = item.Icon;
				const active = isActive(item);
				return (
					<Link
						key={item.href}
						href={item.href}
						onClick={onNavigate}
						className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
							active
								? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
								: "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
						}`}
					>
						<Icon
							className={`w-4 h-4 shrink-0 ${
								active
									? "text-blue-600 dark:text-blue-400"
									: "text-gray-500 dark:text-gray-400"
							}`}
						/>
						<span className="flex-1 truncate">{item.title}</span>
						{active && (
							<span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
						)}
					</Link>
				);
			})}
		</>
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
			{/* Logs out immediately when the session lapses, on any page — without
			    this, expiry is only caught on a server request (see middleware). */}
			<SessionExpiryWatcher callbackUrl="/" />
			<ImpersonationBanner />

			{/* ===================== DESKTOP SIDEBAR (lg+) ===================== */}
			<aside
				className="hidden lg:flex fixed left-0 z-30 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col"
				style={{ top: bannerOffset }}
			>
				{/* Greeting header */}
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
					<NavList />
				</nav>

				<div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
					<p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
						Tradebox · v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"} ·{" "}
						{new Date().getFullYear()}
					</p>
				</div>
			</aside>

			{/* ===================== TOP NAVBAR ===================== */}
			<header
				className="fixed left-0 lg:left-64 right-0 z-30 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 sm:px-5"
				style={{ top: bannerOffset }}
			>
				{/* Left: hamburger (mobile) + greeting */}
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => setDrawerOpen(true)}
						aria-label="Open menu"
						className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition"
					>
						<Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
					</button>
					<h2 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 truncate">
						Welcome, {firstName}
					</h2>
				</div>

				{/* Right: notifications + avatar */}
				<div className="flex items-center gap-2">
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

					<div ref={profileMenuRef} className="relative">
						<div
							className="cursor-pointer relative"
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
							{unreadSupport > 0 && (
								<span
									className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"
									title={`${unreadSupport} support update${
										unreadSupport === 1 ? "" : "s"
									}`}
								/>
							)}
						</div>
						<AnimatePresence>
							{isMenuOpen && <NavMenuDropDown unreadSupport={unreadSupport} />}
						</AnimatePresence>
					</div>
				</div>
			</header>

			{/* ===================== DRAWER (mobile / tablet only) ===================== */}
			<AnimatePresence>
				{drawerOpen && (
					<>
						<motion.div
							key="drawer-backdrop"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							onClick={() => setDrawerOpen(false)}
							className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
						/>

						<motion.aside
							key="drawer-panel"
							initial={{ x: "-100%" }}
							animate={{ x: 0 }}
							exit={{ x: "-100%" }}
							transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
							className="lg:hidden fixed top-0 left-0 z-50 h-screen w-72 max-w-[85vw] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col"
						>
							<div className="px-3 border-b border-gray-200 dark:border-gray-800 flex items-baseline justify-between gap-3">
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

							<nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
								<NavList onNavigate={() => setDrawerOpen(false)} />
							</nav>

							<div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
								<p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
									Tradebox · v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"} ·{" "}
									{new Date().getFullYear()}
								</p>
							</div>
						</motion.aside>
					</>
				)}
			</AnimatePresence>

			{/* ===================== MAIN CONTENT ===================== */}
			<main
				className="lg:pl-64 min-h-screen"
				style={{ paddingTop: 64 + bannerOffset }}
			>
				{children}
			</main>
		</div>
	);
}
