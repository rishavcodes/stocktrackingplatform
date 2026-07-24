"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components";

export function NavbarWrapper() {
	const pathname = usePathname();

	// Hide navbar if the pathname starts with /view/services
	if (
		pathname.startsWith("/dashboard/serviceprovider") ||
		pathname.startsWith("/dashboard/admin") ||
		pathname.startsWith("/dashboard/user") ||
		pathname.startsWith("/dashboard/templets") ||
		pathname.startsWith("/dashboard/notifications") ||
		pathname.startsWith("/marketplace") ||
		pathname.startsWith("/auth") ||
		pathname.startsWith("/dashboard/broker")
	) {
		return;
	}

	return <Navbar />;
}
