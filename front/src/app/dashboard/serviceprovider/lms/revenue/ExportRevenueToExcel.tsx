"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FileDown, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/components/ui/use-toast";

const SUMMARY_URL = "/api/v1/courses/revenue/summary";
const BY_COURSE_URL = "/api/v1/courses/revenue/by-course";
const ORDERS_URL = "/api/v1/courses/revenue/orders";

export default function ExportRevenueToExcel() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!session?.backendToken) {
      toast({ title: "Error", description: "Please sign in to export.", variant: "destructive" });
      return;
    }
    const base = process.env.NEXT_PUBLIC_BACKEND_URL;
    const headers = { Authorization: `Bearer ${session.backendToken}` };
    setExporting(true);
    try {
      const [summaryRes, byCourseRes, ordersRes] = await Promise.all([
        authFetch(`${base}${SUMMARY_URL}`, { headers }),
        authFetch(`${base}${BY_COURSE_URL}`, { headers }),
        authFetch(`${base}${ORDERS_URL}`, { headers }),
      ]);

      const summaryJson = await summaryRes.json();
      const byCourseJson = await byCourseRes.json();
      const ordersJson = await ordersRes.json();

      const summary = summaryJson?.data ?? summaryJson;
      const rows = byCourseJson?.rows ?? [];
      const orders = ordersJson?.orders ?? [];

      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary (key-value table)
      const summaryData = summary && typeof summary === "object"
        ? [
            ["Metric", "Value"],
            ["Gross Revenue", summary.grossRevenue != null ? `₹${Number(summary.grossRevenue).toLocaleString()}` : ""],
            ["Net Revenue", summary.netRevenue != null ? `₹${Number(summary.netRevenue).toLocaleString()}` : ""],
            ["Total GST", summary.totalGST != null ? `₹${Number(summary.totalGST).toLocaleString()}` : ""],
            ["Total Orders", summary.totalOrders ?? ""],
            ["Average Order Value", summary.averageOrderValue != null ? `₹${Number(summary.averageOrderValue).toLocaleString()}` : ""],
            ["This Month Revenue", summary.thisMonthRevenue != null ? `₹${Number(summary.thisMonthRevenue).toLocaleString()}` : ""],
          ]
        : [["Metric", "Value"], ["No data", ""]];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Sheet 2: Revenue by Course
      const byCourseData = [
        ["Course", "Price (₹)", "Orders", "Revenue (₹)"],
        ...rows.map((r: { title: string; price: number; orders: number; revenue: number }) => [
          r.title ?? "",
          r.price ?? 0,
          r.orders ?? 0,
          r.revenue ?? 0,
        ]),
      ];
      const wsByCourse = XLSX.utils.aoa_to_sheet(byCourseData);
      XLSX.utils.book_append_sheet(wb, wsByCourse, "Revenue by Course");

      // Sheet 3: Orders
      const ordersData = [
        ["Order ID", "Course", "Buyer", "Buyer Phone", "Buyer Email", "Amount (₹)", "Date"],
        ...orders.map((o: { id: string; courseTitle: string; buyerName: string; buyerPhone?: string; buyerEmail?: string; amount: number; date: string }) => [
          o.id ?? "",
          o.courseTitle ?? "",
          o.buyerName ?? "",
          o.buyerPhone ?? "",
          o.buyerEmail ?? "",
          o.amount ?? 0,
          o.date ? new Date(o.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
        ]),
      ];
      const wsOrders = XLSX.utils.aoa_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, wsOrders, "Orders");

      const fileName = `revenue-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast({ title: "Exported", description: `${fileName} downloaded.` });
    } catch (err) {
      console.error("Export failed", err);
      toast({ title: "Export failed", description: "Could not download Excel. Try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      {exporting ? "Exporting…" : "Export to Excel"}
    </button>
  );
}
