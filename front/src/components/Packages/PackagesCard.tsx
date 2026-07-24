// components/Packages/PackagesCard.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import ShareIcon from "@/icons/ShareIcon";
import { ShareCard } from "@/components";
import { useToast } from "@/components/ui/use-toast";
import { PackageType } from "@/app/dashboard/serviceprovider/packages/mypackages/page";
import { buildProductUrl } from "@/lib/customDomain";

type Props = {
    packages: PackageType[];
    setPackages: React.Dispatch<React.SetStateAction<PackageType[]>>;
    token: String;
};

export default function PackagesCard({ packages, setPackages, token }: Props) {
    const { toast } = useToast();

    const hostname =
        typeof window !== "undefined" ? window.location.hostname : "";

    const [isVisible, setIsVisible] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [packageToDelete, setPackageToDelete] = useState<string | null>(null);

    const openDeleteModal = (id: string) => {
        setPackageToDelete(id);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setPackageToDelete(null);
    };

    const handleDelete = async () => {
        if (!packageToDelete) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/package/delete`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ id: packageToDelete }),
                }
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message);
            }

            setPackages(prev =>
                prev.filter(pkg => pkg._id !== packageToDelete)
            );

            toast({
                title: "Deleted",
                description: "Package deleted successfully",
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Delete failed",
                variant: "destructive",
            });
        } finally {
            closeDeleteModal();
        }
    };

    return (
        <div className="space-y-4">

            {/* Cards */}
            <div className={`${showDeleteModal ? "blur-sm" : ""}`}>
                {packages.map((pkg, idx) => (
                    <div
                        key={pkg._id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md"
                    >
                        <div className="flex flex-col p-4">

                            {/* Header */}
                            <div
                                className={`${idx % 2 === 0
                                        ? "bg-blue-50 dark:bg-gray-700"
                                        : "bg-blue-100 dark:bg-gray-600"
                                    } px-4 py-2 rounded-t-lg`}
                            >
                                <h3 className="text-xl font-semibold truncate">
                                    {pkg.title}
                                </h3>
                            </div>

                            {/* Content */}
                            <div className="flex gap-4 p-4 border-b">

                                <div className="flex-1 grid grid-cols-4 gap-4">

                                    <StatItem
                                        label="Total Services"
                                        value={pkg.includedServices.length}
                                    />

                                    <StatItem
                                        label="Tiers"
                                        value={pkg.pricingPlans?.length || 0}
                                    />

                                    <StatItem
                                        label="Starts from"
                                        value={
                                            pkg.pricingPlans?.length
                                                ? `₹${Math.min(...pkg.pricingPlans.map((t) => t.price))}`
                                                : "—"
                                        }
                                    />

                                    <div className="col-span-4 mt-2">
                                        <div className="text-sm font-medium mb-1">
                                            Included Plans
                                        </div>
                                        <ul className="text-sm space-y-1">
                                            {pkg.includedServices.map(s => (
                                                <li key={s._id}>✅ {s.title}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 min-w-[200px]">

                                    <div className="flex gap-2">
                                        <Link
                                            href={`/dashboard/serviceprovider/packages/edit/${pkg._id}`}
                                            className="px-4 py-2 bg-green-700 text-white rounded-md"
                                        >
                                            Modify
                                        </Link>

                                        <Link
                                            href={buildProductUrl("packages", pkg._id, (pkg as any).authorData)}
                                            className="px-4 py-2 bg-blue-700 text-white rounded-md"
                                        >
                                            View
                                        </Link>

                                        <button
                                            onClick={() => openDeleteModal(pkg._id)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-md"
                                        >
                                            Delete
                                        </button>
                                    </div>

                                    {/* Share */}
                                    <div
                                        className="relative"
                                        onMouseEnter={() => setIsVisible(pkg._id)}
                                        onMouseLeave={() => setIsVisible("")}
                                    >
                                        <button className="w-full px-4 py-2 flex justify-center gap-2 bg-gray-100 rounded-md">
                                            <ShareIcon className="w-4 h-4" />
                                            Share
                                        </button>

                                        <AnimatePresence>
                                            {pkg._id === isVisible && (
                                                <div className="absolute right-0 bottom-full mb-2">
                                                    <ShareCard
                                                        title={`${pkg.title} - `}
                                                        separator="Check here :-"
                                                        url={`https://${hostname}/view/packages/${pkg._id}`}
                                                    />
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/30"
                        onClick={closeDeleteModal}
                    ></div>

                    <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold">
                            Delete Package
                        </h3>
                        <p className="mt-2 text-gray-500">
                            This action cannot be undone.
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={closeDeleteModal}
                                className="px-4 py-2 border rounded-md"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-md"
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
    value: string | number;
}) => (
    <div className="text-center">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
    </div>
);
