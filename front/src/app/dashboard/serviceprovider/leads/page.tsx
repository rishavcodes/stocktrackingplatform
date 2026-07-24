"use client";

import { useCallback, useEffect, useState } from "react";
import MyLeadsClient from "@/components/Leads/MyLeadsClient";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/authFetch";

export type SalesStatus =
    | "Open"
    | "Still in Process"
    | "Not Interested"
    | "Closed"
    | "Others";

export type LeadType = {
    // Discriminator: "lead" = a real CRM lead (no order yet); "pending_order"
    // = a manual-payment order awaiting / failing verification, surfaced here
    // so the SP can Verify (→ Subscriber) or Reject it.
    kind?: "lead" | "pending_order";
    _id: string;
    type: "service" | "portfolio" | "package";
    subscribedToId: string;
    serviceName: string;
    serviceProviderId: string;
    status: string;
    salesStatus: SalesStatus;
    salesStatusDescription: string;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        number: string;
        // Pre-filled into the Convert dialog's KYC section when present.
        pannumber?: string;
        dob?: string;
    } | null;
    signedDocURL?: string | null;
    // ----- pending_order-only fields (manual order awaiting verification) -----
    orderId?: string;
    paymentMethod?: string;
    paymentStatus?: "pending" | "verified" | "rejected";
    rejectionReason?: string | null;
    subtotal?: number;
    gst?: number;
    total?: number;
    validity?: number | string;
    isRenewal?: boolean;
    paymentProof?: string | null;
    kycDetails?: {
        panUrl?: string;
        panNumber?: string;
        dob?: string;
    } | null;
    // Pricing snapshot from the e-sign cartItem — used to seed the coupon
    // application in the Convert dialog. Null when the e-sign session was
    // legacy / didn't persist a cartItem.
    cartSubtotal?: number | null;
    cartValidity?: number | string | null;
    cartIsGST?: boolean | null;
    // Plan's available tiers, surfaced for the validity dropdown in the
    // Convert dialog. For portfolios this is a single-row array and
    // `portfolioFeeValidity` carries the human label (e.g. "12 months").
    pricingPlans?: { validity: number; price: number }[];
    portfolioFeeValidity?: string | null;
    spChargesGst?: boolean;
};

export default function MyLeadsPage() {
    const { data: session } = useSession();
    const [leads, setLeads] = useState<LeadType[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeads = useCallback(async () => {
        if (!session?.backendToken) return;
        try {
            const res = await authFetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/leads`,
                {
                    headers: {
                        Authorization: `Bearer ${session.backendToken}`,
                    },
                }
            );

            const data = await res.json();
            setLeads(data.data || []);
        } catch (err) {
            console.error("Failed to load leads", err);
        } finally {
            setLoading(false);
        }
    }, [session?.backendToken]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    if (loading)
        return <p className="p-6 text-gray-500">Loading leads...</p>;

    return <MyLeadsClient leads={leads} onRefresh={fetchLeads} />;
}
