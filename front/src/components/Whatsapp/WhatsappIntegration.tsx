"use client";

import {
	AlertCircle,
	CheckCircle,
	CheckCircle2,
	Clock,
	ExternalLink,
	FileText,
	Info,
	Loader2,
	Mail,
	MessageCircle,
	Phone,
	XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import fetcher from "@/lib/data/setup";

type WhatsAppIntegrationProps = {
	_id?: string;
	businessId: string;
	accessToken: string;
	phoneNumberId: string;
	webhookVerifyToken: string;
	isConnected: boolean;
};

type MessageTemplate = {
	category: "MARKETING" | "AUTHENTICATION" | "UTILITY";
	id: string;
	name: string;
	language: string;
	parameter_format: "POSITIONAL" | "NAMED";
	status: "PENDING" | "APPROVED" | "REJECTED";
	components?: Array<{
		type: string;
		text?: string;
		format?: string;
	}>;
};

const WHATSAPP_API_URL = "https://graph.facebook.com/v23.0";

// Save Integration Overlay Component
const SaveIntegrationOverlay = ({ isVisible }: { isVisible: boolean }) => {
	if (!isVisible) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

			{/* Modal Content */}
			<div className="relative z-10 bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
				<div className="text-center">
					{/* Spinner */}
					<div className="w-16 h-16 mx-auto mb-6">
						<div className="w-16 h-16 border-4 border-green-200 dark:border-green-800 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin" />
					</div>

					{/* Content */}
					<div className="space-y-3">
						<h3 className="text-xl font-semibold text-gray-900 dark:text-white">
							Connecting WhatsApp Business
						</h3>
						<p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
							We&apos;re setting up your WhatsApp Business integration. This may
							take a few moments...
						</p>
					</div>

					{/* Progress indicator */}
					<div className="mt-6 flex items-center justify-center gap-2">
						<div className="flex space-x-1">
							<div
								className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
								style={{ animationDelay: "0ms" }}
							/>
							<div
								className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
								style={{ animationDelay: "150ms" }}
							/>
							<div
								className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
								style={{ animationDelay: "300ms" }}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

const StatusBadge = ({ status }: { status: MessageTemplate["status"] }) => {
	const statusConfig = {
		PENDING: {
			icon: Clock,
			color:
				"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
			text: "Pending",
		},
		APPROVED: {
			icon: CheckCircle2,
			color:
				"bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
			text: "Approved",
		},
		REJECTED: {
			icon: XCircle,
			color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
			text: "Rejected",
		},
	};

	const config = statusConfig[status];
	const IconComponent = config.icon;

	return (
		<span
			className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
		>
			<IconComponent className="w-3 h-3" />
			{config.text}
		</span>
	);
};

const CategoryBadge = ({
	category,
}: {
	category: MessageTemplate["category"];
}) => {
	const categoryConfig = {
		MARKETING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
		AUTHENTICATION:
			"bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
		UTILITY: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
	};

	return (
		<span
			className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${categoryConfig[category]}`}
		>
			{category.toUpperCase()}
		</span>
	);
};

const TemplatesTableSkeleton = () => {
	return (
		<div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="bg-gray-50 dark:bg-gray-800/50">
						<TableHead className="font-semibold">Template Name</TableHead>
						<TableHead className="font-semibold">Category</TableHead>
						<TableHead className="font-semibold">Language</TableHead>
						<TableHead className="font-semibold">Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 2 }).map((_, index) => (
						<TableRow key={index}>
							<TableCell>
								<div className="flex items-center gap-3">
									<Skeleton className="w-8 h-8 rounded-lg" />
									<div className="space-y-2">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-24" />
									</div>
								</div>
							</TableCell>
							<TableCell>
								<Skeleton className="h-6 w-16 rounded-md" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-12" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-6 w-20 rounded-full" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
};

const PendingTemplatesInfo = ({
	templates,
}: {
	templates: MessageTemplate[];
}) => {
	const pendingCount = templates?.filter((t) => t.status === "PENDING").length;
	const approvedCount = templates?.filter(
		(t) => t.status === "APPROVED",
	).length;

	if (pendingCount === 0 || approvedCount > 0) {
		return null;
	}

	return (
		<div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
			<div className="flex items-start gap-3">
				<div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
					<Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
				</div>
				<div className="flex-1">
					<h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
						Templates Pending Approval
					</h4>
					<p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
						You currently have <strong>{pendingCount}</strong> template
						{pendingCount > 1 ? "s" : ""} waiting for approval. You won&apos;t
						be able to send messages until your templates are approved by
						WhatsApp.
					</p>
					<div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
						<Mail className="w-3 h-3" />
						<span>
							Need help? Please contact our support team for assistance.
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

const MessageTemplatesTable = ({
	templates,
	isLoading,
}: {
	templates: MessageTemplate[];
	isLoading: boolean;
}) => {
	if (isLoading) {
		return <TemplatesTableSkeleton />;
	}

	if (templates?.length === 0) {
		return (
			<div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
				<div className="p-12 text-center">
					<div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
						<FileText className="w-8 h-8 text-gray-400" />
					</div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
						No Templates Found
					</h3>
					<p className="text-gray-600 dark:text-gray-300 text-sm">
						You haven&apos;t created any message templates yet. Create your
						first template to get started.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
			<Table>
				<TableHeader>
					<TableRow className="bg-gray-50 dark:bg-gray-800/50">
						<TableHead className="font-semibold text-gray-900 dark:text-white">
							Template Name
						</TableHead>
						<TableHead className="font-semibold text-gray-900 dark:text-white">
							Category
						</TableHead>
						<TableHead className="font-semibold text-gray-900 dark:text-white">
							Language
						</TableHead>
						<TableHead className="font-semibold text-gray-900 dark:text-white">
							Status
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{templates?.map((template) => (
						<TableRow
							key={template.id}
							className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
						>
							<TableCell>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
										<MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
									</div>
									<div>
										<div className="font-medium text-gray-900 dark:text-white">
											{template.name || template.id}
										</div>
										<div className="text-sm text-gray-500 dark:text-gray-400">
											ID: {template.id}
										</div>
									</div>
								</div>
							</TableCell>
							<TableCell>
								<CategoryBadge category={template.category} />
							</TableCell>
							<TableCell>
								<span className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase">
									{template.language}
								</span>
							</TableCell>
							<TableCell>
								<StatusBadge status={template.status} />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
};

const WhatsappIntegration = () => {
	const session = useSession();
	const { toast } = useToast();

	const [userData, setUserData] = useState<any>(null);

	const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(
		[],
	);

	const [isConnectedWhatsAppBusiness, setIsConnectedWhatsAppBusiness] =
		useState(false);
	const [isFetchingMessageTemplates, setIsFetchingMessageTemplates] =
		useState(false);
	const [isSavingWhatsAppIntegration, setIsSavingWhatsAppIntegration] =
		useState(false);

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/getuserdata?id=${session?.data?.user?.id}`,
				);
				const data = await response.json();
				setUserData(data.user);
				setIsConnectedWhatsAppBusiness(
					data?.user?.metadata?.whatsapp?.isConnected,
				);
			} catch (error) {
				console.error("Error fetching user data:", error);
			}
		};

		if (session?.data?.user?.id) {
			fetchUserData();
		}
	}, [session?.data?.user?.id]);

	console.log("USER DATA", userData);

	async function fetchMessageTemplates() {
		setIsFetchingMessageTemplates(true);
		try {
			const res = await fetch(
				`${WHATSAPP_API_URL}/${userData?.metadata?.whatsapp?.wabaId}/message_templates`,
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${process.env.NEXT_PUBLIC_WHATSAPP_SYSTEM_USER_TOKEN}`,
					},
				},
			);
			const data = await res.json();
			console.log("DATA", data);
			setMessageTemplates(data.data);
		} catch (error) {
			console.error("ERROR FETCHING MESSAGE TEMPLATES", error);
		} finally {
			setIsFetchingMessageTemplates(false);
		}
	}

	useEffect(() => {
		window.addEventListener("message", (event) => {
			if (event.origin !== "https://www.facebook.com") return;
			try {
				const data = JSON.parse(event.data);
				if (data.type === "WA_EMBEDDED_SIGNUP") {
					console.log("DATA", data);
					saveWhatsAppIntegration({
						businessId: data?.data?.business_id,
						phoneNumberId: data?.data?.phone_number_id,
						wabaId: data?.data?.waba_id,
					});
				}
			} catch {
				console.log("ERROR", event);
			}
		});

		if (userData?.metadata?.whatsapp?.isConnected) {
			fetchMessageTemplates();
		}
	}, [userData?.metadata?.whatsapp?.isConnected]);

	const fbLoginCallback = (response: any) => {
		console.log("RESPONSE", response);
		if (response.authResponse) {
			const code = response.authResponse.code;
			console.log("CODE", code);
			// The returned code must be transmitted to your backend first and then
			// perform a server-to-server call from there to our servers for an access token.
		}
	};

	// WhatsApp Business Integration Functions
	async function connectWhatsAppBusiness() {
		try {
			window.FB.login(fbLoginCallback, {
				config_id: "1933840790712739", // configuration ID goes here
				response_type: "code", // must be set to 'code' for System User access token
				override_default_response_type: true, // when true, any response types passed in the "response_type" will take precedence over the default types
				extras: { version: "v3", setup: {} },
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to open WhatsApp Business setup",
				variant: "destructive",
			});
		}
	}

	async function saveWhatsAppIntegration(payload: {
		businessId: string;
		phoneNumberId: string;
		wabaId: string;
	}) {
		setIsSavingWhatsAppIntegration(true);
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/whatsapp/connect`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						userId: session.data?.user.id,
						businessId: payload.businessId,
						phoneNumberId: payload.phoneNumberId,
						wabaId: payload.wabaId,
					}),
				},
			);

			if (res.status !== 200) {
				toast({
					title: "Error",
					description: "Failed to save WhatsApp integration",
					variant: "destructive",
				});
				return;
			}
			setIsConnectedWhatsAppBusiness(true);
			toast({
				title: "Success",
				description: "WhatsApp Business integration saved successfully",
				variant: "default",
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Something went wrong",
				variant: "destructive",
			});
		} finally {
			setIsSavingWhatsAppIntegration(false);
		}
	}

	return (
		<div className="space-y-6">
			<FacebookSDKLoader />

			{/* Save Integration Overlay */}
			<SaveIntegrationOverlay isVisible={isSavingWhatsAppIntegration} />
			<div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
				<div className="flex items-center gap-4 mb-8">
					<div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
						<MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
							WhatsApp Business API
						</h2>
						<p className="text-gray-600 dark:text-gray-300">
							Connect with customers through WhatsApp Business messaging
						</p>
					</div>
					{isConnectedWhatsAppBusiness && (
						<div className="ml-auto">
							<span className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
								<CheckCircle className="w-4 h-4" />
								Connected
							</span>
						</div>
					)}
				</div>

				{!isConnectedWhatsAppBusiness ? (
					<div className="text-center py-12">
						<div className="w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
							<Phone className="w-12 h-12 text-green-600 dark:text-green-400" />
						</div>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
							Connect WhatsApp Business
						</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
							Set up WhatsApp Business API to send automated messages,
							notifications, and engage with your customers.
						</p>
						<button
							type="button"
							onClick={connectWhatsAppBusiness}
							className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg hover:shadow-xl"
						>
							<MessageCircle className="w-5 h-5" />
							Connect WhatsApp Business
							<ExternalLink className="w-4 h-4" />
						</button>
					</div>
				) : (
					<div className="space-y-6">
						<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
									<CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
								</div>
								<div className="flex-1">
									<h4 className="text-lg font-semibold text-green-800 dark:text-green-200">
										WhatsApp Business Connected Successfully
									</h4>
									<p className="text-green-600 dark:text-green-300 text-sm">
										Your WhatsApp Business integration is active and ready to
										send messages
									</p>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
									<span className="text-sm font-medium text-green-700 dark:text-green-300">
										Active
									</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{isConnectedWhatsAppBusiness && (
				<div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
								<FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<h3 className="text-xl font-bold text-gray-900 dark:text-white">
									Message Templates
								</h3>
								<p className="text-gray-600 dark:text-gray-300 text-sm">
									Manage your WhatsApp message templates
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={fetchMessageTemplates}
								disabled={isFetchingMessageTemplates}
								className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isFetchingMessageTemplates ? (
									<div className="flex items-center gap-2">
										<Loader2 className="w-4 h-4 animate-spin" />
										Refreshing...
									</div>
								) : (
									"Refresh"
								)}
							</button>
						</div>
					</div>

					{!isFetchingMessageTemplates && (
						<PendingTemplatesInfo templates={messageTemplates} />
					)}

					<MessageTemplatesTable
						templates={messageTemplates}
						isLoading={isFetchingMessageTemplates}
					/>
				</div>
			)}
		</div>
	);
};

export default WhatsappIntegration;

const FacebookSDKLoader = () => {
	useEffect(() => {
		window.fbAsyncInit = () => {
			window.FB.init({
				appId: "4056624121221221",
				autoLogAppEvents: true,
				xfbml: true,
				version: "v23.0",
			});
		};

		const script = document.createElement("script");
		script.src = "https://connect.facebook.net/en_US/sdk.js";
		script.async = true;
		script.defer = true;
		script.crossOrigin = "anonymous";
		document.body.appendChild(script);

		return () => {
			document.body.removeChild(script);
		};
	}, []);

	return <div id="fb-root" />;
};
