/**
 * Shared formatter for the "Entry" column / row across the recommendation
 * table, card, list, and modals.
 *
 *  - Single-rate trade (item.rate set OR no range fields)
 *      → primary = "390.00"
 *
 *  - Range trade, NOT triggered
 *      → primary = "385 - 395"   (the range itself; entryPrice is just the
 *        upper/lower bound the backend chose for risk-reward maths and
 *        showing it alone is misleading)
 *
 *  - Range trade, TRIGGERED
 *      → primary = "388.50"      (the actual entry the trade fired at)
 *      → subtitle = "Range: 385 - 395"
 */
export interface EntryDisplay {
  primary: string;
  subtitle?: string;
  /** True when this is a range trade (caller can use to render a small badge). */
  isRange: boolean;
  /** True for a triggered range trade — both the actual entry and the range are meaningful. */
  showsBoth: boolean;
}

const fmt = (n: number) =>
  Number.isFinite(n) ? n.toFixed(2) : "—";

export function getEntryDisplay(item: any): EntryDisplay {
  const lower = Number(item?.lowerRange);
  const upper = Number(item?.upperRange);
  const isRange =
    Number.isFinite(lower) && Number.isFinite(upper) && lower > 0 && upper > 0;
  const isTriggered = item?.istriggered === "triggered";

  if (isRange) {
    const range = `${fmt(lower)} - ${fmt(upper)}`;
    if (isTriggered) {
      const entry = Number(item?.entryPrice) || 0;
      return {
        primary: fmt(entry),
        subtitle: `Range: ${range}`,
        isRange: true,
        showsBoth: true,
      };
    }
    return {
      primary: range,
      isRange: true,
      showsBoth: false,
    };
  }

  const entry = Number(item?.entryPrice) || Number(item?.rate) || 0;
  return {
    primary: fmt(entry),
    isRange: false,
    showsBoth: false,
  };
}
