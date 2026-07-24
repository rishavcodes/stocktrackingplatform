import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

export const ScoreCardChart = ({ stoploss, entry, target, ltp }: any) => {
    const range = target - stoploss;
    const progress = range ? ((ltp - stoploss) / range) * 100 : 0;
    const entryProgress = range ? ((entry - stoploss) / range) * 100 : 0;

    const data = [
        { name: "Progress", value: progress, fill: "#3b82f6" },
    ];

    return (
        <div className="relative w-40 h-40">
            <ResponsiveContainer>
                <RadialBarChart
                    cx="50%"
                    cy="100%"
                    innerRadius="80%"
                    outerRadius="100%"
                    barSize={12}
                    startAngle={180}
                    endAngle={0}
                    data={data}
                >
                    <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                    />
                    <RadialBar dataKey="value" cornerRadius={10} />
                </RadialBarChart>
            </ResponsiveContainer>

            {/* Labels */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-gray-500">Entry ₹{entry.toFixed(2)}</p>
                <p className="text-lg font-semibold text-blue-600">₹{ltp.toFixed(2)}</p>
            </div>
        </div>
    );
};
