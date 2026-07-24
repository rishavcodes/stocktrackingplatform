"use client"
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Trash2, Landmark, Users, Eye, Share, FileText, BarChart3, Clock, TrendingUp, PlusCircle, Search, Filter, MoreVertical, DeleteIcon, TrashIcon } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareCard } from "@/components";
import { AnimatePresence } from "framer-motion";
import ShareIcon from "@/icons/ShareIcon";
import EyeIcon from "@/icons/EyeIcon";
import PencilIcon from "@/icons/PencilIcon";
import { normalizePortfolioPricing } from "@/lib/portfolioPricing";

interface Portfolio {
    _id: string;
    authorData: {
        _id: string;
        name: string;
        email: string;
    }
    portfolioName: string;
    theme: string;
    methodology: string;
    minInvestmentAmount: number;
    benchmarkIndex: string;
    createdAt: string;
    bannerURL?: string;
    subscribedBy?: string[];
    fees?: number;
    feeValidity?: string;
    pricingPlans?: { validity: number; price: number }[];
}

export default function MyPortfolios() {

    const session = useSession()
    const { toast } = useToast();

    const hostname =
        typeof window !== "undefined" && window.location.hostname
            ? window.location.hostname
            : "";

    const [isVisible, setIsVisible] = useState<string>("");
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

    const fetchPortfolios = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/get-portfolios?authorId=${session.data?.user.id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                throw new Error("Failed to fetch portfolios");
            }
            const data = await response.json();
            // Sort portfolios by creation date (latest first)
            const sortedPortfolios = data.data.sort((a: Portfolio, b: Portfolio) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setPortfolios(sortedPortfolios);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolios();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleDelete = async (portfolioId: string) => {
        try {
            setDeleteLoading(portfolioId);
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/delete-portfolio/${portfolioId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to delete portfolio");
            }

            setPortfolios((prev) => prev.filter((p) => p._id !== portfolioId));
            setShowDeleteDialog(null);
            toast({
                title: "Portfolio deleted successfully",
                description: "Your portfolio has been deleted successfully.",
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete portfolio");
            toast({
                title: "Failed to delete portfolio",
                description: "Something went wrong.",
            });
        } finally {
            setDeleteLoading(null);
        }
    };

    const filteredAndSortedPortfolios = portfolios
        .filter(portfolio =>
            portfolio.portfolioName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            portfolio.theme.toLowerCase().includes(searchTerm.toLowerCase()) ||
            portfolio.benchmarkIndex.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case "newest":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case "oldest":
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case "name":
                    return a.portfolioName.localeCompare(b.portfolioName);
                default:
                    return 0;
            }
        });

    if (loading) {
        return (
            <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
                        </div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse"></div>
                    </div>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col md:flex-row animate-pulse">
                                <div className="md:w-1/4">
                                    <div className="h-40 md:h-full bg-gray-300 dark:bg-gray-700"></div>
                                </div>
                                <div className="flex-1 p-6 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="space-y-2">
                                                <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                                                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                                            </div>
                                            <div className="h-8 w-8 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            {[...Array(4)].map((_, i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                                                    <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className="flex flex-wrap gap-2">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-24"></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col items-center justify-center h-[60vh]">
                        <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
                            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Error Loading Portfolios</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm text-center max-w-md">{error}</p>
                        <button
                            onClick={fetchPortfolios}
                            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Toaster />
            <div className="min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    {portfolios.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="text-center max-w-md p-6">
                                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Landmark className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No Portfolios Yet</h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Create your first portfolio to get started with managing investments</p>
                                <Link
                                    href="/dashboard/serviceprovider/portfolio/create"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all text-sm font-medium shadow-md hover:shadow-lg"
                                >
                                    <PlusCircle className="w-5 h-5" />
                                    Create Portfolio
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAndSortedPortfolios.map((portfolio) => (
                                <div
                                    key={portfolio._id}
                                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col md:flex-row items-center group"
                                >
                                    {/* Banner Image Section */}
                                    <div className="md:w-1/4 relative group overflow-hidden pl-2">
                                        <Avatar className="w-full h-40 rounded-lg border dark:border-gray-600">
                                            <AvatarImage src={portfolio.bannerURL} alt={portfolio.portfolioName} className="object-cover" />
                                            <AvatarFallback className="bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                <FileText className="w-8 h-8 text-gray-400" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute top-3 left-3 bg-blue-600 dark:bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                                            {portfolio.theme}
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex-1 p-6 flex flex-col">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="pr-4 flex items-center gap-x-4">
                                                    <Link href={`/dashboard/serviceprovider/portfolio/editportfolio/${portfolio._id}`}>
                                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 group-hover:underline">
                                                            {portfolio.portfolioName}
                                                        </h2>
                                                    </Link>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                                                        {/* <Clock className="w-4 h-4" /> */}
                                                        Created on {format(new Date(portfolio.createdAt), "MMM d, yyyy")}
                                                    </p>
                                                </div>
                                                <div className="border-t border-gray-100 dark:border-gray-700">
                                                    <div className="flex flex-wrap gap-3">
                                                        <Link
                                                            href={`/dashboard/serviceprovider/portfolio/editportfolio/${portfolio._id}`}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all shadow-sm hover:shadow-md"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                            Modify
                                                        </Link>
                                                        <Link
                                                            href={`/view/portfolio/${portfolio._id}`}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all shadow-sm hover:shadow-md"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                            View
                                                        </Link>
                                                        <Link
                                                            href={`/view/factsheet/${portfolio._id}`}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all shadow-sm hover:shadow-md"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            Fact Sheet
                                                        </Link>
                                                        <div
                                                            className="relative group"
                                                            onMouseEnter={() => setIsVisible(portfolio._id)}
                                                            onMouseLeave={() => setIsVisible("")}
                                                        >
                                                            <button className="px-4 py-4 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors">
                                                                <ShareIcon className="w-4 h-4" />
                                                            </button>

                                                            <AnimatePresence>
                                                                {portfolio._id === isVisible && (
                                                                    <div className="absolute right-0 top-4 bottom-full mb-2">
                                                                        <ShareCard
                                                                            title={`${portfolio.portfolioName} - `}
                                                                            separator="Read more at :-"
                                                                            url={`https://${hostname}/view/portfolio/${portfolio._id}`}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                        <button
                                                            className="px-4 py-2 bg-red-600 hover:bg-blue text-white rounded-md transition-colors"
                                                            onClick={() => setShowDeleteDialog(portfolio._id)}
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                                        <TrendingUp className="w-4 h-4" />
                                                        Min. Investment
                                                    </p>
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(portfolio.minInvestmentAmount)}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                                        <BarChart3 className="w-4 h-4" />
                                                        Benchmark
                                                    </p>
                                                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{portfolio.benchmarkIndex}</p>
                                                </div>
                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                                                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                                        <Users className="w-4 h-4" />
                                                        Subscribers
                                                    </p>
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{portfolio.subscribedBy
 ? portfolio.subscribedBy.length : 0}</p>
                                                </div>
                                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800/30">
                                                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                                                        {(portfolio.pricingPlans?.length ?? 0) > 1 ? "Fees (from)" : "Fees"}
                                                    </p>
                                                    {(() => {
                                                        const { minPrice, cheapestPlan } = normalizePortfolioPricing(portfolio);
                                                        return (
                                                            <>
                                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(minPrice)}</p>
                                                                {cheapestPlan && cheapestPlan.validity > 0 && (
                                                                    <p className="text-xs text-green-500 dark:text-green-400 mt-1">Valid for {cheapestPlan.validity} days</p>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Delete Dialog */}
                    {portfolios.map(portfolio => (
                        <AlertDialog
                            key={portfolio._id}
                            open={showDeleteDialog === portfolio._id}
                            onOpenChange={() => setShowDeleteDialog(null)}
                        >
                            <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-md">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-gray-900 dark:text-white text-lg">Delete Portfolio</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 text-sm">
                                        Are you sure you want to delete &quot;{portfolio.portfolioName}&quot;? This action cannot be undone and will remove all associated data.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border-0 rounded-lg text-sm px-4 py-2">
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDelete(portfolio._id)}
                                        disabled={deleteLoading === portfolio._id}
                                        className="bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 border-0 rounded-lg text-sm px-4 py-2"
                                    >
                                        {deleteLoading === portfolio._id ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                Deleting...
                                            </div>
                                        ) : (
                                            "Delete Portfolio"
                                        )}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ))}
                </div>
            </div>
        </>
    )
}