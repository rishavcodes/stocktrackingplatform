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

export function getMcxPnlMultiplier(
  exchange: string | undefined | null,
  scriptname: string | undefined | null
): number {
  if (!exchange || exchange.toUpperCase() !== "MCX" || !scriptname) return 1;
  const name = scriptname.toUpperCase();
  for (const sym of MCX_SYMBOLS_LONGEST_FIRST) {
    if (name.startsWith(sym)) return MCX_LOT_MULTIPLIERS[sym];
  }
  return 1;
}
