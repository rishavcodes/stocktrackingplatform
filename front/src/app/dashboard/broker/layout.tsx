"use client";

import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import NavMenuDropDown from "@/components/Navbar/NavMenuDropDown";
import NotificationDrowdown from "@/components/Notifications/NotificationDrowDown";
import { useUnreadNotifications } from "@/components/Notifications/useUnreadNotifications";
import Sidebar, { type sidebarButton } from "@/components/Sidebar/Sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationIcon from "@/icons/NotificationIcon";
import NProgress from "@/lib/nprogress-config";

const BrokerSideBar: sidebarButton[] = [
	{
		title: "Overview",
		base: "/dashboard/broker/overview",
		href: "/dashboard/broker/overview",
	},
	{
		title: "Analytics",
		base: "/dashboard/broker/analytics",
		href: "/dashboard/broker/analytics",
	},
	{
		title: "Profile",
		href: "/dashboard/broker/myprofile",
		base: "/dashboard/broker/myprofile",
	},
	{
		title: "Marketplace",
		href: "/dashboard/broker/marketplace",
		base: "/dashboard/broker/marketplace",
	},
	{
		title: "Wallet",
		base: "/dashboard/broker/wallet",
		href: "/dashboard/broker/wallet",
	},
	{
		title: "Subscribers",
		href: "/dashboard/broker/subscribers",
		base: "/dashboard/broker/subscribers",
	},
	{
		title: "Leads",
		href: "/dashboard/broker/leads",
		base: "/dashboard/broker/leads",
	},
	{
		title: "Providers",
		href: "/dashboard/broker/providers",
		base: "/dashboard/broker/providers",
	},
];
 
export default function Brokerlayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = useSession();
	const pathname = usePathname();

	const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
	const [isNotificationBarOpen, setIsNotificationBarOpen] =
		useState<boolean>(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	useEffect(() => {
		// Start progress bar whenever route starts changing
		NProgress.start();

		// Stop when route fully loaded
		const timeout = setTimeout(() => {
			NProgress.done();
		}, 500); // Adjust for smoother transition

		return () => clearTimeout(timeout);
	}, [pathname]);

	// Collapse sidebar below 1200px
	useEffect(() => {
		const checkScreenSize = () => {
			setSidebarCollapsed(window.innerWidth < 1200);
		};

		checkScreenSize(); // initial run
		window.addEventListener("resize", checkScreenSize);

		return () => window.removeEventListener("resize", checkScreenSize);
	}, []);

	const handleSidebarToggle = (collapsed: boolean) => {
		setSidebarCollapsed(collapsed);
	};

	const handleProfileIconClick = () => {
		setIsMenuOpen((prev) => !prev);
	};
	const { count: unreadCount, refetch: refetchUnread } = useUnreadNotifications(
		session?.data?.user?.id,
		session?.data?.user?.role,
	);

	const handleNotificationIconClick = () => {
		setIsNotificationBarOpen((prev) => {
			const next = !prev;
			if (!next) refetchUnread();
			return next;
		});
	};

	const brokerButtons =
		session.data?.user.type === "Non Individual"
			? [
					...BrokerSideBar,
					{
						title: "Sub profiles",
						href: "/dashboard/broker/addsubprofile",
						base: "/dashboard/broker/addsubprofile",
					},
				]
			: BrokerSideBar;

	return (
		<div className="bg-white min-h-screen dark:bg-blackShade flex relative top-[-70px]">
			<div className="flex-shrink-0">
				<Sidebar
					haveAvatar={true}
					buttonsArray={brokerButtons}
					haveCategory={true}
					iconIndex={0}
					onToggle={handleSidebarToggle}
					collapsed={sidebarCollapsed} // optional prop if your Sidebar uses it
				/>
			</div>

			<div
				className={`flex flex-col flex-grow transition-all duration-300 ${
					sidebarCollapsed ? "ml-16" : "ml-[280px]"
				}`}
			>
				<div
					className={`fixed top-0 right-0 z-40 h-[80px] bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end px-6 shadow-sm transition-all`}
					style={{ left: sidebarCollapsed ? "4rem" : "280px" }}
				>
					{sidebarCollapsed && (
						<div className="flex items-center space-x-2">
							<h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
								Welcome, {session?.data?.user?.RegName}
							</h2>
						</div>
					)}

					<div className="flex items-center space-x-4">
						<button
							type="button"
							onClick={handleNotificationIconClick}
							className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative"
						>
							<NotificationIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
							{unreadCount > 0 && (
								<span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
									{unreadCount > 99 ? "99+" : unreadCount}
								</span>
							)}
						</button>

						<div className="relative">
							<AnimatePresence>
								{isNotificationBarOpen && <NotificationDrowdown />}
							</AnimatePresence>
						</div>

						<div className="cursor-pointer" onClick={handleProfileIconClick}>
							<Avatar className="w-12 h-12 rounded-full border dark:border-gray-600">
								<AvatarImage
									src={session.data?.user.profileUrl}
									alt={session.data?.user.name}
									className="object-cover"
								/>
								<AvatarFallback className="bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
									<Image
										src={"/images/avatar/avatar.jpg"}
										alt="avatar"
										width={1280}
										height={720}
									/>
								</AvatarFallback>
							</Avatar>
						</div>
						<div className="relative">
							<AnimatePresence>
								{isMenuOpen && <NavMenuDropDown />}
							</AnimatePresence>
						</div>
					</div>
				</div>

				{/* ✅ CHILDREN BELOW TOPBAR */}
				<div className="flex-1 overflow-y-auto mt-[150px]">{children}</div>
			</div>
		</div>
	);
}
