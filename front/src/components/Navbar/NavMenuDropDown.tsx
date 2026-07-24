"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import React from "react";
import DashboardIcon from "@/icons/DashboardIcon";
import SignOutIcon from "@/icons/SignOutIcon";
import { HelpCircle, LogOut, MessageCircle, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type NavMenuDropDownProps = {
	/** When > 0, shows a red dot on the SP "Help & Support" entry. */
	unreadSupport?: number;
};

export default function NavMenuDropDown({
	unreadSupport = 0,
}: NavMenuDropDownProps = {}) {
	const { data: session } = useSession();
	const role = session?.user?.role;

	// Decide which surface this dropdown is on. Anything that isn't an admin /
	// provider / broker is treated as a customer (covers user, undefined, and
	// any unexpected value during a loading state).
	const isAdmin =
		role === "admin" || role === "sub_admin" || role === "super_admin";
	const isProvider = role === "provider";
	const isBroker = role === "broker";
	const isCustomer = !isAdmin && !isProvider && !isBroker;

	type MenuItem = {
		title: string;
		href: string;
		icon: React.ReactElement;
		hasUnread?: boolean;
	};

	let menuItems: MenuItem[] = [];

	if (isCustomer) {
		// "My Profile" lives in the sidebar — don't duplicate it here.
		menuItems = [
			{
				title: "Profile",
				href: "/dashboard/user/myprofile",
				icon: <User />,
			},
			{
				title: "Settings",
				href: "/dashboard/user/settings",
				icon: <Settings />,
			},
			{
				title: "Help & Support",
				href: "/dashboard/user/support",
				icon: <HelpCircle />,
			},
			{
				title: "Chat with Experts",
				href: "/dashboard/user/chats",
				icon: <MessageCircle />,
			},
		];
	} else if (isProvider) {
		menuItems = [
			{
				title: "My Dashboard",
				href: "/dashboard/serviceprovider/overview",
				icon: <DashboardIcon />,
			},
			{
				title: "Help & Support",
				href: "/dashboard/serviceprovider/support",
				icon: <HelpCircle />,
				
			},
			
			
		];
	} else if (isBroker) {
		menuItems = [
			{
				title: "My Dashboard",
				href: "/dashboard/broker/overview",
				icon: <DashboardIcon />,
			},
		];
	} else if (isAdmin) {
		menuItems = [
			{
				title: "My Dashboard",
				href: "/dashboard/admin/serviceprovider",
				icon: <DashboardIcon />,
			},
		];
	}

	const handleLogout = async () => {
		try {
			const token = session?.user?.backendToken;

			if (token) {
				try {
					const logoutEndpoint = isAdmin
						? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/logout`
						: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`;

					await fetch(logoutEndpoint, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
					});
				} catch (backendError) {
					console.error("Backend logout failed:", backendError);
				}
			}

			if (typeof window !== "undefined") {
				localStorage.removeItem("otp_token");
			}

			if (typeof document !== "undefined") {
				const host = window.location.hostname;
				document.cookie = `next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${host}`;
				document.cookie = `__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${host}; secure`;
				document.cookie = `next-auth.callback-url=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${host}`;
				document.cookie = `next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${host}`;
			}

			await signOut({ redirect: false, callbackUrl: "/" });
			window.location.href = "/";
		} catch (error) {
			console.error("Logout error:", error);
			try {
				await signOut({ redirect: false });
				window.location.href = "/";
			} catch {
				window.location.href = "/";
			}
		}
	};

	const containerVariants = {
		hidden: { opacity: 0, y: -10, scale: 0.97 },
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: {
				duration: 0.18,
				ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
				staggerChildren: 0.04,
			},
		},
		exit: {
			opacity: 0,
			y: -8,
			scale: 0.97,
			transition: { duration: 0.12 },
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, x: -6 },
		visible: { opacity: 1, x: 0, transition: { duration: 0.15 } },
	};

	const initial =
		(session?.user?.name || session?.user?.RegName || "U")
			.charAt(0)
			.toUpperCase() || "U";
	const displayName =
		session?.user?.name || session?.user?.RegName || "User";
	const email = session?.user?.email;

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			className="absolute top-[48px] right-0 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-64 overflow-hidden py-1.5"
			style={{ transformOrigin: "top right" }}
		>
			{/* User header — avatar + name + email */}
			<motion.div
				variants={itemVariants}
				className="flex items-center gap-3 px-4 py-3 mb-1 border-b border-gray-100 dark:border-gray-800"
			>
				<Avatar className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700">
					<AvatarImage
						src={session?.user?.profileUrl}
						alt={displayName}
						className="object-cover"
					/>
					<AvatarFallback className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-semibold">
						{initial}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0">
					<p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
						{displayName}
					</p>
					{email && (
						<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
							{email}
						</p>
					)}
				</div>
			</motion.div>

			{/* Menu items */}
			{menuItems.map(({ title, href, icon, hasUnread }) => (
				<motion.div key={title} variants={itemVariants}>
					<Link
						href={href}
						className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition group"
					>
						<span className="relative shrink-0">
							{React.cloneElement(icon, {
								className:
									"w-[18px] h-[18px] text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors",
							})}
							{hasUnread && (
								<span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
							)}
						</span>
						<span className="flex-1 truncate">{title}</span>
						{hasUnread && (
							<span className="text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full">
								New
							</span>
						)}
					</Link>
				</motion.div>
			))}

			{/* Divider + Sign out */}
			{menuItems.length > 0 && (
				<motion.div
					variants={itemVariants}
					className="my-1 border-t border-gray-100 dark:border-gray-800"
				/>
			)}
			<motion.div variants={itemVariants}>
				<button
					type="button"
					onClick={handleLogout}
					className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition group"
				>
					<LogOut className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors shrink-0" />
					<span className="flex-1 text-left">Sign out</span>
				</button>
			</motion.div>
		</motion.div>
	);
}
