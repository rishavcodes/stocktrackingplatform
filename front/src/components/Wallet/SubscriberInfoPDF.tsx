import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import { transactionsType } from "@/app/dashboard/serviceprovider/services/transactions/page";

// NOTE: No custom Font.register here. @react-pdf/renderer's fontkit cannot
// parse variable TTF fonts (they break PDF generation). We rely on the
// built-in Helvetica family (normal/bold) — same approach as PortfolioPDF.

export type PdfViewModel = {
    name: string;
    email: string;
    number: string | number;
    gender: string;
    dob: string;
    pannumber: string;
    aadhaarLast4: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    telegram: string;
    role: string;
    memberSince: string;
    linkedBrokers: { brokerType?: string; clientCode?: string }[];
};

export type PdfAnalytics = {
    totalServices: number;
    totalSpent: number;
    activeCount: number;
    renewals: number;
    avgOrderValue: number;
    customerSince: string;
    lastPurchase: string;
};

const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        paddingTop: 28,
        paddingBottom: 36,
        paddingHorizontal: 32,
        fontSize: 9,
        color: "#0F172A",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    title: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
    generated: { fontSize: 8, color: "#64748B" },
    name: { fontSize: 13, fontWeight: "bold", marginTop: 2 },
    sub: { fontSize: 9, color: "#475569", marginTop: 2 },
    brandBar: {
        backgroundColor: "#0F172A",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
        marginTop: 12,
        marginBottom: 8,
    },
    brandText: { fontSize: 10, fontWeight: "bold", color: "#FFFFFF", letterSpacing: 0.5 },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { width: "50%", paddingVertical: 3, paddingRight: 8 },
    label: { fontSize: 7.5, color: "#64748B", marginBottom: 1 },
    value: { fontSize: 9.5, color: "#0F172A" },
    kpiRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
    kpi: {
        width: "33.33%",
        padding: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 6,
        marginBottom: 6,
    },
    kpiLabel: { fontSize: 7.5, color: "#64748B" },
    kpiValue: { fontSize: 12, fontWeight: "bold", marginTop: 2 },
    table: { marginTop: 4 },
    tHead: {
        flexDirection: "row",
        backgroundColor: "#F1F5F9",
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    tRow: {
        flexDirection: "row",
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    th: { fontSize: 8, fontWeight: "bold", color: "#334155" },
    td: { fontSize: 8.5, color: "#0F172A" },
    cService: { width: "34%" },
    cType: { width: "16%" },
    cStatus: { width: "16%" },
    cTotal: { width: "16%" },
    cDate: { width: "18%" },
    docs: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 6,
        paddingBottom: 6,
        gap: 10,
    },
    docLink: { fontSize: 7.5, color: "#2563EB", marginRight: 10 },
    orderCard: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 6,
        padding: 8,
        marginBottom: 8,
    },
    orderHead: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    orderTitle: { fontSize: 11, fontWeight: "bold", color: "#0F172A", flex: 1, paddingRight: 8 },
    orderTotal: { fontSize: 11, fontWeight: "bold", color: "#0F172A" },
    orderMeta: { fontSize: 8, color: "#475569", marginTop: 2, marginBottom: 5, textTransform: "uppercase" },
    kvGrid: { flexDirection: "row", flexWrap: "wrap" },
    kvCell: { width: "33.33%", paddingVertical: 2, paddingRight: 6 },
    linksLine: { flexDirection: "row", flexWrap: "wrap", marginTop: 5, alignItems: "center" },
    linksLabel: { fontSize: 7.5, color: "#64748B", marginRight: 4 },
    tgUrl: { fontSize: 7.5, color: "#0F172A", marginTop: 1 },
    footer: {
        position: "absolute",
        bottom: 16,
        left: 32,
        right: 32,
        fontSize: 7,
        color: "#94A3B8",
        textAlign: "center",
    },
});

function fmt(v: string | number | null | undefined) {
    return v === 0 || v ? String(v) : "—";
}
function money(n: number) {
    return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function SubscriberInfoPDF({
    view,
    analytics,
    orders,
    generatedAt,
}: {
    view: PdfViewModel;
    analytics: PdfAnalytics;
    orders: transactionsType[];
    generatedAt: string;
}) {
    const fullAddress = [view.address, view.city, view.state, view.pincode]
        .filter(Boolean)
        .join(", ");

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Subscriber Report</Text>
                    <Text style={styles.generated}>Generated {generatedAt}</Text>
                </View>
                <Text style={styles.name}>{fmt(view.name)}</Text>
                <Text style={styles.sub}>
                    {fmt(view.email)}
                    {view.number ? `  •  ${String(view.number)}` : ""}
                    {view.memberSince ? `  •  Member since ${view.memberSince}` : ""}
                </Text>

                {/* Common details */}
                <View style={styles.brandBar}>
                    <Text style={styles.brandText}>PROFILE DETAILS</Text>
                </View>
                <View style={styles.grid}>
                    <Field label="Gender" value={fmt(view.gender)} />
                    <Field label="Date of Birth" value={fmt(view.dob)} />
                    <Field label="PAN Number" value={fmt(view.pannumber)} />
                    <Field
                        label="Aadhaar"
                        value={view.aadhaarLast4 ? `XXXX ${view.aadhaarLast4}` : "—"}
                    />
                    <Field label="Telegram" value={fmt(view.telegram)} />
                    <Field label="Role" value={fmt(view.role)} />
                    <View style={{ width: "100%", paddingVertical: 3 }}>
                        <Text style={styles.label}>Address</Text>
                        <Text style={styles.value}>{fmt(fullAddress)}</Text>
                    </View>
                    {view.linkedBrokers.length > 0 && (
                        <View style={{ width: "100%", paddingVertical: 3 }}>
                            <Text style={styles.label}>Linked Brokers</Text>
                            <Text style={styles.value}>
                                {view.linkedBrokers
                                    .map((b) =>
                                        [b.brokerType, b.clientCode].filter(Boolean).join(" · "),
                                    )
                                    .join("   |   ")}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Analytics summary */}
                <View style={styles.brandBar}>
                    <Text style={styles.brandText}>ANALYTICS</Text>
                </View>
                <View style={styles.kpiRow}>
                    <Kpi label="Total Spent" value={money(analytics.totalSpent)} />
                    <Kpi label="Total Services" value={String(analytics.totalServices)} />
                    <Kpi label="Active Services" value={String(analytics.activeCount)} />
                    <Kpi label="Renewals" value={String(analytics.renewals)} />
                    <Kpi label="Avg Order Value" value={money(analytics.avgOrderValue)} />
                    <Kpi label="Customer Since" value={fmt(analytics.customerSince)} />
                </View>

                {/* Services + all order details */}
                <View style={styles.brandBar}>
                    <Text style={styles.brandText}>SUBSCRIBED SERVICES ({orders.length})</Text>
                </View>
                {orders.map((o) => {
                    const kyc = o.kycDetails;
                    const coupon = (o as any).coupon;
                    const discount = Number((o as any).discountAmount) || 0;
                    const isEvent = (o as any).type === "event";
                    const isRenewal = !!(o as any).isRenewal;
                    const payStatus = o.paymentStatus || (o.verifiedByRa ? "verified" : "");
                    const orderId = (o as any).orderId || o._id || "";
                    const tg = tgLinks(o);
                    const hasDocs =
                        o.invoiceLink ||
                        o.paymentProof ||
                        o.signedDocumentUrl ||
                        kyc?.panUrl ||
                        kyc?.aadhaarUrl;
                    return (
                        <View key={o._id} style={styles.orderCard} wrap={false}>
                            <View style={styles.orderHead}>
                                <Text style={styles.orderTitle}>{fmt(o.serviceName)}</Text>
                                <Text style={styles.orderTotal}>{money(Number(o.total))}</Text>
                            </View>
                            <Text style={styles.orderMeta}>
                                {fmt((o as any).type)} · {o.isExpired ? "Expired" : "Active"} ·{" "}
                                {isRenewal ? "Renewal" : "Fresh"}
                                {payStatus ? ` · ${payStatus}` : ""}
                            </Text>
                            <View style={styles.kvGrid}>
                                <KvCell label="Subtotal" value={money(Number(o.subtotal))} />
                                <KvCell label="GST" value={money(Number(o.gst))} />
                                <KvCell label="Total" value={money(Number(o.total))} />
                                <KvCell
                                    label="Coupon"
                                    value={
                                        coupon?.code
                                            ? `${coupon.code}${discount > 0 ? ` (−₹${discount.toFixed(2)})` : ""}`
                                            : "—"
                                    }
                                />
                                <KvCell label="Payment Method" value={fmt(o.paymentMethod)} />
                                <KvCell
                                    label="Validity"
                                    value={o.validity ? `${o.validity} days` : "—"}
                                />
                                <KvCell
                                    label="Start Date"
                                    value={
                                        (o as any).startDate
                                            ? new Date((o as any).startDate).toLocaleDateString("en-IN")
                                            : "—"
                                    }
                                />
                                <KvCell
                                    label="End Date"
                                    value={
                                        (o as any).endDate
                                            ? new Date((o as any).endDate).toLocaleDateString("en-IN")
                                            : "—"
                                    }
                                />
                                <KvCell
                                    label="Purchased"
                                    value={
                                        o.createdAt
                                            ? new Date(o.createdAt).toLocaleDateString("en-IN")
                                            : "—"
                                    }
                                />
                                {isEvent && (
                                    <KvCell
                                        label="Event"
                                        value={`${
                                            (o as any).eventSchedule
                                                ? new Date((o as any).eventSchedule).toLocaleDateString("en-IN")
                                                : "—"
                                        }${(o as any).eventMode ? ` · ${(o as any).eventMode}` : ""}`}
                                    />
                                )}
                                <KvCell label="Order ID" value={orderId || "—"} />
                                <KvCell label="Payment ID" value={o.paymentId || "—"} />
                            </View>
                            {hasDocs && (
                                <View style={styles.linksLine}>
                                    <Text style={styles.linksLabel}>Documents:</Text>
                                    {o.invoiceLink && (
                                        <Link src={o.invoiceLink} style={styles.docLink}>
                                            Invoice
                                        </Link>
                                    )}
                                    {o.paymentProof && (
                                        <Link src={o.paymentProof} style={styles.docLink}>
                                            Payment Proof
                                        </Link>
                                    )}
                                    {o.signedDocumentUrl && (
                                        <Link src={o.signedDocumentUrl} style={styles.docLink}>
                                            Signed TnC
                                        </Link>
                                    )}
                                    {kyc?.panUrl && (
                                        <Link src={kyc.panUrl} style={styles.docLink}>
                                            PAN Doc
                                        </Link>
                                    )}
                                    {kyc?.aadhaarUrl && (
                                        <Link src={kyc.aadhaarUrl} style={styles.docLink}>
                                            Aadhaar Doc
                                        </Link>
                                    )}
                                </View>
                            )}
                            {tg.length > 0 && (
                                <View style={{ marginTop: 5 }}>
                                    <Text style={styles.linksLabel}>
                                        Telegram invite link{tg.length > 1 ? "s" : ""} (copy &amp; share):
                                    </Text>
                                    {tg.map((t, i) => (
                                        <Text key={i} style={styles.tgUrl}>
                                            {t.label !== "Join" ? `${t.label}: ` : ""}
                                            {t.url}
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    );
                })}
                {orders.length === 0 && (
                    <Text style={styles.value}>No services found.</Text>
                )}

                <Text style={styles.footer} fixed>
                    Tradebox — Subscriber report. Document links open the original files online.
                </Text>
            </Page>
        </Document>
    );
}

// Packages carry one invite link per included plan (telegramInviteLinks);
// single-service orders carry one (telegramInviteLink). De-duped by URL.
function tgLinks(o: transactionsType): { label: string; url: string }[] {
    const out: { label: string; url: string }[] = [];
    const seen = new Set<string>();
    const add = (label: string, url?: string) => {
        if (url && !seen.has(url)) {
            seen.add(url);
            out.push({ label, url });
        }
    };
    const multi = (o as any).telegramInviteLinks;
    if (Array.isArray(multi)) {
        multi.forEach((t: any, i: number) => add(t?.serviceName || `Plan ${i + 1}`, t?.link));
    }
    add("Join", (o as any).telegramInviteLink);
    return out;
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.cell}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
}

function KvCell({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.kvCell}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
}

function Kpi({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>{label}</Text>
            <Text style={styles.kpiValue}>{value}</Text>
        </View>
    );
}
