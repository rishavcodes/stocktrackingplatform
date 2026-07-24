"use strict";

/**
 * CVL KRA non-secret configuration.
 *
 * Credentials are NOT here — they are stored per service provider in the DB
 * (CvlKraCredentialModel) and resolved at call time. This module only holds the
 * fixed UAT/LIVE base URLs; the environment is chosen per provider.
 */

const CVLKRA_URLS = {
  uatBaseUrl:
    process.env.CVLKRA_UAT_BASE_URL || "https://krapancheck.cvlindia.com/V3/api",
  liveBaseUrl:
    process.env.CVLKRA_LIVE_BASE_URL || "https://api.kracvl.com/int/api",
};

/** Resolve the CVL KRA base URL for a provider's chosen environment. */
export function getCvlKraBaseUrl(environment?: string): string {
  return environment === "live"
    ? CVLKRA_URLS.liveBaseUrl
    : CVLKRA_URLS.uatBaseUrl;
}

/**
 * JSON field names for the encrypted request/response envelope.
 * Live API expects `data`; some UAT builds accept `reqdtls`. Override via env if needed.
 */
export const CVLKRA_REQ_FIELD_CANDIDATES = [
  process.env.CVLKRA_REQ_FIELD,
  "data",
  "reqdtls",
  "reqDtls",
].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);

export const CVLKRA_RES_FIELDS = ["resdtls", "data", "resDtls"];
