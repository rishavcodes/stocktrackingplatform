"use client";

import { Check, ChevronDown, FileText, IndianRupee, Image as ImageIcon, Loader2, Package, Plus, Store, X } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { authFetch } from "@/lib/authFetch";
import { useRouter }  from "next/navigation";

type Plan = {
    _id: string;
    title: string;
};

type PricingTier = {
    validity: number;
    price: number;
};

type PackageForm = {
    title: string;
    description: string;
    pricingPlans: PricingTier[];
    bannerURL: File | null;
    tncFile: File | null;
};

export default function CreatePackage() {
    const { data: session } = useSession();
    const { toast } = useToast();
    
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");

    const [plans, setPlans] = useState<Plan[]>([]);
    const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
    const [showPlanDropdown, setShowPlanDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>([]);

    const [form, setForm] = useState<PackageForm>({
        title: "",
        description: "",
        pricingPlans: [{ validity: 30, price: 0 }],
        bannerURL: null,
        tncFile: null,
    });
const  router  = useRouter();
    /* ---------------- FETCH PLANS ---------------- */
    useEffect(() => {
        if (!session?.user.id) return;

        fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allservicesforcoupon?id=${session.user.id}`
        )
            .then(res => res.json())
            .then(data => setPlans(data.data || []))
            .catch(() => {
                toast({
                    title: "Error",
                    description: "Failed to load plans",
                    variant: "destructive",
                });
            });
    }, [session?.user.id]);

    /* ---------------- CLOSE DROPDOWN ON OUTSIDE CLICK ---------------- */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setShowPlanDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    /* ---------------- HANDLERS ---------------- */

    const changeHandler = (e: any) => {
        setForm(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const bannerHandler = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "Image too large",
                description: "Banner image must be 5MB or less",
                variant: "destructive",
            });
            e.target.value = "";
            return;
        }

        setPreviewUrl(URL.createObjectURL(file));
        setForm(prev => ({ ...prev, bannerURL: file }));
    };

    const tncHandler = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            toast({
                title: "Invalid file",
                description: "Only PDF allowed",
                variant: "destructive",
            });
            e.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "PDF too large",
                description: "Terms & Conditions PDF must be 5MB or less",
                variant: "destructive",
            });
            e.target.value = "";
            return;
        }

        setForm(prev => ({ ...prev, tncFile: file }));
    };

    /* ---------------- PLAN LOGIC ---------------- */

    const togglePlan = (id: string) => {
        setSelectedPlanIds(prev =>
            prev.includes(id)
                ? prev.filter(p => p !== id)
                : [...prev, id]
        );
    };

    const selectAllPlans = (e: any) => {
        e.stopPropagation();
        setSelectedPlanIds(plans.map(p => p._id));
    };

    const clearAll = (e: any) => {
        e.stopPropagation();
        setSelectedPlanIds([]);
    };

    const removePlan = (id: string, e: any) => {
        e.stopPropagation();
        setSelectedPlanIds(prev => prev.filter(p => p !== id));
    };

    /* ---------------- SUBMIT ---------------- */

    const submit = async (e: any) => {
        e.preventDefault();

        if (selectedPlanIds.length < 2) {
            toast({
                title: "Select plans",
                description: "Minimum 2 plans required",
                variant: "destructive",
            });
            return;
        }

        if (!form.bannerURL || !form.tncFile) {
            toast({
                title: "Files missing",
                description: "Banner & TnC required",
                variant: "destructive",
            });
            return;
        }

        for (const tier of form.pricingPlans) {
            if (!tier.price || tier.price <= 0 || !tier.validity || tier.validity <= 0) {
                toast({
                    title: "Invalid pricing",
                    description: "Every tier needs a valid price and validity",
                    variant: "destructive",
                });
                return;
            }
            if (tier.validity > 365) {
                toast({
                    title: "Invalid validity",
                    description: "Validity must be between 1 and 365 days",
                    variant: "destructive",
                });
                return;
            }
        }

        setLoading(true);

        const payload = {
            title: form.title,
            description: form.description,
            includedServices: selectedPlanIds,
            pricingPlans: form.pricingPlans.map((t) => ({
                price: Number(t.price),
                validity: Number(t.validity),
            })),
            shareWithMarketplaces,
            authorData: {
                id: session?.user.id,
                name: session?.user.RegName,
                email: session?.user.email,
                type: session?.user.category,
                authorImage: session?.user.profileUrl ?? "",
                aboutAuthor: session?.user.aboutMe,
            },
        };

        const fd = new FormData();
        fd.append("data", JSON.stringify(payload));
        fd.append("bannerURL", form.bannerURL);
        fd.append("tncFile", form.tncFile);

        try {
            const res = await authFetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/package/create`,
                {
                    method: "POST", headers: {
                        Authorization: `Bearer ${session?.backendToken}`, // ✅ added
                    }, body: fd
                }
            );

            const data = await res.json();

            if (res.status === 200) {
                toast({
                    title: "Success",
                    description: "Package created successfully",
                    variant: "success",
                });
                router.push("/dashboard/serviceprovider/packages/mypackages")
            } else {
                toast({
                    title: "Error",
                    description: data.message,
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 p-4">
            <form
                onSubmit={submit}
                className="mx-auto max-w-7xl"
            >
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

                    {/* Header */}
                   

                    {/* Basic Info: title + plans */}
                    <div className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Package Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={changeHandler}
                                    placeholder="e.g. Pro Trader Bundle"
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>

                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Included Plans <span className="text-red-500">*</span>
                                    <span className="font-normal text-gray-400 ml-1">(min 2)</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPlanDropdown(!showPlanDropdown)}
                                    className="w-full h-10 px-3 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                >
                                    <span className={selectedPlanIds.length === 0 ? "text-gray-400" : ""}>
                                        {selectedPlanIds.length === 0
                                            ? "Select plans"
                                            : `${selectedPlanIds.length} plan${selectedPlanIds.length > 1 ? "s" : ""} selected`}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPlanDropdown ? "rotate-180" : ""}`} />
                                </button>

                                {showPlanDropdown && (
                                    <div className="absolute z-20 mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg max-h-64 overflow-y-auto">
                                        <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                {selectedPlanIds.length}/{plans.length} selected
                                            </span>
                                            <div className="flex gap-1">
                                                <button type="button" onClick={selectAllPlans} className="h-6 text-xs px-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium">
                                                    Select All
                                                </button>
                                                <button type="button" onClick={clearAll} className="h-6 text-xs px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-1.5">
                                            {plans.length === 0 ? (
                                                <div className="text-center text-gray-500 py-4 text-xs">
                                                    No plans available
                                                </div>
                                            ) : (
                                                plans.map(plan => {
                                                    const isSelected = selectedPlanIds.includes(plan._id);
                                                    return (
                                                        <div
                                                            key={plan._id}
                                                            className={`flex items-center gap-2 px-2 py-2 rounded-md transition ${isSelected
                                                                ? "bg-blue-50 dark:bg-blue-900/20"
                                                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                                                        >
                                                            <Checkbox
                                                                id={`plan-${plan._id}`}
                                                                checked={isSelected}
                                                                onCheckedChange={() => togglePlan(plan._id)}
                                                            />
                                                            <span
                                                                className="text-sm flex-1 cursor-pointer text-gray-700 dark:text-gray-200"
                                                                onClick={() => togglePlan(plan._id)}
                                                            >
                                                                {plan.title}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}

                                {selectedPlanIds.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {plans
                                            .filter((p) => selectedPlanIds.includes(p._id))
                                            .map((plan) => (
                                                <span
                                                    key={plan._id}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-800"
                                                >
                                                    {plan.title}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => removePlan(plan._id, e)}
                                                        className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition"
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                </span>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Description
                            </label>
                            <textarea
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                                placeholder="Describe your package benefits and features..."
                                name="description"
                                value={form.description}
                                onChange={changeHandler}
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800"></div>

                    {/* Pricing Tiers */}
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <IndianRupee className="w-4 h-4 text-emerald-600" />
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pricing Tiers</h3>
                                <span className="text-xs text-gray-400">• add up to 5 validity/price options</span>
                            </div>
                            {form.pricingPlans.length < 5 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            pricingPlans: [...prev.pricingPlans, { validity: 30, price: 0 }],
                                        }))
                                    }
                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Tier
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {form.pricingPlans.map((tier, idx) => (
                                <div
                                    key={idx}
                                    className="relative p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800/20 hover:border-blue-300 dark:hover:border-blue-700 transition"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded-full uppercase tracking-wide">
                                            Tier {idx + 1}
                                        </span>
                                        {form.pricingPlans.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        pricingPlans: prev.pricingPlans.filter((_, i) => i !== idx),
                                                    }))
                                                }
                                                className="text-gray-400 hover:text-red-500 p-0.5 rounded transition"
                                            >
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-[10px] font-medium mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Validity
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={365}
                                                    value={tier.validity || ""}
                                                    onChange={(e) => {
                                                        const v = parseInt(e.target.value) || 0;
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            pricingPlans: prev.pricingPlans.map((t, i) =>
                                                                i === idx ? { ...t, validity: v } : t
                                                            ),
                                                        }));
                                                    }}
                                                    className="w-full h-8 pl-2 pr-10 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium">days</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Price
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={tier.price || ""}
                                                    onChange={(e) => {
                                                        const v = parseInt(e.target.value) || 0;
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            pricingPlans: prev.pricingPlans.map((t, i) =>
                                                                i === idx ? { ...t, price: v } : t
                                                            ),
                                                        }));
                                                    }}
                                                    className="w-full h-8 pl-6 pr-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800"></div>

                    {/* Media + Marketplace */}
                    <div className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Banner */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                                    Package Banner
                                </label>
                                {!form.bannerURL ? (
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition group h-28 bg-gray-50/50 dark:bg-gray-800/30">
                                        <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition">
                                            <ImageIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" />
                                        </div>
                                        <span className="mt-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                                            Click to upload
                                        </span>
                                        <span className="text-[10px] text-gray-500">PNG/JPG/GIF · up to 5MB</span>
                                        <input type="file" hidden accept="image/*" onChange={bannerHandler} />
                                    </label>
                                ) : (
                                    <div className="relative group h-28">
                                        <Image
                                            src={previewUrl}
                                            width={400}
                                            height={112}
                                            alt="Banner preview"
                                            className="rounded-xl w-full h-28 object-cover border border-gray-200 dark:border-gray-700"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                            <label className="bg-white/95 text-gray-900 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-white flex items-center gap-1">
                                                Change
                                                <input type="file" hidden accept="image/*" onChange={bannerHandler} />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setForm(prev => ({ ...prev, bannerURL: null }))}
                                                className="bg-red-500 text-white p-1.5 rounded-md hover:bg-red-600 transition"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* T&C */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    <FileText className="w-3.5 h-3.5 text-orange-500" />
                                    Terms & Conditions
                                </label>
                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition group h-28 bg-gray-50/50 dark:bg-gray-800/30">
                                    <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition">
                                        {form.tncFile ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" />
                                        )}
                                    </div>
                                    <span className="mt-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-full px-2">
                                        {form.tncFile ? form.tncFile.name : "Click to upload PDF"}
                                    </span>
                                    <span className="text-[10px] text-gray-500">PDF · up to 5MB</span>
                                    <input type="file" hidden accept="application/pdf" onChange={tncHandler} />
                                </label>
                                {form.tncFile && (
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, tncFile: null }))}
                                        className="mt-1.5 text-[11px] text-red-500 hover:text-red-700 font-medium"
                                    >
                                        Remove file
                                    </button>
                                )}
                            </div>

                            {/* Marketplaces */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    <Store className="w-3.5 h-3.5 text-teal-500" />
                                    Marketplace Distribution
                                </label>
                                <MarketPlaceSelect onChange={setShareWithMarketplaces} />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-6 py-3 flex justify-end gap-2">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => router.push("/dashboard/serviceprovider/packages/mypackages")}
                            className="px-5 h-10 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 h-10 rounded-lg font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin h-4 w-4" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" /> Create Package
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
