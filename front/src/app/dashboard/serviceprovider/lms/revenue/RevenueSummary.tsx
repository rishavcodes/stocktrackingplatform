"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/authFetch";

type Summary = {
    grossRevenue: number;
    netRevenue: number;
    totalGST: number;
    totalOrders: number;
    averageOrderValue: number;
    thisMonthRevenue: number;
};

export default function RevenueSummary() {
    const { data: session } = useSession();
    const [data, setData] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSummary() {
            try {
                const res = await authFetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/revenue/summary`,
                    {
                        headers: {
                            Authorization: `Bearer ${session?.backendToken}`,
                        },
                    }
                );

                if (!res.ok) throw new Error("Failed to fetch revenue summary");

                const json: Summary = await res.json();
                setData(json);
            } catch (err) {
                console.error("Revenue summary fetch failed", err);
            } finally {
                setLoading(false);
            }
        }

        if (session?.backendToken) {
            fetchSummary();
        }
    }, [session?.backendToken]);

    if (loading) {
        return <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />;
    }

    if (!data) return null;

    const cards = [
        { label: "Gross Revenue", value: `₹${data.grossRevenue.toLocaleString()}` },
        { label: "Net Revenue", value: `₹${data.netRevenue.toLocaleString()}` },
        { label: "Total Sales", value: data.totalOrders },
        { label: "This Month", value: `₹${data.thisMonthRevenue.toLocaleString()}` },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
                <div
                    key={c.label}
                    className="rounded-lg border bg-white dark:bg-gray-900 p-5"
                >
                    <p className="text-sm text-gray-500">{c.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                        {c.value}
                    </p>
                </div>
            ))}
        </div>
    );
}
