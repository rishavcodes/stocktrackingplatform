import { ScoreCardTypes } from "../types";

const FIELD_LABELS: Record<string, string> = {
  entryPrice: "📌 Entry Price",
  rate: "📈 Rate",
  upperRange: "⬆️ Upper Range",
  lowerRange: "⬇️ Lower Range",
  target: "🎯 Target",
  targets: "🎯 Targets",
  stoploss: "🛑 Stop Loss",
  validity: "⏳ Validity",
  holdingPeriod: "📆 Holding Period",
  notes: "🖊️ Notes",
  lotsize: "📦 Lot Size",
  shareWithPlans: "📋 Shared Plans",
  shareWithMarketplaces: "🏪 Shared Marketplaces",
};

function formatValue(field: string, value: any) {
  if (value === null || value === undefined) return "—";

  if (field === "validity") {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (field === "targets" && Array.isArray(value)) {
    return value.map((t: any) => t.price).join(", ");
  }

  if ((field === "shareWithPlans" || field === "shareWithMarketplaces") && Array.isArray(value)) {
    return `${value.length} selected`;
  }

  return String(value);
}

export default function buildModifyTelegramMessage(
  before: ScoreCardTypes,
  after: ScoreCardTypes,
  allowedUpdates: Record<string, any>
) {
  const changes: string[] = [];

  for (const field of Object.keys(allowedUpdates)) {
    // Only surface fields with a user-facing label; internal fields like
    // `riskRewardRatio` (recomputed server-side when target/stoploss change)
    // should not leak into the subscriber-facing change list.
    if (!FIELD_LABELS[field]) continue;

    const oldVal = (before as any)[field];
    const newVal = (after as any)[field];

    if (oldVal === undefined && newVal === undefined) continue;

    const oldFormatted = formatValue(field, oldVal);
    const newFormatted = formatValue(field, newVal);
    if (oldFormatted === newFormatted) continue;

    changes.push(
      `• ${FIELD_LABELS[field]}: ${oldFormatted} → ${newFormatted}`
    );
  }

  if (!changes.length) return null;

  return (
    `✏️ Trade Modified\n\n` +
    `📊 Script: ${after.scriptname}\n` +
    `Type: ${after.entryType.toUpperCase()}\n\n` +
    `🔄 Changes:\n` +
    changes.join("\n")
  );
}
