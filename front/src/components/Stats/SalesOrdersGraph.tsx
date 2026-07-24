"use client";

import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Define types for props
interface SalesData {
    month: string;
    orders: number;
    renewOrders: number;
}

interface SalesOrdersGraphProps {
    data: SalesData[];
}

export default function SalesOrdersGraph({ data }: { data: any }) {
    return (
        <Card className="mt-6 rounded-2xl shadow-md mb-6">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">
                    Monthly Sales & Renew Orders
                </CardTitle>
            </CardHeader>

            <CardContent className="px-2 sm:px-6">
                <div className="h-[260px] sm:h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#b3bdd3" />
                            <XAxis dataKey="month" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#fff",
                                    borderRadius: "10px",
                                    border: "1px solid #e5e7eb",
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                height={36}
                                wrapperStyle={{
                                    paddingBottom: "10px",
                                }}
                            />
                            <Bar
                                name="New Orders"
                                dataKey="orders"
                                fill="#3b82f6"
                                radius={[6, 6, 0, 0]}
                                barSize={35}
                                activeBar={{ fill: "#2563eb" }}
                            />
                            <Bar
                                name="Renew Orders"
                                dataKey="renewOrders"
                                fill="#f59e0b"
                                radius={[6, 6, 0, 0]}
                                barSize={35}
                                activeBar={{ fill: "#d97706" }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};
