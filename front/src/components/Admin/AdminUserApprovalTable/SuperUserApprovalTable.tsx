"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  Clock,
  Users,
  ArrowUpDown,
  MoreVertical,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

type ServiceProvider = {
  _id: string;
  RegName: string;
  email: string;
  regNumber: string;
  category: string;
  verified: boolean;
  number?: string;
  city?: string;
  state?: string;
  certificate?: string;
  createdAt?: string;
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

type SortKey = "RegName" | "email" | "category" | "city" | "state";
type SortDir = "asc" | "desc";

/* ------------------------------------------------------------------ */
/*  Action-Dropdown (triple-dot)                                      */
/* ------------------------------------------------------------------ */
function ActionDropdown({
  provider,
  token,
  onActionComplete,
}: {
  provider: ServiceProvider;
  token: string;
  onActionComplete: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---- Verify ---- */
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!type || !category) {
      toast({
        title: "Error",
        description: "Please select Type & Category",
        variant: "destructive",
      });
      return;
    }
    setVerifying(true);
    try {
      const metaRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/update-provider-meta`,
        {
          method: "POST",
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: provider._id, type, category }),
        }
      );
      const metaData = await metaRes.json();
      if (!metaData.success) throw new Error("Meta update failed");

      const verifyRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/verifyserviceprovider`,
        {
          method: "POST",
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: provider._id }),
        }
      );
      if (verifyRes.status === 200) {
        toast({ title: "Success", description: "Provider verified" });
        setShowVerifyDialog(false);
        onActionComplete();
      }
    } catch {
      toast({
        title: "Error",
        description: "Verification failed",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  /* ---- Reject ---- */
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason",
        variant: "destructive",
      });
      return;
    }
    setRejecting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/rejectserviceprovider`,
        {
          method: "POST",
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: provider._id,
            email: provider.email,
            name: provider.RegName,
            reason,
          }),
        }
      );
      if (res.status === 200) {
        toast({ title: "Success", description: "Provider rejected" });
        setShowRejectDialog(false);
        onActionComplete();
      }
    } catch {
      toast({
        title: "Error",
        description: "Rejection failed",
        variant: "destructive",
      });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-500" />
        </button>

        {open && (
          <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <button
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setShowVerifyDialog(true);
              }}
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setShowRejectDialog(true);
              }}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Verify Dialog (modal overlay) */}
      {showVerifyDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          onClick={() => setShowVerifyDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Approve Provider
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Classify <strong>{provider.RegName}</strong> before approving
            </p>

            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none mb-4"
            >
              <option value="">Select Type</option>
              <option value="Individual">Individual</option>
              <option value="Non Individual">Non Individual</option>
              <option value="sub profile">Sub Profile</option>
            </select>

            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none mb-6"
            >
              <option value="">Select Category</option>
              <option value="Research Analyst">Research Analyst</option>
              <option value="Broker">Broker</option>
            </select>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowVerifyDialog(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {verifying ? "Approving…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog (modal overlay) */}
      {showRejectDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          onClick={() => setShowRejectDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Reject Provider
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Provide a reason for rejecting{" "}
              <strong>{provider.RegName}</strong>
            </p>

            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter rejection reason…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:border-red-300 focus:ring-2 focus:ring-red-100 outline-none mb-6"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectDialog(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {rejecting ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Table                                                        */
/* ------------------------------------------------------------------ */
export default function SuperUserApprovalTable() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("RegName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.backendToken}`,
  };

  const url =
    status === "authenticated"
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/serviceproviders?verified=false`
      : null;

  const { data, isLoading, mutate } = useSWR<{
    serviceProviders: ServiceProvider[];
  }>(url, (url: string) => fetcher(url, { headers }));

  /* ---- Filtering + Sorting ---- */
  const processed = useMemo(() => {
    if (!data?.serviceProviders) return [];
    const q = searchQuery.toLowerCase();
    const filtered = data.serviceProviders.filter(
      (p) =>
        p.RegName?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.regNumber?.toLowerCase().includes(q)
    );
    return [...filtered].sort((a, b) => {
      const aVal = (a[sortKey] ?? "").toLowerCase();
      const bVal = (b[sortKey] ?? "").toLowerCase();
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [data, searchQuery, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleExportToExcel = () => {
    const exportData = processed.map((p) => ({
      Name: p.RegName,
      Email: p.email,
      Phone: p.number ?? "",
      "SEBI Reg No": p.regNumber,
      Category: p.category,
      City: p.city ?? "",
      State: p.state ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PendingProviders");
    XLSX.writeFile(
      wb,
      `Pending_Providers_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  /* ---- LOADING ---- */
  if (status === "loading" || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">
          Loading pending providers…
        </p>
      </div>
    );
  }

  /* ---- EMPTY ---- */
  if (!data?.serviceProviders?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
          <Users className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">
            All caught up!
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            No pending service providers awaiting approval
          </p>
        </div>
      </div>
    );
  }

  /* ---- Sortable Header helper ---- */
  const SortableHeader = ({
    label,
    field,
    className = "",
  }: {
    label: string;
    field: SortKey;
    className?: string;
  }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors ${className}`}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${sortKey === field ? "text-emerald-600" : "text-gray-300"
            }`}
        />
      </span>
    </th>
  );

  /* ---- Document link helper ---- */
  const CertificateCell = ({ url }: { url?: string }) => {
    if (!url) return <span className="text-xs text-gray-300">—</span>;
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(url, "_blank");
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          View
          <ExternalLink className="w-3 h-3 opacity-50" />
        </button>
      </div>
    );
  };

  /* ---- MAIN UI ---- */
  return (
    <>
      <Toaster />
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or reg no…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all bg-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {processed.length} pending
            </span>
            <button
              onClick={handleExportToExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* No search results */}
        {processed.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">
              No providers match &quot;<strong>{searchQuery}</strong>&quot;
            </p>
          </div>
        )}

        {/* ---- Desktop Table ---- */}
        {processed.length > 0 && (
          <div className="hidden md:block border border-gray-200 rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Registered
                    </th>
                    <SortableHeader label="Name" field="RegName" />
                    <SortableHeader label="Email" field="email" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      SEBI Reg No
                    </th>
                    <SortableHeader label="Category" field="category" />
                    <SortableHeader label="City" field="city" />
                    <SortableHeader label="State" field="state" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      SEBI Certificate
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {processed.map((p, i) => (
                    <tr
                      key={p._id}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          {formatDate(p.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-gray-800">
                          {p.RegName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 max-w-[180px] truncate">
                        {p.email}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {p.number ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-mono text-gray-600">
                          {p.regNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block text-xs font-medium text-blue-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {p.city ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {p.state ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <CertificateCell url={p.certificate} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <ActionDropdown
                          provider={p}
                          token={session?.backendToken ?? ""}
                          onActionComplete={() => mutate()}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- Mobile Cards ---- */}
        {processed.length > 0 && (
          <div className="md:hidden space-y-3">
            {processed.map((p, i) => (
              <div
                key={p._id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 font-medium">
                        #{i + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-800 truncate">
                        {p.RegName}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{p.email}</p>
                  </div>
                  <ActionDropdown
                    provider={p}
                    token={session?.backendToken ?? ""}
                    onActionComplete={() => mutate()}
                  />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block">Phone</span>
                    <span className="text-gray-700 font-medium">
                      {p.number ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">SEBI Reg No</span>
                    <span className="text-gray-700 font-mono font-medium">
                      {p.regNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">City / State</span>
                    <span className="text-gray-700 font-medium">
                      {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Category</span>
                    <span className="inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {p.category}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Pending
                  </span>
                  {p.certificate && (
                    <button
                      onClick={() => window.open(p.certificate, "_blank")}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      SEBI Cert
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
