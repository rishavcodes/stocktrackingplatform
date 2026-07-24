"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// Targeting refs come back from the API either as populated objects
// ({_id, title}) or as raw ObjectId strings if populate didn't run.
type TargetRef = { _id: string; title?: string } | string;

type Coupon = {
  _id: string;
  code: string;
  discount: number;
  expiryDate: string;
  createdAt?: string;
  usageLimit: number;
  usedCount: number;
  couponType?: "event" | "plans" | "packages";
  serviceIds: TargetRef[];
  packageIds?: TargetRef[];
  serviceValidities?: { serviceId: string; validity: number }[];
  packageValidities?: { packageId: string; validity: number }[];
  eventId?: {
    _id: string;
    title: string;
  } | string | null;
  discountType: "percentage" | "fixed";
};

function refId(r: TargetRef): string {
  return typeof r === "string" ? r : r?._id ?? "";
}
function refTitle(r: TargetRef): string {
  return typeof r === "string" ? "" : r?.title ?? "";
}

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

const CouponList = () => {
  const { data: session } = useSession();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  const id = session?.user?.id;
  const { toast } = useToast();

  // Fetch coupons
  useEffect(() => {
    if (!id) return;

    const fetchCoupons = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allcoupons?id=${id}`
        );
        if (!response.ok) throw new Error("Failed to fetch coupons");

        const data = await response.json();
        setCoupons(data.coupons || []);
        console.log("Fetched coupons:", data.coupons);
      } catch (error) {
        console.error("Error fetching coupons:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, [id]);

  // Open delete confirmation modal
  const openDeleteModal = (couponId: string) => {
    setCouponToDelete(couponId);
    setShowDeleteModal(true);
  };

  // Close delete confirmation modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setCouponToDelete(null);
  };

  // Delete coupon after confirmation
  const handleDelete = async () => {
    if (!couponToDelete) return;
    
    const deletedCoupon = coupons.find((c) => c._id === couponToDelete);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/deletecoupons`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: couponToDelete }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.message || "Failed to delete coupon.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Coupon "${deletedCoupon?.code}" deleted successfully.`,
        variant: "default",
      });

      setCoupons((prev) => prev.filter((coupon) => coupon._id !== couponToDelete));
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast({
        title: "Error",
        description: "Something went wrong while deleting the coupon.",
        variant: "destructive",
      });
    }
  };

  // const serviceName = coupons?.map((ser)=>ser.serviceIds.title.join(",") || "All Plans")
  return (
    <>
      <Toaster />
      
      {/* Main content with conditional blur */}
      <div className={`w-full bg-white dark:bg-gray-900 py-8 ${showDeleteModal ? "blur-sm" : ""}`}>
        <div className="max-w-7xl mx-auto px-4">
          {/* <h1 className="text-left text-3xl font-bold mb-8 text-gray-800 dark:text-white">
            Your Coupons
          </h1> */}

          {coupons.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl inline-block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
                <h3 className="text-xl font-medium text-gray-600 dark:text-gray-300 mt-4">
                  No coupons found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Create your first coupon to get started
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {coupons.map((coupon) => (
                <div
                  key={coupon._id}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md overflow-hidden transition-all hover:shadow-lg"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center mb-2">
                          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                             {coupon.discountType ==="percentage" ? `${coupon.discount}% ` : `₹${coupon.discount}`}
                          </span>
                          <span className="ml-3 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-full">
                            {coupon.code}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Created
                            </p>
                            <p className="font-medium text-gray-700 dark:text-gray-200">
                              {coupon.createdAt
                                ? new Date(coupon.createdAt).toLocaleDateString()
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Expires
                            </p>
                            <p className="font-medium text-gray-700 dark:text-gray-200">
                              {new Date(
                                coupon.expiryDate
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Usage
                            </p>
                            <p className="font-medium text-gray-700 dark:text-gray-200">
                              {coupon.usedCount} / {coupon.usageLimit}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Link
                          href={`/dashboard/serviceprovider/content/createcoupon/updatecoupon/${coupon._id}`}
                          className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => openDeleteModal(coupon._id)}
                          className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      {(() => {
                        const type =
                          coupon.couponType ||
                          (coupon.packageIds && coupon.packageIds.length > 0
                            ? "packages"
                            : coupon.eventId
                              ? "event"
                              : "plans");

                        if (type === "event") {
                          const ev = coupon.eventId;
                          const name =
                            ev && typeof ev === "object" ? ev.title : "";
                          return (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Event
                              </span>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                {name || "—"}
                              </span>
                            </div>
                          );
                        }

                        if (type === "packages") {
                          // Build a title lookup from the populated refs (when
                          // populate runs) so we can label each row, then group
                          // validity rows by packageId. The render-set is the
                          // union of populated packages + any packageId that
                          // appears only in packageValidities — that way the
                          // validity chips render even if populate fails.
                          const titleById = new Map<string, string>();
                          for (const r of coupon.packageIds || []) {
                            const id = refId(r);
                            if (id) titleById.set(id, refTitle(r));
                          }
                          const validityByPkg = new Map<string, number[]>();
                          for (const row of coupon.packageValidities || []) {
                            const id = String(row.packageId);
                            const arr = validityByPkg.get(id) || [];
                            arr.push(row.validity);
                            validityByPkg.set(id, arr);
                          }
                          const allIds = Array.from(
                            new Set<string>([
                              ...Array.from(titleById.keys()),
                              ...Array.from(validityByPkg.keys()),
                            ])
                          );
                          if (allIds.length === 0) {
                            return (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Packages: All Packages
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-2">
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Packages
                              </span>
                              {allIds.map((id) => {
                                const validities = validityByPkg.get(id) || [];
                                const title = titleById.get(id) || "Package";
                                return (
                                  <div key={id} className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                      {title}
                                    </span>
                                    {validities.length > 0 ? (
                                      validities
                                        .slice()
                                        .sort((a, b) => a - b)
                                        .map((v) => (
                                          <span
                                            key={v}
                                            className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                          >
                                            {formatValidityLabel(v)}
                                          </span>
                                        ))
                                    ) : (
                                      <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                        All durations
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        // plans — same approach: union populated plans with
                        // serviceValidities so the validity chips render even
                        // when populate didn't run.
                        const titleById = new Map<string, string>();
                        for (const r of coupon.serviceIds || []) {
                          const id = refId(r);
                          if (id) titleById.set(id, refTitle(r));
                        }
                        const validityByPlan = new Map<string, number[]>();
                        for (const row of coupon.serviceValidities || []) {
                          const id = String(row.serviceId);
                          const arr = validityByPlan.get(id) || [];
                          arr.push(row.validity);
                          validityByPlan.set(id, arr);
                        }
                        const allIds = Array.from(
                          new Set<string>([
                            ...Array.from(titleById.keys()),
                            ...Array.from(validityByPlan.keys()),
                          ])
                        );
                        if (allIds.length === 0) {
                          return (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Plans: All Plans
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Plans
                            </span>
                            {allIds.map((id) => {
                              const validities = validityByPlan.get(id) || [];
                              const title = titleById.get(id) || "Plan";
                              return (
                                <div key={id} className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                    {title}
                                  </span>
                                  {validities.length > 0 ? (
                                    validities
                                      .slice()
                                      .sort((a, b) => a - b)
                                      .map((v) => (
                                        <span
                                          key={v}
                                          className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                        >
                                          {formatValidityLabel(v)}
                                        </span>
                                      ))
                                  ) : (
                                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                      All durations
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm" 
            onClick={closeDeleteModal}
          ></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete Coupon
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Are you sure you want to delete this coupon? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CouponList;