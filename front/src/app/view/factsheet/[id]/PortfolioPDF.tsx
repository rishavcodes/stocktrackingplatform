import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { IPortfolio } from "./page";
import { format } from "date-fns";

// NOTE: No custom Font.register here. @react-pdf/renderer's fontkit cannot
// parse variable TTF fonts (the Inter variable fonts broke PDF generation,
// which made the download button silently fail). We fall back to the built-in
// Helvetica family, which supports normal/bold/italic out of the box.

// Professional styles — 2 pages only, clean layout
const styles = StyleSheet.create({
	page: {
		flexDirection: "column",
		backgroundColor: "#FFFFFF",
		paddingTop: 28,
		paddingBottom: 28,
		paddingHorizontal: 32,
	},
	header: {
		flexDirection: "column",
		marginBottom: 14,
	},
	headerTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	logo: {
		width: 28,
		height: 28,
		backgroundColor: "#2563EB",
		borderRadius: 6,
		marginRight: 10,
	},
	companyName: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#0F172A",
		flex: 1,
	},
	lastUpdated: {
		fontSize: 9,
		color: "#64748B",
	},
	brandBar: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#0F172A",
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginBottom: 14,
		borderRadius: 6,
	},
	factsheetText: {
		fontSize: 12,
		fontWeight: "bold",
		color: "#FFFFFF",
		letterSpacing: 0.5,
	},
	investmentInfoCard: {
		backgroundColor: "#FFFFFF",
		padding: 14,
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	investmentInfoTop: {
		flexDirection: "row",
		alignItems: "center",
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#E2E8F0",
	},
	investmentInfoImagePlaceholder: {
		width: 48,
		height: 48,
		borderRadius: 8,
		backgroundColor: "#EFF6FF",
		marginRight: 12,
	},
	investmentInfoDetails: {
		flex: 1,
		flexDirection: "column",
	},
	investmentInfoTitle: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#0F172A",
		marginBottom: 6,
	},
	investmentInfoTags: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		marginBottom: 8,
	},
	tag: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#CED4DA",
		borderRadius: 4,
		paddingHorizontal: 6,
		paddingVertical: 3,
		marginRight: 6,
		marginBottom: 6,
	},
	tagText: {
		fontSize: 9,
		color: "#495057",
	},
	cagrTag: {
		backgroundColor: "#E6F9F0",
		borderColor: "#A3E9C3",
	},
	cagrTagText: {
		color: "#0B874B",
		fontWeight: "bold",
	},
	description: {
		fontSize: 10,
		color: "#6C757D",
	},
	investmentInfoBottom: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingTop: 12,
	},
	infoColumn: {
		flexDirection: "column",
	},
	infoLabel: {
		fontSize: 9,
		color: "#6C757D",
		marginBottom: 4,
	},
	infoValue: {
		fontSize: 11,
		color: "#212529",
		fontWeight: "bold",
	},
	rationaleCard: {
		borderWidth: 1,
		borderColor: "#E2E8F0",
		borderRadius: 8,
		backgroundColor: "#FFFFFF",
		marginBottom: 12,
	},
	rationaleHeader: {
		padding: 8,
		backgroundColor: "#F8FAFC",
		borderBottomWidth: 1,
		borderBottomColor: "#E2E8F0",
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
	},
	rationaleTitle: {
		fontSize: 10,
		fontWeight: "bold",
		color: "#334155",
	},
	rationaleBody: {
		padding: 12,
	},
	rationaleParagraph: {
		fontSize: 9,
		color: "#475569",
		lineHeight: 1.45,
	},
	bulletPoint: {
		flexDirection: "row",
		marginBottom: 5,
	},
	bulletText: {
		flex: 1,
		fontSize: 10,
		color: "#212529",
		lineHeight: 1.5,
		marginLeft: 5,
	},
	rebalanceCard: {
		borderWidth: 1,
		borderColor: "#E2E8F0",
		borderRadius: 8,
		backgroundColor: "#FFFFFF",
		marginBottom: 12,
	},
	rebalanceHeader: {
		padding: 8,
		backgroundColor: "#F8FAFC",
		borderBottomWidth: 1,
		borderBottomColor: "#E2E8F0",
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
	},
	rebalanceTitle: {
		fontSize: 10,
		fontWeight: "bold",
		color: "#334155",
	},
	rebalanceBody: {
		flexDirection: "row",
		justifyContent: "space-around",
		padding: 12,
	},
	rebalanceColumn: {
		flexDirection: "column",
		alignItems: "center",
	},
	rebalanceLabel: {
		fontSize: 9,
		color: "#6C757D",
		marginBottom: 4,
	},
	rebalanceValue: {
		fontSize: 11,
		color: "#212529",
		fontWeight: "bold",
	},
	managedByCard: {
		borderWidth: 1,
		borderColor: "#BFDBFE",
		borderRadius: 8,
		backgroundColor: "#EFF6FF",
		marginBottom: 12,
	},
	managedByHeader: {
		padding: 8,
		backgroundColor: "#DBEAFE",
		borderBottomWidth: 1,
		borderBottomColor: "#BFDBFE",
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
	},
	managedByTitle: {
		fontSize: 10,
		fontWeight: "bold",
		color: "#1D4ED8",
	},
	managedByBody: {
		padding: 12,
	},
	managerName: {
		fontSize: 12,
		fontWeight: "bold",
		color: "#1E293B",
		marginBottom: 4,
	},
	managerAddress: {
		fontSize: 9,
		color: "#475569",
		marginBottom: 10,
		lineHeight: 1.4,
	},
	managerContactGrid: {
		flexDirection: "row",
		justifyContent: "space-between",
		flexWrap: "wrap",
	},
	managerContactColumn: {
		flexDirection: "column",
		width: "48%", // Two columns
		marginBottom: 15,
	},
	managerContactLabel: {
		fontSize: 9,
		color: "#64748B",
		marginBottom: 4,
	},
	managerContactValue: {
		fontSize: 10,
		color: "#1E293B",
		fontWeight: "bold",
	},
	scriptsCard: {
		borderWidth: 1,
		borderColor: "#E2E8F0",
		borderRadius: 8,
		backgroundColor: "#FFFFFF",
		marginBottom: 12,
		overflow: "hidden",
	},
	scriptsHeader: {
		padding: 8,
		backgroundColor: "#0F172A",
		borderBottomWidth: 1,
		borderBottomColor: "#334155",
	},
	scriptsTitle: {
		fontSize: 11,
		fontWeight: "bold",
		color: "#FFFFFF",
	},
	scriptsTableContainer: {
		padding: 0,
	},
	scriptsTableHeader: {
		flexDirection: "row",
		backgroundColor: "#F1F5F9",
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#E2E8F0",
	},
	scriptsTableRow: {
		flexDirection: "row",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderBottomWidth: 1,
		borderBottomColor: "#E2E8F0",
	},
	scriptsTableRowAlt: {
		backgroundColor: "#F8FAFC",
	},
	scriptsTableCell: {
		flex: 1,
		fontSize: 9,
		color: "#475569",
	},
	scriptsTableHeaderCell: {
		flex: 1,
		fontSize: 9,
		color: "#334155",
		fontWeight: "bold",
	},
	section: {
		marginBottom: 35,
	},
	sectionTitle: {
		fontSize: 22,
		fontWeight: 600,
		color: "#212529",
		marginBottom: 20,
		textAlign: "left",
	},
	card: {
		backgroundColor: "#FFFFFF",
		padding: 25,
		borderRadius: 12,
		marginBottom: 20,
		boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	label: {
		fontSize: 14,
		color: "#6C757D",
		textAlign: "left",
	},
	value: {
		fontSize: 14,
		color: "#212529",
		fontWeight: 600,
		textAlign: "right",
	},
	table: {
		marginTop: 15,
		borderRadius: 12,
		overflow: "hidden",
		boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
	},
	tableHeader: {
		flexDirection: "row",
		backgroundColor: "#F8F9FA",
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#E9ECEF",
	},
	tableRow: {
		flexDirection: "row",
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#E9ECEF",
		backgroundColor: "#FFFFFF",
	},
	tableCell: {
		flex: 1,
		fontSize: 11,
		color: "#495057",
		textAlign: "left",
		paddingHorizontal: 4,
	},
	tableHeaderCell: {
		flex: 1,
		fontSize: 11,
		color: "#212529",
		fontWeight: 600,
		textAlign: "left",
		paddingHorizontal: 4,
	},
	footer: {
		position: "absolute",
		bottom: 40,
		left: 40,
		right: 40,
		fontSize: 12,
		color: "#6C757D",
		textAlign: "center",
		borderTop: "2px solid #E9ECEF",
		paddingTop: 20,
	},
	footerFlow: {
		marginTop: 14,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "#E2E8F0",
		fontSize: 9,
		color: "#64748B",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	pageLabel: {
		fontSize: 9,
		color: "#64748B",
	},
	chartContainer: {
		marginTop: 20,
		padding: 20,
		backgroundColor: "#FFFFFF",
		borderRadius: 12,
		boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
	},
	chartTitle: {
		fontSize: 14,
		fontWeight: 600,
		color: "#212529",
		marginBottom: 15,
		textAlign: "left",
	},
	chartPlaceholder: {
		height: 200,
		backgroundColor: "#F8F9FA",
		borderRadius: 8,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		border: "1px solid #E9ECEF",
	},
	summaryGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginTop: 10,
	},
	summaryItem: {
		width: "50%",
		padding: 5,
	},
	summaryLabel: {
		fontSize: 10,
		color: "#6C757D",
		marginBottom: 6,
		textAlign: "left",
	},
	summaryValue: {
		fontSize: 14,
		fontWeight: 600,
		color: "#1E40AF",
		textAlign: "left",
	},
	performanceMetric: {
		fontSize: 14,
		fontWeight: 700,
		textAlign: "center",
		marginBottom: 2,
	},
	positiveMetric: {
		color: "#16A34A",
	},
	negativeMetric: {
		color: "#DC2626",
	},
	neutralMetric: {
		color: "#1E40AF",
	},
	metricLabel: {
		fontSize: 9,
		color: "#64748B",
		textAlign: "center",
		marginBottom: 1,
	},
	supportingMetric: {
		fontSize: 8,
		color: "#94A3B8",
		textAlign: "center",
		marginTop: 1,
		fontWeight: 400,
	},
	chartBar: {
		height: 150,
		width: 30,
		backgroundColor: "#4DABF7",
		marginHorizontal: 4,
	},
	chartBarContainer: {
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "center",
		height: 200,
		marginTop: 20,
	},
	chartBarLabelContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginTop: 6,
	},
	chartBarLabel: {
		width: 30,
		fontSize: 10,
		color: "#495057",
		textAlign: "center",
		marginHorizontal: 4,
	},
	cardBody: {
		padding: 10,
	},
});

interface PortfolioPDFProps {
	portfolio: IPortfolio;
}

const PortfolioPDF = ({ portfolio }: PortfolioPDFProps) => (
	<Document>
		<Page size="A4" style={styles.page}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerTop}>
					<View style={styles.logo} />
					<Text style={styles.companyName}>{portfolio.portfolioName}</Text>
					<Text style={styles.lastUpdated}>
						As of {format(new Date(portfolio.updatedAt || Date.now()), "dd MMM yyyy")}
					</Text>
				</View>
			</View>

			<View style={styles.brandBar}>
				<Text style={styles.factsheetText}>PORTFOLIO FACTSHEET</Text>
			</View>

			<View style={styles.investmentInfoCard}>
				<View style={styles.investmentInfoTop}>
					<View style={styles.investmentInfoImagePlaceholder} />
					<View style={styles.investmentInfoDetails}>
						<Text style={styles.investmentInfoTitle}>{portfolio.portfolioName}</Text>
						<View style={styles.investmentInfoTags}>
							<View style={[styles.tag, styles.cagrTag]}>
								<Text style={[styles.tagText, styles.cagrTagText]}>
									{portfolio.riskMetrics?.standardDeviation ?? "—"}% 3Y CAGR
								</Text>
							</View>
							<View style={[styles.tag, { backgroundColor: "#F8D7DA", borderColor: "#F5C6CB" }]}>
								<View style={{ flexDirection: "row", alignItems: "center" }}>
									<View style={{ width: 40, height: 6, backgroundColor: "#E9ECEF", borderRadius: 3, marginRight: 4 }}>
										<View
											style={{
												width: "40px",
												height: "100%",
												backgroundColor:
													portfolio.riskLevel > 3 ? "#DC3545" : portfolio.riskLevel > 2 ? "#FFC107" : "#28A745",
												borderRadius: 3,
											}}
										/>
									</View>
									<Text style={[styles.tagText, { color: "#721C24" }]}>Risk {portfolio.riskLevel}%</Text>
								</View>
							</View>
							<View style={styles.tag}>
								<Text style={styles.tagText}>Evergreen</Text>
							</View>
						</View>
						<Text style={styles.description}>{portfolio.methodology}</Text>
					</View>
				</View>
				<View style={styles.investmentInfoBottom}>
					<View style={styles.infoColumn}>
						<Text style={styles.infoLabel}>Type</Text>
						<Text style={styles.infoValue}>
							{portfolio.scripts?.length ? portfolio.scripts[0].segmentType : "—"}
						</Text>
					</View>
					<View style={styles.infoColumn}>
						<Text style={styles.infoLabel}>Constituents</Text>
						<Text style={styles.infoValue}>{portfolio.scripts?.length ?? 0} holdings</Text>
					</View>
					<View style={styles.infoColumn}>
						<Text style={styles.infoLabel}>Asset Class</Text>
						<Text style={styles.infoValue}>Equity</Text>
					</View>
					<View style={styles.infoColumn}>
						<Text style={styles.infoLabel}>Launch Date</Text>
						<Text style={styles.infoValue}>
							{portfolio.launchDate ? format(new Date(portfolio.launchDate), "dd-MM-yyyy") : "—"}
						</Text>
					</View>
				</View>
			</View>

			<View style={styles.rationaleCard}>
				<View style={styles.rationaleHeader}>
					<Text style={styles.rationaleTitle}> Rationale</Text>
				</View>
				<View style={styles.rationaleBody}>
					<Text style={styles.rationaleParagraph}>{portfolio.rationale ?? "No rationale available"}</Text>
				</View>
			</View>

			<View style={styles.rebalanceCard}>
				<View style={styles.rebalanceHeader}>
					<Text style={styles.rebalanceTitle}>Rebalance Schedule</Text>
				</View>
				<View style={styles.rebalanceBody}>
					<View style={styles.rebalanceColumn}>
						<Text style={styles.rebalanceLabel}>Rebalance Frequency</Text>
						<Text style={styles.rebalanceValue}>{portfolio.reviewFrequency} months</Text>
					</View>
					<View style={styles.rebalanceColumn}>
						<Text style={styles.rebalanceLabel}>Last Rebalance Date</Text>
						<Text style={styles.rebalanceValue}>
							{portfolio.createdAt
								? format(
										new Date(
											new Date(portfolio.createdAt).setMonth(
												new Date(portfolio.createdAt).getMonth() + portfolio.reviewFrequency - portfolio.reviewFrequency
											)
										),
										"dd-MM-yyyy"
									)
								: "—"}
						</Text>
					</View>
					<View style={styles.rebalanceColumn}>
						<Text style={styles.rebalanceLabel}>Next Rebalance Date</Text>
						<Text style={styles.rebalanceValue}>
							{portfolio.createdAt
								? format(
										new Date(
											new Date(portfolio.createdAt).setMonth(
												new Date(portfolio.createdAt).getMonth() + portfolio.reviewFrequency
											)
										),
										"dd-MM-yyyy"
									)
								: "—"}
						</Text>
					</View>
				</View>
			</View>

			<View style={styles.managedByCard}>
				<View style={styles.managedByHeader}>
					<Text style={styles.managedByTitle}>Managed By</Text>
				</View>
				<View style={styles.managedByBody}>
					<Text style={styles.managerName}>{portfolio.authorData?.name ?? "—"}</Text>
					{(portfolio as { seraddress?: string }).seraddress ? (
						<Text style={styles.managerAddress}>{(portfolio as { seraddress?: string }).seraddress}</Text>
					) : null}
					<View style={styles.managerContactGrid}>
						<View style={styles.managerContactColumn}>
							<Text style={styles.managerContactLabel}>Contact</Text>
							<Text style={styles.managerContactValue}>
								{portfolio.sername != null ? String(portfolio.sername) : "—"}
							</Text>
						</View>
						<View style={styles.managerContactColumn}>
							<Text style={styles.managerContactLabel}>Email</Text>
							<Text style={styles.managerContactValue}>
								{portfolio.authorData?.email ?? "—"}
							</Text>
						</View>
						<View style={styles.managerContactColumn}>
							<Text style={styles.managerContactLabel}>SEBI Reg No</Text>
							<Text style={styles.managerContactValue}>
								{(portfolio as { sebiRegNo?: string }).sebiRegNo ?? "—"}
							</Text>
						</View>
					</View>
				</View>
			</View>

			<View style={[styles.footerFlow, { marginBottom: 0 }]}>
				<Text style={styles.pageLabel}>Page 1 of 2</Text>
			</View>
		</Page>

		{/* Page 2: Constituents, Closed Positions, Performance, Overview, Risk, Disclosure, Footer */}
		<Page size="A4" style={styles.page}>
			<View style={[styles.header, { marginBottom: 10 }]}>
				<View style={styles.headerTop}>
					<Text style={styles.companyName}>{portfolio.portfolioName}</Text>
					<Text style={styles.pageLabel}>Page 2 of 2</Text>
				</View>
			</View>

			<View style={styles.scriptsCard}>
				<View style={styles.scriptsHeader}>
					<Text style={styles.scriptsTitle}>Current Holdings</Text>
				</View>
				<View style={styles.scriptsTableContainer}>
					<View style={styles.scriptsTableHeader}>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 1.6 }]}>Script</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 0.6, textAlign: "right" }]}>Qty</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 0.9, textAlign: "right" }]}>Entry</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 0.9, textAlign: "right" }]}>CMP</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 0.9, textAlign: "right" }]}>Value</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 0.9, textAlign: "right" }]}>P/L</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 0.9, textAlign: "right" }]}>Potential left</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 0.7, textAlign: "right" }]}>Weight</Text>
					</View>
					{(portfolio.scripts ?? []).map((script, index) => {
						const s = script as {
							profitLoss?: number;
							currentValue?: number;
							initialValue?: number;
							target?: number;
						};
						const pl =
							typeof s.profitLoss === "number"
								? s.profitLoss
								: typeof s.currentValue === "number" && typeof s.initialValue === "number"
									? s.currentValue - s.initialValue
									: 0;
						const isProfit = pl >= 0;
						const target = s.target ?? 0;
						const cmp = script.cmp ?? 0;
						const qty = script.quantity ?? 0;
						const hasTarget = typeof s.target === "number" && !Number.isNaN(s.target);
						const potential = hasTarget ? (target - cmp) * qty : null;
						const isPotentialPositive = potential != null && potential >= 0;
						return (
							<View key={script.slNo} style={[styles.scriptsTableRow, index % 2 !== 0 ? styles.scriptsTableRowAlt : {}]}>
								<View style={[styles.scriptsTableCell, { flex: 1.6, flexDirection: "column", paddingVertical: 6 }]}>
									<Text style={{ fontSize: 10, fontWeight: "bold", color: "#111827" }}>{script.scriptName?.name ?? "—"}</Text>
									<Text style={{ fontSize: 9, color: "#6B7280", marginTop: 2 }}>
										{script.exchangeType ?? "—"} • {script.segmentType ?? "—"}
									</Text>
								</View>
								<Text style={[styles.scriptsTableCell, { flex: 0.6, textAlign: "right" }]}>
									{script.quantity != null ? script.quantity.toLocaleString() : "—"}
								</Text>
								<Text style={[styles.scriptsTableCell, { flex: 0.9, textAlign: "right" }]}>
									{(script.buyRate ?? script.cmp ?? 0).toLocaleString()}
								</Text>
								<Text style={[styles.scriptsTableCell, { flex: 0.9, textAlign: "right" }]}>
									{(script.cmp ?? 0).toLocaleString()}
								</Text>
								<Text style={[styles.scriptsTableCell, { flex: 0.9, textAlign: "right" }]}>
									{(script.value ?? 0).toLocaleString()}
								</Text>
								<Text
									style={[
										styles.scriptsTableCell,
										{ flex: 0.9, textAlign: "right", color: isProfit ? "#10B981" : "#DC2626", fontWeight: "bold" },
									]}
								>
									{pl >= 0 ? "" : "-"}₹{Math.abs(pl).toLocaleString()}
								</Text>
								<Text
									style={[
										styles.scriptsTableCell,
										{
											flex: 0.9,
											textAlign: "right",
											color: potential == null ? "#6B7280" : isPotentialPositive ? "#10B981" : "#DC2626",
											fontWeight: potential != null ? "bold" : "normal",
										},
									]}
								>
									{potential != null
										? `${potential >= 0 ? "" : "-"}₹${Math.abs(potential).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
										: "—"}
								</Text>
								<Text style={[styles.scriptsTableCell, { flex: 0.7, textAlign: "right" }]}>{script.weightage ?? 0}%</Text>
							</View>
						);
					})}
				</View>
			</View>

			<View style={styles.scriptsCard}>
				<View style={styles.scriptsHeader}>
					<Text style={styles.scriptsTitle}>Previous Rebalances</Text>
				</View>

				<View style={styles.scriptsTableContainer}>
					{/* Table Header */}
					<View style={styles.scriptsTableHeader}>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 1.1 }]}>Date</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 1.8 }]}>Added</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 1.6 }]}>Removed</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 1.6 }]}>Closed</Text>
						<Text style={[styles.scriptsTableHeaderCell, { flex: 1.9 }]}>Qty changed</Text>
					</View>

					{/* Dynamic Rows */}
					{portfolio.rebalanceHistory && portfolio.rebalanceHistory.length > 0 ? (
						portfolio.rebalanceHistory.map((rb, index) => (
							<View
								key={index}
								style={[
									styles.scriptsTableRow,
									index % 2 !== 0 ? styles.scriptsTableRowAlt : {},
								]}
							>
								<Text style={[styles.scriptsTableCell, { flex: 1.1 }]}>
									{rb.date ? format(new Date(rb.date), "dd-MM-yyyy") : "—"}
								</Text>
								<Text style={[styles.scriptsTableCell, { flex: 1.8, color: "#10B981" }]}>
									{rb.added && rb.added.length > 0
										? rb.added.map((a) => a.name).join(", ")
										: "—"}
								</Text>
								<Text style={[styles.scriptsTableCell, { flex: 1.6, color: "#DC2626" }]}>
									{rb.removed && rb.removed.length > 0
										? rb.removed.map((r) => r.name).join(", ")
										: "—"}
								</Text>
								<Text style={[styles.scriptsTableCell, { flex: 1.6 }]}>
									{rb.closed && rb.closed.length > 0
										? rb.closed.map((c) => c.name).join(", ")
										: "—"}
								</Text>
								<Text style={[styles.scriptsTableCell, { flex: 1.9 }]}>
									{rb.changed && rb.changed.length > 0
										? rb.changed.map((c) => `${c.name} (${c.from}→${c.to})`).join(", ")
										: "—"}
								</Text>
							</View>
						))
					) : (
						<View style={styles.scriptsTableRow}>
							<Text style={[styles.scriptsTableCell, { flex: 8, textAlign: "center", padding: 20 }]}>
								No rebalances yet
							</Text>
						</View>
					)}
				</View>
			</View>

			<View style={styles.scriptsCard}>
				<View style={styles.scriptsHeader}>
					<Text style={styles.scriptsTitle}>Performance Overview</Text>
				</View>
				<View style={styles.cardBody}>
					<View style={styles.summaryGrid}>
						<View style={styles.summaryItem}>
							<Text style={[styles.performanceMetric, styles.neutralMetric]}>
								₹{(portfolio.minInvestmentAmount ?? 0) - (portfolio.performance?.totalInitialValue ?? 0)}
							</Text>
							<Text style={styles.metricLabel}>Uninvested</Text>
						</View>
						<View style={styles.summaryItem}>
							{(() => {
								const totalPotentialLeft = (portfolio.scripts || []).reduce((sum, script) => {
									const s = script as { target?: number };
									if (typeof s.target !== "number" || Number.isNaN(s.target)) return sum;
									const cmp = script.cmp ?? 0;
									const qty = script.quantity ?? 0;
									return sum + (s.target - cmp) * qty;
								}, 0);
								const isPositive = totalPotentialLeft >= 0;
								return (
									<>
										<Text
											style={[
												styles.performanceMetric,
												isPositive ? styles.positiveMetric : styles.negativeMetric,
											]}
										>
											{totalPotentialLeft >= 0 ? "" : "-"}₹{Math.abs(totalPotentialLeft).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
										</Text>
										<Text style={styles.metricLabel}>Total potential left</Text>
									</>
								);
							})()}
						</View>
						<View style={styles.summaryItem}>
							<Text style={[styles.performanceMetric, styles.neutralMetric]}>
								₹{(portfolio.performance?.totalCurrentValue ?? 0).toLocaleString()}
							</Text>
							<Text style={styles.metricLabel}>Total Value</Text>
							<Text style={styles.supportingMetric}>{portfolio.scripts?.length ?? 0} scripts</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text
								style={[
									styles.performanceMetric,
									(portfolio.performance?.totalProfitLoss ?? 0) >= 0 ? styles.positiveMetric : styles.negativeMetric,
								]}
							>
								₹{(portfolio.performance?.totalProfitLoss ?? 0).toLocaleString()}
							</Text>
							<Text style={styles.metricLabel}>Unrealized P&L</Text>
							<Text style={styles.supportingMetric}>
								{(portfolio.performance?.totalProfitLossPercentage ?? 0).toFixed(2)}% of portfolio
							</Text>
						</View>
					</View>
				</View>
			</View>

			<View style={styles.scriptsCard}>
				<View style={styles.scriptsHeader}>
					<Text style={styles.scriptsTitle}>Portfolio Overview</Text>
				</View>
				<View style={styles.cardBody}>
					<View style={styles.summaryGrid}>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryLabel}>Minimum Investment</Text>
							<Text style={styles.summaryValue}>₹{(portfolio.minInvestmentAmount ?? 0).toLocaleString()}</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryLabel}>Investment Horizon</Text>
							<Text style={styles.summaryValue}>{portfolio.investmentHorizon} months</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryLabel}>Review Frequency</Text>
							<Text style={styles.summaryValue}>{portfolio.reviewFrequency} months</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryLabel}>Benchmark Index</Text>
							<Text style={styles.summaryValue}>{portfolio.benchmarkIndex}</Text>
						</View>
					</View>
				</View>
			</View>

			<View style={styles.scriptsCard}>
				<View style={styles.scriptsHeader}>
					<Text style={styles.scriptsTitle}>Risk Metrics</Text>
				</View>
				<View style={styles.cardBody}>
					<View style={styles.summaryGrid}>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryLabel}>Standard Deviation</Text>
							<Text style={styles.summaryValue}>{portfolio.riskMetrics?.standardDeviation ?? "—"}%</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryLabel}>Sharpe Ratio</Text>
							<Text style={styles.summaryValue}>{portfolio.riskMetrics?.sharpeRatio ?? "—"}</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryLabel}>Maximum Drawdown</Text>
							<Text style={styles.summaryValue}>{portfolio.riskMetrics?.maximumDrawdown ?? "—"}%</Text>
						</View>
					</View>
				</View>
			</View>

			<View style={styles.rationaleCard}>
				<View style={styles.rationaleHeader}>
					<Text style={styles.rationaleTitle}>Definitions & Disclosures</Text>
				</View>
				<View style={styles.rationaleBody}>
					<Text style={styles.rationaleParagraph}>
						{portfolio.disclosure ?? "No disclosure available."}
					</Text>
				</View>
			</View>

			<View style={styles.footerFlow}>
				<Text style={styles.pageLabel}>Generated {format(new Date(), "dd MMM yyyy")}</Text>
				<Text style={styles.pageLabel}>Page 2 of 2</Text>
			</View>
		</Page>
	</Document>
);

export default PortfolioPDF;
