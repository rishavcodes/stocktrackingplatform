"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/authFetch";

type OrderRow = {
    id: string;
    courseTitle: string;
    buyerName: string;
    amount: number;
    date: string;
    buyerPhone:string;
    buyerEmail:string;
};

export default function RevenueOrdersTable() {
    const { data: session } = useSession();
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOrders() {
            try {
                const res = await authFetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/revenue/orders`,
                    {
                        headers: {
                            Authorization: `Bearer ${session?.backendToken}`,
                        },
                    }
                );

                const json = await res.json();
                setOrders(json.orders || []);
            } catch (err) {
                console.error("Failed to fetch orders", err);
            } finally {
                setLoading(false);
            }
        }

        if (session?.backendToken) {
            fetchOrders();
        }
    }, [session?.backendToken]);

    return (
        <div className="bg-white dark:bg-gray-900 border rounded-lg">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Recent Orders</h2>
            </div>

            {loading ? (
                <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : orders.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No orders yet</div>
            ) : (
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="text-left px-4 py-2">Order</th>
                            <th className="text-left px-4 py-2">Course</th>
                            <th className="text-left px-4 py-2">Buyer</th>
                            <th className="text-left px-4 py-2">Buyer Phone</th>
                            <th className="text-left px-4 py-2">Buyer Email</th>
                            <th className="text-right px-4 py-2">Amount</th>
                            <th className="text-right px-4 py-2">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((o) => (
                            <tr
                                key={o.id}
                                className="border-t hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <td className="px-4 py-3">{o.id}</td>
                                <td className="px-4 py-3">{o.courseTitle}</td>
                                <td className="px-4 py-3">{o.buyerName}</td>
                                <td className="px-4 py-3">{o.buyerPhone}</td>
                                <td className="px-4 py-3">{o.buyerEmail}</td>
                                <td className="px-4 py-3 text-right">
                                    ₹{o.amount.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {new Date(o.date).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
