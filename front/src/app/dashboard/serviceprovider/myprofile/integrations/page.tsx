"use client";

import {
	CheckCircle,
	CreditCard,
	ExternalLink,
	Eye,
	EyeOff,
	Lock,
	MessageCircle,
	RefreshCw,
	Settings,
	Shield,
	Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import useSWR from "swr";
import { Input } from "@/components";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import WhatsappIntegration from "@/components/Whatsapp/WhatsappIntegration";
import fetcher from "@/lib/data/setup";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

type RazorpayDetailsProps = {
	_id?: string;
	keyId: string;
	keySecret: string;
};

type CashfreeDetailsProps = {
	_id?: string;
	appId: string;
	secretKey: string;
};

type IntegrationTab = "payment" | "whatsapp";
type GatewayType = "razorpay" | "cashfree";

const GATEWAY_CONFIG = {
	razorpay: {
		label: "Razorpay",
		color: "blue",
		accent: "from-blue-500 to-blue-700",
		lightBg: "bg-blue-50 dark:bg-blue-950/40",
		border: "border-blue-500",
		ring: "ring-blue-500/20",
		badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
		btnBg: "bg-blue-600 hover:bg-blue-700",
		iconBg: "bg-gradient-to-br from-blue-500 to-blue-700",
		image: "/razerpay.png",
		features: ["UPI Auto-Pay", "Cards & Net Banking", "Auto-Renewal Support"],
	},
	cashfree: {
		label: "Cashfree",
		color: "purple",
		accent: "from-purple-500 to-violet-700",
		lightBg: "bg-purple-50 dark:bg-purple-950/40",
		border: "border-purple-500",
		ring: "ring-purple-500/20",
		badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
		btnBg: "bg-purple-600 hover:bg-purple-700",
		iconBg: "bg-gradient-to-br from-purple-500 to-violet-700",
		image: "/cashfree.png",
		features: ["UPI Collect & Intent", "Cards & Net Banking", "Low Transaction Fees"],
	},
} as const;

const fadeSlide = {
	initial: { opacity: 0, y: 16 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -12 },
	transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
};

export default function IntegrationsPage() {
	const session = useSession();
	const { toast } = useToast();

	const [activeTab, setActiveTab] = useState<IntegrationTab>("payment");
	const [selectedGateway, setSelectedGateway] = useState<GatewayType>("razorpay");
	const [activeIntegration, setActiveIntegration] = useState<GatewayType | null>(null);
	const [saving, setSaving] = useState(false);
	const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

	const { data: razorpayData } = useSWR<{ data: RazorpayDetailsProps }>(
		session.data?.user.id
			? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/get/razorpaykeys?id=${session.data?.user.id}`
			: null,
		fetcher,
	);

	const { data: cashfreeData } = useSWR<{ data: CashfreeDetailsProps }>(
		session.data?.user.id
			? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/get/cashfreekeys?id=${session.data?.user.id}`
			: null,
		fetcher,
	);

	const [razorpayDetails, setRazorpayDetails] = useState<RazorpayDetailsProps>({
		_id: "",
		keyId: "",
		keySecret: "",
	});

	const [cashfreeDetails, setCashfreeDetails] = useState<CashfreeDetailsProps>({
		_id: "",
		appId: "",
		secretKey: "",
	});

	useEffect(() => {
		const spId = session.data?.user.id;
		if (!spId) return;
		(async () => {
			try {
				const res = await fetch(
					`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/get/getsppaymentdetails?id=${spId}`
				);
				const json = await res.json();
				const integration = json?.data?.integration as GatewayType | undefined;
				if (integration === "cashfree" || integration === "razorpay") {
					setSelectedGateway(integration);
					setActiveIntegration(integration);
				}
			} catch {}
		})();
	}, [session.data?.user.id]);

	useEffect(() => {
		if (razorpayData?.data) setRazorpayDetails(razorpayData.data);
	}, [razorpayData?.data]);

	useEffect(() => {
		if (cashfreeData?.data) setCashfreeDetails(cashfreeData.data);
	}, [cashfreeData?.data]);

	function handleRazorpayChange(event: ChangeEvent<HTMLInputElement>) {
		const { name, value } = event.target;
		setRazorpayDetails((prev) => ({ ...prev, [name]: value }));
	}

	function handleCashfreeChange(event: ChangeEvent<HTMLInputElement>) {
		const { name, value } = event.target;
		setCashfreeDetails((prev) => ({ ...prev, [name]: value }));
	}

	async function handleRazorpaySubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/add/razorpaykeys`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: session.data?.user.id,
						name: session.data?.user.RegName,
						email: session.data?.user.email,
						...razorpayDetails,
					}),
				},
			);
			if (res.status !== 200) {
				toast({ title: "Error", description: "Failed to add Razorpay keys", variant: "destructive" });
				return;
			}
			toast({ title: "Success", description: "Razorpay keys added successfully" });
			setActiveIntegration("razorpay");
		} catch {
			toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
		} finally {
			setSaving(false);
		}
	}

	async function updateRazorpayDetails() {
		setSaving(true);
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/update/razorpaykeys`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(razorpayDetails),
				},
			);
			if (res.status !== 200) {
				toast({ title: "Error", description: "Failed to update Razorpay keys", variant: "destructive" });
				return;
			}
			toast({ title: "Success", description: "Razorpay keys updated successfully" });
			setActiveIntegration("razorpay");
		} catch {
			toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
		} finally {
			setSaving(false);
		}
	}

	async function handleCashfreeSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/add/cashfreekeys`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: session.data?.user.id,
						name: session.data?.user.RegName,
						email: session.data?.user.email,
						...cashfreeDetails,
					}),
				},
			);
			if (res.status !== 200) {
				toast({ title: "Error", description: "Failed to add Cashfree keys", variant: "destructive" });
				return;
			}
			toast({ title: "Success", description: "Cashfree keys added successfully" });
			setActiveIntegration("cashfree");
		} catch {
			toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
		} finally {
			setSaving(false);
		}
	}

	async function updateCashfreeDetails() {
		setSaving(true);
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/update/cashfreekeys`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(cashfreeDetails),
				},
			);
			if (res.status !== 200) {
				toast({ title: "Error", description: "Failed to update Cashfree keys", variant: "destructive" });
				return;
			}
			toast({ title: "Success", description: "Cashfree keys updated successfully" });
			setActiveIntegration("cashfree");
		} catch {
			toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
		} finally {
			setSaving(false);
		}
	}

	const toggleSecret = (key: string) =>
		setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));

	const isRazorpayConnected = !!razorpayData?.data?.keyId && activeIntegration === "razorpay";
	const isCashfreeConnected = !!cashfreeData?.data?.appId && activeIntegration === "cashfree";
	const cfg = GATEWAY_CONFIG[selectedGateway];

	return (
		<div className="min-h-screen p-4 md:p-8 dark:bg-blackShade bg-gray-50/80">
			<Toaster />

			<div className="max-w-6xl mx-auto space-y-8">
				

				{/* Tab Switcher */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.4, delay: 0.1 }}
					className="flex justify-center"
				>
					<div className="bg-white dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-sm inline-flex gap-1">
						{[
							{ key: "payment" as IntegrationTab, label: "Payment Gateway", icon: CreditCard, color: "blue" },
							//{ key: "whatsapp" as IntegrationTab, label: "WhatsApp Business", icon: MessageCircle, color: "green" },
						].map((tab) => (
							<button
								key={tab.key}
								onClick={() => setActiveTab(tab.key)}
								className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
									activeTab === tab.key
										? `text-white shadow-lg`
										: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
								}`}
							>
								{activeTab === tab.key && (
									<motion.div
										layoutId="activeTabBg"
										className={`absolute inset-0 rounded-xl ${tab.color === "blue" ? "bg-gradient-to-r from-blue-600 to-blue-700" : "bg-gradient-to-r from-green-600 to-green-700"}`}
										transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
									/>
								)}
								<tab.icon className="w-4 h-4 relative z-10" />
								<span className="relative z-10">{tab.label}</span>
							</button>
						))}
					</div>
				</motion.div>

				{/* Payment Gateway Content */}
				<AnimatePresence mode="wait">
					{activeTab === "payment" && (
						<motion.div
							key="payment"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.35 }}
							className="space-y-6"
						>
							{/* Gateway Cards */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{(["razorpay", "cashfree"] as GatewayType[]).map((gw) => {
									const c = GATEWAY_CONFIG[gw];
									const isActive = selectedGateway === gw;
									const isConnected = gw === "razorpay" ? isRazorpayConnected : isCashfreeConnected;
									return (
										<motion.button
											key={gw}
											type="button"
											onClick={() => setSelectedGateway(gw)}
											whileHover={{ scale: 1.01 }}
											whileTap={{ scale: 0.99 }}
											className={`relative group text-left w-full p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
												isActive
													? `${c.border} ${c.lightBg} shadow-lg ring-4 ${c.ring}`
													: "border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
											}`}
										>
											{isActive && (
												<motion.div
													layoutId="gatewayHighlight"
													className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${c.accent}`}
													transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
												/>
											)}

											<div className="flex items-start justify-between mb-4">
												<div className="flex items-center gap-3">
													<div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isActive ? c.lightBg : "bg-gray-100 dark:bg-gray-800"} transition-all duration-300 shadow-sm border ${isActive ? c.border : "border-transparent"}`}>
														<Image src={c.image} alt={c.label} width={26} height={26} />
													</div>
													<div>
														<p className={`font-bold text-lg ${isActive ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>
															{c.label}
														</p>
														<p className="text-xs text-gray-400 dark:text-gray-500">Payment Gateway</p>
													</div>
												</div>
												<div className="flex items-center gap-2">
													{isConnected && (
														<span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${c.badge} flex items-center gap-1`}>
															<span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
															Connected
														</span>
													)}
													{isActive && (
														<motion.div
															initial={{ scale: 0 }}
															animate={{ scale: 1 }}
															className={`w-6 h-6 rounded-full ${c.iconBg} flex items-center justify-center`}
														>
															<CheckCircle className="w-4 h-4 text-white" />
														</motion.div>
													)}
												</div>
											</div>

											<div className="flex flex-wrap gap-1.5">
												{c.features.map((f) => (
													<span
														key={f}
														className={`text-[11px] px-2 py-0.5 rounded-md transition-colors duration-200 ${
															isActive
																? "bg-white/60 dark:bg-white/10 text-gray-700 dark:text-gray-300"
																: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
														}`}
													>
														{f}
													</span>
												))}
											</div>
										</motion.button>
									);
								})}
							</div>

							{/* Configuration Form */}
							<AnimatePresence mode="wait">
								{selectedGateway === "razorpay" && (
									<motion.div key="razorpay-form" {...fadeSlide}>
										<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-sm overflow-hidden">
											<div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
															<Image src="/razerpay.png" alt="Razorpay" width={24} height={24} className="brightness-0 invert" />
														</div>
														<div>
															<h2 className="text-lg font-bold text-white">Razorpay Configuration</h2>
															<p className="text-blue-100 text-sm">Enter your API credentials to start accepting payments</p>
														</div>
													</div>
													{isRazorpayConnected && (
														<span className="text-xs font-medium bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
															<Shield className="w-3 h-3" />
															Active
														</span>
													)}
												</div>
											</div>

											<form className="p-6 space-y-5" onSubmit={handleRazorpaySubmit}>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
													<div className="space-y-1.5">
														<label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
															<Lock className="w-3.5 h-3.5" />
															Key ID
														</label>
														<Input
															title=""
															type="text"
															name="keyId"
															value={razorpayDetails.keyId}
															onChange={handleRazorpayChange}
															required={true}
															height="py-3"
														/>
													</div>
													<div className="space-y-1.5">
														<label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
															<Lock className="w-3.5 h-3.5" />
															Key Secret
															<button
																type="button"
																onClick={() => toggleSecret("rzpSecret")}
																className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
															>
																{showSecrets.rzpSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
															</button>
														</label>
														<Input
															title=""
															type={showSecrets.rzpSecret ? "text" : "password"}
															name="keySecret"
															value={razorpayDetails.keySecret}
															onChange={handleRazorpayChange}
															required={true}
															height="py-3"
														/>
													</div>
												</div>

												<div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4">
													<div className="flex gap-3">
														<Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
														<div>
															<p className="text-sm font-medium text-blue-800 dark:text-blue-300">Your credentials are encrypted</p>
															<p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
																API keys are stored securely and never exposed to end users. Get your keys from{" "}
																<a href="https://dashboard.razorpay.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
																	Razorpay Dashboard <ExternalLink className="w-3 h-3" />
																</a>
															</p>
														</div>
													</div>
												</div>

												<div className="flex justify-end pt-2">
													{razorpayData?.data ? (
														<button
															type="button"
															onClick={updateRazorpayDetails}
															disabled={saving}
															className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
														>
															{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
															{saving ? "Updating..." : "Update Configuration"}
														</button>
													) : (
														<button
															type="submit"
															disabled={saving}
															className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
														>
															{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
															{saving ? "Saving..." : "Save Configuration"}
														</button>
													)}
												</div>
											</form>
										</div>
									</motion.div>
								)}
								{selectedGateway === "cashfree" && (
									<motion.div key="cashfree-form" {...fadeSlide}>
										<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-sm overflow-hidden">
											<div className="bg-gradient-to-r from-purple-600 to-violet-700 px-6 py-5">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
															<Image src="/cashfree.png" alt="Cashfree" width={24} height={24}  />
														</div>
														<div>
															<h2 className="text-lg font-bold text-white">Cashfree Configuration</h2>
															<p className="text-purple-100 text-sm">Enter your API credentials to start accepting payments</p>
														</div>
													</div>
													{isCashfreeConnected && (
														<span className="text-xs font-medium bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
															<Shield className="w-3 h-3" />
															Active
														</span>
													)}
												</div>
											</div>

											<form className="p-6 space-y-5" onSubmit={handleCashfreeSubmit}>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
													<div className="space-y-1.5">
														<label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
															<Lock className="w-3.5 h-3.5" />
															App ID
														</label>
														<Input
															title=""
															type="text"
															name="appId"
															value={cashfreeDetails.appId}
															onChange={handleCashfreeChange}
															required={true}
															height="py-3"
														/>
													</div>
													<div className="space-y-1.5">
														<label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
															<Lock className="w-3.5 h-3.5" />
															Secret Key
															<button
																type="button"
																onClick={() => toggleSecret("cfSecret")}
																className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
															>
																{showSecrets.cfSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
															</button>
														</label>
														<Input
															title=""
															type={showSecrets.cfSecret ? "text" : "password"}
															name="secretKey"
															value={cashfreeDetails.secretKey}
															onChange={handleCashfreeChange}
															required={true}
															height="py-3"
														/>
													</div>
												</div>

												<div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-xl p-4">
													<div className="flex gap-3">
														<Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
														<div>
															<p className="text-sm font-medium text-purple-800 dark:text-purple-300">Your credentials are encrypted</p>
															<p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-0.5">
																API keys are stored securely and never exposed to end users. Get your keys from{" "}
																<a href="https://merchant.cashfree.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
																	Cashfree Dashboard <ExternalLink className="w-3 h-3" />
																</a>
															</p>
														</div>
													</div>
												</div>

												<div className="flex justify-end pt-2">
													{cashfreeData?.data ? (
														<button
															type="button"
															onClick={updateCashfreeDetails}
															disabled={saving}
															className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
														>
															{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
															{saving ? "Updating..." : "Update Configuration"}
														</button>
													) : (
														<button
															type="submit"
															disabled={saving}
															className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
														>
															{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
															{saving ? "Saving..." : "Save Configuration"}
														</button>
													)}
												</div>
											</form>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>
					)}

					{activeTab === "whatsapp" && (
						<motion.div
							key="whatsapp"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.35 }}
						>
							<WhatsappIntegration />
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
