/**
 * Alice Blue contract master helper.
 * Fetches contract master JSON from v2api (NSE, BSE, MCX) and returns contract details for a given symbol.
 */

import axios from "axios";

const CONTRACT_MASTER_BASE =
  "https://v2api.aliceblueonline.com/restpy/static/contract_master/V2";

export type ContractMasterExchange = "NSE" | "BSE" | "MCX";

export interface ContractMasterItem {
  trading_symbol: string;
  symbol: string;
  group_name: string;
  exch: string;
  lot_size: string;
  instrument_type: string;
  formatted_ins_name: string;
  exchange_segment: string;
  pdc: string;
  tick_size: string;
  token: string;
}

/** Response shape: { "NSE": ContractMasterItem[] } or { "BSE": ... } or { "MCX": ... } */
type ContractMasterResponse = Record<string, ContractMasterItem[]>;

const fetchContractMaster = async (
  exchange: ContractMasterExchange
): Promise<ContractMasterItem[]> => {
  const url = `${CONTRACT_MASTER_BASE}/${exchange}`;
  const res = await axios.get<ContractMasterResponse>(url, { timeout: 15000 });
  const data = res.data;
  const list = data[exchange];
  if (!Array.isArray(list)) {
    throw new Error(`Invalid contract master response for ${exchange}`);
  }
  return list;
};

/**
 * Find a contract by symbol. Matches:
 * - contract.symbol (case-insensitive)
 * - contract.trading_symbol (case-insensitive)
 * - contract.trading_symbol === symbol + "-EQ" (common for equity)
 */
function findContractBySymbol(
  list: ContractMasterItem[],
  symbol: string
): ContractMasterItem | undefined {
  const normalized = (symbol || "").trim().toUpperCase();
  if (!normalized) return undefined;

  // Exact symbol match (e.g. "ACC", "RELIANCE")
  let found = list.find(
    (c) => c.symbol?.toUpperCase() === normalized
  );
  if (found) return found;

  // Exact trading_symbol match (e.g. "ACC-EQ", "20MICRONS-EQ")
  found = list.find(
    (c) => c.trading_symbol?.toUpperCase() === normalized
  );
  if (found) return found;

  // trading_symbol without suffix (e.g. scriptname is "ACC" and we have "ACC-EQ")
  found = list.find(
    (c) => c.trading_symbol?.toUpperCase() === `${normalized}-EQ`
  );
  if (found) return found;

  // trading_symbol starts with symbol (for derivatives / NFO etc.)
  found = list.find(
    (c) =>
      c.trading_symbol?.toUpperCase().startsWith(normalized) ||
      c.symbol?.toUpperCase().startsWith(normalized)
  );
  return found;
}

/** In-memory cache per exchange to avoid refetching on every request */
const cache: {
  [K in ContractMasterExchange]?: { list: ContractMasterItem[]; at: number };
} = {};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get contract master list for an exchange (with simple TTL cache).
 */
async function getCachedList(
  exchange: ContractMasterExchange
): Promise<ContractMasterItem[]> {
  const now = Date.now();
  const entry = cache[exchange];
  if (entry && now - entry.at < CACHE_TTL_MS) {
    return entry.list;
  }
  const list = await fetchContractMaster(exchange);
  cache[exchange] = { list, at: now };
  return list;
}

/**
 * Fetch contract master for the given exchange, filter by symbol, and return the contract details.
 * Returns null if not found.
 */
export async function getContractBySymbol(
  exchange: ContractMasterExchange,
  symbol: string
): Promise<ContractMasterItem | null> {
  if (!symbol || !exchange) return null;
  try {
    const list = await getCachedList(exchange);
    const contract = findContractBySymbol(list, symbol);
    return contract ?? null;
  } catch (err) {
    console.error("[contractMaster] getContractBySymbol error:", err);
    return null;
  }
}
