"use client"
import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Target,  Activity, Wallet } from "lucide-react";
import { ScoreCardTypes } from "@/lib/types";

const sections: string[] = ["equity", "FnO", "commodity"];

// Per-RA performance summary, computed over that RA's slice of the pooled
// trades. Mirrors the dashboard's own definitions: a "successful" trade is a
// closed + triggered recommendation that booked positive P&L; returns are P&L
// over deployed entry value across closed+triggered trades.
function computeRAStats(list: ScoreCardTypes[]) {
  const closedTriggered = list.filter(
    (t) => t.status === "closed" && t.istriggered === "triggered",
  );
  const successful = closedTriggered.filter((t) => Number(t.pnl || 0) > 0).length;
  const successRate = closedTriggered.length
    ? Number(((successful / closedTriggered.length) * 100).toFixed(2))
    : 0;
  const totalEntry = closedTriggered.reduce(
    (s, e) => s + Number(e.entryPrice || 0),
    0,
  );
  const totalPnl = closedTriggered.reduce((s, e) => s + Number(e.pnl || 0), 0);
  const returnsPct = totalEntry
    ? Number(((totalPnl / totalEntry) * 100).toFixed(2))
    : 0;
  return {
    total: list.length,
    closed: list.filter((t) => t.status === "closed").length,
    successRate,
    returnsPct,
    totalPnl,
  };
}

async function fetchTrades(id: string, planId?: string) {
  try {
    const queryParam = planId ? `&planId=${planId}` : "";
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/getmyrecommendations?id=${id}${queryParam}`,
      { method: "GET" }
    );

    if (response.status !== 200) {
      return { data: [], plans: [], ras: [] };
    }

    const rawRes = await response.json();
    return {
      data: rawRes.data,
      plans: rawRes.plans || [],
      ras: rawRes.ras || [],
    };
  } catch (error) {
    console.error("Error fetching trades:", error);
    return { data: [], plans: [], ras: [] };
  }
}

export default function PerformancePage({ id }: { id: string }) {
  const [tradesData, setTradesData] = useState<ScoreCardTypes[]>([]);
  const [plans, setPlans] = useState<{ _id: string; title: string }[]>([]);
  const [ras, setRas] = useState<{ id: string; name: string }[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [selectedRA, setSelectedRA] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      const res = await fetchTrades(id, selectedPlan === "all" ? undefined : selectedPlan);
      setTradesData(res.data);
      setPlans(res.plans);
      setRas(res.ras);
    }

    fetchData();
  }, [id, selectedPlan]);

  // The full RA roster for the firm (master + every sub-profile) comes from the
  // API, so EVERY RA appears in the filter — even ones who haven't posted a
  // recommendation yet. We fall back to deriving the list from the trades only
  // if the API didn't send a roster (older backend). A solo RA / user sub-
  // profile gets a single entry → the RA selector + RA-wise table stay hidden.
  const raList = useMemo(() => {
    if (ras.length) return ras;
    const map = new Map<string, string>();
    for (const t of tradesData) {
      const a = (t as any).authorData;
      if (a?.id) map.set(String(a.id), a.name || "Unknown RA");
    }
    return Array.from(map, ([raId, name]) => ({ id: raId, name }));
  }, [ras, tradesData]);

  const multiRA = raList.length > 1;

  // Every metric below runs on this RA-filtered slice, so picking an RA (via
  // the header dropdown or a row in the RA-wise table) re-scopes the entire
  // dashboard to that RA; "all" keeps the whole-firm view.
  const trades = useMemo(
    () =>
      selectedRA === "all"
        ? tradesData
        : tradesData.filter(
            (t) => String((t as any).authorData?.id) === selectedRA,
          ),
    [tradesData, selectedRA],
  );

  // Helper function to check if a trade was successful (closed on profit)
  const isSuccessfulTrade = (trade: ScoreCardTypes): boolean => {
    return Number(trade.pnl || 0) > 0;
  };

  // Filter closed and triggered trades by segment
  const filterClosedTriggeredTrades = (exchanges: string[]) =>
    trades.filter(
      (t) =>
        t.status === "closed" &&
        exchanges.includes(t.exchange) &&
        t.istriggered === "triggered"
    );

  // All closed trades (including non-triggered)
  const closedTradesAll = trades.filter((t) => t.status === "closed");

  // Closed and triggered trades only
  const closedTriggeredTrades = trades.filter(
    (t) => t.status === "closed" && t.istriggered === "triggered"
  );

  const openTrades = trades.filter((t) => t.status === "open");

  // Segment filtering - adjust exchanges based on your actual data
  const closedTradesEquity = filterClosedTriggeredTrades(["NSE", "BSE"]);
  const closedTradesFNO = filterClosedTriggeredTrades(["NFO", "BFO"]);
  const closedTradesCommodity = filterClosedTriggeredTrades(["MCX"]);

  // Count successful trades for each segment
  const successfulTradesAll = closedTriggeredTrades.filter(isSuccessfulTrade).length;
  const successfulTradesEquity = closedTradesEquity.filter(isSuccessfulTrade).length;
  const successfulTradesFNO = closedTradesFNO.filter(isSuccessfulTrade).length;
  const successfulTradesCommodity = closedTradesCommodity.filter(isSuccessfulTrade).length;

  // Calculate total P&L for different segments
  const totalPnLAll = closedTriggeredTrades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const totalPnLEquity = closedTradesEquity.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const totalPnLFNO = closedTradesFNO.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const totalPnLCommodity = closedTradesCommodity.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);

  const successRatio = () => {
    const calc = (successfulTrades: number, allTrades: ScoreCardTypes[]) =>
      allTrades.length
        ? Number(((successfulTrades / allTrades.length) * 100).toFixed(2))
        : 0;

    return {
      all: calc(successfulTradesAll, closedTriggeredTrades),
      equity: calc(successfulTradesEquity, closedTradesEquity),
      FnO: calc(successfulTradesFNO, closedTradesFNO),
      commodity: calc(successfulTradesCommodity, closedTradesCommodity),
    };
  };

  const percentageRatio = () => {
    const calc = (totalVal: number, totalPnLVal: number) =>
      totalVal ? Number(((totalPnLVal / totalVal) * 100).toFixed(2)) : 0;

    return {
      all: calc(
        closedTriggeredTrades.reduce((sum, e) => sum + Number(e.entryPrice || 0), 0),
        closedTriggeredTrades.reduce((sum, e) => sum + Number(e.pnl || 0), 0)
      ),
      equity: calc(
        closedTradesEquity.reduce((sum, e) => sum + Number(e.entryPrice || 0), 0),
        closedTradesEquity.reduce((sum, e) => sum + Number(e.pnl || 0), 0)
      ),
      FnO: calc(
        closedTradesFNO.reduce((sum, e) => sum + Number(e.entryPrice || 0), 0),
        closedTradesFNO.reduce((sum, e) => sum + Number(e.pnl || 0), 0)
      ),
      commodity: calc(
        closedTradesCommodity.reduce((sum, e) => sum + Number(e.entryPrice || 0), 0),
        closedTradesCommodity.reduce((sum, e) => sum + Number(e.pnl || 0), 0)
      ),
    };
  };

  // Prepare data for charts
  const tradeStatusData = [
    { name: "Open", value: openTrades.length, color: "#00A172" },
    { name: "Closed", value: closedTradesAll.length, color: "#FF6B6B" },
  ];

  const successRatioData = [
    { 
      name: "Equity", 
      value: successRatio().equity, 
      color: "#01AFEF",
      successfulTrades: successfulTradesEquity,
      totalTrades: closedTradesEquity.length
    },
    { 
      name: "F&O", 
      value: successRatio().FnO, 
      color: "#00c1a1",
      successfulTrades: successfulTradesFNO,
      totalTrades: closedTradesFNO.length
    },
    { 
      name: "Commodity", 
      value: successRatio().commodity, 
      color: "#FF9F40",
      successfulTrades: successfulTradesCommodity,
      totalTrades: closedTradesCommodity.length
    },
  ];

  const returnsData = [
    { name: "Equity", value: percentageRatio().equity, color: "#01AFEF" },
    { name: "F&O", value: percentageRatio().FnO, color: "#00c1a1" },
    { name: "Commodity", value: percentageRatio().commodity, color: "#FF9F40" },
  ];

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Determine color for P&L display
  const getPnLColor = (amount: number) => {
    return amount >= 0 ? "text-green-600" : "text-red-600";
  };

  const getPnLBgColor = (amount: number) => {
    return amount >= 0 ? "bg-green-50" : "bg-red-50";
  };

  const getPnLIconColor = (amount: number) => {
    return amount >= 0 ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Performance Dashboard
              </h1>
              <p className="text-gray-600">
                Track your trading performance and analytics
                {multiRA && selectedRA !== "all" && (
                  <>
                    {" — "}
                    <span className="font-semibold text-gray-800">
                      {raList.find((r) => r.id === selectedRA)?.name}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* RA selector — only for firms (master / admin sub) where the
                  pooled data spans more than one RA. */}
              {multiRA && (
                <select
                  value={selectedRA}
                  onChange={(e) => setSelectedRA(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All RAs</option>
                  {raList.map((ra) => (
                    <option key={ra.id} value={ra.id}>
                      {ra.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Plans</option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold mb-2 text-yellow-800">Segment Analysis:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <strong>Equity:</strong> {successfulTradesEquity}/{closedTradesEquity.length} successful ({successRatio().equity}%)
            </div>
            <div className="bg-white p-3 rounded border">
              <strong>F&O:</strong> {successfulTradesFNO}/{closedTradesFNO.length} successful ({successRatio().FnO}%)
            </div>
            <div className="bg-white p-3 rounded border">
              <strong>Commodity:</strong> {successfulTradesCommodity}/{closedTradesCommodity.length} successful ({successRatio().commodity}%)
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{trades.length}</span>
            </div>
            <h3 className="text-lg font-semibold opacity-90">Total Recommendations</h3>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{openTrades.length}</span>
            </div>
            <h3 className="text-lg font-semibold opacity-90">Open Trades</h3>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{closedTradesAll.length}</span>
            </div>
            <h3 className="text-lg font-semibold opacity-90">Closed Trades</h3>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              
              <span className="text-3xl font-bold">{successRatio().all}%</span>
            </div>
            <h3 className="text-lg font-semibold opacity-90">Success Rate</h3>
          </div>
        </div>

        {/* RA-wise Performance — only shown to firms (Non-Individual master /
            admin sub-profile) whose pooled data spans multiple RAs. Tap a row
            to re-scope the whole dashboard to that RA. */}
        {multiRA && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">RA-wise Performance</h2>
              {selectedRA !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedRA("all")}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">RA</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Total Recs</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Closed</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Success Rate</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Returns</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Total P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {raList.map((ra) => {
                    const s = computeRAStats(
                      tradesData.filter(
                        (t) => String((t as any).authorData?.id) === ra.id,
                      ),
                    );
                    const active = selectedRA === ra.id;
                    return (
                      <tr
                        key={ra.id}
                        onClick={() => setSelectedRA(active ? "all" : ra.id)}
                        className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${active ? "bg-blue-50" : ""}`}
                      >
                        <td className="py-3 px-4 font-medium">{ra.name}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{s.total}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{s.closed}</td>
                        <td className="text-right py-3 px-4">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            {s.successRate}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                            {s.returnsPct}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`inline-block px-3 py-1 ${s.totalPnl >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} rounded-full text-sm font-semibold`}>
                            {formatCurrency(s.totalPnl)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Tap a row to filter the whole dashboard to that RA.
            </p>
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Trade Status Pie Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Trade Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tradeStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent! * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tradeStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Success Ratio Bar Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Success Ratio by Segment</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={successRatioData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value, name) => [`${value}%`, "Success Rate"]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `${label} (${data.successfulTrades}/${data.totalTrades} trades)`;
                    }
                    return label;
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {successRatioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Returns Bar Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Returns by Segment (%)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={returnsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, "Returns"]} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {returnsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Overall Performance Card - UPDATED WITH TOTAL P&L */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Overall Performance</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Overall Success Rate</p>
                  <p className="text-3xl font-bold text-blue-600">{successRatio().all}%</p>
                </div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Overall Returns</p>
                  <p className="text-3xl font-bold text-green-600">{percentageRatio().all}%</p>
                </div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>

              {/* NEW: Total P&L Card */}
              <div className={`flex items-center justify-between p-4 ${getPnLBgColor(totalPnLAll)} rounded-lg`}>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total P&L</p>
                  <p className={`text-3xl font-bold ${getPnLColor(totalPnLAll)}`}>
                    {formatCurrency(totalPnLAll)}
                  </p>
                </div>
                <div className={`w-16 h-16 ${totalPnLAll >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                  <Wallet className={`w-8 h-8 ${getPnLIconColor(totalPnLAll)}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats Table - UPDATED WITH P&L COLUMN */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Segment Performance Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Segment</th>
                  <th className="text-right py-3 px-4 text-gray-700 font-semibold">Total Trades</th>
                  <th className="text-right py-3 px-4 text-gray-700 font-semibold">Successful Trades</th>
                  <th className="text-right py-3 px-4 text-gray-700 font-semibold">Success Rate</th>
                  <th className="text-right py-3 px-4 text-gray-700 font-semibold">Returns</th>
                  <th className="text-right py-3 px-4 text-gray-700 font-semibold">Total P&L</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">Equity</td>
                  <td className="text-right py-3 px-4 text-gray-700">{closedTradesEquity.length}</td>
                  <td className="text-right py-3 px-4 text-gray-700">{successfulTradesEquity}</td>
                  <td className="text-right py-3 px-4">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      {successRatio().equity}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      {percentageRatio().equity}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={`inline-block px-3 py-1 ${totalPnLEquity >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-full text-sm font-semibold`}>
                      {formatCurrency(totalPnLEquity)}
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">F&O</td>
                  <td className="text-right py-3 px-4 text-gray-700">{closedTradesFNO.length}</td>
                  <td className="text-right py-3 px-4 text-gray-700">{successfulTradesFNO}</td>
                  <td className="text-right py-3 px-4">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      {successRatio().FnO}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      {percentageRatio().FnO}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={`inline-block px-3 py-1 ${totalPnLFNO >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-full text-sm font-semibold`}>
                      {formatCurrency(totalPnLFNO)}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">Commodity</td>
                  <td className="text-right py-3 px-4 text-gray-700">{closedTradesCommodity.length}</td>
                  <td className="text-right py-3 px-4 text-gray-700">{successfulTradesCommodity}</td>
                  <td className="text-right py-3 px-4">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      {successRatio().commodity}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      {percentageRatio().commodity}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={`inline-block px-3 py-1 ${totalPnLCommodity >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-full text-sm font-semibold`}>
                      {formatCurrency(totalPnLCommodity)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}