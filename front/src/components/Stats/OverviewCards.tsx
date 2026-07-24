"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Users, Star, Briefcase, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import RevenueIcon from "@/icons/RevenueIcon";

export default function OverviewCards({ data }: { data: any }) {
    const current = data?.currentStats || {};
    const previous = data?.previousStats || {};

    // Helper function for comparison
    const getComparison = (currentValue: number, previousValue: number) => {
        if (!previousValue || previousValue === 0) return { diff: 0, positive: null };

        const diff = ((currentValue - previousValue) / previousValue) * 100;
        return {
            diff: diff.toFixed(1),
            positive: diff > 0,
        };
    };

    const cards = [
        {
            title: "Subscribers",
            value: current.subscribers || 0,
            prev: previous.subscribers || 0,
            icon: <Users className="text-green-500" />,
        },
        {
            title: "Revenue",
            value: `₹${(current.totalRevenue || 0).toLocaleString()}`,
            prev: previous.totalRevenue || 0,
            icon: <RevenueIcon className="text-green-500" />,
        },
        {
            title: "Plans",
            value: current.totalPlans || 0,
            prev: previous.totalPlans || 0,
            icon: <Briefcase className="text-blue-500" />,
        },
        {
            title: "Leads",
            value: current.totalLeads || 0,
            prev: previous.totalLeads || 0,
            icon: <Star className="text-yellow-500" />,
        },
        {
            title: "Orders",
            value: current.currentOrders || 0,
            prev: previous.prevOrders || 0,
            icon: <ShoppingCart className="text-purple-500" />,
        },
    ];

    return (
        <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6 pb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
        >
            {cards.map((card, i) => {
                const { diff, positive } = getComparison(
                    Number(card.value.toString().replace(/₹|,/g, "")),
                    card.prev
                );

                return (
                    <motion.div
                        key={i}
                        whileHover={{ scale: 1.03 }}
                        className="transition-transform"
                    >
                        <Card className="overflow-hidden gap-2 py-4 md:gap-4 md:py-6">
                            <CardHeader className="flex items-center gap-x-2 md:gap-x-3 px-4 md:px-6 text-sm md:text-base font-medium [&_svg]:size-5 md:[&_svg]:size-6 [&_svg]:shrink-0">
                                {card.icon} {card.title}
                            </CardHeader>

                            <CardContent className="flex items-baseline justify-between gap-2 flex-wrap px-4 md:px-6">
                                <span className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white truncate min-w-0">
                                    {card.value}
                                </span>
                                {card.title !== "Revenue" && positive !== null && (
                                    <div
                                        className={`inline-flex items-center gap-0.5 text-xs font-semibold shrink-0 whitespace-nowrap ${positive
                                                ? "text-green-500"
                                                : diff === "0.0"
                                                    ? "text-gray-400"
                                                    : "text-red-500"
                                            }`}
                                    >
                                        {positive ? (
                                            <TrendingUp className="w-3 h-3" />
                                        ) : (
                                            <TrendingDown className="w-3 h-3" />
                                        )}
                                        {diff !== "0.0" && <span>{Math.abs(Number(diff))}%</span>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
