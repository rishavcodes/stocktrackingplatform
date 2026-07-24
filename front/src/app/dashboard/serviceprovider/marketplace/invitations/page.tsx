"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";

interface Invitation {
	marketplaceId: string;
	marketplaceName: string;
	description?: string;
	broker: {
		name: string;
		email: string;
		profileUrl?: string;
	};
	invitation: {
		invitedAt: string;
		status: string;
	};
	createdAt: string;
}

export default function MarketplaceInvitationsPage() {
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [responding, setResponding] = useState<string | null>(null);
	const { data: session } = useSession();
	const fetchInvitations = async ({ silent = false } = {}) => {
		// Don't fire before the session token is hydrated — a `Bearer undefined`
		// request 401s and authFetch would sign the user out.
		if (!session?.backendToken) return;

		if (silent) {
			setRefreshing(true);
		} else {
			setLoading(true);
		}
		try {
			const response = await authFetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/invitations`,
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.backendToken}`,
					},
				},
			);
			const data = await response.json();

			if (data.success) {
				setInvitations(data.data);
			} else {
				toast({
					title: "Error",
					description: data.message || "Failed to fetch invitations",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error fetching invitations:", error);
			toast({
				title: "Error",
				description: "Failed to fetch invitations",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	//helper function to format date
const getInvitiondate = (date?: string | Date) =>
new Date(date ?? new Date()).toLocaleDateString();
	// console.log("invitations", invitations);

	const respondToInvitation = async (
		marketplaceId: string,
		action: "accept" | "reject",
	) => {
		setResponding(marketplaceId);

		try {
			const response = await authFetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/invitations/${marketplaceId}/respond`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.backendToken}`,
					},
					body: JSON.stringify({ action }),
				},
			);

			const data = await response.json();

			if (data.success) {
				toast({
					title: "Success",
					description: data.message,
				});

				// Remove the invitation from the list
				setInvitations((prev) =>
					prev.filter((inv) => inv.marketplaceId !== marketplaceId),
				);
			} else {
				toast({
					title: "Error",
					description: data.message || `Failed to ${action} invitation`,
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error(`Error ${action}ing invitation:`, error);
			toast({
				title: "Error",
				description: `Failed to ${action} invitation`,
				variant: "destructive",
			});
		} finally {
			setResponding(null);
		}
	};

	useEffect(() => {
		if (!session?.backendToken) return;

		// Initial load (shows the loading screen).
		fetchInvitations();

		// Refetch when the user returns to this tab/page so newly-sent
		// invitations appear without a re-login. Silent = no loading flash.
		const onFocus = () => fetchInvitations({ silent: true });
		const onVisibility = () => {
			if (document.visibilityState === "visible") {
				fetchInvitations({ silent: true });
			}
		};
		window.addEventListener("focus", onFocus);
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			window.removeEventListener("focus", onFocus);
			document.removeEventListener("visibilitychange", onVisibility);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session?.backendToken]);

	if (loading) {
		return <div className="p-6">Loading invitations...</div>;
	}

	if (invitations.length === 0) {
		return (
			<div className="p-6">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-2xl font-bold">Marketplace Invitations</h1>
					<Button
						variant="outline"
						size="sm"
						disabled={refreshing}
						onClick={() => fetchInvitations({ silent: true })}
					>
						{refreshing ? "Refreshing..." : "Refresh"}
					</Button>
				</div>
				<p className="text-muted-foreground">
					You have no pending invitations.
				</p>
			</div>
		);
	}
	return (
		<div className="p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Marketplace Invitations</h1>
				<Button
					variant="outline"
					size="sm"
					disabled={refreshing}
					onClick={() => fetchInvitations({ silent: true })}
				>
					{refreshing ? "Refreshing..." : "Refresh"}
				</Button>
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{invitations.map((invitation) => (
					<Card key={invitation.marketplaceId}>
						<CardHeader>
							<CardTitle>{invitation.marketplaceName}</CardTitle>
							<CardDescription>
								Invited by {invitation.broker.name}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{invitation.description && (
								<p className="text-sm text-muted-foreground mb-4">
									{invitation.description}
								</p>
							)}
							<div className="text-sm space-y-1">
								<p>
									<span className="font-medium">Broker Email:</span>{" "}
									{invitation.broker.email}
								</p>
								<p>
									<span className="font-medium">Invited:</span>{" "}
									{getInvitiondate(invitation?.invitation?.invitedAt)}
									
								</p>
							</div>
						</CardContent>
						<CardFooter className="flex gap-2">
							<Button
								onClick={() =>
									respondToInvitation(invitation.marketplaceId, "accept")
								}
								disabled={responding === invitation.marketplaceId}
								className="flex-1"
							>
								{responding === invitation.marketplaceId
									? "Processing..."
									: "Accept"}
							</Button>
							<Button
								variant="outline"
								onClick={() =>
									respondToInvitation(invitation.marketplaceId, "reject")
								}
								disabled={responding === invitation.marketplaceId}
								className="flex-1"
							>
								Reject
							</Button>
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	);
}
