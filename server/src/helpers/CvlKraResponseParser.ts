import { parseStringPromise } from "xml2js";
import { mapKraStatus } from "./CvlKraStatusMap";

/**
 * Parsing + mapping for the SolicitPANDetailsFetchALLKRA response.
 *
 * The decrypted `resdtls` is expected to be the KYC download file structure as
 * XML: <ROOT><KYC_DATA>..</KYC_DATA><FATCA_ADDL_DTLS>..</FATCA_ADDL_DTLS>
 * <APP_PAN_SUMM>..</APP_PAN_SUMM></ROOT>. We also accept a JSON body as a
 * fallback in case CVL returns JSON for this endpoint (confirm at UAT).
 */

export interface CvlKraResult {
  appName: string;
  appStatus: string;
  statusLabel: string;
  kraName: string;
  appStatusDt: string;
  fatcaApplicable: string;
  identity: {
    name: string;
    fatherOrSpouseName: string;
    gender: string;
    dob: string;
    pan: string;
  };
  contact: { email: string; mobile: string };
  correspondenceAddress: AddressBlock;
  permanentAddress: AddressBlock;
  other: {
    kycMode: string;
    ipvFlag: string;
    occupation: string;
    income: string;
    maritalStatus: string;
    kraInfo: string;
    errorDesc: string;
  };
  fatca: Record<string, string>;
  raw: any;
  errorCode: string;
  errorMessage: string;
}

interface AddressBlock {
  line1: string;
  line2: string;
  line3: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  addressProof: string;
}

/** xml2js with explicitArray:false yields strings, "" for empty tags, or nested objects. */
function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return ""; // nested/object — not a leaf scalar
}

/**
 * Normalize a stored DOB (free-form string or Date) to the dd/mm/yyyy format
 * CVL expects for APP_DOB_INCORP. Returns "" when it can't be parsed.
 *
 * Handles: dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, ISO timestamps, and Date.
 */
export function normalizeDobToDDMMYYYY(input: unknown): string {
  if (!input) return "";
  const pad = (n: number) => String(n).padStart(2, "0");

  if (input instanceof Date && !isNaN(input.getTime())) {
    return `${pad(input.getDate())}/${pad(input.getMonth() + 1)}/${input.getFullYear()}`;
  }

  const raw = String(input).trim();
  if (!raw) return "";

  // dd/mm/yyyy or dd-mm-yyyy (already day-first)
  let m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${pad(+d)}/${pad(+mo)}/${y}`;
  }

  // yyyy-mm-dd or yyyy/mm/dd (year-first)
  m = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${pad(+d)}/${pad(+mo)}/${y}`;
  }

  // ISO timestamp / anything Date can parse
  const dt = new Date(raw);
  if (!isNaN(dt.getTime())) {
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  }

  return "";
}

function address(k: any, prefix: "COR" | "PER"): AddressBlock {
  return {
    line1: s(k?.[`APP_${prefix}_ADD1`]),
    line2: s(k?.[`APP_${prefix}_ADD2`]),
    line3: s(k?.[`APP_${prefix}_ADD3`]),
    city: s(k?.[`APP_${prefix}_CITY`]),
    state: s(k?.[`APP_${prefix}_STATE`]),
    pincode: s(k?.[`APP_${prefix}_PINCD`]),
    country: s(k?.[`APP_${prefix}_CTRY`]),
    addressProof: s(k?.[`APP_${prefix}_ADD_PROOF`]),
  };
}

/** Parse the decrypted Solicit payload (XML or JSON) into a loose object tree. */
export async function parseSolicit(decrypted: string): Promise<any> {
  const t = (decrypted || "").trim();
  if (!t) return {};
  if (t.startsWith("<")) {
    return parseStringPromise(t, { explicitArray: false, trim: true });
  }
  try {
    return JSON.parse(t);
  } catch {
    return { _raw: t };
  }
}

/** Map a parsed Solicit tree into the structured result we store + return. */
export function mapSolicitKyc(
  parsed: any,
  envelope?: { error_code?: string; error_message?: string },
): CvlKraResult {
  const root = parsed?.ROOT ?? parsed?.APP_REQ_ROOT ?? parsed ?? {};
  const k = root?.KYC_DATA ?? root ?? {};
  const fatcaNode = root?.FATCA_ADDL_DTLS ?? {};

  const appStatus = s(k?.APP_STATUS);
  const { kra, label } = mapKraStatus(appStatus);

  const fatca: Record<string, string> = {};
  for (const key of [
    "APP_FATCA_APPLICABLE_FLAG",
    "APP_FATCA_COUNTRY_RES",
    "APP_FATCA_BIRTH_PLACE",
    "APP_FATCA_BIRTH_COUNTRY",
    "APP_FATCA_COUNTRY_CITYZENSHIP",
    "APP_FATCA_DATE_DECLARATION",
  ]) {
    fatca[key] = s(k?.[key]);
  }
  for (const key of [
    "APP_FATCA_ENTITY_PAN",
    "APP_FATCA_COUNTRY_RESIDENCY",
    "APP_FATCA_TAX_IDENTIFICATION_NO",
    "APP_FATCA_TAX_EXEMPT_FLAG",
    "APP_FATCA_TAX_EXEMPT_REASON",
  ]) {
    const v = s(fatcaNode?.[key]);
    if (v) fatca[key] = v;
  }

  return {
    appName: s(k?.APP_NAME),
    appStatus,
    statusLabel: label,
    kraName: kra || s(k?.APP_KRA_INFO),
    appStatusDt: s(k?.APP_STATUSDT),
    fatcaApplicable: s(k?.APP_FATCA_APPLICABLE_FLAG),
    identity: {
      name: s(k?.APP_NAME),
      fatherOrSpouseName: s(k?.APP_F_NAME),
      gender: s(k?.APP_GEN),
      dob: s(k?.APP_DOB_DT),
      pan: s(k?.APP_PAN_NO),
    },
    contact: {
      email: s(k?.APP_EMAIL),
      mobile: s(k?.APP_MOB_NO),
    },
    correspondenceAddress: address(k, "COR"),
    permanentAddress: address(k, "PER"),
    other: {
      kycMode: s(k?.APP_KYC_MODE),
      ipvFlag: s(k?.APP_IPV_FLAG),
      occupation: s(k?.APP_OCC),
      income: s(k?.APP_INCOME),
      maritalStatus: s(k?.APP_MAR_STATUS),
      kraInfo: s(k?.APP_KRA_INFO),
      errorDesc: s(k?.APP_ERROR_DESC),
    },
    fatca,
    raw: parsed,
    errorCode: s(envelope?.error_code),
    errorMessage: s(envelope?.error_message),
  };
}
