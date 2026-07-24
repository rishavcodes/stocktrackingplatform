"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Input } from "@/components";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import Image from "next/image";
import PictureIcon from "@/icons/PictureIcon";
import PdfIcon from "@/icons/PdfIcon";
import { authFetch } from "@/lib/authFetch";

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
    bannerURL: File | string | null;
    tncFile: File | string | null;
};

async function fetchPackage(id: string, token: string) {
    const res = await authFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/package/details?id=${id}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
}

export default function EditPackage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { data: session } = useSession();
    const { toast } = useToast();

    const token = session?.backendToken;

    const [id, setId] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const [plans, setPlans] = useState<Plan[]>([]);
    const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
    const [showPlanDropdown, setShowPlanDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [previewUrl, setPreviewUrl] = useState("");
    const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>([]);

    const [form, setForm] = useState<PackageForm>({
        title: "",
        description: "",
        pricingPlans: [{ validity: 30, price: 0 }],
        bannerURL: null,
        tncFile: null,
    });

    /* ---------------- GET PARAM ID ---------------- */
    useEffect(() => {
        const loadId = async () => {
            const { id } = await params;
            setId(id);
        };
        loadId();
    }, [params]);

    /* ---------------- FETCH PLANS ---------------- */
    useEffect(() => {
        if (!session?.user.id || !token) return;

        authFetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allservicesforcoupon?id=${session.user.id}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        )
            .then(res => res.json())
            .then(data => setPlans(data.data || []));
    }, [session?.user.id, token]);

    /* ---------------- FETCH PACKAGE ---------------- */
    useEffect(() => {
        if (!id || !token) return;

        const load = async () => {
            setIsLoading(true);
            const pkg = await fetchPackage(id, token);

            if (!pkg) {
                toast({
                    title: "Error",
                    description: "Package not found",
                    variant: "destructive",
                });
                return;
            }

            setForm({
                title: pkg.title,
                description: pkg.description,
                pricingPlans:
                    Array.isArray(pkg.pricingPlans) && pkg.pricingPlans.length > 0
                        ? pkg.pricingPlans.map((t: any) => ({
                              validity: Number(t.validity) || 0,
                              price: Number(t.price) || 0,
                          }))
                        : [{ validity: 30, price: 0 }],
                bannerURL: pkg.bannerURL,
                tncFile: pkg.tncFileURL,
            });

            setSelectedPlanIds(pkg.includedServices.map((s: any) => s._id));
            setShareWithMarketplaces(pkg.shareWithMarketplaces || []);

            if (pkg.bannerURL) setPreviewUrl(pkg.bannerURL);

            setIsLoading(false);
        };

        load();
    }, [id, token]);

    /* ---------------- CLOSE DROPDOWN ---------------- */
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

    const removePlan = (id: string, e: any) => {
        e.stopPropagation();
        setSelectedPlanIds(prev => prev.filter(p => p !== id));
    };

    const getSelectedTitles = () =>
        plans
            .filter(p => selectedPlanIds.includes(p._id))
            .map(p => p.title);

    /* ---------------- SUBMIT ---------------- */

    async function updatePackage(e: FormEvent) {
        e.preventDefault();

        if (selectedPlanIds.length < 2) {
            toast({
                title: "Validation",
                description: "Minimum 2 plans required",
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

        const payload = {
            id,
            title: form.title,
            description: form.description,
            includedServices: selectedPlanIds,
            pricingPlans: form.pricingPlans.map((t) => ({
                price: Number(t.price),
                validity: Number(t.validity),
            })),
            shareWithMarketplaces,
        };

        const fd = new FormData();
        fd.append("data", JSON.stringify(payload));

        if (form.bannerURL instanceof File) {
            fd.append("bannerURL", form.bannerURL);
        }

        if (form.tncFile instanceof File) {
            fd.append("tncFile", form.tncFile);
        }

        try {
            const res = await authFetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/package/update`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: fd,
                }
            );

            const data = await res.json();

            if (!res.ok) throw new Error(data.message);

            toast({
                title: "Updated",
                description: "Package updated successfully",
                variant: "success"
            });

        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        }
    }

    /* ---------------- UI ---------------- */

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-10 w-10" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <Toaster />
            <form
                onSubmit={updatePackage}
                className="mx-auto max-w-8xl"
            >
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">

                    {/* Basic Info Row: title + plans picker */}
                    <div className="px-4 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                                title="Package Title"
                                name="title"
                                type="text"
                                value={form.title}
                                onChange={changeHandler}
                            />

                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Included Plans <span className="normal-case text-gray-400">(min 2)</span>
                                </label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-between h-9 text-sm"
                                    onClick={() => setShowPlanDropdown(!showPlanDropdown)}
                                >
                                    {selectedPlanIds.length === 0
                                        ? "Select plans"
                                        : `${selectedPlanIds.length} plan(s) selected`}
                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showPlanDropdown ? "rotate-180" : ""}`} />
                                </Button>

                                {showPlanDropdown && (
                                    <div className="absolute z-20 mt-1 w-full border rounded-lg bg-white dark:bg-gray-800 shadow-xl max-h-64 overflow-y-auto">
                                        {plans.length === 0 ? (
                                            <div className="text-center text-gray-500 py-4 text-xs">
                                                No plans available
                                            </div>
                                        ) : (
                                            plans.map(plan => (
                                                <div
                                                    key={plan._id}
                                                    className={`flex items-center space-x-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${selectedPlanIds.includes(plan._id)
                                                        ? "bg-blue-50 dark:bg-blue-900/20"
                                                        : ""}`}
                                                >
                                                    <Checkbox
                                                        id={`plan-${plan._id}`}
                                                        checked={selectedPlanIds.includes(plan._id)}
                                                        onCheckedChange={() => togglePlan(plan._id)}
                                                    />
                                                    <label htmlFor={`plan-${plan._id}`} className="text-sm flex-1 cursor-pointer">
                                                        {plan.title}
                                                    </label>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedPlanIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {getSelectedTitles().map((title, i) => (
                                    <Badge
                                        key={i}
                                        variant="secondary"
                                        className="flex items-center gap-1 px-2 py-0.5 text-xs"
                                    >
                                        {title}
                                        <button
                                            type="button"
                                            onClick={(e) => removePlan(selectedPlanIds[i], e)}
                                            className="hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                                        >
                                            <X size={10} />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700"></div>

                    {/* Description */}
                    <div className="px-4 py-3">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Description
                        </label>
                        <textarea
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white dark:bg-gray-800"
                            name="description"
                            value={form.description}
                            onChange={changeHandler}
                            rows={2}
                        />
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700"></div>

                    {/* Pricing Tiers — inline */}
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Pricing Tiers
                            </label>
                            {form.pricingPlans.length < 5 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            pricingPlans: [...prev.pricingPlans, { validity: 30, price: 0 }],
                                        }))
                                    }
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    + Add Tier
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {form.pricingPlans.map((tier, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-end gap-1.5 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50"
                                >
                                    <div className="w-24">
                                        <label className="block text-[10px] font-medium mb-0.5 text-gray-600 dark:text-gray-400">
                                            Tier {idx + 1} • Days
                                        </label>
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
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800"
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-[10px] font-medium mb-0.5 text-gray-600 dark:text-gray-400">
                                            Price (₹)
                                        </label>
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
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800"
                                        />
                                    </div>
                                    {form.pricingPlans.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    pricingPlans: prev.pricingPlans.filter((_, i) => i !== idx),
                                                }))
                                            }
                                            className="text-red-500 hover:text-red-700 p-1 mb-0.5"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700"></div>

                    {/* Media + Marketplace Row */}
                    <div className="px-4 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Banner */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Banner
                                </label>
                                {!previewUrl ? (
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition group h-24">
                                        <PictureIcon className="w-7 h-7 text-gray-400 group-hover:text-blue-500 transition" />
                                        <span className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                            Upload banner
                                        </span>
                                        <span className="text-[10px] text-gray-500">PNG/JPG/GIF up to 5MB</span>
                                        <input type="file" hidden accept="image/*" onChange={bannerHandler} />
                                    </label>
                                ) : (
                                    <div className="relative group h-24">
                                        <Image
                                            src={previewUrl}
                                            width={400}
                                            height={96}
                                            alt="Banner preview"
                                            className="rounded-md w-full h-24 object-cover border border-gray-200 dark:border-gray-700"
                                        />
                                        <div className="absolute top-1 right-1 flex gap-1">
                                            <label className="bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] cursor-pointer hover:bg-blue-600">
                                                Change
                                                <input type="file" hidden accept="image/*" onChange={bannerHandler} />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPreviewUrl("");
                                                    setForm(prev => ({ ...prev, bannerURL: null }));
                                                }}
                                                className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* T&C */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Terms & Conditions
                                </label>
                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition group h-24">
                                    <PdfIcon className="w-7 h-7 text-gray-400 group-hover:text-blue-500 transition" />
                                    <span className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400 truncate max-w-full px-2">
                                        {form.tncFile
                                            ? (form.tncFile instanceof File ? form.tncFile.name : "Uploaded PDF")
                                            : "Upload T&C PDF"}
                                    </span>
                                    <span className="text-[10px] text-gray-500">PDF up to 5MB</span>
                                    <input type="file" hidden accept="application/pdf" onChange={tncHandler} />
                                </label>
                                {form.tncFile && (
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, tncFile: null }))}
                                        className="mt-1 text-xs text-red-500 hover:text-red-700"
                                    >
                                        Remove file
                                    </button>
                                )}
                            </div>

                            {/* Marketplaces */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Marketplaces
                                </label>
                                <MarketPlaceSelect
                                    onChange={setShareWithMarketplaces}
                                    initialValues={shareWithMarketplaces}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700"></div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 px-4 py-3">
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white px-6 h-9 rounded-md font-semibold shadow transition-all flex items-center gap-2 text-sm"
                        >
                            <Check className="h-4 w-4" /> Update Package
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
