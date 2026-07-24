"use client";

import { Bell, ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SideBarIconsArr } from "./SideBarIconsArr";

export type topbarButton = {
	title: string;
	href: string;
	base: string;
};

type TopbarProps = {
	haveAvatar: boolean;
	heading?: string;
	haveCategory?: boolean;
	iconIndex: number;
	buttonsArray: topbarButton[];
	height?: string;
	onToggle?: (collapsed: boolean) => void;
};

export default function Topbar({
	haveAvatar,
	heading,
	buttonsArray,
	iconIndex,
	haveCategory = false,
	height = "h-16",
	onToggle,
}: TopbarProps) {
	const pathname = usePathname();
	const session = useSession();
	const [subscription, setSubscription] = useState<boolean>(false);
	const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
	const [services, setServices] = useState<Record<string, boolean>>({});
	const [isScrolled, setIsScrolled] = useState<boolean>(false);
	const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

	// Scroll effect
	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 10);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Responsive collapse
	useEffect(() => {
		const checkScreenSize = () => {
			const shouldCollapse = window.innerWidth < 1024;
			setIsCollapsed(shouldCollapse);
		};

		checkScreenSize();
		window.addEventListener("resize", checkScreenSize);
		return () => window.removeEventListener("resize", checkScreenSize);
	}, []);

	// Fetch subscription status
	useEffect(() => {
		const fetchSubscription = async () => {
			if (!session.data?.user.id || session?.data?.user.role !== "provider")
				return;

			try {
				const res = await fetch(
					`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/check-subscription?providerId=${session?.data?.user.id}`,
				);
				const data = await res.json();

				if (res.ok && data?.isSubscription === true) {
					setSubscription(true);
					setServices(data?.services || {});
				}
			} catch (error) {
				console.error("Error fetching subscription:", error);
			}
		};

		fetchSubscription();
	}, [session.data?.user.id]);

	const toggleCollapse = () => {
		setIsCollapsed(!isCollapsed);
		onToggle?.(!isCollapsed);
	};

	return (
		<>
			{/* Topbar */}
			<div
				className={cn(
					" dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 fixed top-0 left-0 right-0 transition-all duration-300 mt-24 rounded-md mx-auto",
					isScrolled ? "shadow-lg" : "shadow-sm",
					isCollapsed ? "h-16" : "h-20",
					height,
				)}
			>
				{/* Added top padding to prevent navbar collapse */}
				<div className="w-full">
					<div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
						{/* Left-aligned navigation container */}
						<div className="flex justify-center items-center gap-10 w-full">
							{/* <div>
                   <Link href="/marketplace/serviceprovider">
              <button className="bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500 text-white font-medium px-4 py-2 rounded-lg shadow-md transition-all duration-300">
                Service Provider
              </button>
            </Link>
                </div> */}
							<div className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-hide">
								{buttonsArray.map((button, idx) => {
									const Icon = SideBarIconsArr[iconIndex][idx];
									const isDisabled =
										button.title === "My Plans" && !subscription;
									const isActive = pathname.includes(button.base);

									return (
										<Link
											key={button.title}
											href={isDisabled ? "#" : button.href}
											className={cn(
												"group relative flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 min-w-fit border",
												isActive
													? "text-gray-900 dark:text-white bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 border-green-200 dark:border-green-800 shadow-sm"
													: "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-600",
												isDisabled && "opacity-50 cursor-not-allowed grayscale",
											)}
											title={button.title}
										>
											<Icon
												className={cn(
													"w-5 h-5 transition-transform group-hover:scale-110",
													isActive
														? "text-green-600 dark:text-green-400"
														: "text-gray-500 dark:text-gray-400",
												)}
											/>

											<span
												className={cn(
													"text-sm font-medium whitespace-nowrap transition-colors",
													isActive
														? "text-gray-900 dark:text-white"
														: "text-gray-600 dark:text-gray-300",
												)}
											>
												{button.title}
											</span>

											{/* Hover effect */}
											<div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
										</Link>
									);
								})}
							</div>
							<div></div>
						</div>
					</div>
				</div>
			</div>

			{/* Spacer for fixed positioning - increased top padding */}
			<div
				className={cn(
					"transition-all duration-300 pt-20",
					isCollapsed ? "h-16" : "h-20",
				)}
			/>
		</>
	);
}
