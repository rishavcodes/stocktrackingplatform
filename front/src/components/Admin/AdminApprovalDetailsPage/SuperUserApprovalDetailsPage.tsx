"use client";
import React, { useState, useMemo } from "react";
import {
  SuperUserApprovalDetailsType,
  ProviderBillingData,
  ProviderAnalyticsData,
  WalletTransaction,
  Order,
} from "./SuperUserApprovalDetailsType";
import RejectionBox from "./RejectionBox";
import RemoveBox from "./RemoveBox";
import DeleteSPBox from "./DeleteSPBox";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import VerifyBox from "./VerifyBox";
import WalletBalanceCard from "./WalletBalanceCard";
import ArrowLeftIcon from "@/icons/ArrowLeftIcon";
import PdfIcon from "@/icons/PdfIcon";
import WalletIcon from "@/icons/WalletIcon";
import WalletRechargeCard from "./WalletRechargeCard";
import WalletDeductCard from "./WalletDeductCard";
import { useRouter } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import LMSCommercialCard from "./LMSCommercialCard";
import CustomSubdomainCard from "./CustomSubdomainCard";
import AnalyticsTab from "./AnalyticsTab";
// Editable profile UI reused from the SP's own dashboard. The named export
// accepts an explicit `userId` so an admin can view/edit any SP's profile
// using the same form the SP themselves see.
import { MyProfile } from "@/components/MyProfile/MyProfileForm";
import {
  User,
  Building,
  CreditCard,
  Receipt,
  Plug,
  Download,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Shield,
  Globe,
  Image,
  Link2,
  Clock,
  BarChart3,
  Users,
  TrendingUp,
  BookOpen,
  Activity,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Props = { id: string };

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "business", label: "Business", icon: Building },
  { key: "subscription", label: "Subscription", icon: CreditCard },
  { key: "billings", label: "Billings", icon: Receipt },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "integrations", label: "Integrations", icon: Plug },
] as const;

type TabKey = (typeof TABS)[number]["key"];


function formatDate(d?: string | Date): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function maskKey(key?: string): string {
  if (!key || key.length < 8) return key || "—";
  return key.slice(0, 8) + "••••••••";
}

const TX_TYPE_LABELS: Record<string, { label: string; color: string; sign: "+" | "-" }> = {
  topup: { label: "Top Up", color: "text-green-600", sign: "+" },
  "manual-topup": { label: "Manual Top Up", color: "text-green-600", sign: "+" },
  withdraw: { label: "Withdrawal", color: "text-red-600", sign: "-" },
  deduction: { label: "Deduction", color: "text-red-600", sign: "-" },
  "subscription-charge": { label: "Subscription", color: "text-orange-600", sign: "-" },
  "Onboarding-Charge": { label: "Onboarding", color: "text-orange-600", sign: "-" },
  "Renewal-Charge": { label: "Renewal", color: "text-orange-600", sign: "-" },
  additional_charge: { label: "Additional", color: "text-orange-600", sign: "-" },
  "model-portfolio-charge": { label: "Portfolio", color: "text-orange-600", sign: "-" },
  "course-sale": { label: "Course Sale", color: "text-green-600", sign: "+" },
  "marketplace-broker-commission": { label: "Broker Commission", color: "text-green-600", sign: "+" },
};

export default function SuperUserApprovalDetailsPage({ id }: Props) {
  const session = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // Wallet transactions sort state
  type TxSortKey = "createdAt" | "type" | "amount" | "by" | "remarks" | "paymentId";
  const [txSortKey, setTxSortKey] = useState<TxSortKey>("createdAt");
  const [txSortDir, setTxSortDir] = useState<"asc" | "desc">("desc");

  const toggleTxSort = (key: TxSortKey) => {
    if (txSortKey === key) {
      setTxSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setTxSortKey(key);
      setTxSortDir(key === "createdAt" || key === "amount" ? "desc" : "asc");
    }
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.data?.backendToken}`,
  };

  // Main provider data
  const { data, isLoading, mutate } = useSWR<{
    serviceProviderData: SuperUserApprovalDetailsType;
  }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/providerdetails?id=${id}`,
    (url: string) => fetcher(url, { headers })
  );

  // Billing data — lazy load only when billings, analytics, or integrations tab is active
  const shouldLoadBilling = activeTab === "billings" || activeTab === "analytics" || activeTab === "integrations";
  const { data: billingData, isLoading: billingLoading } = useSWR<ProviderBillingData>(
    shouldLoadBilling
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/providerbilling?id=${id}`
      : null,
    (url: string) => fetcher(url, { headers })
  );

  // Analytics data — lazy load only when analytics tab is active
  const { data: analyticsData, isLoading: analyticsLoading } = useSWR<ProviderAnalyticsData>(
    activeTab === "analytics"
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/provideranalytics?id=${id}`
      : null,
    (url: string) => fetcher(url, { headers })
  );

  const sp = data?.serviceProviderData;
  const isSubscribed = sp?.subscriptionDetails?.subscriptionActive === true;
  const isAdmin = session.data?.user.role === "admin";

  // Client-side sort of wallet transactions
  const sortedTransactions = useMemo(() => {
    const list = billingData?.walletTransactions ? [...billingData.walletTransactions] : [];
    list.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (txSortKey) {
        case "createdAt":
          av = new Date(a.createdAt).getTime();
          bv = new Date(b.createdAt).getTime();
          break;
        case "type":
          av = (a.type || "").toLowerCase();
          bv = (b.type || "").toLowerCase();
          break;
        case "amount":
          av = a.amount || 0;
          bv = b.amount || 0;
          break;
        case "by":
          av = (a.orderdBy?.name || "").toLowerCase();
          bv = (b.orderdBy?.name || "").toLowerCase();
          break;
        case "remarks":
          av = (a.remarks || "").toLowerCase();
          bv = (b.remarks || "").toLowerCase();
          break;
        case "paymentId":
          av = (a.paymentId || "").toLowerCase();
          bv = (b.paymentId || "").toLowerCase();
          break;
      }
      if (av < bv) return txSortDir === "asc" ? -1 : 1;
      if (av > bv) return txSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [billingData?.walletTransactions, txSortKey, txSortDir]);

  const handleDownload = async () => {
    try {
      const response = await fetch(sp?.certificate || "");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${sp?.RegName}_${sp?.regNumber}_SEBI_certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  /* ── Loading ── */
  if (isLoading || session.status === "loading") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading provider details…</p>
        </div>
      </div>
    );
  }

  if (!sp) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-sm text-gray-500">Provider not found</p>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:shadow-sm transition-all"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">Account Details</h1>
            <p className="text-xs text-gray-400">{sp.email}</p>
          </div>
          {isAdmin && <ViewAsButton spId={id} adminToken={session.data?.backendToken} />}
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex w-full border-b-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 flex gap-x-2 py-3 font-medium whitespace-nowrap transition-all duration-200 text-sm md:text-base
              ${active
                    ? "text-emerald-600 dark:text-blue-400 border-b-2 border-emerald-600 dark:border-blue-400 bg-white/5 dark:bg-black/10"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  PROFILE TAB                                              */}
        {/*                                                            */}
        {/*  Renders the same editable profile form the SP sees in     */}
        {/*  their own dashboard, scoped to the SP being viewed.       */}
        {/*  `hideToaster` because the admin page already mounts one   */}
        {/*  near the top of the render tree.                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <MyProfile userId={id} hideToaster />
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  BUSINESS TAB                                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "business" && (
          <div className="space-y-5">
            {/* Registration info */}
            <Section title="Registration Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <InfoItem label="SEBI Registration No" value={sp.regNumber} />
                <InfoItem label="Category" value={sp.category} />
                <InfoItem label="Type" value={sp.type} />
                <InfoItem label="GST Number" value={sp.gst || "N/A"} />
                <InfoItem label="Company Name" value={sp.companyName || sp.RegName} />
                <InfoItem label="Website" value={sp.website || "N/A"} />
                <InfoItem label="Verification Status" value={sp.verified ? "Verified" : "Pending"} />
                <InfoItem label="Approval Date" value={sp.approvalDate || "N/A"} />
              </div>
            </Section>

            {/* SEBI Document */}
            <Section title="SEBI Certificate">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <PdfIcon className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-800">SEBI_Certificate_{sp.regNumber}.pdf</h4>
                  <p className="text-xs text-gray-400">SEBI Registration Document</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(sp.certificate, "_blank")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            </Section>

            {/* Compliance Officer */}
            {(sp.complianceOfficerName || sp.complianceOfficerEmail || sp.complianceOfficerNumber) && (
              <Section title="Compliance Officer">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                  <InfoItem label="Name" value={sp.complianceOfficerName} />
                  <InfoItem label="Email" value={sp.complianceOfficerEmail} />
                  <InfoItem label="Phone" value={sp.complianceOfficerNumber} />
                </div>
              </Section>
            )}

            {/* Policies & Legal */}
            {(sp.disclaimer || sp.refundPolicy || sp.privacyPolicy) && (
              <Section title="Policies & Legal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Disclaimer", value: sp.disclaimer },
                    { label: "Refund Policy", value: sp.refundPolicy },
                    { label: "Privacy Policy", value: sp.privacyPolicy },
                  ]
                    .filter((p) => p.value)
                    .map((p) => (
                      <div key={p.label} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-600 mb-2">{p.label}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">{p.value}</p>
                      </div>
                    ))}
                </div>
              </Section>
            )}

            {/* Investor Charter */}
            {sp.investorCharter && (
              <Section title="Investor Charter">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800">Investor_Charter.pdf</h4>
                    <p className="text-xs text-gray-400">Investor Charter Document</p>
                  </div>
                  <button
                    onClick={() => window.open(sp.investorCharter, "_blank")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View
                  </button>
                </div>
              </Section>
            )}

            {/* Company Certificate */}
            {sp.CompanyCertificate && (
              <Section title="Company Certificate">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800">Company_Certificate.pdf</h4>
                    <p className="text-xs text-gray-400">Company Registration Document</p>
                  </div>
                  <button
                    onClick={() => window.open(sp.CompanyCertificate, "_blank")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View
                  </button>
                </div>
              </Section>
            )}

            {/* Documents */}
            {sp.Documents && sp.Documents.length > 0 && (
              <Section title="Uploaded Documents" subtitle={`${sp.Documents.length} document(s)`}>
                <div className="space-y-2">
                  {sp.Documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 truncate">{doc.name || `Document ${idx + 1}`}</span>
                      </div>
                      {doc.link && (
                        <a href={doc.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 flex-shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Added By */}
            {sp.addedby?.isSubProfile && (
              <Section title="Added By" subtitle="Sub-profile parent information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <InfoItem label="Parent Company" value={sp.addedby.companyName} />
                  <InfoItem label="Parent ID" value={sp.addedby.id} />
                </div>
              </Section>
            )}

            {/* Admin Actions — only for admin */}
            {isAdmin && (
              <>
                {!sp.verified ? (
                  <Section title="Verification Actions" subtitle="Approve or reject this provider">
                    <div className="flex flex-wrap gap-3">
                      <VerifyBox id={sp._id} token={session.data?.user.backendToken!} />
                      <RejectionBox id={sp._id} email={sp.email} name={sp.RegName} token={session.data?.user?.backendToken!} />
                    </div>
                  </Section>
                ) : (
                  <div className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-red-100 bg-red-50/50 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <div>
                        <h3 className="text-sm font-semibold text-red-800">Danger Zone</h3>
                        <p className="text-xs text-red-500">Irreversible actions</p>
                      </div>
                    </div>
                    <div className="p-6 flex flex-wrap gap-3">
                      <RemoveBox id={sp._id} token={session.data?.user?.backendToken!} />
                      <DeleteSPBox id={sp._id} token={session.data?.user?.backendToken!} WalletBalance={sp.wallet?.amount!} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  SUBSCRIPTION TAB                                         */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "subscription" && (
          <div className="space-y-5">
            {/* Subscription Overview */}
            <Section title="Subscription Overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <DetailRow label="Status" value={isSubscribed ? "Active" : "Inactive"} />
                  <DetailRow label="Plan" value={sp.currentSubscriptionDetails?.plan || "None"} />
                  <DetailRow label="Pricing Type" value={sp.currentSubscriptionDetails?.pricingType || "N/A"} />
                  <DetailRow label="Amount" value={`${sp.currentSubscriptionDetails?.amount || 0}`} />
                  <DetailRow label="GST" value={`${sp.currentSubscriptionDetails?.gst || 0}`} />
                  <DetailRow label="Total" value={`${sp.currentSubscriptionDetails?.total || 0}`} />
                </div>
                <div className="space-y-3">
                  <DetailRow label="Start Date" value={formatDate(sp.currentSubscriptionDetails?.startDate)} />
                  <DetailRow label="End Date" value={formatDate(sp.currentSubscriptionDetails?.endDate)} />
                  <DetailRow label="Duration" value={sp.currentSubscriptionDetails?.duration ? `${sp.currentSubscriptionDetails.duration} months` : "N/A"} />
                  {sp.currentSubscriptionDetails?.pricingType === "Percentage" ? (
                    <>
                      <DetailRow label="Fresh Onboarding %" value={`${sp.currentSubscriptionDetails?.percentageFreshOnboarding || 0}%`} />
                      <DetailRow label="Renewal %" value={`${sp.currentSubscriptionDetails?.percentageRenewal || 0}%`} />
                    </>
                  ) : (
                    <>
                      <DetailRow label="Fixed Fresh Onboarding" value={`${sp.currentSubscriptionDetails?.fixedFreshOnboardingCharge || 0}`} />
                      <DetailRow label="Fixed Renewal" value={`${sp.currentSubscriptionDetails?.fixedRenewalCharge || 0}`} />
                    </>
                  )}
                  {sp.currentSubscriptionDetails?.plan === "Prepaid" && (
                    <DetailRow label="Customer Limit" value={String(sp.currentSubscriptionDetails?.customerLimit || "N/A")} />
                  )}
                  {sp.currentSubscriptionDetails?.fixedCommercialFee && (
                    <DetailRow label="Fixed Commercial Fee" value={`${sp.currentSubscriptionDetails.fixedCommercialFee}`} />
                  )}
                </div>
              </div>
            </Section>

            {/* Activated Services */}
            <Section title="Activated Services" subtitle="Current service configuration for this provider">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <Th>Service</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[
                      { label: "Recommendations", key: "recommendations" },
                      { label: "Payment Gateway", key: "paymentGateway" },
                      { label: "Onboarding", key: "onboarding" },
                      { label: "Content", key: "content" },
                      { label: "Model Portfolio", key: "modelPortfolio" },
                      { label: "Recurring Payment", key: "recurringPayment" },
                    ].map((svc) => {
                      const active = sp.services?.[svc.key as keyof typeof sp.services];
                      return (
                        <tr key={svc.key} className="hover:bg-gray-50/50">
                          <td className="py-2.5 pr-4 text-sm text-gray-700">{svc.label}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-gray-300"}`} />
                              {active ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 pr-4 text-sm text-gray-700">LMS</td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sp.lmsCommercial?.enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sp.lmsCommercial?.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                          {sp.lmsCommercial?.enabled ? `Enabled (${sp.lmsCommercial.commissionPercentage}%)` : "Disabled"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Model Portfolio Info */}
            <Section title="Model Portfolio Configuration">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <DetailRow label="Portfolio Limit" value={String(sp.modelPortfolios?.limits ?? 1)} />
                <DetailRow label="Active Portfolios" value={String(sp.modelPortfolios?.Portfolios?.length ?? 0)} />
              </div>
            </Section>

            {/* Subscription admin actions */}
            {isAdmin && sp.verified && (
              <Section title="Subscription Management" subtitle="Manage subscription and services for this provider">
                <div className="flex flex-wrap gap-3">
                  <WalletBalanceCard
                    amount={sp.wallet?.amount!}
                    token={session.data?.user?.backendToken || ""}
                    id={sp._id}
                    subscribed={isSubscribed}
                    services={sp.services}
                    currentSubscription={{
                      plan: sp.currentSubscriptionDetails?.plan!,
                      duration: sp.currentSubscriptionDetails?.duration!,
                      freshOnboardingCharge: sp.currentSubscriptionDetails?.freshOnboardingCharge,
                      renewalCharge: sp.currentSubscriptionDetails?.renewalCharge,
                      customerLimit: sp.currentSubscriptionDetails?.customerLimit,
                      oneTimesetupFee: sp.currentSubscriptionDetails?.amount,
                      percentageFreshOnboarding: sp.currentSubscriptionDetails?.percentageFreshOnboarding,
                      percentageRenewal: sp.currentSubscriptionDetails?.percentageRenewal,
                      fixedFreshOnboardingCharge: sp.currentSubscriptionDetails?.fixedFreshOnboardingCharge,
                      fixedRenewalCharge: sp.currentSubscriptionDetails?.fixedRenewalCharge,
                      pricingType: sp.currentSubscriptionDetails?.pricingType,
                      fixedCommercialFee: sp.currentSubscriptionDetails?.fixedCommercialFee,
                    }}
                    modelPortfolios={sp.modelPortfolios!}
                    onSubscriptionChange={() => mutate()}
                  />
                  <LMSCommercialCard
                    token={session.data?.user?.backendToken || ""}
                    providerId={sp._id}
                    initialEnabled={sp.lmsCommercial?.enabled}
                    initialPercentage={sp.lmsCommercial?.commissionPercentage}
                  />
                  <CustomSubdomainCard
                    token={session.data?.user?.backendToken || ""}
                    providerId={sp._id}
                    initialSubdomain={sp.customSubdomain}
                    initialStatus={sp.customSubdomainStatus}
                    onSaved={() => mutate()}
                  />
                </div>
                {sp.customSubdomain && (
                  <div className="mt-3 text-xs text-gray-600">
                    Branded URL:{" "}
                    <span className="font-medium text-gray-800">
                      https://{sp.customSubdomain}.tradeboxlive.com/dashboard
                    </span>{" "}
                    <span
                      className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sp.customSubdomainStatus === "active"
                          ? "bg-green-50 text-green-700"
                          : sp.customSubdomainStatus === "disabled"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {sp.customSubdomainStatus || "pending"}
                    </span>
                  </div>
                )}
              </Section>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  BILLINGS TAB                                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "billings" && (
          <div className="space-y-5">
            {/* ── Unified Wallet Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WalletIcon className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Wallet</h3>
                </div>
                {isAdmin && sp.verified && (
                  <div className="flex items-center gap-2">
                    <WalletRechargeCard
                      token={session.data?.user?.backendToken || ""}
                      providerName={sp.RegName}
                      id={sp._id}
                    />
                    <WalletDeductCard
                      token={session.data?.user?.backendToken || ""}
                      providerName={sp.RegName}
                      id={sp._id}
                      currentBalance={sp.wallet?.amount || 0}
                    />
                  </div>
                )}
              </div>
              <div className="px-6 py-5 flex items-center gap-6">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 flex-shrink-0">
                  <WalletIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Available Balance</p>
                  <p className="text-3xl font-bold text-gray-900">₹{sp.wallet?.amount?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
            </div>

            {billingLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <Section title="Wallet Transactions" subtitle={`${billingData?.walletTransactions?.length || 0} transaction(s)`}>
                {!billingData?.walletTransactions?.length ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No transactions yet</p>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full min-w-[700px]">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <SortableTh label="Date" sortKeyValue="createdAt" activeKey={txSortKey} dir={txSortDir} onClick={toggleTxSort} />
                          <SortableTh label="Type" sortKeyValue="type" activeKey={txSortKey} dir={txSortDir} onClick={toggleTxSort} />
                          <SortableTh label="Amount" sortKeyValue="amount" activeKey={txSortKey} dir={txSortDir} onClick={toggleTxSort} />
                          <SortableTh label="By" sortKeyValue="by" activeKey={txSortKey} dir={txSortDir} onClick={toggleTxSort} />
                          <SortableTh label="Remarks" sortKeyValue="remarks" activeKey={txSortKey} dir={txSortDir} onClick={toggleTxSort} />
                          <SortableTh label="Payment ID" sortKeyValue="paymentId" activeKey={txSortKey} dir={txSortDir} onClick={toggleTxSort} />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sortedTransactions.map((tx: WalletTransaction) => {
                          const info = TX_TYPE_LABELS[tx.type] || { label: tx.type, color: "text-gray-600", sign: "-" as const };
                          return (
                            <tr key={tx._id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                              <td className="py-3 pr-4">
                                <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
                              </td>
                              <td className="py-3 pr-4">
                                <span className={`text-sm font-semibold ${info.sign === "+" ? "text-green-600" : "text-red-600"}`}>
                                  {info.sign === "+" ? (
                                    <ArrowUpRight className="w-3 h-3 inline mr-0.5" />
                                  ) : (
                                    <ArrowDownRight className="w-3 h-3 inline mr-0.5" />
                                  )}
                                  {tx.amount.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-xs text-gray-600 truncate max-w-[130px]">{tx.orderdBy?.name || "—"}</td>
                              <td className="py-3 pr-4 text-xs text-gray-500 max-w-[180px]">
                                {tx.remarks ? (
                                  <span className="italic text-gray-600">{tx.remarks}</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="py-3 text-xs text-gray-400 font-mono truncate max-w-[120px]">{tx.paymentId || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  ANALYTICS TAB                                            */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <AnalyticsTab sp={sp} billingData={billingData} billingLoading={billingLoading} analyticsData={analyticsData} analyticsLoading={analyticsLoading} />
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  INTEGRATIONS TAB                                         */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "integrations" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Razorpay */}
              <IntegrationCard
                name="Razorpay"
                description="Payment gateway integration"
                connected={!!billingData?.razorpayKey}
                loading={billingLoading}
                details={
                  billingData?.razorpayKey
                    ? [
                      { label: "Key ID", value: maskKey(billingData.razorpayKey.keyId) },
                      { label: "Name", value: billingData.razorpayKey.name || "—" },
                      { label: "Email", value: billingData.razorpayKey.email || "—" },
                      { label: "Connected", value: formatDate(billingData.razorpayKey.createdAt) },
                    ]
                    : []
                }
                color="blue"
              />

              {/* WhatsApp */}
              <IntegrationCard
                name="Marketplace"
                description="Marketplace membership / ownership"
                connected={(sp.marketplaces?.length ?? 0) > 0}
                loading={false}
                details={
                  sp.marketplaces && sp.marketplaces.length > 0
                    ? [
                      { label: "Memberships", value: String(sp.marketplaces.length) },
                      ...sp.marketplaces.slice(0, 4).map((mp) => ({
                        label: mp.role === "broker" ? "Owner of" : "Member of",
                        value: mp.name,
                      })),
                    ]
                    : []
                }
                color="green"
              />

              {/* Telegram */}
              <IntegrationCard
                name="Telegram"
                description="Telegram channel connection"
                connected={!!sp.telegram}
                loading={false}
                details={sp.telegram ? [{ label: "Username", value: sp.telegram }] : []}
                color="blue"
              />

              {/* Email */}
              <IntegrationCard
                name="Email Settings"
                description="Whitelabel email configuration"
                connected={!!sp.email}
                loading={false}
                details={[{ label: "Primary Email", value: sp.email }]}
                color="purple"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────── */
/*  Reusable Sub-Components                           */
/* ────────────────────────────────────────────────── */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <p className="text-sm font-medium text-gray-900">{value || "N/A"}</p>
    </div>
  );
}

function ProfileField({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
      <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value || "N/A"}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    green: "bg-green-50 border-green-100 text-green-700",
  };
  return (
    <div className={`rounded-xl p-4 border ${colors[color] || colors.blue}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2.5 pr-4 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  );
}

function SortableTh<K extends string>({
  label,
  sortKeyValue,
  activeKey,
  dir,
  onClick,
}: {
  label: string;
  sortKeyValue: K;
  activeKey: K;
  dir: "asc" | "desc";
  onClick: (key: K) => void;
}) {
  const active = activeKey === sortKeyValue;
  return (
    <th
      onClick={() => onClick(sortKeyValue)}
      className={`py-2.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none transition-colors ${
        active ? "text-gray-800" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )
        ) : (
          <ChevronDown className="w-3 h-3 opacity-25" />
        )}
      </span>
    </th>
  );
}

function IntegrationCard({
  name,
  description,
  connected,
  loading,
  details,
  color,
}: {
  name: string;
  description: string;
  connected: boolean;
  loading: boolean;
  details: { label: string; value: string }[];
  color: string;
}) {
  const borderColor = connected ? "border-green-200" : "border-gray-200";
  return (
    <div className={`bg-white rounded-2xl border ${borderColor} p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-800">{name}</h4>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        {loading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        ) : connected ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
            <CheckCircle2 className="w-3 h-3" /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            <XCircle className="w-3 h-3" /> Not Connected
          </span>
        )}
      </div>
      {details.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-gray-100">
          {details.map((d) => (
            <div key={d.label} className="flex justify-between text-xs">
              <span className="text-gray-400">{d.label}</span>
              <span className="text-gray-700 font-medium truncate ml-2 max-w-[180px]">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    indigo: "bg-indigo-50 text-indigo-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <div className={`flex items-center gap-3 px-3 py-3 rounded-xl ${colors[color] || colors.blue}`}>
      <div className="opacity-60">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

// "View as SP" — stashes the admin's NextAuth session cookie, mints a
// short-lived impersonation token for the target SP, then opens the bridge
// page in a new tab. The bridge swaps the NextAuth cookie to the SP's
// session; the SP dashboard's banner ("Exit Impersonation") restores the
// stashed admin cookie when the admin is done. Middleware also auto-
// restores if the admin navigates back to /dashboard/admin while a shadow
// cookie is still present.
function ViewAsButton({ spId, adminToken }: { spId: string; adminToken?: string }) {
  const [loading, setLoading] = React.useState(false);

  const start = async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      // Stash *before* navigating — once the bridge signs in as the SP it
      // overwrites the only NextAuth cookie, so the admin backup must
      // already be on disk before that fires. The Exit Impersonation
      // banner (and the middleware safety net) use the shadow cookie to
      // bring the admin back.
      const stashRes = await fetch("/api/admin/impersonate/stash", {
        method: "POST",
        credentials: "include",
      });
      if (!stashRes.ok) {
        const json = await stashRes.json().catch(() => ({}));
        alert(json?.message ?? "Failed to back up admin session");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/impersonate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ targetId: spId, targetType: "provider" }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json?.token) {
        alert(json?.message ?? "Failed to start impersonation");
        return;
      }
      // Same-tab navigation — admin returns to /dashboard/admin via the
      // Exit Impersonation banner on the SP dashboard.
      window.location.href = `/auth/impersonate?token=${encodeURIComponent(json.token)}`;
    } catch (e) {
      alert("Failed to start impersonation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium shadow-sm transition-colors"
      title="Open this service provider's dashboard as them"
    >
      <ExternalLink className="w-4 h-4" />
      {loading ? "Opening…" : "View as SP"}
    </button>
  );
}
