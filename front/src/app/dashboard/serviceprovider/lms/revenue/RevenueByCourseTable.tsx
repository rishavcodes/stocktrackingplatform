"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/authFetch";

type CourseRevenue = {
    courseId: string;
    title: string;
    price: number;
    orders: number;
    revenue: number;
};

export default function RevenueByCourseTable() {
    const { data: session } = useSession();
    const [rows, setRows] = useState<CourseRevenue[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchByCourse() {
            try {
                const res = await authFetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/revenue/by-course`,
                    {
                        headers: {
                            Authorization: `Bearer ${session?.backendToken}`,
                        },
                    }
                );

                const json = await res.json();
                setRows(json.rows || []);
            } catch (err) {
                console.error("Failed to fetch revenue by course", err);
            } finally {
                setLoading(false);
            }
        }

        if (session?.backendToken) {
            fetchByCourse();
        }
    }, [session?.backendToken]);

    return (
        <div className="bg-white dark:bg-gray-900 border rounded-lg">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Revenue by Course</h2>
            </div>

            {loading ? (
                <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : rows.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No sales yet</div>
            ) : (
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="text-left px-4 py-2">Course</th>
                            <th className="text-right px-4 py-2">Price</th>
                            <th className="text-right px-4 py-2">Orders</th>
                            <th className="text-right px-4 py-2">Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.courseId}
                                className="border-t hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <td className="px-4 py-3">{row.title}</td>
                                <td className="px-4 py-3 text-right">₹{row.price}</td>
                                <td className="px-4 py-3 text-right">{row.orders}</td>
                                <td className="px-4 py-3 text-right font-semibold">
                                    ₹{row.revenue.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
