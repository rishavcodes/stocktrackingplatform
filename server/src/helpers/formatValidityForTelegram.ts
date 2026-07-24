export default function formatValidityForTelegram(
  validity: Date,
  holdingPeriod?: "intraday" | "btst" | "forward"
): string {
  if (holdingPeriod === "intraday") {
    return "Intraday";
  }

  // BTST and carry-forward → show date only (IST-safe)
  return validity.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
