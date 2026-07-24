"use client";
import React, { ChangeEvent, useState, useEffect, useRef } from "react";
import PaidEventSelect from "@/components/Inputs/EventListInput";
import { useSession } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Briefcase,
	Calendar,
	ChevronDown,
	Hash,
	IndianRupee,
	Loader2,
	Package as PackageIcon,
	Percent,
	RotateCcw,
	Send,
	Tag,
	Ticket,
	Users,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  // Targets specific (plan/package, validity-in-days) tiers. The SP picks
  // exactly which durations the coupon covers — to apply to every duration
  // of a plan, they select all of that plan's validities.
  serviceValidities: ServiceValidity[];
  packageValidities: PackageValidity[];
};

type Validity = { validity: number; price: number };

type PaidEvent = {
  _id: string;
  title: string;
};

type PaidPlan = {
  _id: string;
  title: string;
  pricingPlans?: Validity[];
};

type Package = {
  _id: string;
  title: string;
  pricingPlans?: Validity[];
};

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

const AddCouponForm = () => {
  const session = useSession();
  const id = session.data?.user.id;
  const { toast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const packageDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // Set default dates
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(today.getMonth() + 1);

  const [selection, setSelection] = useState("plans");
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
  const [packages, setPackages] = useState<Package[]>([]); // Added state for packages
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let url = "";
        if (selection === "event") {
          url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allpaidevents?id=${id}`;
        } else if (selection === "plans") {
          url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allservicesforcoupon?id=${id}`;
        } else if (selection === "packages") {
          url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/package/mypackages?id=${id}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${selection}`);
        }
        const data = await response.json();
        
        if (selection === "event") {
          setPaidEvents(data.data);
        } else if (selection === "plans") {
          setPlans(data.data);
        } else if (selection === "packages") {
          setPackages(data.data || data.packages || []);
        }
      } catch (error) {
        console.error(`Error fetching ${selection}:`, error);
        toast({
          title: "Error",
          description: `Failed to load ${selection === "event" ? "events" : selection === "plans" ? "plans" : "packages"}`,
          variant: "destructive",
        });
      }
    };

    if (id) {
      fetchData();
    }
  }, [selection, id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPlanDropdown(false);
      }
      if (packageDropdownRef.current && !packageDropdownRef.current.contains(event.target as Node)) {
        setShowPackageDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    let inputValue = value;

    if (name === "code") {
      inputValue = value.toUpperCase();
    }

    setCouponData((prev) => ({ ...prev, [name]: inputValue }));
  }

  function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    const numValue = parseFloat(value);
    setCouponData((prev) => ({ ...prev, [name]: numValue }));
  }

  function handleSelectChange(name: string, value: string) {
    setCouponData((prev) => ({ ...prev, [name]: value }));
  }

  // Validity-level helpers: a "selection" is a (planId/packageId, validity)
  // pair. To target a whole plan, the SP selects all of its validities.

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

  // Chip data — one chip per (plan, validity).
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!couponData.code) {
      toast({
        title: "Validation Error",
        description: "Coupon code is required",
        variant: "destructive",
      });
      return;
    }

    if (couponData.discount <= 0) {
      toast({
        title: "Validation Error",
        description: "Discount must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    if (couponData.discountType === "percentage" && couponData.discount > 100) {
      toast({
        title: "Validation Error",
        description: "Percentage discount cannot exceed 100%",
        variant: "destructive",
      });
      return;
    }

    if (new Date(couponData.expiryDate) <= new Date(couponData.startDate)) {
      toast({
        title: "Validation Error",
        description: "Expiry date must be after start date",
        variant: "destructive",
      });
      return;
    }

    // Validate based on selection type
    if (
      selection === "plans" &&
      couponData.serviceValidities.length === 0
    ) {
      toast({
        title: "Validation Error",
        description: "Please select at least one plan validity",
        variant: "destructive",
      });
      return;
    }

    if (
      selection === "packages" &&
      couponData.packageValidities.length === 0
    ) {
      toast({
        title: "Validation Error",
        description: "Please select at least one package validity",
        variant: "destructive",
      });
      return;
    }

    if (selection === "event" && !couponData.eventId) {
      toast({
        title: "Validation Error",
        description: "Please select an event",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: session.data?.user.RegName,
      email: session.data?.user.email,
      id: session.data?.user.id,
      type: session.data?.user.category,
      couponType: selection, // Add selection type to data
      ...couponData
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/addnewcoupon`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to add coupon");
      }

      if (response.status !== 201) {
        toast({
          title: "Failed",
          description: result.message || "Failed to add coupon",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Successfully Added coupon`,
        variant: "success",
      });

      // Reset form
      setCouponData({
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
      setShowPlanDropdown(false);
      setShowPackageDropdown(false);
      router.push('/dashboard/serviceprovider/content/createcoupon/previouscoupons');
    } catch (error: any) {
      console.error("Error adding coupon:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong while adding the coupon",
        variant: "destructive",
      });
    }
  };

  const inputCls =
    "w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
  const labelCls =
    "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

  // Counts + chips for the multi-select used in the "Apply To" row. Each
  // chip = one (plan/package, validity) tier the coupon will cover.
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

  return (
    <div className="min-[900]-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 p-4">
      <Toaster />
      <form method="POST" onSubmit={handleSubmit} className="mx-auto max-w-7xl">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

          {/* Header */}
          

          {/* Apply To toggle + Coupon Code */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plans/Packages segmented control */}
              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Tag className="w-3.5 h-3.5 text-purple-500" />
                  Apply To <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1 h-10 p-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {[
                    { value: "plans", label: "Plans", icon: Briefcase },
                    { value: "packages", label: "Packages", icon: PackageIcon },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = selection === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md cursor-pointer transition ${active
                            ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                          }`}
                      >
                        <input
                          type="radio"
                          name="selection"
                          value={opt.value}
                          checked={active}
                          onChange={(e) => setSelection(e.target.value)}
                          className="hidden"
                        />
                        <Icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Coupon Code */}
              
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800"></div>
          <div className="px-6 py-4 space-y-4">
            {/* Coupon Code */}
            <div>
              <label className={`${labelCls} flex items-center gap-1.5`}>
                <Hash className="w-3.5 h-3.5 text-emerald-500" />
                Coupon Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={couponData.code}
                onChange={handleChange}
                placeholder="e.g. WELCOME20"
                required
                className={`${inputCls} uppercase tracking-wider font-mono`}
              />
            </div>

            {/* Plans / Packages multi-select — sits right below the coupon code */}
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
                  Select {selection === "plans" ? "Plans" : "Packages"} <span className="text-red-500">*</span>
                </label>

                {/* Selected chips — one per (plan/package, validity) tier */}
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

                {/* Dropdown trigger */}
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

                {/* Dropdown menu — grouped by plan/package, with each tier
                    (validity duration) as a checkable row. */}
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
          {/* Validity dates — Start | Expiry */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Date */}
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

              {/* Expiry Date */}
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

            {/* Discount + Usage Limit + Per-customer limit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {/* Discount — connected input group: type | value */}
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

              {/* Usage Limit */}
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

              {/* Uses Per Customer */}
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
              onClick={() => {
                setCouponData({
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
                setShowPlanDropdown(false);
                setShowPackageDropdown(false);
              }}
              className="px-5 h-10 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 h-10 rounded-lg font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2 text-sm"
            >
              <Send className="w-4 h-4" /> Create Coupon
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddCouponForm;