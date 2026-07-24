const MCX_LOT_MULTIPLIERS: Record<string, number> = {
  ALUMINIUM: 1000,
  ALUMINI: 1000,
  GOLDGUINEA: 0.125,
  GOLDTEN: 0.1,
  GOLDM: 0.1,
  GOLD: 100,
  NATURALGAS: 1,
  NATGASMINI: 0.1,
  LEADMINI: 1000,
  LEAD: 1000,
  ZINCMINI: 1000,
  ZINC: 1000,
};

const MCX_SYMBOLS_LONGEST_FIRST = Object.keys(MCX_LOT_MULTIPLIERS).sort(
  (a, b) => b.length - a.length
);

// Memoize per (exchange, scriptname). The dashboard calls this ~4× per row
// per render — and the table re-renders every 1.5s on the live tick. The
// prefix-scan loop is small but compounds at 100+ rows × 1.5s.
const multiplierCache = new Map<string, number>();

export function getMcxPnlMultiplier(
  exchange: string | undefined | null,
  scriptname: string | undefined | null
): number {
  if (!exchange || exchange.toUpperCase() !== "MCX" || !scriptname) return 1;
  const key = `${exchange}::${scriptname}`;
  const cached = multiplierCache.get(key);
  if (cached !== undefined) return cached;
  const name = scriptname.toUpperCase();
  let multiplier = 1;
  for (const sym of MCX_SYMBOLS_LONGEST_FIRST) {
    if (name.startsWith(sym)) {
      multiplier = MCX_LOT_MULTIPLIERS[sym];
      break;
    }
  }
  multiplierCache.set(key, multiplier);
  return multiplier;
}
