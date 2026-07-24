"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Info, Loader2, Minus, Plus } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { getBrokerSession } from "@/lib/brokerSession";

interface Recommendation {
	_id: string;
	authorData: {
		id: string;
		name: string;
		email: string;
		authorImage?: string;
		type?: string;
	};
	exchange: string;
	scriptname: string;
	token: string;
	entryPrice: number;
	entryType: string;
	target: number;
	stoploss: number;
	validity: string;
	status: string;
	result: string;
	createdAt: string;
	pnlpercentage?: any;
	pnl?: any;
}

const EXCHANGE_SEGMENT_MAP: Record<string, string> = {
	NSE: "nse_cm",
	BSE: "bse_cm",
	NFO: "nse_fo",
	BFO: "bse_fo",
	MCX: "mcx_fo",
	CDS: "cde_fo",
};

const FNO_EXCHANGES = new Set(["NFO", "BFO", "MCX", "CDS"]);

interface BuyOrderModalProps {
	isOpen: boolean;
	onClose: () => void;
	recommendation: Recommendation;
	brokerType?: "alice-blue" | "bigul";
}

export function BuyOrderModal({
	isOpen,
	onClose,
	recommendation,
	brokerType = "alice-blue",
}: BuyOrderModalProps) {
	const [orderType, setOrderType] = useState<"Buy" | "Sell">("Buy");
	const [exchange, setExchange] = useState<string>("NSE");
	const [tradeType, setTradeType] = useState<"DELIVERY" | "INTRADAY">("INTRADAY");
	const [orderStrategy, setOrderStrategy] = useState<"Regular" | "Cover">("Cover");
	const [quantity, setQuantity] = useState(1);
	const [orderTypeValue, setOrderTypeValue] = useState<"Market" | "Limit">("Market");
	const [limitPrice, setLimitPrice] = useState<number>(recommendation.entryPrice || 0);
	const [coverStopLoss, setCoverStopLoss] = useState(719.00);
	const [stopLossEnabled, setStopLossEnabled] = useState(false);
	const [triggerPrice, setTriggerPrice] = useState<number>(recommendation.stoploss || 0);
	const [validity, setValidity] = useState<"Day" | "IOC">("Day");
	const [disclosedQuantity, setDisclosedQuantity] = useState(false);
	const [disclosedQuantityValue, setDisclosedQuantityValue] = useState(0);
	const [placing, setPlacing] = useState(false);
	const [orderError, setOrderError] = useState<string | null>(null);
	const [orderSuccess, setOrderSuccess] = useState(false);
	const [marketDataReady, setMarketDataReady] = useState(false);
	const [marketDataError, setMarketDataError] = useState<string | null>(null);
	/** From market data tf/tk: lp (last price), pc (percentage change) for the scorecard exchange */
	const [liveLtp, setLiveLtp] = useState<number | null>(null);
	const [livePc, setLivePc] = useState<number | null>(null);
	/** Depth data (dk/df): bp1–5, sp1–5, bq1–5, sq1–5, bo1–5, so1–5, lp, pc, etc. */
	const [depthData, setDepthData] = useState<Record<string, number | string>>({});
	const [availableMargin, setAvailableMargin] = useState<number | null>(null);
	const [requiredMargin, setRequiredMargin] = useState<number | null>(null);
	const [marginLoading, setMarginLoading] = useState(false);
	const [bigulScript, setBigulScript] = useState<{
		scripCode: string;
		tradingSymbol: string;
		segment: string;
	} | null>(null);
	const [bigulScriptLoading, setBigulScriptLoading] = useState(false);
	const { toast } = useToast();
	const { data: session } = useSession();
	const brokerSession = useMemo(
		() => (brokerType === "bigul" ? getBrokerSession(session) : null),
		[brokerType, session]
	);

	const ALICE_BLUE_SESSION_KEY = "aliceBlueSession";

	// Resolve Angel One token → Bigul ScripCode/TradingSymbol when modal opens
	useEffect(() => {
		if (!isOpen || brokerType !== "bigul" || !recommendation) return;
		const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
		if (!baseUrl) return;

		setBigulScript(null);
		setBigulScriptLoading(true);
		let cancelled = false;

		(async () => {
			try {
				const params = new URLSearchParams({
					exchange: recommendation.exchange,
					token: recommendation.token,
					scriptname: recommendation.scriptname,
				});
				const res = await fetch(`${baseUrl}/api/bigul/resolve-script?${params}`);
				const data = await res.json();
				if (!cancelled && data.found) {
					setBigulScript({
						scripCode: data.scripCode,
						tradingSymbol: data.tradingSymbol,
						segment: data.segment,
					});
				}
			} catch {
				// Resolution failed — order will still attempt with Angel One values
			} finally {
				if (!cancelled) setBigulScriptLoading(false);
			}
		})();

		return () => { cancelled = true; };
	}, [isOpen, brokerType, recommendation?.exchange, recommendation?.token, recommendation?.scriptname]);

	// Sync form defaults from recommendation when modal opens
	useEffect(() => {
		if (!isOpen || !recommendation) return;
		setExchange(recommendation.exchange || "NSE");
		setLimitPrice(recommendation.entryPrice || 0);
		setTriggerPrice(recommendation.stoploss || 0);
		setCoverStopLoss(recommendation.stoploss || 0);
		setOrderType(recommendation.entryType === "Sell" ? "Sell" : "Buy");
		setOrderError(null);
		setOrderSuccess(false);
		setLiveLtp(null);
		setLivePc(null);
		setMarketDataError(null);
		setDepthData({});
		setDisclosedQuantityValue(0);
	}, [isOpen, recommendation]);

	// Shared market:data handler for both Alice Blue and Bigul feeds
	const handleMarketData = (data: unknown) => {
		const msg = data as { t?: string; e?: string; lp?: number | string; pc?: number | string; [k: string]: unknown };
		if (msg.t === "tf" || msg.t === "tk") {
			const lp = msg.lp;
			const pc = msg.pc;
			if (lp !== undefined && lp !== null) {
				const n = typeof lp === "number" ? lp : parseFloat(String(lp));
				if (!Number.isNaN(n)) setLiveLtp(n);
			}
			if (pc !== undefined && pc !== null) {
				const n = typeof pc === "number" ? pc : parseFloat(String(pc));
				if (!Number.isNaN(n)) setLivePc(n);
			}
		}
		if (msg.t === "dk" || msg.t === "df") {
			const depthKeys = [
				"lp", "pc", "o", "h", "l", "c", "ap", "v", "oi", "ltq", "ltt", "tbq", "tsq", "uc", "lc",
				"bp1", "bp2", "bp3", "bp4", "bp5", "sp1", "sp2", "sp3", "sp4", "sp5",
				"bq1", "bq2", "bq3", "bq4", "bq5", "sq1", "sq2", "sq3", "sq4", "sq5",
				"bo1", "bo2", "bo3", "bo4", "bo5", "so1", "so2", "so3", "so4", "so5",
				"ts", "e", "tk",
			];
			const update: Record<string, number | string> = {};
			for (const key of depthKeys) {
				const v = msg[key];
				if (v !== undefined && v !== null) {
					update[key] = typeof v === "number" ? v : String(v);
				}
			}
			if (Object.keys(update).length) {
				setDepthData((prev) => ({ ...prev, ...update }));
			}
		}
	};

	// Alice Blue market data (Socket.IO namespace /marketdata)
	useEffect(() => {
		if (!isOpen || !recommendation || brokerType !== "alice-blue") return;
		const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
		if (!baseUrl) return;

		const socket: Socket = io(`${baseUrl}/marketdata`);

		socket.on("connect", () => {
			setMarketDataError(null);
			const raw = typeof window !== "undefined" ? localStorage.getItem(ALICE_BLUE_SESSION_KEY) : null;
			const sessionData = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
			const userSession = sessionData?.userSession;
			const clientId = sessionData?.clientId;
			if (userSession && clientId) {
				socket.emit("init", { sessionId: userSession, clientId });
			}
		});

		socket.on("market:init", () => {
			setMarketDataReady(true);
			setMarketDataError(null);
			const token = `${recommendation.exchange}|${recommendation.token}`;
			socket.emit("subscribe:market", { tokens: token });
			socket.emit("subscribe:depth", { tokens: token });
		});

		socket.on("market:error", (payload: { message?: string }) => {
			setMarketDataReady(false);
			setMarketDataError(payload?.message ?? "Market data error");
		});

		socket.on("market:data", handleMarketData);

		socket.on("disconnect", () => {
			setMarketDataReady(false);
		});

		return () => {
			socket.disconnect();
			socket.off("market:init");
			socket.off("market:error");
			socket.off("market:data");
		};
	}, [isOpen, recommendation?.exchange, recommendation?.token, brokerType]);

	// Bigul market data (Socket.IO namespace /marketdatabigul)
	useEffect(() => {
		if (!isOpen || !recommendation || brokerType !== "bigul") return;
		if (bigulScriptLoading) return;
		const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
		if (!baseUrl) return;

		const resolvedToken = bigulScript?.scripCode ?? recommendation.token;
		const resolvedSegment = bigulScript?.segment ?? EXCHANGE_SEGMENT_MAP[recommendation.exchange] ?? "nse_cm";

		const socket: Socket = io(`${baseUrl}/marketdatabigul`);

		socket.on("connect", () => {
			setMarketDataError(null);
			const accessToken = brokerSession?.accessToken;
			if (accessToken) {
				socket.emit("init", { accessToken });
			}
		});

		socket.on("market:init", () => {
			setMarketDataReady(true);
			setMarketDataError(null);
			const scrips = `${resolvedSegment}|${resolvedToken}`;
			socket.emit("subscribe:market", { scrips });
			socket.emit("subscribe:depth", { scrips });
		});

		socket.on("market:error", (payload: { message?: string }) => {
			setMarketDataReady(false);
			setMarketDataError(payload?.message ?? "Market data error");
		});

		socket.on("market:data", handleMarketData);

		socket.on("disconnect", () => {
			setMarketDataReady(false);
		});

		return () => {
			socket.disconnect();
			socket.off("market:init");
			socket.off("market:error");
			socket.off("market:data");
		};
	}, [isOpen, recommendation?.exchange, recommendation?.token, brokerType, bigulScript, bigulScriptLoading, brokerSession?.accessToken]);

	// Bigul: fetch available margin (user-limits) when modal opens
	useEffect(() => {
		if (!isOpen || brokerType !== "bigul" || !recommendation) return;
		const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
		if (!baseUrl) return;

		const accessToken = brokerSession?.accessToken;
		const clientCode = brokerSession?.clientCode;
		if (!accessToken || !clientCode) return;

		const exchMap: Record<string, string> = { NSE: "NSE", BSE: "BSE", MCX: "MCX", NFO: "NSE", BFO: "BSE", CDS: "NSE" };
		const segMap: Record<string, string> = { NSE: "CASH", BSE: "CASH", MCX: "CASH", NFO: "FO", BFO: "FO", CDS: "CUR" };
		const isFnO = FNO_EXCHANGES.has(recommendation.exchange);
		const prodMap: Record<string, string> = { DELIVERY: isFnO ? "NRML" : "CNC", INTRADAY: "MIS" };

		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(`${baseUrl}/api/bigul/orders/user-limits`, {
					method: "POST",
					headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
					body: JSON.stringify({
						source: "B2B",
						clientCode,
						seg: segMap[recommendation.exchange] || "CASH",
						exch: exchMap[recommendation.exchange] || "NSE",
						prod: prodMap[tradeType] || "MIS",
					}),
				});
				const result = await res.json();
				if (!cancelled && result.success && result.data) {
					const avl = parseFloat(result.data.avlMrgn ?? result.data.availableMargin ?? "0");
					setAvailableMargin(isNaN(avl) ? 0 : avl);
				}
			} catch {
				// Silently fail — margin display will remain as --
			}
		})();
		return () => { cancelled = true; };
	}, [isOpen, brokerType, recommendation?.exchange, tradeType, brokerSession?.accessToken, brokerSession?.clientCode]);

	// Bigul: fetch required margin when order parameters change (debounced)
	useEffect(() => {
		if (!isOpen || brokerType !== "bigul" || !recommendation) return;
		if (bigulScriptLoading) return;
		const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
		if (!baseUrl) return;

		const accessToken = brokerSession?.accessToken;
		const clientCode = brokerSession?.clientCode;
		if (!accessToken || !clientCode) return;

		const resolvedToken = bigulScript?.scripCode ?? recommendation.token;
		const resolvedSegment = bigulScript?.segment ?? EXCHANGE_SEGMENT_MAP[recommendation.exchange] ?? "nse_cm";

		setMarginLoading(true);
		const timer = setTimeout(async () => {
			try {
				const res = await fetch(`${baseUrl}/api/bigul/orders/check-margin`, {
					method: "POST",
					headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
					body: JSON.stringify({
						source: "B2B",
						clientCode,
						brnchId: "HO",
						exSeg: resolvedSegment,
						prc: orderTypeValue === "Limit" ? String(limitPrice.toFixed(2)) : "0",
						prcTp: orderTypeValue === "Limit" ? "L" : "MKT",
						prod: tradeType === "DELIVERY" ? "CNC" : "MIS",
						qty: String(quantity),
						tok: resolvedToken,
						trnsTp: orderType === "Buy" ? "B" : "S",
					}),
				});
				const result = await res.json();
				if (result.success && result.data) {
					const reqd = parseFloat(result.data.reqdMrgn ?? result.data.ordMrgn ?? "0");
					setRequiredMargin(isNaN(reqd) ? 0 : reqd);
					const avl = parseFloat(result.data.avlMrgn ?? "0");
					if (!isNaN(avl) && avl > 0) setAvailableMargin(avl);
				}
			} catch {
				// Silently fail
			} finally {
				setMarginLoading(false);
			}
		}, 500);

		return () => { clearTimeout(timer); setMarginLoading(false); };
	}, [isOpen, brokerType, quantity, orderTypeValue, limitPrice, tradeType, orderType, recommendation?.exchange, recommendation?.token, bigulScript, bigulScriptLoading, brokerSession?.accessToken, brokerSession?.clientCode]);

	const handleQuantityChange = (delta: number) => {
		setQuantity((prev) => Math.max(1, prev + delta));
	};

	const handleLimitPriceChange = (delta: number) => {
		setLimitPrice((prev) => {
			const next = (prev || 0) + delta;
			return Math.max(0, Number(next.toFixed(2)));
		});
	};

	const handleStopLossChange = (delta: number) => {
		setCoverStopLoss((prev) => Math.max(0, prev + delta));
	};

	const handleTriggerPriceChange = (delta: number) => {
		setTriggerPrice((prev) => {
			const next = (prev || 0) + delta;
			return Math.max(0, Number(next.toFixed(2)));
		});
	};

	// Disclosed quantity validation: must be < total quantity and between 10% and 90%
	const dqMin = Math.ceil(0.1 * quantity);
	const dqMax = Math.min(quantity - 1, Math.floor(0.9 * quantity));
	const dqValidRange = dqMin <= dqMax;
	const isDisclosedQtyInvalid =
		disclosedQuantity &&
		dqValidRange &&
		(disclosedQuantityValue < dqMin || disclosedQuantityValue > dqMax);

	// Clamp disclosed quantity to 10%–90% when order quantity changes
	useEffect(() => {
		if (!disclosedQuantity || !dqValidRange) return;
		setDisclosedQuantityValue((prev) => Math.max(dqMin, Math.min(dqMax, prev)));
	}, [quantity]);

	const handlePlaceOrder = async () => {
		if (placing) return;
		setOrderError(null);

		// ── Bigul order placement ──────────────────────────────────────────────
		if (brokerType === "bigul") {
			const accessToken = brokerSession?.accessToken;
			const clientCode = brokerSession?.clientCode;

			if (!accessToken) {
				const msg = "Please log in with Bigul first.";
				setOrderError(msg);
				toast({ title: "Login required", description: msg, variant: "destructive" });
				return;
			}

			const exSeg = bigulScript?.segment ?? EXCHANGE_SEGMENT_MAP[recommendation.exchange] ?? "nse_cm";
			const resolvedToken = bigulScript?.scripCode ?? recommendation.token;
			const resolvedSymbol = bigulScript?.tradingSymbol ?? recommendation.scriptname;
			const pt = orderTypeValue === "Limit" ? "L" : "MKT";
			const isFnO = FNO_EXCHANGES.has(recommendation.exchange);
			const pc = tradeType === "DELIVERY" ? (isFnO ? "NRML" : "CNC") : "MIS";
			const rt = validity === "Day" ? "DAY" : "IOC";
			const tt = orderType === "Buy" ? "B" : "S";
			const pr = orderTypeValue === "Limit" ? String(limitPrice.toFixed(2)) : "0";
			const tp = stopLossEnabled ? String(triggerPrice.toFixed(2)) : "0";
			const dq = disclosedQuantity ? String(disclosedQuantityValue) : "0";

			const payload = {
				source: "B2B",
				clientCode,
				es: exSeg,
				ts: resolvedSymbol,
				tk: resolvedToken,
				tt,
				pt,
				pc,
				rt,
				qt: String(quantity),
				pr,
				mp: "0",
				tp,
				am: "NO",
				dq,
				cf: "N",
				pf: "N",
				ur: "",
			};

			setPlacing(true);
			try {
				const res = await fetch(
					`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bigul/orders/place-order`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
						body: JSON.stringify(payload),
					}
				);
				const result = await res.json();
				if (result.success) {
					setOrderSuccess(true);
					setOrderError(null);
					toast({
						title: "Order placed successfully",
						description: result.data?.nOrdNo
							? `Order ID: ${result.data.nOrdNo}`
							: result.message || "Your order has been submitted.",
						variant: "success",
					});
					onClose();
				} else {
					const errMsg = result.message || "Failed to place order";
					setOrderError(errMsg);
					toast({ title: "Order failed", description: errMsg, variant: "destructive" });
				}
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : "Failed to place order";
				setOrderError(errMsg);
				toast({ title: "Order failed", description: errMsg, variant: "destructive" });
			} finally {
				setPlacing(false);
			}
			return;
		}

		// ── Alice Blue order placement ─────────────────────────────────────────
		const raw = typeof window !== "undefined" ? localStorage.getItem(ALICE_BLUE_SESSION_KEY) : null;
		const sessionData = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
		const userSession = sessionData?.userSession;

		if (!userSession) {
			const msg = "Please log in with Alice Blue first. Use the login link and return here.";
			setOrderError(msg);
			toast({
				title: "Login required",
				description: msg,
				variant: "destructive",
			});
			return;
		}

		const exchangeForContract = FNO_EXCHANGES.has(recommendation.exchange)
			? recommendation.exchange
			: exchange;
		let instrumentId = recommendation.token;
		try {
			const contractRes = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/aliceblue/contract?exchange=${encodeURIComponent(exchangeForContract)}&symbol=${encodeURIComponent(recommendation.scriptname || "")}`
			);
			const contractResult = await contractRes.json();
			if (contractResult.success && (contractResult.data?.instrumentId ?? contractResult.data?.token)) {
				instrumentId = String(contractResult.data.instrumentId ?? contractResult.data.token);
			}
		} catch {
			// Keep recommendation.token as fallback
		}

		const product = tradeType === "DELIVERY" ? "LONGTERM" : "INTRADAY";
		const orderComplexity = orderStrategy === "Regular" ? "REGULAR" : "CO";
		const orderTypeApi = orderTypeValue === "Market" ? "MARKET" : "LIMIT";
		const validityApi = validity === "Day" ? "DAY" : "IOC";

		const order: Record<string, string | number> = {
			exchange: FNO_EXCHANGES.has(recommendation.exchange) ? recommendation.exchange : exchange,
			instrumentId,
			transactionType: orderType === "Buy" ? "BUY" : "SELL",
			quantity,
			product,
			orderComplexity,
			orderType: orderTypeApi,
			validity: validityApi,
			price: orderTypeApi === "LIMIT" ? limitPrice.toFixed(2) : "",
			slLegPrice: "",
			targetLegPrice: "",
			slTriggerPrice: "",
			disclosedQuantity: "",
			marketProtectionPercent: "",
			deviceId: "123",
			trailingSlAmount: "",
			apiOrderSource: "",
			algoId: "",
			orderTag: "",
		};

		if (orderTypeApi === "LIMIT") {
			order.price = limitPrice.toFixed(2);
		}
		if (orderStrategy === "Cover" && tradeType === "INTRADAY") {
			order.slTriggerPrice = coverStopLoss.toFixed(2);
			order.slLegPrice = coverStopLoss.toFixed(2);
			order.targetLegPrice = String(recommendation.target ?? "");
		} else if (stopLossEnabled) {
			order.slTriggerPrice = triggerPrice.toFixed(2);
			order.slLegPrice = triggerPrice.toFixed(2);
			order.targetLegPrice = String(recommendation.target ?? "");
		}
		if (orderStrategy === "Regular" && disclosedQuantity) {
			// Validate: DQ must be less than quantity and between 10% and 90%
			if (disclosedQuantityValue >= quantity) {
				setOrderError("Disclosed quantity must be less than total order quantity.");
				toast({ title: "Validation", description: "Disclosed quantity must be less than total order quantity.", variant: "destructive" });
				return;
			}
			if (!dqValidRange) {
				setOrderError("Order quantity must be at least 2 to use disclosed quantity (10%–90% range).");
				toast({ title: "Validation", description: "Increase order quantity to use disclosed quantity.", variant: "destructive" });
				return;
			}
			if (disclosedQuantityValue < dqMin || disclosedQuantityValue > dqMax) {
				setOrderError(`Disclosed quantity must be between 10% and 90% of order quantity (${dqMin}–${dqMax} for this order).`);
				toast({ title: "Validation", description: "Disclosed quantity must be between 10% and 90% of order quantity.", variant: "destructive" });
				return;
			}
			order.disclosedQuantity = String(disclosedQuantityValue);
		}

		setPlacing(true);
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/aliceblue/orders/place-order`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${userSession}`,
					},
					body: JSON.stringify([order]),
				}
			);
			const result = await res.json();

			if (result.success) {
				setOrderSuccess(true);
				setOrderError(null);
				const first = Array.isArray(result.data) ? result.data[0] : result.data;
				const brokerOrderId = first?.brokerOrderId;
				const requestTime = first?.requestTime;
				toast({
					title: "Order placed successfully",
					description: brokerOrderId
						? `Order ID: ${brokerOrderId}${requestTime ? ` • ${requestTime}` : ""}`
						: result.message || "Your order has been submitted.",
				});
				onClose();
			} else {
				const errMsg = result.message || result.error?.message || "Failed to place order";
				setOrderError(errMsg);
				toast({
					title: "Order failed",
					description: errMsg,
					variant: "destructive",
				});
			}
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : "Failed to place order";
			setOrderError(errMsg);
			toast({
				title: "Order failed",
				description: errMsg,
				variant: "destructive",
			});
		} finally {
			setPlacing(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
			<DialogContent className="max-w-md w-full max-h-[95vh] overflow-y-auto p-0 sm:rounded-2xl">
				<DialogHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b px-4 py-3">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 flex-1 min-w-0">
							<Button
								variant="ghost"
								size="icon"
								onClick={onClose}
								className="h-8 w-8 flex-shrink-0"
							>
								<ArrowLeft className="h-5 w-5" />
							</Button>
							<DialogTitle className="text-lg font-semibold truncate">
								{recommendation.scriptname}
							</DialogTitle>
							<Popover>
								<PopoverTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
										<Info className="h-4 w-4" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-80 max-h-[80vh] overflow-y-auto" align="end" side="bottom">
									<div className="space-y-4">
										<h4 className="font-bold text-sm mb-3 text-gray-900 dark:text-gray-100">Order Information</h4>
										
										<div className="space-y-1">
											<h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
												Exchange (NSE/BSE):
											</h5>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												Choose your preferred exchange to punch your order. NSE and BSE may usually have slightly different prices and liquidity.
											</p>
										</div>

										<div className="space-y-1">
											<h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
												Product Type Selection:
											</h5>
											<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
												<strong>Delivery:</strong> A Delivery order is used for buying a stock with the intention to hold it for the long term.
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												<strong>Intraday:</strong> An Intraday order is used for buying or selling a stock within the same trading day.
											</p>
										</div>

										<div className="space-y-1">
											<h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
												Order Types:
											</h5>
											<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
												<strong>Regular:</strong> Standard market or limit order.
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
												<strong>Stop Loss:</strong> Place a protective stop loss order.
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
												<strong>Cover:</strong> Protect your positions with cover trigger price feature.
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												<strong>Bracket:</strong> Place order with target and stop loss in one go.
											</p>
										</div>

										<div className="space-y-1">
											<h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
												Quantity:
											</h5>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												Enter the number of shares you want to trade. Use +/- buttons to adjust.
											</p>
										</div>

										<div className="space-y-1">
											<h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
												Price:
											</h5>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												Set your desired purchase price. Select &apos;Market&apos; for immediate execution at current market price or &apos;Limit&apos; to specify your price.
											</p>
										</div>

										<div className="space-y-1">
											<h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
												Disclosed Quantity:
											</h5>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												The portion of your total order quantity that will be visible to other market participants. Setting a lower disclosed quantity can help minimize impact on market price for large orders. Can be 0 or equal to total quantity.
											</p>
										</div>

										<div className="space-y-1">
											<h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
												Validity:
											</h5>
											<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
												<strong>Day:</strong> Order valid for current trading day only.
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												<strong>IOC (Immediate or Cancel):</strong> Order will execute immediately and rest any unfilled portion gets cancelled.
											</p>
										</div>

										<div className="space-y-1">
											<h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
												Market Depth:
											</h5>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												View real-time buying and selling activity at different price levels. Shows pending orders and quantities, bid-ask spread differences.
											</p>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</div>
						<div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-shrink-0">
							<Button
								variant={orderType === "Buy" ? "default" : "ghost"}
								size="sm"
								onClick={() => setOrderType("Buy")}
								className={`h-7 px-3 text-xs ${
									orderType === "Buy"
										? "bg-green-600 hover:bg-green-700 text-white"
										: "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
								}`}
							>
								Buy
							</Button>
							<Button
								variant={orderType === "Sell" ? "default" : "ghost"}
								size="sm"
								onClick={() => setOrderType("Sell")}
								className={`h-7 px-3 text-xs ${
									orderType === "Sell"
										? "bg-red-600 hover:bg-red-700 text-white"
										: "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
								}`}
							>
								Sell
							</Button>
						</div>
					</div>
				</DialogHeader>

				<div className="px-4 py-4 space-y-4 bg-white dark:bg-gray-900">

					{/* Exchange with live lp/pc from market data */}
					{recommendation.exchange && (
						<div className="grid grid-cols-1 gap-2">
							<button
								type="button"
								onClick={() => setExchange(recommendation.exchange)}
								className="flex items-center gap-2 p-3 rounded-lg border-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 transition-all"
							>
								<div className="w-4 h-4 rounded-full border-2 border-blue-600 bg-blue-600 flex items-center justify-center flex-shrink-0">
									<div className="w-2 h-2 rounded-full bg-white" />
								</div>
								<div className="text-left min-w-0">
									<div className="font-medium text-sm">{recommendation.exchange}</div>
									<div className="text-xs text-gray-600 dark:text-gray-400">
										{liveLtp != null ? liveLtp.toFixed(2) : "—"}
									</div>
									<div className={`text-xs ${(livePc ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
										{livePc != null ? `${livePc >= 0 ? "+" : ""}${Number(livePc).toFixed(2)}%` : "—"}
									</div>
								</div>
							</button>
						</div>
					)}

					{/* Trade Type Selection */}
					<div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
						<Button
							variant={tradeType === "DELIVERY" ? "default" : "ghost"}
							size="sm"
							onClick={() => {
								setTradeType("DELIVERY");
								// Delivery should always be Regular
								setOrderStrategy("Regular");
							}}
							className={`flex-1 h-9 text-xs ${
								tradeType === "DELIVERY"
									? "bg-blue-600 hover:bg-blue-700 text-white"
									: "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
							}`}
						>
							DELIVERY
						</Button>
						<Button
							variant={tradeType === "INTRADAY" ? "default" : "ghost"}
							size="sm"
							onClick={() => setTradeType("INTRADAY")}
							className={`flex-1 h-9 text-xs ${
								tradeType === "INTRADAY"
									? "bg-blue-600 hover:bg-blue-700 text-white"
									: "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
							}`}
						>
							INTRADAY
						</Button>
					</div>

					{/* Order Strategy Selection */}
					<div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
						<Button
							variant={orderStrategy === "Regular" ? "default" : "ghost"}
							size="sm"
							onClick={() => setOrderStrategy("Regular")}
							className={`flex-1 h-9 text-xs ${
								orderStrategy === "Regular"
									? "bg-blue-600 hover:bg-blue-700 text-white"
									: "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
							}`}
						>
							Regular
						</Button>
						<Button
							variant={orderStrategy === "Cover" ? "default" : "ghost"}
							size="sm"
							disabled={tradeType === "DELIVERY"}
							onClick={() => {
								if (tradeType === "INTRADAY") {
									setOrderStrategy("Cover");
									// Use dedicated cover stop loss instead of generic SL
									setStopLossEnabled(false);
								}
							}}
							className={`flex-1 h-9 text-xs ${
								orderStrategy === "Cover" && tradeType === "INTRADAY"
									? "bg-blue-600 hover:bg-blue-700 text-white"
									: "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
							} ${
								tradeType === "DELIVERY"
									? "opacity-60 cursor-not-allowed"
									: ""
							}`}
						>
							Cover
						</Button>
					</div>

					{/* Quantity – label left, controls right */}
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<Label className="text-sm font-medium">Quantity</Label>
							<Info className="h-4 w-4 text-gray-400" />
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="icon"
								onClick={() => handleQuantityChange(-1)}
								className="h-10 w-10 shrink-0"
							>
								<Minus className="h-4 w-4" />
							</Button>
							<Input
								type="number"
								value={quantity}
								onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
								className="w-24 text-center shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
							/>
							<Button
								variant="outline"
								size="icon"
								onClick={() => handleQuantityChange(1)}
								className="h-10 w-10 shrink-0"
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{/* Order Type – label left, options right */}
					<div className="flex items-center justify-between gap-3">
						<Label className="text-sm font-medium shrink-0">Order Type</Label>
						<RadioGroup
							value={orderTypeValue}
							onValueChange={(value) => {
								setOrderTypeValue(value as "Market" | "Limit");
								if (value === "Limit" && liveLtp != null) setLimitPrice(liveLtp);
							}}
							className="flex gap-4"
						>
							<div className="flex items-center gap-2">
								<RadioGroupItem value="Market" id="market" />
								<Label htmlFor="market" className="cursor-pointer">
									Market
								</Label>
							</div>
							<div className="flex items-center gap-2">
								<RadioGroupItem value="Limit" id="limit" />
								<Label htmlFor="limit" className="cursor-pointer">
									Limit
								</Label>
							</div>
						</RadioGroup>
					</div>

					{/* Limit Price – single line: label left, input right (only for Limit orders) */}
					{orderTypeValue === "Limit" && (
						<div className="flex items-center justify-between gap-2">
							<Label className="text-sm font-medium shrink-0">Limit Price</Label>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="icon"
									onClick={() => handleLimitPriceChange(-1)}
									className="h-10 w-10 shrink-0"
								>
									<Minus className="h-4 w-4" />
								</Button>
								<Input
									type="number"
									value={limitPrice}
									onChange={(e) => {
										const value = parseFloat(e.target.value);
										setLimitPrice(Number.isNaN(value) ? 0 : Math.max(0, value));
									}}
									className="w-24 text-center shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
									step="0.01"
								/>
								<Button
									variant="outline"
									size="icon"
									onClick={() => handleLimitPriceChange(1)}
									className="h-10 w-10 shrink-0"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}

					{/* Cover Stop Loss – single line (only for INTRADAY + Cover) */}
					{tradeType === "INTRADAY" && orderStrategy === "Cover" && (
						<div className="flex items-center justify-between gap-2">
							<Label className="text-sm font-medium shrink-0">Cover Stop Loss</Label>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="icon"
									onClick={() => handleStopLossChange(-1)}
									className="h-10 w-10 shrink-0"
								>
									<Minus className="h-4 w-4" />
								</Button>
								<Input
									type="number"
									value={coverStopLoss}
									onChange={(e) =>
										setCoverStopLoss(Math.max(0, parseFloat(e.target.value) || 0))
									}
									className="w-24 text-center shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
									step="0.01"
								/>
								<Button
									variant="outline"
									size="icon"
									onClick={() => handleStopLossChange(1)}
									className="h-10 w-10 shrink-0"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}

					{/* Generic Stop Loss toggle & Trigger Price – single line when enabled */}
					{!(tradeType === "INTRADAY" && orderStrategy === "Cover") && (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-sm font-medium">Stop Loss</Label>
								<Switch
									checked={stopLossEnabled}
									onCheckedChange={setStopLossEnabled}
								/>
							</div>
							{stopLossEnabled && (
								<div className="flex items-center justify-between gap-2">
									<Label className="text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0">
										Trigger Price
									</Label>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="icon"
											onClick={() => handleTriggerPriceChange(-1)}
											className="h-10 w-10 shrink-0"
										>
											<Minus className="h-4 w-4" />
										</Button>
										<Input
											type="number"
											value={triggerPrice}
											onChange={(e) => {
												const value = parseFloat(e.target.value);
												setTriggerPrice(
													Number.isNaN(value) ? 0 : Math.max(0, value),
												);
											}}
											className="w-24 text-center shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
											step="0.01"
										/>
										<Button
											variant="outline"
											size="icon"
											onClick={() => handleTriggerPriceChange(1)}
											className="h-10 w-10 shrink-0"
										>
											<Plus className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Validity – label left, options right */}
					<div className="flex items-center justify-between gap-3">
						<Label className="text-sm font-medium shrink-0">Validity</Label>
						<RadioGroup
							value={validity}
							onValueChange={(value) => setValidity(value as "Day" | "IOC")}
							className="flex gap-4"
						>
							<div className="flex items-center gap-2">
								<RadioGroupItem value="Day" id="day" />
								<Label htmlFor="day" className="cursor-pointer">
									Day
								</Label>
							</div>
							<div className="flex items-center gap-2">
								<RadioGroupItem value="IOC" id="ioc" />
								<Label htmlFor="ioc" className="cursor-pointer">
									IOC
								</Label>
							</div>
						</RadioGroup>
					</div>

					{/* Disclosed Quantity – only for Regular; label/switch row, input on next line right-aligned */}
					{orderStrategy === "Regular" && (
						<div className="flex flex-col gap-2">
							<div
								role="button"
								tabIndex={0}
								onClick={() => setDisclosedQuantity((prev) => !prev)}
								onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setDisclosedQuantity((prev) => !prev); }}
								className="flex items-center justify-between gap-2 cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 px-1 -mx-1 py-0.5"
							>
								<div className="flex items-center gap-2">
									<Label className="text-sm font-medium cursor-pointer">Disclosed Quantity</Label>
									<Popover>
										<PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
											<button type="button" className="rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700">
												<Info className="h-4 w-4 text-gray-400" />
											</button>
										</PopoverTrigger>
										<PopoverContent className="w-80 max-h-[80vh] overflow-y-auto" align="start" side="bottom">
											<p className="text-xs text-gray-700 dark:text-gray-300">
												<strong>Disclosed Quantity:</strong><br />
												The portion of your total order quantity that will be visible to other market participants. Setting a lower disclosed quantity can help minimize impact on market price for large orders. Can be 0 or equal to total quantity.
											</p>
										</PopoverContent>
									</Popover>
								</div>
								<Switch
									checked={disclosedQuantity}
									disabled={!dqValidRange}
									onCheckedChange={(checked) => {
										setDisclosedQuantity(checked);
										if (checked && dqValidRange) {
											const defaultVal = Math.min(dqMax, Math.max(dqMin, Math.round(0.5 * quantity)));
											setDisclosedQuantityValue(defaultVal);
										}
									}}
									onClick={(e) => e.stopPropagation()}
								/>
							</div>
							{!dqValidRange && (
								<p className="text-xs text-amber-600 dark:text-amber-500">
									Order quantity must be at least 2 to use disclosed quantity (10%–90%).
								</p>
							)}
							{disclosedQuantity && dqValidRange && (
								<>
									<div className="flex justify-end gap-2">
										<Button
											variant="outline"
											size="icon"
											onClick={() => setDisclosedQuantityValue((prev) => Math.max(dqMin, prev - 1))}
											className="h-10 w-10 shrink-0"
										>
											<Minus className="h-4 w-4" />
										</Button>
										<Input
											type="number"
											min={dqMin}
											max={dqMax}
											value={disclosedQuantityValue}
											onChange={(e) => {
												const v = parseInt(e.target.value, 10);
												if (Number.isNaN(v)) return;
												setDisclosedQuantityValue(Math.max(dqMin, Math.min(dqMax, v)));
											}}
											className="w-24 text-center shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
										/>
										<Button
											variant="outline"
											size="icon"
											onClick={() => setDisclosedQuantityValue((prev) => Math.min(dqMax, prev + 1))}
											className="h-10 w-10 shrink-0"
										>
											<Plus className="h-4 w-4" />
										</Button>
									</div>
									<p className="text-xs text-gray-500 dark:text-gray-400 text-right">
										Recommended: 10%–90% of order quantity ({dqMin}–{dqMax} for this order).
									</p>
									{isDisclosedQtyInvalid && (
										<p className="text-xs text-red-600 dark:text-red-500 text-right">
											Disclosed quantity must be between {dqMin} and {dqMax}.
										</p>
									)}
								</>
							)}
						</div>
					)}

					{orderError && (
						<div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
							{orderError}
						</div>
					)}
					{orderSuccess && (
						<div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-300">
							Order placed successfully.
						</div>
					)}

					{/* Market Depth (from depth feed dk/df: bp1–5, sp1–5, bq1–5, sq1–5, bo1–5, so1–5) */}
					<div className="space-y-2 pt-2 border-t dark:border-gray-800">
						<Label className="text-sm font-medium underline">Market Depth</Label>
						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr className="border-b dark:border-gray-800">
										<th className="text-left py-2 text-green-600 dark:text-green-500">Orders</th>
										<th className="text-left py-2 text-green-600 dark:text-green-500">Qty</th>
										<th className="text-left py-2 text-green-600 dark:text-green-500">Bid</th>
										<th className="text-left py-2 text-red-600 dark:text-red-500">Offer</th>
										<th className="text-left py-2 text-red-600 dark:text-red-500">Qty</th>
										<th className="text-left py-2 text-red-600 dark:text-red-500">Orders</th>
									</tr>
								</thead>
								<tbody>
									{[1, 2, 3, 4, 5].map((i) => {
										const bo = depthData[`bo${i}`] ?? "—";
										const bq = depthData[`bq${i}`] ?? "—";
										const bp = depthData[`bp${i}`] != null ? Number(depthData[`bp${i}`]).toFixed(2) : "—";
										const sp = depthData[`sp${i}`] != null ? Number(depthData[`sp${i}`]).toFixed(2) : "—";
										const sq = depthData[`sq${i}`] ?? "—";
										const so = depthData[`so${i}`] ?? "—";
										return (
											<tr key={i} className="border-b dark:border-gray-800/50">
												<td className="py-1.5 text-green-600 dark:text-green-500">{String(bo)}</td>
												<td className="py-1.5 text-green-600 dark:text-green-500">{String(bq)}</td>
												<td className="py-1.5 text-green-600 dark:text-green-500">{bp}</td>
												<td className="py-1.5 text-red-600 dark:text-red-500">{sp}</td>
												<td className="py-1.5 text-red-600 dark:text-red-500">{String(sq)}</td>
												<td className="py-1.5 text-red-600 dark:text-red-500">{String(so)}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
						{depthData.lp != null && (
							<p className="text-xs text-gray-500 dark:text-gray-400">
								LTP: {Number(depthData.lp).toFixed(2)}
								{depthData.pc != null && ` (${Number(depthData.pc).toFixed(2)}%)`}
							</p>
						)}
					</div>
				</div>

				{/* Fixed footer: Margin + Buy/Sell button */}
				<div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex flex-col">
					{/* Margin Information – fixed above button */}
					<div className="flex justify-between px-4 pt-3 pb-2 border-b dark:border-gray-800">
						<div>
							<Label className="text-sm text-gray-600 dark:text-gray-400">Available Margin</Label>
							<div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
								{availableMargin !== null ? `₹${availableMargin.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
							</div>
						</div>
						<div className="text-right">
							<Label className="text-sm text-gray-600 dark:text-gray-400">Required Margin</Label>
							<div className={`text-lg font-semibold ${requiredMargin !== null && availableMargin !== null && requiredMargin > availableMargin ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
								{marginLoading ? (
									<Loader2 className="h-4 w-4 animate-spin inline-block" />
								) : requiredMargin !== null ? (
									`₹${requiredMargin.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
								) : "—"}
							</div>
							{requiredMargin !== null && availableMargin !== null && requiredMargin > availableMargin && (
								<p className="text-xs text-red-500 mt-0.5">Insufficient margin</p>
							)}
						</div>
					</div>
					{/* Buy Now / Sell Now Button */}
					<div className="p-4">
					<Button
						className={`w-full h-12 text-base font-semibold ${
							orderType === "Buy"
								? "bg-green-600 hover:bg-green-700"
								: "bg-red-600 hover:bg-red-700"
						} text-white disabled:opacity-70 disabled:pointer-events-none`}
						onClick={handlePlaceOrder}
						disabled={placing}
						aria-busy={placing}
					>
						{placing ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
								Placing…
							</>
						) : (
							<>{orderType} Now</>
						)}
					</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
