"use client";
import React, { ChangeEvent, useState, useEffect, useRef } from "react";
import PaidEventSelect from "@/components/Inputs/EventListInput";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Briefcase,
  Calendar,
  ChevronDown,
  Hash,
  Lock,
  Package as PackageIcon,
  Percent,
  RotateCcw,
  Send,
  Tag,
  Ticket,
  Users,
  X,
} from "lucide-react";

export type ServiceValidity = { serviceId: string; validity: number };
export type PackageValidity = { packageId: string; validity: number };

export type couponCodeDataProps = {
  code: string;
  discountType: "percentage" | "fixed";
  discount: number;
  startDate: string;
  expiryDate: string;
  usageLimit: number;
  perCustomerLimit: number;
  eventId: string;
  serviceValidities: ServiceValidity[];
  packageValidities: PackageValidity[];
};

type Validity = { validity: number; price: number };
type PaidEvent = { _id: string; title: string };
type PaidPlan = { _id: string; title: string; pricingPlans?: Validity[] };
type Package = { _id: string; title: string; pricingPlans?: Validity[] };

type CouponType = "plans" | "packages" | "event";

function formatValidityLabel(days: number): string {
  if (!days || days < 1) return `${days} day${days === 1 ? "" : "s"}`;
  if (days % 365 === 0) {
    const y = days / 365;
    return `${y} year${y > 1 ? "s" : ""}`;
  }
  if (days % 30 === 0) {
    const m = days / 30;
    return `${m} month${m > 1 ? "s" : ""}`;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}

const EditCouponForm = () => {
  const session = useSession();
  const userId = session.data?.user.id;
  const { toast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const packageDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useParams();
  const couponId = params?.id as string;

  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(today.getMonth() + 1);

  // Detected once the coupon loads — the SP can't change the coupon's
  // target type on update; it's locked to whatever they picked at create.
  const [selection, setSelection] = useState<CouponType>("plans");

  // Holds the raw legacy targeting when an older coupon (serviceIds only,
  // no serviceValidities) is loaded. Once the relevant plans/packages list
  // arrives, this gets expanded into validity rows.
  const [legacyServiceIds, setLegacyServiceIds] = useState<string[] | null>(null);
  const [legacyPackageIds, setLegacyPackageIds] = useState<string[] | null>(null);

  const [couponData, setCouponData] = useState<couponCodeDataProps>({
    code: "",
    discountType: "percentage",
    discount: 0,
    startDate: today.toISOString().split("T")[0],
    expiryDate: nextMonth.toISOString().split("T")[0],
    usageLimit: 0,
    perCustomerLimit: 1,
    eventId: "",
    serviceValidities: [],
    packageValidities: [],
  });

  const [paidEvents, setPaidEvents] = useState<PaidEvent[]>([]);
  const [plans, setPlans] = useState<PaidPlan[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);

  /* ---------------- LOAD EXISTING COUPON ---------------- */
  useEffect(() => {
    if (!couponId) return;

    const fetchCoupon = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/getcoupon?id=${couponId}`
        );
        const result = await response.json();
        if (!result || !result.data || !result.data.code) {
          throw new Error("Invalid coupon data");
        }

        const d = result.data;
        const serviceIds: string[] = Array.isArray(d.serviceIds) ? d.serviceIds : [];
        const packageIds: string[] = Array.isArray(d.packageIds) ? d.packageIds : [];
        const serviceValidities: ServiceValidity[] = Array.isArray(d.serviceValidities)
          ? d.serviceValidities.map((r: any) => ({
              serviceId: String(r.serviceId),
              validity: Number(r.validity),
            }))
          : [];
        const packageValidities: PackageValidity[] = Array.isArray(d.packageValidities)
          ? d.packageValidities.map((r: any) => ({
              packageId: String(r.packageId),
              validity: Number(r.validity),
            }))
          : [];

        let detected: CouponType = "plans";
        if (d.couponType === "event" || d.eventId) detected = "event";
        else if (
          d.couponType === "packages" ||
          packageValidities.length > 0 ||
          packageIds.length > 0
        )
          detected = "packages";
        else detected = "plans";

        setSelection(detected);

        // Legacy migration: a coupon saved before validity-level targeting
        // only has serviceIds / packageIds. We stash those and expand them
        // into all-validity rows once the option list arrives.
        if (serviceValidities.length === 0 && serviceIds.length > 0) {
          setLegacyServiceIds(serviceIds);
        }
        if (packageValidities.length === 0 && packageIds.length > 0) {
          setLegacyPackageIds(packageIds);
        }

        setCouponData({
          code: d.code || "",
          discountType: d.discountType || "percentage",
          discount: d.discount || 0,
          startDate:
            d.startDate?.slice(0, 10) || today.toISOString().split("T")[0],
          expiryDate:
            d.expiryDate?.slice(0, 10) || nextMonth.toISOString().split("T")[0],
          usageLimit: d.usageLimit || 0,
          perCustomerLimit: d.perCustomerLimit || 1,
          eventId: d.eventId || "",
          serviceValidities,
          packageValidities,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load coupon details.",
          variant: "destructive",
        });
      }
    };

    fetchCoupon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponId]);

  /* ---------------- LOAD OPTIONS FOR CURRENT TYPE ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      try {
        let url = "";
        if (selection === "event") {
          url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allpaidevents?id=${userId}`;
        } else if (selection === "plans") {
          url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allservicesforcoupon?id=${userId}`;
        } else if (selection === "packages") {
          url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/package/mypackages?id=${userId}`;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${selection}`);
        const data = await response.json();
        if (selection === "event") setPaidEvents(data.data);
        else if (selection === "plans") setPlans(data.data);
        else if (selection === "packages") setPackages(data.data || data.packages || []);
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to load ${
            selection === "event" ? "events" : selection === "plans" ? "plans" : "packages"
          }`,
          variant: "destructive",
        });
      }
    };
    fetchData();
  }, [selection, userId]);

  /* ---------------- LEGACY EXPANSION ----------------
   * Once `plans` / `packages` are loaded, expand any stashed legacy
   * serviceIds / packageIds into validity rows (one row per pricing tier)
   * so the SP can edit them in the new UI.
   */
  useEffect(() => {
    if (legacyServiceIds && plans.length > 0) {
      const expanded: ServiceValidity[] = [];
      for (const id of legacyServiceIds) {
        const plan = plans.find((p) => p._id === id);
        for (const t of plan?.pricingPlans ?? []) {
          expanded.push({ serviceId: id, validity: t.validity });
        }
      }
      setCouponData((prev) => ({ ...prev, serviceValidities: expanded }));
      setLegacyServiceIds(null);
    }
  }, [legacyServiceIds, plans]);

  useEffect(() => {
    if (legacyPackageIds && packages.length > 0) {
      const expanded: PackageValidity[] = [];
      for (const id of legacyPackageIds) {
        const pkg = packages.find((p) => p._id === id);
        for (const t of pkg?.pricingPlans ?? []) {
          expanded.push({ packageId: id, validity: t.validity });
        }
      }
      setCouponData((prev) => ({ ...prev, packageValidities: expanded }));
      setLegacyPackageIds(null);
    }
  }, [legacyPackageIds, packages]);

  /* ---------------- OUTSIDE-CLICK FOR DROPDOWNS ---------------- */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPlanDropdown(false);
      }
      if (
        packageDropdownRef.current &&
        !packageDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPackageDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- INPUT HANDLERS ---------------- */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    const inputValue = name === "code" ? value.toUpperCase() : value;
    setCouponData((prev) => ({ ...prev, [name]: inputValue }));
  }
  function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setCouponData((prev) => ({ ...prev, [name]: parseFloat(value) }));
  }
  function handleSelectChange(name: string, value: string) {
    setCouponData((prev) => ({ ...prev, [name]: value }));
  }

  /* ---------------- VALIDITY HELPERS ---------------- */
  const isPlanValiditySelected = (planId: string, validity: number) =>
    couponData.serviceValidities.some(
      (r) => r.serviceId === planId && r.validity === validity
    );

  const togglePlanValidity = (planId: string, validity: number) => {
    setCouponData((prev) => {
      const exists = prev.serviceValidities.some(
        (r) => r.serviceId === planId && r.validity === validity
      );
      const next = exists
        ? prev.serviceValidities.filter(
            (r) => !(r.serviceId === planId && r.validity === validity)
          )
        : [...prev.serviceValidities, { serviceId: planId, validity }];
      return { ...prev, serviceValidities: next };
    });
  };

  const togglePlanAllValidities = (plan: PaidPlan, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const tiers = plan.pricingPlans ?? [];
    if (tiers.length === 0) return;
    setCouponData((prev) => {
      const allSelected = tiers.every((t) =>
        prev.serviceValidities.some(
          (r) => r.serviceId === plan._id && r.validity === t.validity
        )
      );
      if (allSelected) {
        return {
          ...prev,
          serviceValidities: prev.serviceValidities.filter(
            (r) => r.serviceId !== plan._id
          ),
        };
      }
      const remaining = prev.serviceValidities.filter(
        (r) => r.serviceId !== plan._id
      );
      const added = tiers.map((t) => ({ serviceId: plan._id, validity: t.validity }));
      return { ...prev, serviceValidities: [...remaining, ...added] };
    });
  };

  const isPackageValiditySelected = (packageId: string, validity: number) =>
    couponData.packageValidities.some(
      (r) => r.packageId === packageId && r.validity === validity
    );

  const togglePackageValidity = (packageId: string, validity: number) => {
    setCouponData((prev) => {
      const exists = prev.packageValidities.some(
        (r) => r.packageId === packageId && r.validity === validity
      );
      const next = exists
        ? prev.packageValidities.filter(
            (r) => !(r.packageId === packageId && r.validity === validity)
          )
        : [...prev.packageValidities, { packageId, validity }];
      return { ...prev, packageValidities: next };
    });
  };

  const togglePackageAllValidities = (pkg: Package, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const tiers = pkg.pricingPlans ?? [];
    if (tiers.length === 0) return;
    setCouponData((prev) => {
      const allSelected = tiers.every((t) =>
        prev.packageValidities.some(
          (r) => r.packageId === pkg._id && r.validity === t.validity
        )
      );
      if (allSelected) {
        return {
          ...prev,
          packageValidities: prev.packageValidities.filter(
            (r) => r.packageId !== pkg._id
          ),
        };
      }
      const remaining = prev.packageValidities.filter(
        (r) => r.packageId !== pkg._id
      );
      const added = tiers.map((t) => ({ packageId: pkg._id, validity: t.validity }));
      return { ...prev, packageValidities: [...remaining, ...added] };
    });
  };

  const selectAllPlanValidities = (e: React.MouseEvent) => {
    e.stopPropagation();
    const all: ServiceValidity[] = [];
    for (const plan of plans) {
      for (const t of plan.pricingPlans ?? []) {
        all.push({ serviceId: plan._id, validity: t.validity });
      }
    }
    setCouponData((prev) => ({ ...prev, serviceValidities: all }));
  };

  const selectAllPackageValidities = (e: React.MouseEvent) => {
    e.stopPropagation();
    const all: PackageValidity[] = [];
    for (const pkg of packages) {
      for (const t of pkg.pricingPlans ?? []) {
        all.push({ packageId: pkg._id, validity: t.validity });
      }
    }
    setCouponData((prev) => ({ ...prev, packageValidities: all }));
  };

  const clearAllPlanSelections = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCouponData((prev) => ({ ...prev, serviceValidities: [] }));
  };

  const clearAllPackageSelections = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCouponData((prev) => ({ ...prev, packageValidities: [] }));
  };

  const removeServiceValidity = (
    planId: string,
    validity: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setCouponData((prev) => ({
      ...prev,
      serviceValidities: prev.serviceValidities.filter(
        (r) => !(r.serviceId === planId && r.validity === validity)
      ),
    }));
  };

  const removePackageValidity = (
    packageId: string,
    validity: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setCouponData((prev) => ({
      ...prev,
      packageValidities: prev.packageValidities.filter(
        (r) => !(r.packageId === packageId && r.validity === validity)
      ),
    }));
  };

  type ChipRow = { id: string; validity: number; label: string };

  const getSelectedPlanChips = (): ChipRow[] =>
    couponData.serviceValidities
      .map((r) => {
        const plan = plans.find((p) => p._id === r.serviceId);
        if (!plan) return null;
        return {
          id: r.serviceId,
          validity: r.validity,
          label: `${plan.title} · ${formatValidityLabel(r.validity)}`,
        };
      })
      .filter((x): x is ChipRow => x !== null);

  const getSelectedPackageChips = (): ChipRow[] =>
    couponData.packageValidities
      .map((r) => {
        const pkg = packages.find((p) => p._id === r.packageId);
        if (!pkg) return null;
        return {
          id: r.packageId,
          validity: r.validity,
          label: `${pkg.title} · ${formatValidityLabel(r.validity)}`,
        };
      })
      .filter((x): x is ChipRow => x !== null);

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!couponData.code) {
      toast({ title: "Validation Error", description: "Coupon code is required", variant: "destructive" });
      return;
    }
    if (couponData.discount <= 0) {
      toast({ title: "Validation Error", description: "Discount must be greater than zero", variant: "destructive" });
      return;
    }
    if (couponData.discountType === "percentage" && couponData.discount > 100) {
      toast({ title: "Validation Error", description: "Percentage discount cannot exceed 100%", variant: "destructive" });
      return;
    }
    if (new Date(couponData.expiryDate) <= new Date(couponData.startDate)) {
      toast({ title: "Validation Error", description: "Expiry date must be after start date", variant: "destructive" });
      return;
    }
    if (selection === "plans" && couponData.serviceValidities.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one plan validity", variant: "destructive" });
      return;
    }
    if (selection === "packages" && couponData.packageValidities.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one package validity", variant: "destructive" });
      return;
    }
    if (selection === "event" && !couponData.eventId) {
      toast({ title: "Validation Error", description: "Please select an event", variant: "destructive" });
      return;
    }

    try {
      const dataToSend = {
        ...couponData,
        id: couponId,
        userId: session.data?.user._id,
        couponType: selection,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/updatecoupon`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        }
      );

      if (!response.ok) throw new Error("Update failed");

      toast({ title: "Success", description: "Coupon updated successfully." });
      router.push(
        "/dashboard/serviceprovider/content/createcoupon/previouscoupons?refresh=true"
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon.",
        variant: "destructive",
      });
    }
  };

  /* ---------------- STYLES ---------------- */
  const inputCls =
    "w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
  const labelCls =
    "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

  const selectedChips: ChipRow[] =
    selection === "plans"
      ? getSelectedPlanChips()
      : selection === "packages"
      ? getSelectedPackageChips()
      : [];
  const selectedCount = selectedChips.length;
  const totalValidityCount =
    selection === "plans"
      ? plans.reduce((sum, p) => sum + (p.pricingPlans?.length ?? 0), 0)
      : selection === "packages"
      ? packages.reduce((sum, p) => sum + (p.pricingPlans?.length ?? 0), 0)
      : 0;

  const typeMeta: Record<CouponType, { label: string; Icon: typeof Briefcase }> = {
    plans: { label: "Plans", Icon: Briefcase },
    packages: { label: "Packages", Icon: PackageIcon },
    event: { label: "Event", Icon: Ticket },
  };
  const ActiveIcon = typeMeta[selection].Icon;

  return (
    <div className="min-[900]-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 p-4">
      <Toaster />
      <form method="POST" onSubmit={handleSubmit} className="mx-auto max-w-7xl">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Apply To (locked) */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Tag className="w-3.5 h-3.5 text-purple-500" />
                  Apply To
                </label>
                <div
                  className="flex items-center gap-2 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
                  title="Coupon target type cannot be changed after creation"
                >
                  <ActiveIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">{typeMeta[selection].label}</span>
                  <Lock className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800"></div>

          <div className="px-6 py-4 space-y-4">
            {/* Coupon Code (disabled — code is immutable) */}
            <div>
              <label className={`${labelCls} flex items-center gap-1.5`}>
                <Hash className="w-3.5 h-3.5 text-emerald-500" />
                Coupon Code
              </label>
              <input
                type="text"
                name="code"
                value={couponData.code}
                onChange={handleChange}
                disabled
                className={`${inputCls} uppercase tracking-wider font-mono opacity-70 cursor-not-allowed`}
              />
            </div>

            {/* Plans / Packages multi-select */}
            {(selection === "plans" || selection === "packages") && (
              <div
                className="relative"
                ref={selection === "plans" ? dropdownRef : packageDropdownRef}
              >
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  {selection === "plans" ? (
                    <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                  ) : (
                    <PackageIcon className="w-3.5 h-3.5 text-purple-500" />
                  )}
                  Select {selection === "plans" ? "Plan Validities" : "Package Validities"}{" "}
                  <span className="text-red-500">*</span>
                </label>

                {selectedCount > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedChips.map((chip) => (
                      <span
                        key={`${chip.id}:${chip.validity}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-800"
                      >
                        {chip.label}
                        <button
                          type="button"
                          onClick={(e) =>
                            selection === "plans"
                              ? removeServiceValidity(chip.id, chip.validity, e)
                              : removePackageValidity(chip.id, chip.validity, e)
                          }
                          className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    selection === "plans"
                      ? setShowPlanDropdown(!showPlanDropdown)
                      : setShowPackageDropdown(!showPackageDropdown)
                  }
                  className="w-full h-10 px-3 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <span className={selectedCount === 0 ? "text-gray-400" : ""}>
                    {selectedCount === 0
                      ? `Select ${selection === "plans" ? "plan validities" : "package validities"}`
                      : `${selectedCount} validit${selectedCount === 1 ? "y" : "ies"} selected`}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      (selection === "plans" ? showPlanDropdown : showPackageDropdown)
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {(selection === "plans" ? showPlanDropdown : showPackageDropdown) && (
                  <div className="absolute z-20 mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg max-h-80 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {selectedCount}/{totalValidityCount} selected
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={
                            selection === "plans"
                              ? selectAllPlanValidities
                              : selectAllPackageValidities
                          }
                          className="h-6 text-xs px-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={
                            selection === "plans"
                              ? clearAllPlanSelections
                              : clearAllPackageSelections
                          }
                          className="h-6 text-xs px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="p-1.5">
                      {selection === "plans" ? (
                        plans.length === 0 ? (
                          <div className="text-center text-gray-500 py-4 text-xs">
                            No plans available
                          </div>
                        ) : (
                          plans.map((plan) => {
                            const tiers = plan.pricingPlans ?? [];
                            const allSelected =
                              tiers.length > 0 &&
                              tiers.every((t) =>
                                isPlanValiditySelected(plan._id, t.validity)
                              );
                            return (
                              <div
                                key={plan._id}
                                className="mb-2 last:mb-0 border border-gray-100 dark:border-gray-800 rounded-md overflow-hidden"
                              >
                                <div className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900/50">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Briefcase className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                      {plan.title}
                                    </span>
                                  </div>
                                  {tiers.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => togglePlanAllValidities(plan, e)}
                                      className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                                    >
                                      {allSelected ? "Unselect all" : "Select all"}
                                    </button>
                                  )}
                                </div>
                                {tiers.length === 0 ? (
                                  <div className="px-3 py-2 text-[11px] text-gray-400">
                                    No validities configured for this plan
                                  </div>
                                ) : (
                                  tiers.map((tier) => {
                                    const isSelected = isPlanValiditySelected(
                                      plan._id,
                                      tier.validity
                                    );
                                    return (
                                      <div
                                        key={`${plan._id}:${tier.validity}`}
                                        className={`flex items-center gap-2 px-3 py-1.5 transition ${
                                          isSelected
                                            ? "bg-blue-50 dark:bg-blue-900/20"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                        }`}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() =>
                                            togglePlanValidity(plan._id, tier.validity)
                                          }
                                        />
                                        <span
                                          className="text-sm flex-1 cursor-pointer text-gray-700 dark:text-gray-200"
                                          onClick={() =>
                                            togglePlanValidity(plan._id, tier.validity)
                                          }
                                        >
                                          {formatValidityLabel(tier.validity)}
                                          {typeof tier.price === "number" && (
                                            <span className="text-gray-400 ml-2">
                                              · ₹{tier.price}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            );
                          })
                        )
                      ) : packages.length === 0 ? (
                        <div className="text-center text-gray-500 py-4 text-xs">
                          No packages available
                        </div>
                      ) : (
                        packages.map((pkg) => {
                          const tiers = pkg.pricingPlans ?? [];
                          const allSelected =
                            tiers.length > 0 &&
                            tiers.every((t) =>
                              isPackageValiditySelected(pkg._id, t.validity)
                            );
                          return (
                            <div
                              key={pkg._id}
                              className="mb-2 last:mb-0 border border-gray-100 dark:border-gray-800 rounded-md overflow-hidden"
                            >
                              <div className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900/50">
                                <div className="flex items-center gap-2 min-w-0">
                                  <PackageIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                    {pkg.title}
                                  </span>
                                </div>
                                {tiers.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => togglePackageAllValidities(pkg, e)}
                                    className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                                  >
                                    {allSelected ? "Unselect all" : "Select all"}
                                  </button>
                                )}
                              </div>
                              {tiers.length === 0 ? (
                                <div className="px-3 py-2 text-[11px] text-gray-400">
                                  No validities configured for this package
                                </div>
                              ) : (
                                tiers.map((tier) => {
                                  const isSelected = isPackageValiditySelected(
                                    pkg._id,
                                    tier.validity
                                  );
                                  return (
                                    <div
                                      key={`${pkg._id}:${tier.validity}`}
                                      className={`flex items-center gap-2 px-3 py-1.5 transition ${
                                        isSelected
                                          ? "bg-blue-50 dark:bg-blue-900/20"
                                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                      }`}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() =>
                                          togglePackageValidity(pkg._id, tier.validity)
                                        }
                                      />
                                      <span
                                        className="text-sm flex-1 cursor-pointer text-gray-700 dark:text-gray-200"
                                        onClick={() =>
                                          togglePackageValidity(pkg._id, tier.validity)
                                        }
                                      >
                                        {formatValidityLabel(tier.validity)}
                                        {typeof tier.price === "number" && (
                                          <span className="text-gray-400 ml-2">
                                            · ₹{tier.price}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selection === "event" && (
              <PaidEventSelect
                name="eventId"
                value={couponData.eventId}
                onChange={setCouponData}
                events={paidEvents}
              />
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800"></div>

          {/* Validity */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={couponData.startDate}
                  onChange={handleChange}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={couponData.expiryDate}
                  onChange={handleChange}
                  min={couponData.startDate || undefined}
                  required
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Percent className="w-3.5 h-3.5 text-amber-500" />
                  Discount <span className="text-red-500">*</span>
                </label>
                <div className="flex h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition overflow-hidden">
                  <select
                    value={couponData.discountType}
                    onChange={(e) => handleSelectChange("discountType", e.target.value)}
                    className="w-24 px-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40 focus:outline-none cursor-pointer border-r border-gray-200 dark:border-gray-700"
                  >
                    <option value="percentage">% off</option>
                    <option value="fixed">₹ off</option>
                  </select>
                  <input
                    type="number"
                    name="discount"
                    value={couponData.discount || ""}
                    onChange={handleNumberChange}
                    placeholder={couponData.discountType === "percentage" ? "0-100" : "0"}
                    min="0"
                    max={couponData.discountType === "percentage" ? "100" : undefined}
                    required
                    className="flex-1 min-w-0 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  Usage Limit
                </label>
                <input
                  type="number"
                  name="usageLimit"
                  value={couponData.usageLimit || ""}
                  onChange={handleNumberChange}
                  placeholder="Total uses (0 = unlimited)"
                  min="0"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  Uses Per Customer
                </label>
                <input
                  type="number"
                  name="perCustomerLimit"
                  value={couponData.perCustomerLimit || ""}
                  onChange={handleNumberChange}
                  placeholder="1"
                  min="1"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-6 py-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/serviceprovider/content/createcoupon/previouscoupons"
                )
              }
              className="px-5 h-10 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Cancel
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 h-10 rounded-lg font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2 text-sm"
            >
              <Send className="w-4 h-4" /> Update Coupon
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditCouponForm;
