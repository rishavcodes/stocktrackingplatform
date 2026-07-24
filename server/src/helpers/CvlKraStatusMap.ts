/**
 * CVL KRA APP_STATUS decoder.
 *
 * The 3-digit APP_STATUS code is KRA-prefixed: the first digit identifies the
 * KRA (CVLKRA=0xx, NDML=1xx, DOTEX=2xx, CAMS=3xx, KARVY=4xx, KFIN=6xx) and the
 * last two digits the status. A few codes are special-cased.
 */

const KRA_BY_PREFIX: Record<string, string> = {
  "0": "CVLKRA",
  "1": "NDML",
  "2": "DOTEX",
  "3": "CAMS",
  "4": "KARVY",
  "6": "KFIN",
};

const STATUS_BY_SUFFIX: Record<string, string> = {
  "00": "Not Checked",
  "01": "Submitted",
  "02": "KRA Verified",
  "03": "Hold",
  "04": "Rejected",
  "05": "Not Available",
  "06": "Deactivated",
  "07": "KRA Validated",
  "11": "Existing KYC Submitted",
  "12": "Existing KYC Verified",
  "13": "Existing KYC Hold",
  "14": "Existing KYC Rejected",
};

const SPECIAL: Record<string, string> = {
  "022": "KYC Registered with CVLMF",
  "888": "Not Checked with Multiple KRA",
  "999": "Invalid PAN Format",
};

export interface KraStatus {
  kra: string;
  label: string;
}

export function mapKraStatus(code?: string | null): KraStatus {
  const c = (code || "").trim();
  if (!c) return { kra: "", label: "Not Available" };
  if (SPECIAL[c]) return { kra: KRA_BY_PREFIX[c[0]] ?? "", label: SPECIAL[c] };
  return {
    kra: KRA_BY_PREFIX[c[0]] ?? "",
    label: STATUS_BY_SUFFIX[c.slice(1)] ?? `Unknown (${c})`,
  };
}
