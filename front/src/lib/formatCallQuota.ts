/** Human-readable label for provider call commitment (e.g. "5 calls per week"). */
export function formatCallQuotaLabel(
	callsQuota?: number | null,
	callsPeriod?: string | null,
): string | null {
	if (callsQuota == null || callsQuota <= 0) return null;
	const p = (callsPeriod || "DAY").toUpperCase();
	const unit = p === "WEEK" ? "week" : p === "MONTH" ? "month" : "day";
	return `${callsQuota} call${callsQuota === 1 ? "" : "s"} per ${unit}`;
}
