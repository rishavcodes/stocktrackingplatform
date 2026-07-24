"use client";

import { OurServicesType } from "@/lib/types";
import { useState } from "react";
import Link from "next/link";
import { ToastOptions } from "./api";
import React from "react";
import RenewTradeboxPlan from "./RenewTradeboxPlan";
import ShareIcon from "@/icons/ShareIcon";
import { AnimatePresence } from "framer-motion";
import { ShareCard } from "@/components";
import { useToast } from "@/components/ui/use-toast";
import { buildProductUrl } from "@/lib/customDomain";

type PlansCardProps = {
  myPlans: OurServicesType[];
  gridLayout: string;
  setMyPlans: React.Dispatch<React.SetStateAction<OurServicesType[]>>;
  showToast: (options: ToastOptions) => void;
};

export default function PlansCard({
  myPlans,
  gridLayout,
  setMyPlans,
  showToast,
}: PlansCardProps) {
  const { toast } = useToast();
  const hostname =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "";

  const [isVisible, setIsVisible] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  // Open delete confirmation modal
  const openDeleteModal = (planId: string) => {
    setPlanToDelete(planId);
    setShowDeleteModal(true);
  };

  // Close delete confirmation modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPlanToDelete(null);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/deleteservice`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: planToDelete }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete plan");
      }

      // Update local state to remove the deleted plan
      setMyPlans((prevPlans) => prevPlans.filter((plan) => plan._id !== planToDelete));

      toast({
        title: "Success",
        description: "Plan deleted successfully",
        variant: "default",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete plan",
        variant: "destructive",
      });
    } finally {
      closeDeleteModal();
    }
  };

  return (
    <div className="space-y-4">
      {/* Main content with conditional blur */}
      <div className={`${showDeleteModal ? "blur-sm" : ""}`}>
        {myPlans.map((plan, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex flex-col p-4">
              {/* Header */}
              <div
                className={`${idx % 2 === 0
                  ? "bg-blue-50 dark:bg-gray-700"
                  : "bg-blue-100 dark:bg-gray-600"
                  } px-4 py-2 rounded-t-lg`}
              >
                <h3 className="text-xl font-semibold dark:text-white truncate">
                  {plan.title} <span className="text-sm">({plan.segment})</span>
                </h3>
              </div>

              {/* Content */}
              <div className="flex gap-4 p-4 border-b">
                <div className="flex flex-1 gap-6 items-center">
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    {plan.serviceType === "normal" ? (
                      <>
                        <StatItem
                          label="Active Subscribers"
                          value={plan.subscribedBy?.length}
                        />
                        <StatItem
                          label="Total Subscribers"
                          value={plan.subscribedBy?.length}
                        />
                      </>
                    ) : (
                      <>
                        <StatItem label="AUM" value={plan.AUM} />
                        <StatItem
                          label="Total Clients"
                          value={plan.NoOfClients}
                        />
                      </>
                    )}

                    {/* Pricing Plans List */}
                    <div className="col-span-2">
                      <div className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                        Pricing Options
                      </div>
                      {plan.pricingPlans && plan.pricingPlans.length > 0 ? (
                        <ul className="text-sm dark:text-white space-y-1">
                          {plan.pricingPlans.map((pricing, i) => (
                            <li key={i}>
                              ✅ ₹{pricing.price} for {pricing.validity} days
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm dark:text-white">
                          ₹{plan.price} for {plan.validity} days
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    {plan.activated ? (
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/serviceprovider/services/editplan/${plan._id}`}
                          className="px-4 py-2 bg-green-900/90 text-white rounded-md transition-colors"
                        >
                          Modify
                        </Link>
                        <Link
                          href={buildProductUrl("services", plan._id, (plan as any).authorData)}
                          className="px-4 py-2 bg-blue-900 hover:bg-blue text-white rounded-md transition-colors"
                        >
                          View
                        </Link>

                        <button 
                          className="px-4 py-2 bg-red-600 hover:bg-blue text-white rounded-md transition-colors"
                          onClick={() => openDeleteModal(plan._id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <RenewTradeboxPlan id={plan._id} title={plan.title} />
                    )}

                    {/* Share Button */}
                    <div
                      className="relative group"
                      onMouseEnter={() => setIsVisible(plan._id)}
                      onMouseLeave={() => setIsVisible("")}
                    >
                      <button className="w-full px-4 py-2 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors">
                        <ShareIcon className="w-4 h-4" />
                        Share
                      </button>

                      <AnimatePresence>
                        {plan._id === isVisible && (
                          <div className="absolute right-0 bottom-full mb-2">
                            <ShareCard
                              title={`${plan.title} - `}
                              separator="Read more at :-"
                              url={`https://${hostname}/view/services/${plan._id}`}
                            />
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
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
              Delete Plan
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Are you sure you want to delete this plan? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlan}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) => (
  <div className="text-center">
    <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
    <div className="text-lg font-semibold dark:text-white">{value}</div>
  </div>
);