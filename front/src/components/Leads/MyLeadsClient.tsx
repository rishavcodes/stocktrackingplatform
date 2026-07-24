"use client";

import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
    LeadType,
    SalesStatus,
} from "@/app/dashboard/serviceprovider/leads/page";
import {
    CalendarIcon,
    ClockIcon,
    ArrowDownIcon,
    ChevronDown,
    ChevronUp,
    Loader2,
    Users,
    FileCheck,
    XCircle,
    Clock,
    Eye,
    Download,
    UserCheck,
    Trash2,
    FileText,
    CheckCircle2,
    ShieldQuestion,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import EmailIcon from "@/icons/EmailIcon";
import ProfileIcon from "@/icons/ProfileIcon";
import ServiceIcon from "@/icons/ServiceIcon";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/authFetch";
import { convertLeadToSubscriber } from "@/lib/convertLead";
import { useEffect, useMemo, useState } from "react";

const SALES_STATUSES: SalesStatus[] = [
    "Open",
    "Still in Process",
    "Not Interested",
    "Closed",
    "Others",
];

function salesStatusBadgeClass(status: SalesStatus): string {
    switch (status) {
        case "Open":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
        case "Still in Process":
            return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
        case "Not Interested":
            return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
        case "Closed":
            return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
        case "Others":
            return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200";
    }
}

interface OthersDialogState {
    leadId: string;
    initialDescription: string;
}

interface ConvertDialogState {
    lead: LeadType;
}

export default function MyLeadsClient({
    leads: initialLeads,
    onRefresh,
}: {
    leads: LeadType[];
    onRefresh?: () => Promise<void> | void;
}) {
    const { data: session } = useSession();
    const { toast } = useToast();

    const [leads, setLeads] = useState<LeadType[]>(initialLeads);

    // Keep local state in sync when the parent refetches (after verify/reject).
    useEffect(() => {
        setLeads(initialLeads);
    }, [initialLeads]);

    // Manual-payment verification state (pending_order rows).
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [rejectDialog, setRejectDialog] = useState<LeadType | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [filterStatus] = useState<string>("all");
    const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

    const [othersDialog, setOthersDialog] = useState<OthersDialogState | null>(
        null
    );
    const [othersDescription, setOthersDescription] = useState("");
    const [othersError, setOthersError] = useState<string | null>(null);

    const [convertDialog, setConvertDialog] = useState<ConvertDialogState | null>(
        null
    );
    const [convertNote, setConvertNote] = useState("");
    const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);

    // Coupon state inside the Convert dialog. Mirrors the customer-side
    // checkout (StepTwo.tsx) so the same validation rules apply.
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<
        { id: string; code: string; type: string; value: number } | null
    >(null);
    const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);
    // Snapshot of Subtotal + GST captured at coupon-Apply time so Remove
    // can roll the form fields back to the pre-discount baseline.
    const [preCouponSubtotal, setPreCouponSubtotal] = useState<string>("");
    const [preCouponGst, setPreCouponGst] = useState<string>("");

    // Manual overrides for any-stage conversion. All optional; pre-filled
    // from the e-sign cart snapshot and/or the user record when present so
    // the SP doesn't have to retype known data.
    const [signedDocFile, setSignedDocFile] = useState<File | null>(null);
    const [manualSubtotal, setManualSubtotal] = useState<string>("");
    const [manualGst, setManualGst] = useState<string>("");
    const [manualTotal, setManualTotal] = useState<string>("");
    const [manualAutoTotal, setManualAutoTotal] = useState(true);
    const [manualValidity, setManualValidity] = useState<string>("");
    const [manualPanNumber, setManualPanNumber] = useState<string>("");
    const [manualDob, setManualDob] = useState<string>("");
    // Index into convertDialog.lead.pricingPlans for the validity dropdown.
    // "" = not selected. Picking a tier auto-fills subtotal / GST / total.
    const [selectedTierIdx, setSelectedTierIdx] = useState<string>("");

    // Delete-confirmation state. Mirrors the portfolio/coupon delete pattern.
    const [deleteDialog, setDeleteDialog] = useState<LeadType | null>(null);
    const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

    const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Keep manual Total = Subtotal + GST when Auto-calculate is on, same
    // UX as the regenerate-invoice modal.
    useEffect(() => {
        if (!manualAutoTotal) return;
        const s = Number(manualSubtotal);
        const g = Number(manualGst);
        if (Number.isFinite(s) && Number.isFinite(g)) {
            setManualTotal(String(s + g));
        }
    }, [manualAutoTotal, manualSubtotal, manualGst]);

    // When the SP picks a validity tier from the dropdown, auto-fill the
    // financial fields from that tier (price + 18% GST when SP charges it).
    // Total is then derived by the autoTotal effect above. Validity is set
    // to the tier's days, or the portfolio's feeValidity label for tier-0
    // single-row portfolios.
    useEffect(() => {
        if (!convertDialog || selectedTierIdx === "") return;
        const lead = convertDialog.lead;
        const tier = lead.pricingPlans?.[Number(selectedTierIdx)];
        if (!tier) return;
        setManualSubtotal(String(tier.price));
        setManualGst(
            lead.spChargesGst
                ? String(Number((tier.price * 0.18).toFixed(2)))
                : "0",
        );
        if (tier.validity > 0) {
            setManualValidity(String(tier.validity));
        } else if (lead.portfolioFeeValidity) {
            setManualValidity(lead.portfolioFeeValidity);
        }
    }, [selectedTierIdx, convertDialog]);

    // Funnel-stage stats. Derived from the full prop array so the cards stay
    // stable while the SP filters the list view.
    const stats = useMemo(
        () => ({
            total: leads.filter((l) => l.kind !== "pending_order").length,
            awaitingVerification: leads.filter(
                (l) => l.kind === "pending_order" && l.paymentStatus === "pending"
            ).length,
            esignCompleted: leads.filter((l) => l.status === "esign_completed")
                .length,
            paymentFailed: leads.filter((l) => l.status === "payment_failed")
                .length,
            abandoned: leads.filter((l) => l.status === "abandoned").length,
        }),
        [leads]
    );

    const filteredLeads = leads.filter((lead) => {
        if (filterStatus === "esign" && !lead.status.toLowerCase().includes("esign"))
            return false;
        const ts = new Date(lead.createdAt).getTime();
        if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            if (ts > end.getTime()) return false;
        }
        return true;
    });

    // Pending verifications pin to the top, then rejected, then real leads;
    // the date toggle sorts within each group.
    const rowRank = (l: LeadType) =>
        l.kind === "pending_order"
            ? l.paymentStatus === "pending"
                ? 0
                : 1
            : 2;
    const sortedLeads = [...filteredLeads].sort((a, b) => {
        const r = rowRank(a) - rowRank(b);
        if (r !== 0) return r;
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return dateSort === "desc" ? tb - ta : ta - tb;
    });

    const exportToExcel = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString().replace(/\//g, "-");
        const timeStr = now.toLocaleTimeString().replace(/:/g, "-");

        const excelData = leads.map((lead) => ({
            "Name": lead.user?.name || "N/A",
            "Email": lead.user?.email || "N/A",
            "Number": lead.user?.number || "N/A",
            "Service Name": lead.serviceName || "N/A",
            "Stage": lead.status || "N/A",
            "Lead Status": lead.salesStatus || "Open",
            "Lead Status Notes": lead.salesStatusDescription || "",
            "Document": lead.signedDocURL || "",
            "Date": lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "",
            "Time": lead.createdAt ? new Date(lead.createdAt).toLocaleTimeString() : "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
        XLSX.writeFile(workbook, `Leads_Data_${dateStr}_${timeStr}.xlsx`);
    };

    async function patchSalesStatus(
        leadId: string,
        salesStatus: SalesStatus,
        salesStatusDescription: string
    ) {
        if (!session?.backendToken) {
            toast({
                title: "Not signed in",
                description: "Please sign in again to update lead status.",
                variant: "destructive",
            });
            return false;
        }

        setUpdatingLeadId(leadId);
        try {
            const res = await authFetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/leads/${leadId}/sales-status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.backendToken}`,
                    },
                    body: JSON.stringify({
                        salesStatus,
                        salesStatusDescription,
                    }),
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data?.success) {
                toast({
                    title: "Update failed",
                    description: data?.message || "Could not update lead status.",
                    variant: "destructive",
                });
                return false;
            }

            setLeads((prev) =>
                prev.map((l) =>
                    l._id === leadId
                        ? {
                              ...l,
                              salesStatus,
                              salesStatusDescription:
                                  salesStatus === "Others"
                                      ? salesStatusDescription
                                      : "",
                          }
                        : l
                )
            );
            toast({
                title: "Lead status updated",
                description: `Marked as ${salesStatus}.`,
            });
            return true;
        } catch (err) {
            toast({
                title: "Update failed",
                description: "Network error. Please try again.",
                variant: "destructive",
            });
            return false;
        } finally {
            setUpdatingLeadId(null);
        }
    }

    function handleStatusSelect(lead: LeadType, next: SalesStatus) {
        if (next === "Others") {
            setOthersDescription(lead.salesStatusDescription || "");
            setOthersError(null);
            setOthersDialog({
                leadId: lead._id,
                initialDescription: lead.salesStatusDescription || "",
            });
            return;
        }
        patchSalesStatus(lead._id, next, "");
    }

    async function submitOthersDialog() {
        if (!othersDialog) return;
        const trimmed = othersDescription.trim();
        if (!trimmed) {
            setOthersError("Description is required when status is 'Others'.");
            return;
        }
        const ok = await patchSalesStatus(othersDialog.leadId, "Others", trimmed);
        if (ok) {
            setOthersDialog(null);
            setOthersDescription("");
            setOthersError(null);
        }
    }

    function openConvertDialog(lead: LeadType) {
        setConvertNote("");
        setCouponCode("");
        setAppliedCoupon(null);
        setDiscountedPrice(null);
        setCouponError(null);
        setPreCouponSubtotal("");
        setPreCouponGst("");
        // Seed manual fields from the e-sign cart snapshot when present.
        // SP can edit any of them; nothing is required.
        setSignedDocFile(null);
        const seedSubtotal =
            typeof lead.cartSubtotal === "number"
                ? String(lead.cartSubtotal)
                : "";
        setManualSubtotal(seedSubtotal);
        const seedGst =
            typeof lead.cartSubtotal === "number" && lead.cartIsGST
                ? String(Number((lead.cartSubtotal * 0.18).toFixed(2)))
                : "";
        setManualGst(seedGst);
        setManualTotal(
            seedSubtotal && seedGst
                ? String(Number(seedSubtotal) + Number(seedGst))
                : seedSubtotal,
        );
        setManualAutoTotal(true);
        setManualValidity(
            lead.cartValidity === null || lead.cartValidity === undefined
                ? ""
                : String(lead.cartValidity),
        );
        // Pre-fill PAN/DOB from the user record — surfaced via the recent
        // getLeadsByServiceProvider expansion. Still editable in the dialog.
        setManualPanNumber(lead.user?.pannumber ?? "");
        setManualDob(lead.user?.dob ?? "");
        // Pre-select the tier whose validity matches the cart snapshot's
        // validity (legacy happy-path); else leave the dropdown unselected.
        const cartValidityNum =
            typeof lead.cartValidity === "number"
                ? lead.cartValidity
                : Number.parseInt(String(lead.cartValidity ?? ""), 10);
        const matchIdx = lead.pricingPlans?.findIndex(
            (p) =>
                Number.isFinite(cartValidityNum) &&
                p.validity === cartValidityNum,
        );
        setSelectedTierIdx(
            matchIdx !== undefined && matchIdx >= 0 ? String(matchIdx) : "",
        );
        setConvertDialog({ lead });
    }

    function resetConvertDialogState() {
        setConvertDialog(null);
        setConvertNote("");
        setCouponCode("");
        setAppliedCoupon(null);
        setDiscountedPrice(null);
        setCouponError(null);
        setPreCouponSubtotal("");
        setPreCouponGst("");
        setSignedDocFile(null);
        setManualSubtotal("");
        setManualGst("");
        setManualTotal("");
        setManualAutoTotal(true);
        setManualValidity("");
        setManualPanNumber("");
        setManualDob("");
        setSelectedTierIdx("");
    }

    async function applyCouponInDialog() {
        if (!convertDialog) return;
        const lead = convertDialog.lead;
        const code = couponCode.trim();
        if (!code) {
            setCouponError("Enter a coupon code first.");
            return;
        }
        // Coupon baseline = the SP-typed subtotal if set, else the e-sign
        // cart snapshot. Either source lets the apply call go through.
        const baselineSubtotal =
            Number(manualSubtotal) ||
            (typeof lead.cartSubtotal === "number" ? lead.cartSubtotal : 0);
        if (!Number.isFinite(baselineSubtotal) || baselineSubtotal <= 0) {
            setCouponError(
                "Enter the subtotal in Manual overrides first — coupon needs a price to apply against.",
            );
            return;
        }
        setCouponLoading(true);
        setCouponError(null);
        try {
            const validitySource = manualValidity || String(lead.cartValidity ?? "");
            const validityNum = Number.parseInt(validitySource, 10);
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/applycoupon`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        serviceId: lead.subscribedToId,
                        couponCode: code,
                        price: baselineSubtotal,
                        validity: Number.isFinite(validityNum)
                            ? validityNum
                            : undefined,
                    }),
                },
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                setCouponError(data?.message || "Coupon could not be applied.");
                setAppliedCoupon(null);
                setDiscountedPrice(null);
                return;
            }
            setAppliedCoupon({
                id: data.coupon?.id,
                code: data.coupon?.code,
                type: data.coupon?.type,
                value: data.coupon?.value,
            });
            setDiscountedPrice(data.discountedPrice);
            // Snapshot the pre-discount values so Remove can roll back to
            // them. Use the current form values as the baseline (these
            // were already set from the tier-pick or SP's manual entry).
            const snapSubtotal = manualSubtotal;
            const snapGst = manualGst;
            setPreCouponSubtotal(snapSubtotal);
            setPreCouponGst(snapGst);
            // Mutate the form fields so GST + Total recompute against the
            // discounted subtotal. GST scales by the same ratio as Subtotal
            // (preserves the underlying rate — 18% or 0% or custom). The
            // existing autoTotal effect then derives Total.
            const newSubtotal = Number(data.discountedPrice);
            const currentGst = Number(snapGst || 0);
            const ratio =
                baselineSubtotal > 0 ? newSubtotal / baselineSubtotal : 0;
            const newGst = Number((currentGst * ratio).toFixed(2));
            setManualSubtotal(String(newSubtotal));
            setManualGst(String(newGst));
        } catch {
            setCouponError("Network error. Please try again.");
        } finally {
            setCouponLoading(false);
        }
    }

    function removeCouponInDialog() {
        // Roll the form back to the pre-Apply baseline if we captured one;
        // else just clear the coupon state. Total auto-recomputes via the
        // autoTotal effect once Subtotal/GST update.
        if (preCouponSubtotal !== "") setManualSubtotal(preCouponSubtotal);
        if (preCouponGst !== "") setManualGst(preCouponGst);
        setCouponCode("");
        setAppliedCoupon(null);
        setDiscountedPrice(null);
        setCouponError(null);
        setPreCouponSubtotal("");
        setPreCouponGst("");
    }

    async function submitConvertDialog() {
        if (!convertDialog) return;
        if (!session?.backendToken) {
            toast({
                title: "Not signed in",
                description: "Please sign in again to convert this lead.",
                variant: "destructive",
            });
            return;
        }

        const lead = convertDialog.lead;
        setConvertingLeadId(lead._id);
        try {
            const toNumOrUndef = (v: string) => {
                const n = Number(v);
                return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
            };
            // When a coupon is applied, the form's Subtotal/GST/Total show
            // the post-discount values for SP convenience — but the backend
            // re-validates the coupon and re-applies the discount itself.
            // So the payload must carry the PRE-discount snapshot, otherwise
            // the backend double-discounts.
            const hasCoupon = !!appliedCoupon;
            const subtotalToSend = hasCoupon
                ? toNumOrUndef(preCouponSubtotal)
                : toNumOrUndef(manualSubtotal);
            const gstToSend = hasCoupon
                ? toNumOrUndef(preCouponGst)
                : toNumOrUndef(manualGst);
            const totalToSend = hasCoupon
                ? (() => {
                      const s = Number(preCouponSubtotal);
                      const g = Number(preCouponGst);
                      return Number.isFinite(s) && Number.isFinite(g)
                          ? s + g
                          : undefined;
                  })()
                : toNumOrUndef(manualTotal);
            const result = await convertLeadToSubscriber(
                lead._id,
                session.backendToken,
                {
                    note: convertNote.trim(),
                    couponCode: appliedCoupon?.code,
                    signedDocument: signedDocFile,
                    subtotal: subtotalToSend,
                    gst: gstToSend,
                    total: totalToSend,
                    validity: manualValidity.trim() || undefined,
                    panNumber: manualPanNumber.trim() || undefined,
                    dob: manualDob.trim() || undefined,
                },
            );
            if (!result.ok) {
                toast({
                    title: "Conversion failed",
                    description: result.message,
                    variant: "destructive",
                });
                return;
            }

            // Lead is deleted server-side on success; remove it from the list.
            setLeads((prev) => prev.filter((l) => l._id !== lead._id));
            toast({
                title: result.idempotent
                    ? "Already converted"
                    : "Lead converted to subscriber",
                description: result.idempotent
                    ? "This lead was already converted earlier."
                    : "Confirmation email and invoice are on their way.",
            });
            resetConvertDialogState();
        } finally {
            setConvertingLeadId(null);
        }
    }

    async function submitDeleteDialog() {
        if (!deleteDialog) return;
        if (!session?.backendToken) {
            toast({
                title: "Not signed in",
                description: "Please sign in again to delete this lead.",
                variant: "destructive",
            });
            return;
        }
        const lead = deleteDialog;
        setDeletingLeadId(lead._id);
        try {
            const res = await authFetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/leads/${lead._id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${session.backendToken}`,
                    },
                },
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                toast({
                    title: "Delete failed",
                    description: data?.message || "Could not delete lead.",
                    variant: "destructive",
                });
                return;
            }
            setLeads((prev) => prev.filter((l) => l._id !== lead._id));
            toast({ title: "Lead deleted" });
            setDeleteDialog(null);
        } catch {
            toast({
                title: "Delete failed",
                description: "Network error. Please try again.",
                variant: "destructive",
            });
        } finally {
            setDeletingLeadId(null);
        }
    }

    // Verify a pending manual-payment order. Reuses the existing endpoint that
    // marks it verified, subscribes the user, and fires telegram/email/invoice.
    // On success the order becomes a Subscriber and drops out of the leads feed,
    // so we refetch from the parent rather than mutate locally.
    async function verifyOrder(lead: LeadType) {
        if (!lead.orderId) return;
        setVerifyingId(lead.orderId);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/verify-manual-payment`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId: lead.orderId }),
                },
            );
            if (!res.ok) throw new Error("verify failed");
            toast({
                title: "Payment verified",
                description:
                    "Subscriber added. Telegram invite and invoice are on their way.",
            });
            await onRefresh?.();
        } catch {
            toast({
                title: "Verification failed",
                description: "Please try again.",
                variant: "destructive",
            });
        } finally {
            setVerifyingId(null);
        }
    }

    async function submitRejectDialog() {
        if (!rejectDialog?.orderId) return;
        setRejectingId(rejectDialog.orderId);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/reject-manual-payment`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId: rejectDialog.orderId,
                        reason: rejectReason.trim(),
                    }),
                },
            );
            if (!res.ok) throw new Error("reject failed");
            toast({
                title: "Payment rejected",
                description: "The order has been marked as rejected.",
            });
            setRejectDialog(null);
            setRejectReason("");
            await onRefresh?.();
        } catch {
            toast({
                title: "Rejection failed",
                description: "Please try again.",
                variant: "destructive",
            });
        } finally {
            setRejectingId(null);
        }
    }

    // ---- pending_order row renderers (shared between desktop + mobile) ----
    const renderPendingBadge = (lead: LeadType) =>
        lead.paymentStatus === "rejected" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 px-2.5 py-1 text-xs font-medium">
                <XCircle className="w-3.5 h-3.5" /> Rejected
            </span>
        ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2.5 py-1 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" /> Awaiting Verification
            </span>
        );

    const renderPendingDocs = (lead: LeadType) => (
        <div className="flex flex-col gap-1.5 text-xs">
            {lead.paymentProof && (
                <a
                    href={lead.paymentProof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                >
                    <FileText className="w-3.5 h-3.5" /> Payment Proof
                </a>
            )}
            {lead.signedDocURL && (
                <a
                    href={lead.signedDocURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                >
                    <Eye className="w-3.5 h-3.5" /> Signed TnC
                </a>
            )}
            {lead.kycDetails?.panUrl && (
                <a
                    href={lead.kycDetails.panUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                >
                    <FileText className="w-3.5 h-3.5" /> PAN
                </a>
            )}
        </div>
    );

    const renderPendingActions = (lead: LeadType) => {
        if (lead.paymentStatus === "rejected") {
            return lead.rejectionReason ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                    Reason: {lead.rejectionReason}
                </span>
            ) : null;
        }
        const busy =
            verifyingId === lead.orderId || rejectingId === lead.orderId;
        return (
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => verifyOrder(lead)}
                    disabled={busy}
                >
                    {verifyingId === lead.orderId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    )}
                    Verify
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                        setRejectReason("");
                        setRejectDialog(lead);
                    }}
                    disabled={busy}
                >
                    Reject
                </Button>
            </div>
        );
    };

    const renderStatusDropdown = (lead: LeadType) => {
        const current: SalesStatus = lead.salesStatus || "Open";
        const isUpdating = updatingLeadId === lead._id;
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={isUpdating}>
                    <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity ${salesStatusBadgeClass(
                            current
                        )} ${isUpdating ? "opacity-60 cursor-wait" : "hover:opacity-90"}`}
                    >
                        {isUpdating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : null}
                        <span>{current}</span>
                        <ChevronDown className="w-3 h-3" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                    {SALES_STATUSES.map((s) => (
                        <DropdownMenuItem
                            key={s}
                            onClick={() => handleStatusSelect(lead, s)}
                            className={
                                s === current ? "bg-gray-100 font-semibold dark:bg-gray-700" : ""
                            }
                        >
                            {s}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    return (
        <div className="pb-20 min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Leads</h1>
                            <p className="text-muted-foreground mt-1 flex items-center gap-1">
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                                    {filteredLeads.length} leads
                                </span>
                                {(filterStatus !== "all" || dateFrom || dateTo) && (
                                    <span className="text-xs text-gray-500">(filtered)</span>
                                )}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <Button onClick={exportToExcel} className="gap-2 bg-green-600 hover:bg-green-700">
                                <ArrowDownIcon className="w-4 h-4" />
                                Export Excel
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                        <Card>
                            <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                                <span className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700">
                                    <Users className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Total Leads</span>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                                <span className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-900/30">
                                    <ShieldQuestion className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Awaiting Verification</span>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.awaitingVerification}</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                                <span className="p-1.5 rounded-md bg-green-50 dark:bg-green-900/30">
                                    <FileCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">e-Sign Completed</span>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.esignCompleted}</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                                <span className="p-1.5 rounded-md bg-red-50 dark:bg-red-900/30">
                                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Payment Failed</span>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.paymentFailed}</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                                <span className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-900/30">
                                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Abandoned</span>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.abandoned}</span>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Date range filter */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <label className="text-sm text-gray-600 dark:text-gray-400">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                        />
                        <label className="text-sm text-gray-600 dark:text-gray-400">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                        />
                        {(dateFrom || dateTo) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDateFrom("");
                                    setDateTo("");
                                }}
                                className="text-xs text-indigo-600 hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block mt-5 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-sm min-w-[720px]">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDateSort((d) => (d === "desc" ? "asc" : "desc"))
                                            }
                                            className="inline-flex items-center gap-1 hover:text-indigo-600"
                                        >
                                            Date & Time
                                            {dateSort === "desc" ? (
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            ) : (
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">Name</th>
                                    <th className="px-4 py-3 text-left font-medium">Email</th>
                                    <th className="px-4 py-3 text-left font-medium">Number</th>
                                    <th className="px-4 py-3 text-left font-medium">Service Name</th>
                                    <th className="px-4 py-3 text-left font-medium">Stage</th>
                                    <th className="px-4 py-3 text-left font-medium">Lead Status</th>
                                    <th className="px-4 py-3 text-left font-medium">Document</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sortedLeads?.map((lead) => {
                                    const isPending = lead.kind === "pending_order";
                                    return (
                                    <tr key={lead._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 text-sm font-medium">
                                                    <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                    <span>{new Date(lead.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="font-medium">{lead.user?.name || "N/A"}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="truncate max-w-[180px]">{lead.user?.email || "N/A"}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="truncate max-w-[160px]">{lead.user?.number || "N/A"}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span>{lead.serviceName}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {isPending ? (
                                                renderPendingBadge(lead)
                                            ) : (
                                                <span>{lead.status}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            {isPending ? (
                                                <div className="flex flex-col">
                                                    <span className="font-semibold tabular-nums">
                                                        ₹{Number(lead.total ?? 0).toFixed(2)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {lead.isRenewal ? "Renewal" : "Fresh"} · Manual
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    {renderStatusDropdown(lead)}
                                                    {lead.salesStatus === "Others" &&
                                                        lead.salesStatusDescription && (
                                                            <span
                                                                className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]"
                                                                title={lead.salesStatusDescription}
                                                            >
                                                                {lead.salesStatusDescription}
                                                            </span>
                                                        )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            {isPending ? (
                                                <div className="flex flex-col gap-2">
                                                    {renderPendingDocs(lead)}
                                                    {renderPendingActions(lead)}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    {lead.signedDocURL ? (
                                                        <div className="flex items-center gap-3">
                                                            <a
                                                                href={lead.signedDocURL}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-xs"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                View
                                                            </a>
                                                            <a
                                                                href={lead.signedDocURL}
                                                                download
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-xs"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                Download
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">—</span>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2 text-xs border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                            onClick={() => openConvertDialog(lead)}
                                                            disabled={convertingLeadId === lead._id}
                                                        >
                                                            {convertingLeadId === lead._id ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <UserCheck className="w-3.5 h-3.5 mr-1" />
                                                            )}
                                                            Convert to Subscriber
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2 text-xs border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={() => setDeleteDialog(lead)}
                                                            disabled={deletingLeadId === lead._id}
                                                            aria-label="Delete lead"
                                                        >
                                                            {deletingLeadId === lead._id ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden mt-5 space-y-4">
                        {sortedLeads?.map((lead) => {
                            const isPending = lead.kind === "pending_order";
                            return (
                            <div
                                key={lead._id}
                                className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-1 text-sm font-medium">
                                            <CalendarIcon className="w-4 h-4 text-blue-500" />
                                            <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                            <ClockIcon className="w-3 h-3" />
                                            <span>{new Date(lead.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                    {isPending ? (
                                        renderPendingBadge(lead)
                                    ) : (
                                        <Badge variant="destructive">{lead.status}</Badge>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <ProfileIcon className="w-4 h-4 text-purple-500" />
                                        <span>{lead.user?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <EmailIcon className="w-4 h-4 text-blue-500" />
                                        <span>{lead.user?.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <ServiceIcon className="w-4 h-4 text-green-500" />
                                        <span>{lead.serviceName}</span>
                                    </div>
                                </div>

                                {isPending ? (
                                    <div className="mt-4 flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground">
                                            Amount
                                        </span>
                                        <span className="text-base font-semibold tabular-nums">
                                            ₹{Number(lead.total ?? 0).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {lead.isRenewal ? "Renewal" : "Fresh"} · Manual payment
                                        </span>
                                    </div>
                                ) : (
                                    <div className="mt-4 flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground">
                                            Lead Status
                                        </span>
                                        {renderStatusDropdown(lead)}
                                        {lead.salesStatus === "Others" &&
                                            lead.salesStatusDescription && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {lead.salesStatusDescription}
                                                </span>
                                            )}
                                    </div>
                                )}

                                {isPending ? (
                                    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                                        {renderPendingDocs(lead)}
                                        {renderPendingActions(lead)}
                                    </div>
                                ) : (
                                    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                                        {lead.signedDocURL && (
                                            <div className="flex items-center gap-3">
                                                <a
                                                    href={lead.signedDocURL}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-xs"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    View document
                                                </a>
                                                <a
                                                    href={lead.signedDocURL}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-xs"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    Download
                                                </a>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-8 text-xs border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                onClick={() => openConvertDialog(lead)}
                                                disabled={convertingLeadId === lead._id}
                                            >
                                                {convertingLeadId === lead._id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <UserCheck className="w-3.5 h-3.5 mr-1" />
                                                )}
                                                Convert to Subscriber
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-3 text-xs border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => setDeleteDialog(lead)}
                                                disabled={deletingLeadId === lead._id}
                                                aria-label="Delete lead"
                                            >
                                                {deletingLeadId === lead._id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>

                    {sortedLeads.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <h3 className="text-lg font-medium text-gray-500 mb-1">No leads found</h3>
                            <p className="text-sm">
                                {dateFrom || dateTo || filterStatus !== "all"
                                    ? "Try changing your filters"
                                    : "Your leads will appear here"}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <Dialog
                open={othersDialog !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setOthersDialog(null);
                        setOthersError(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Add a description</DialogTitle>
                        <DialogDescription>
                            Marking this lead as &ldquo;Others&rdquo; needs a short note so
                            you can recall the context later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="lead-others-description">Description</Label>
                        <Textarea
                            id="lead-others-description"
                            value={othersDescription}
                            onChange={(e) => {
                                setOthersDescription(e.target.value);
                                if (othersError) setOthersError(null);
                            }}
                            placeholder="e.g. Wants to revisit next quarter, asked for new pricing, etc."
                            rows={4}
                        />
                        {othersError && (
                            <p className="text-xs text-red-600">{othersError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setOthersDialog(null);
                                setOthersError(null);
                            }}
                            disabled={updatingLeadId !== null}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={submitOthersDialog}
                            disabled={updatingLeadId !== null}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {updatingLeadId !== null ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Save"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={deleteDialog !== null}
                onOpenChange={(open) => {
                    if (!open && deletingLeadId === null) {
                        setDeleteDialog(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete lead?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteDialog
                                ? `Delete lead from ${deleteDialog.user?.name || "this user"} for ${deleteDialog.serviceName}? This cannot be undone.`
                                : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={deletingLeadId !== null}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={submitDeleteDialog}
                            disabled={deletingLeadId !== null}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deletingLeadId !== null ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={rejectDialog !== null}
                onOpenChange={(open) => {
                    if (!open && rejectingId === null) {
                        setRejectDialog(null);
                        setRejectReason("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Reject payment?</DialogTitle>
                        <DialogDescription>
                            {rejectDialog
                                ? `Reject the manual payment from ${rejectDialog.user?.name || "this user"} for ${rejectDialog.serviceName}? The order stays here marked "Rejected" and won't become a subscriber.`
                                : null}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="reject-reason">Reason (optional)</Label>
                        <Textarea
                            id="reject-reason"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. Payment proof unclear / amount mismatch"
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRejectDialog(null);
                                setRejectReason("");
                            }}
                            disabled={rejectingId !== null}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={submitRejectDialog}
                            disabled={rejectingId !== null}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {rejectingId !== null ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Reject"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={convertDialog !== null}
                onOpenChange={(open) => {
                    if (!open && convertingLeadId === null) {
                        resetConvertDialogState();
                    }
                }}
            >
                <DialogContent className="sm:max-w-[560px] p-6 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Convert lead to subscriber</DialogTitle>
                        <DialogDescription>
                            This creates a verified subscriber order and runs the same
                            post-payment flow (telegram invite, confirmation email,
                            invoice). The onboarding charge is normally debited at e-sign
                            — if it wasn&apos;t already debited then, it will be debited
                            from your wallet now.
                        </DialogDescription>
                    </DialogHeader>

                    {convertDialog && (
                        <div className="space-y-3 py-2 text-sm">
                            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/40 space-y-1">
                                <div>
                                    <span className="text-muted-foreground">User: </span>
                                    <span className="font-medium">
                                        {convertDialog.lead.user?.name || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Email: </span>
                                    <span>{convertDialog.lead.user?.email || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Service: </span>
                                    <span className="font-medium">
                                        {convertDialog.lead.serviceName}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Stage: </span>
                                    <span>{convertDialog.lead.status}</span>
                                </div>
                                {typeof convertDialog.lead.cartSubtotal === "number" && (
                                    <div>
                                        <span className="text-muted-foreground">Price: </span>
                                        <span className="font-medium">
                                            ₹{convertDialog.lead.cartSubtotal}
                                        </span>
                                    </div>
                                )}
                                {!convertDialog.lead.signedDocURL && (
                                    <div className="text-xs text-amber-700 dark:text-amber-300 pt-1">
                                        This lead hasn&apos;t signed yet — upload the
                                        signed agreement at the bottom before converting.
                                    </div>
                                )}
                            </div>

                            {/* (1) Plan / pricing.
                                SP picks a validity from the dropdown → subtotal +
                                GST auto-fill from the matching tier (Service /
                                Package: pricingPlans, Portfolio: single fee).
                                The three numeric inputs stay editable as overrides. */}
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Plan
                                </div>
                                {convertDialog.lead.pricingPlans &&
                                convertDialog.lead.pricingPlans.length > 0 ? (
                                    <div className="space-y-1">
                                        <Label htmlFor="convert-tier">
                                            Validity
                                        </Label>
                                        <select
                                            id="convert-tier"
                                            value={selectedTierIdx}
                                            onChange={(e) =>
                                                setSelectedTierIdx(e.target.value)
                                            }
                                            disabled={convertingLeadId !== null}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="">
                                                — Pick a validity —
                                            </option>
                                            {convertDialog.lead.pricingPlans.map(
                                                (p, i) => (
                                                    <option
                                                        key={i}
                                                        value={String(i)}
                                                    >
                                                        {p.validity > 0
                                                            ? `${p.validity} days`
                                                            : convertDialog.lead
                                                                  .portfolioFeeValidity ??
                                                              "—"}
                                                        {" · ₹"}
                                                        {p.price}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <Label htmlFor="convert-validity">
                                            Validity
                                        </Label>
                                        <Input
                                            id="convert-validity"
                                            type="text"
                                            placeholder="e.g. 30 (days) or 12 months"
                                            value={manualValidity}
                                            onChange={(e) =>
                                                setManualValidity(e.target.value)
                                            }
                                            disabled={convertingLeadId !== null}
                                        />
                                        <div className="text-[11px] text-muted-foreground">
                                            No price tiers on file for this plan —
                                            enter the validity and the amounts below
                                            manually.
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <Label htmlFor="convert-subtotal">
                                        Subtotal
                                    </Label>
                                    <Input
                                        id="convert-subtotal"
                                        type="number"
                                        step="0.01"
                                        value={manualSubtotal}
                                        onChange={(e) =>
                                            setManualSubtotal(e.target.value)
                                        }
                                        disabled={convertingLeadId !== null}
                                    />
                                </div>

                                {/* (2) Coupon — sits right after Subtotal so the
                                    discount applies to the price BEFORE GST is
                                    computed. Backend re-validates and recomputes
                                    GST/total against the discounted subtotal. */}
                                {(() => {
                                    const baselineSubtotal =
                                        Number(manualSubtotal) ||
                                        (typeof convertDialog.lead.cartSubtotal ===
                                        "number"
                                            ? convertDialog.lead.cartSubtotal
                                            : 0);
                                    const hasBaseline =
                                        Number.isFinite(baselineSubtotal) &&
                                        baselineSubtotal > 0;
                                    return (
                                        <div className="space-y-1">
                                            <Label htmlFor="convert-coupon">
                                                Coupon code{" "}
                                                <span className="text-muted-foreground">
                                                    (optional)
                                                </span>
                                            </Label>
                                            {appliedCoupon ? (
                                                <div className="flex items-center justify-between rounded-md border border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-3 py-2">
                                                    <div className="text-xs">
                                                        <div className="font-medium text-green-800 dark:text-green-200">
                                                            {appliedCoupon.code} applied
                                                        </div>
                                                        {discountedPrice !== null &&
                                                            preCouponSubtotal !== "" && (
                                                                <div className="text-green-700 dark:text-green-300">
                                                                    ₹{preCouponSubtotal}{" "}
                                                                    → ₹{discountedPrice}{" "}
                                                                    (−₹
                                                                    {(
                                                                        Number(
                                                                            preCouponSubtotal,
                                                                        ) -
                                                                        discountedPrice
                                                                    ).toFixed(2)}
                                                                    )
                                                                </div>
                                                            )}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={removeCouponInDialog}
                                                        disabled={
                                                            convertingLeadId !== null
                                                        }
                                                        className="h-7 text-xs"
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        id="convert-coupon"
                                                        value={couponCode}
                                                        onChange={(e) => {
                                                            setCouponCode(
                                                                e.target.value,
                                                            );
                                                            if (couponError)
                                                                setCouponError(null);
                                                        }}
                                                        placeholder="Enter coupon code"
                                                        disabled={
                                                            convertingLeadId !== null ||
                                                            couponLoading
                                                        }
                                                        className="flex-1"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={applyCouponInDialog}
                                                        disabled={
                                                            convertingLeadId !== null ||
                                                            couponLoading ||
                                                            !couponCode.trim() ||
                                                            !hasBaseline
                                                        }
                                                    >
                                                        {couponLoading ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            "Apply"
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                            {couponError && (
                                                <p className="text-xs text-red-600">
                                                    {couponError}
                                                </p>
                                            )}
                                            {!hasBaseline && !appliedCoupon && (
                                                <p className="text-xs text-muted-foreground">
                                                    Pick a validity or enter a Subtotal
                                                    above to apply a coupon.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="space-y-1">
                                    <Label htmlFor="convert-gst">GST</Label>
                                    <Input
                                        id="convert-gst"
                                        type="number"
                                        step="0.01"
                                        value={manualGst}
                                        onChange={(e) => setManualGst(e.target.value)}
                                        disabled={convertingLeadId !== null}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="convert-total">Total</Label>
                                        <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={manualAutoTotal}
                                                onChange={(e) =>
                                                    setManualAutoTotal(
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                            Auto-calculate
                                        </label>
                                    </div>
                                    <Input
                                        id="convert-total"
                                        type="number"
                                        step="0.01"
                                        value={manualTotal}
                                        onChange={(e) => setManualTotal(e.target.value)}
                                        disabled={
                                            convertingLeadId !== null ||
                                            manualAutoTotal
                                        }
                                    />
                                </div>
                            </div>

                            {/* (3) KYC. PAN + DOB are pre-filled from the user
                                record when present; both editable, both
                                optional. */}
                            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    KYC{" "}
                                    <span className="text-muted-foreground font-normal">
                                        (optional)
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="convert-pan-number">
                                            PAN number
                                        </Label>
                                        <Input
                                            id="convert-pan-number"
                                            type="text"
                                            value={manualPanNumber}
                                            onChange={(e) =>
                                                setManualPanNumber(e.target.value)
                                            }
                                            disabled={convertingLeadId !== null}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="convert-dob">
                                            Date of birth
                                        </Label>
                                        <Input
                                            id="convert-dob"
                                            type="date"
                                            value={manualDob}
                                            onChange={(e) =>
                                                setManualDob(e.target.value)
                                            }
                                            disabled={convertingLeadId !== null}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* (4) Signed document upload. */}
                            <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <Label htmlFor="convert-signed-doc">
                                    Signed document (PDF){" "}
                                    <span className="text-muted-foreground">
                                        {convertDialog.lead.signedDocURL
                                            ? "(existing on file — upload to replace)"
                                            : "(optional)"}
                                    </span>
                                </Label>
                                <input
                                    id="convert-signed-doc"
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) =>
                                        setSignedDocFile(
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                    disabled={convertingLeadId !== null}
                                    className="block w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-gray-300 file:bg-white file:text-xs file:cursor-pointer"
                                />
                                {signedDocFile && (
                                    <div className="text-xs text-muted-foreground">
                                        Selected: {signedDocFile.name}
                                    </div>
                                )}
                            </div>

                            {/* (5) Reference note — last. */}
                            <div className="space-y-1">
                                <Label htmlFor="convert-note">
                                    Reference note <span className="text-muted-foreground">(optional)</span>
                                </Label>
                                <Textarea
                                    id="convert-note"
                                    value={convertNote}
                                    onChange={(e) => setConvertNote(e.target.value)}
                                    placeholder="e.g. Paid via UPI to abc@upi on 2026-05-27"
                                    rows={3}
                                    disabled={convertingLeadId !== null}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={resetConvertDialogState}
                            disabled={convertingLeadId !== null}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={submitConvertDialog}
                            disabled={convertingLeadId !== null}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {convertingLeadId !== null ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Convert"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
