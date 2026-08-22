"use client";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { Edit, Target, DollarSign, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import PlansListSelect from "@/components/MultiSelect/PlansListSelect";
import { getEntryDisplay } from "./entryDisplay";
import { expiryToInputMax, parseExpiry } from "@/lib/parseExpiry";

interface TargetItem {
    price: number;
    isHit?: boolean;
    hitAt?: Date;
}

interface TradeData {
    _id: string;
    scriptname: string;
    entryType: string;
    entryPrice: number;
    target: number;
    targets?: TargetItem[];
    stoploss: number;
    rate?: number;
    upperRange?: number;
    lowerRange?: number;
    validity: string;
    notes?: string;
    link?: string;
    lotsize?: string;
    shareWithPlans?: string[];
    shareWithMarketplaces?: string[];
    shareWith?: string[];
    istriggered: "triggered" | "not triggered";
    status: "open" | "closed";
    holdingPeriod?: "intraday" | "forward";
    exchange?: string;
    ltp?: number;
    expiry?: string;
}

interface TradeModifyConfirmationBoxProps {
    trade: TradeData;
    onUpdate?: (updatedTrade: TradeData) => void;
    isDropdownItem?: boolean;
}

export default function TradeModifyConfirmationBox({
    trade,
    onUpdate,
    isDropdownItem = false,
}: TradeModifyConfirmationBoxProps) {
    const { toast } = useToast();
    const session = useSession();
    const [formData, setFormData] = useState<Partial<TradeData>>({});
    const [targetsForm, setTargetsForm] = useState<TargetItem[]>([]);
    const [shareWithPlans, setShareWithPlans] = useState<string[]>([]);
    const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const hasMultipleTargets = trade.targets && trade.targets.length > 1;
    const isNotTriggered = trade.istriggered === "not triggered" && trade.status === "open";

    useEffect(() => {
        if (trade?._id) {
            setFormData({
                entryPrice: trade.entryPrice,
                target: trade.target,
                stoploss: trade.stoploss,
                validity: trade.validity
                    ? trade.validity.split("T")[0]
                    : "",
                upperRange: trade.upperRange,
                lowerRange: trade.lowerRange,
                holdingPeriod: trade.holdingPeriod,
            });
            if (trade.targets && trade.targets.length > 0) {
                setTargetsForm(trade.targets.map((t) => ({ ...t })));
            }
            setShareWithPlans(trade.shareWithPlans || []);
            setShareWithMarketplaces(trade.shareWithMarketplaces || []);
        }
    }, [trade._id]);

    // Today's date in IST as YYYY-MM-DD — used to decide whether a chosen
    // validity date is "today" (intraday) or a later day (positional).
    const todayIST = (() => {
        const now = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    })();

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        if (["entryPrice", "target", "stoploss", "upperRange", "lowerRange"].includes(name)) {
            if (value.startsWith("-")) return;
            if (!/^\d*\.?\d*$/.test(value)) return;
            const numericValue = value === "" ? 0 : parseFloat(value);
            setFormData((prev) => ({ ...prev, [name]: numericValue }));
        } else if (name === "validity") {
            // Picking a non-today date implicitly converts the trade to
            // positional — the user shouldn't have to flip the selector
            // first. Picking today's date keeps it as intraday.
            setFormData((prev) => ({
                ...prev,
                validity: value,
                holdingPeriod:
                    value && value !== todayIST ? "forward" : "intraday",
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleTargetChange = (index: number, value: string) => {
        if (value.startsWith("-")) return;
        if (!/^\d*\.?\d*$/.test(value)) return;
        const numericValue = value === "" ? 0 : parseFloat(value);
        setTargetsForm((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], price: numericValue };
            return updated;
        });
    };

    const validateForm = (): string | null => {
        const entryPrice = formData.entryPrice ?? trade.entryPrice ?? 0;
        const stoploss = formData.stoploss ?? 0;

        if (hasMultipleTargets) {
            for (let i = 0; i < targetsForm.length; i++) {
                const tp = targetsForm[i].price;
                if (tp <= 0) continue;
                if (trade.entryType === "buy" && tp <= entryPrice) {
                    return `For BUY trade, Target ${i + 1} must be greater than entry price`;
                }
                if (trade.entryType === "sell" && tp >= entryPrice) {
                    return `For SELL trade, Target ${i + 1} must be less than entry price`;
                }
            }
            for (let i = 1; i < targetsForm.length; i++) {
                if (targetsForm[i].price <= 0 || targetsForm[i - 1].price <= 0) continue;
                if (trade.entryType === "buy" && targetsForm[i].price <= targetsForm[i - 1].price) {
                    return `Target ${i + 1} must be greater than Target ${i}`;
                }
                if (trade.entryType === "sell" && targetsForm[i].price >= targetsForm[i - 1].price) {
                    return `Target ${i + 1} must be less than Target ${i}`;
                }
            }
        } else {
            const target = formData.target ?? 0;
            if (target > 0) {
                if (trade.entryType === "buy" && target <= entryPrice) {
                    return "For BUY trade, target must be greater than entry price";
                }
                if (trade.entryType === "sell" && target >= entryPrice) {
                    return "For SELL trade, target must be less than entry price";
                }
            }
        }

        if (stoploss > 0) {
            if (trade.entryType === "buy" && stoploss >= entryPrice) {
                return "For BUY trade, stop loss must be less than entry price";
            }
            if (trade.entryType === "sell" && stoploss <= entryPrice) {
                return "For SELL trade, stop loss must be greater than entry price";
            }
        }

        if (formData.validity) {
            const validityDate = new Date(formData.validity);
            if (isNaN(validityDate.getTime())) {
                return "Invalid validity date";
            }
            const expiryDate = parseExpiry(trade.expiry);
            if (expiryDate && validityDate > expiryDate) {
                return "Validity cannot exceed contract expiry";
            }
        }

        return null;
    };

    async function modifyTrade() {
        if (!trade?._id) {
            toast({
                title: "Error",
                description: "Invalid trade data",
                variant: "destructive",
            });
            return;
        }

        const validationError = validateForm();
        if (validationError) {
            toast({
                title: "Validation Error",
                description: validationError,
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const payload: any = { ...formData };
            if (hasMultipleTargets) {
                payload.targets = targetsForm;
                payload.target = targetsForm[0]?.price || formData.target;
            }
            if (isNotTriggered) {
                payload.shareWithPlans = shareWithPlans;
                payload.shareWithMarketplaces = shareWithMarketplaces;
            }

            // Strip holdingPeriod when it isn't a valid enum value. Legacy
            // recommendations were created before this field existed and may
            // have null / "" stored — sending those triggers the backend's
            // "Invalid holding period" validator. Only forward a real value.
            if (
                payload.holdingPeriod !== "intraday" &&
                payload.holdingPeriod !== "forward"
            ) {
                delete payload.holdingPeriod;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/modify/${trade._id}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: "Success",
                    description: `${trade.scriptname} updated successfully`,
                });

                if (onUpdate) {
                    // Mirror exactly what was sent so the list row re-renders
                    // with the new values. Plain `formData` doesn't carry the
                    // multi-target array (lives in `targetsForm`) or the
                    // not-triggered shareWith fields — so the list was
                    // showing stale data after a target edit.
                    const merged: any = { ...trade, ...formData };
                    if (hasMultipleTargets) {
                        merged.targets = targetsForm;
                        merged.target =
                            targetsForm[0]?.price || formData.target;
                    }
                    if (isNotTriggered) {
                        merged.shareWithPlans = shareWithPlans;
                        merged.shareWithMarketplaces = shareWithMarketplaces;
                    }
                    onUpdate(merged as TradeData);
                }
            } else {
                toast({
                    title: "Error",
                    description: result.message || "Failed to update trade",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update trade, please try again",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Conditions based on backend logic
    const canEditEntryPrice = trade.istriggered === "not triggered" && trade.status === "open";
    const canEditTargetStoploss = (trade.istriggered === "not triggered" || trade.istriggered === "triggered") && trade.status === "open";
    const canEditValidity = trade.status === "open"; // Both not triggered and triggered can edit validity

    // Check if trade has range-based entry (upperRange and lowerRange)
    const hasRangeEntry = trade.upperRange && trade.lowerRange;

    // The validity date is the source of truth — today = intraday, future = positional.
    const isIntraday = (formData.validity || trade.validity?.split("T")[0]) === todayIST;

    // Cap the date picker at the contract expiry for FnO / MCX trades. Cash
    // equity has no expiry, so this is a no-op (`undefined` removes the cap).
    const expiryMaxStr = expiryToInputMax(trade.expiry);

    const hasChanges = (() => {
        const formChanged = Object.keys(formData).some((key) => {
            const formValue = formData[key as keyof TradeData];
            const tradeValue = trade[key as keyof TradeData];
            return formValue !== tradeValue;
        });
        if (formChanged) return true;
        if (hasMultipleTargets && trade.targets) {
            if (targetsForm.some((t, i) => t.price !== trade.targets![i]?.price)) return true;
        }
        if (isNotTriggered) {
            const origPlans = trade.shareWithPlans || [];
            const origMarketplaces = trade.shareWithMarketplaces || [];
            if (JSON.stringify(shareWithPlans.sort()) !== JSON.stringify([...origPlans].sort())) return true;
            if (JSON.stringify(shareWithMarketplaces.sort()) !== JSON.stringify([...origMarketplaces].sort())) return true;
        }
        return false;
    })();

    return (
      <AlertDialog>
        <Toaster />
        <AlertDialogTrigger
          className={
            isDropdownItem
              ? "w-full flex items-center px-2 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
              : "bg-blue-600 p-2 rounded-full text-white hover:bg-blue-700 transition-colors"
          }
        >
          <Edit className={isDropdownItem ? "w-4 h-4 mr-2" : "h-4 w-4"} />
          {isDropdownItem && "Modify Trade"}
        </AlertDialogTrigger>

        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <Edit className="h-4 w-4" /> Modify Trade - {trade.scriptname}
            </AlertDialogTitle>

            <AlertDialogDescription className="text-black dark:text-white text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] ${
                    trade.istriggered === "triggered"
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  }`}
                >
                  {trade.istriggered === "triggered"
                    ? "Initiated"
                    : "Not initiated"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] ${
                    trade.status === "open"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                  }`}
                >
                  {trade.status === "open" ? "Open" : "Closed"}
                </span>
                {hasRangeEntry && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    Range Entry
                  </span>
                )}
                {isIntraday && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    Intraday
                  </span>
                )}
                {trade.status === "closed" && (
                  <span className="text-red-600 dark:text-red-400 font-medium ml-2">
                    Closed — cannot be modified.
                  </span>
                )}
              </div>

              {/* Live price + entry context — surfaces CMP and the
                  range/entry pivot inside the modify modal so the provider
                  doesn't have to flip back to the list to read the LTP. */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                  <span className="opacity-70 uppercase tracking-wider text-[10px]">CMP</span>
                  <span className="font-semibold">
                    {Number(trade.ltp) > 0
                      ? `₹${Number(trade.ltp).toFixed(2)}`
                      : "—"}
                  </span>
                </span>
                {(() => {
                  const e = getEntryDisplay(trade);
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      <span className="opacity-70 uppercase tracking-wider text-[10px]">
                        Entry
                      </span>
                      <span className="font-semibold">
                        {e.isRange && !e.showsBoth ? e.primary : `₹${e.primary}`}
                      </span>
                      {e.subtitle && (
                        <span className="opacity-70">· {e.subtitle}</span>
                      )}
                    </span>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Editable Fields */}
          {trade.status === "open" && (
            <div className="space-y-3 py-2">
              {/* Row 1: Entry Price | Stop Loss | Validity */}
              <div className="grid grid-cols-3 gap-2">
                {/* Entry Price */}
                <div className="space-y-1 p-2.5 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                    Entry Price
                  </h4>
                  {canEditEntryPrice && !hasRangeEntry ? (
                    <Input
                      type="number"
                      name="entryPrice"
                      value={formData.entryPrice || ""}
                      onChange={handleChange}
                      placeholder="Entry Price"
                      className="h-8 text-sm"
                    />
                  ) : (
                    (() => {
                      const e = getEntryDisplay(trade);
                      return (
                        <div className="py-1">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            {e.primary}
                          </p>
                          {e.subtitle && (
                            <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 leading-tight">
                              {e.subtitle}
                            </p>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Stop Loss */}
                <div className="space-y-1 p-2.5 rounded-lg border bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                  <h4 className="text-xs font-semibold text-orange-900 dark:text-orange-100">
                    Stop Loss
                  </h4>
                  <Input
                    type="number"
                    name="stoploss"
                    value={formData.stoploss || ""}
                    onChange={handleChange}
                    placeholder="Stop Loss"
                    className="h-8 text-sm"
                  />
                </div>

                {/* Validity */}
                <div className="space-y-1 p-2.5 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <h4 className="text-xs font-semibold text-green-900 dark:text-green-100">
                    Validity
                  </h4>
                  <Input
                    type="date"
                    name="validity"
                    value={formData.validity || ""}
                    min={todayIST}
                    max={expiryMaxStr ?? undefined}
                    onChange={handleChange}
                    className="h-8 text-sm cursor-pointer"
                  />
                  <p className="text-[11px] text-green-900 dark:text-green-100 leading-tight">
                    {isIntraday ? "Intraday" : "Positional"}
                  </p>
                </div>
              </div>

              {/* Range Entry — only when applicable */}
              {trade.istriggered === "not triggered" && hasRangeEntry && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-purple-900 dark:text-purple-100">
                      Lower Range
                    </label>
                    <Input
                      type="number"
                      name="lowerRange"
                      value={formData.lowerRange || ""}
                      onChange={handleChange}
                      placeholder="Lower Range"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-purple-900 dark:text-purple-100">
                      Upper Range
                    </label>
                    <Input
                      type="number"
                      name="upperRange"
                      value={formData.upperRange || ""}
                      onChange={handleChange}
                      placeholder="Upper Range"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Targets */}
              <div className="space-y-2 p-2.5 rounded-lg border bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                <h4 className="text-xs font-semibold flex items-center gap-1.5 text-orange-900 dark:text-orange-100">
                  <Target className="h-3.5 w-3.5" /> Targets
                </h4>
                {hasMultipleTargets ? (
                  <div
                    className={`grid gap-2 ${targetsForm.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
                  >
                    {targetsForm.map((t, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <label className="text-xs font-medium text-orange-700 dark:text-orange-300 shrink-0">
                          T{i + 1}
                        </label>
                        <Input
                          type="number"
                          value={t.price || ""}
                          onChange={(e) =>
                            handleTargetChange(i, e.target.value)
                          }
                          placeholder={`Target ${i + 1}`}
                          disabled={t.isHit}
                          className="h-8 text-sm"
                        />
                        {t.isHit && (
                          <span className="text-[11px] text-green-600 dark:text-green-400 whitespace-nowrap">
                            ✓
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Input
                    type="number"
                    name="target"
                    value={formData.target || ""}
                    onChange={handleChange}
                    placeholder="Target"
                    className="h-8 text-sm"
                  />
                )}
              </div>

              {/* Share With — only for not triggered trades */}
              {isNotTriggered && session.data?.user?.id && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-100">
                      <Share2 className="h-3.5 w-3.5" /> Plans
                    </label>
                    <PlansListSelect
                      onChange={setShareWithPlans}
                      id={session.data.user.id}
                      initialValues={trade.shareWithPlans}
                    />
                  </div>
                </div>
              )}

              {!hasChanges && (
                <p className="text-yellow-600 dark:text-yellow-400 text-xs text-center">
                  No changes made to the trade data.
                </p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-red-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={modifyTrade}
              disabled={isLoading || trade.status === "closed" || !hasChanges}
            >
              {isLoading ? "Updating..." : "Update Trade"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
}