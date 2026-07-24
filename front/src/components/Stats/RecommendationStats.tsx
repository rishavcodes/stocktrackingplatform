"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function RecommendationStats({ data }: { data: any }) {
    const COLORS = ["#60A5FA", "#34D399"];

    const chartData = [
        { name: "Open", value: data.open },
        { name: "Closed", value: data.close },
    ];

    const labels = ["Open", "Closed"];

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="pb-6"
        >
            <Card className="shadow-md">
                <CardHeader className="flex justify-between items-center font-semibold">
                    <span>Recommendation Overview</span>
                    <TrendingUp className="text-green-600" />
                </CardHeader>

                <CardContent className="flex flex-col md:flex-row items-center gap-8">
                    <ResponsiveContainer width={250} height={250}>
                        <PieChart>
                            <Legend
                                verticalAlign="top"
                                height={36}
                                wrapperStyle={{
                                    paddingBottom: "10px",
                                }}
                            />
                            <Pie data={chartData} dataKey="value" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                {chartData.map((entry, index) => (
                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>

                    <div className="text-sm space-y-2 text-gray-600">
                        <p>Total Recommendations: <span className="font-semibold">{data.total}</span></p>
                        <p>Return Ratio: <span className="font-semibold">{data.returnratio}%</span></p>
                        <p>Average Return: <span className="font-semibold">{data.returnpercentage}%</span></p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
