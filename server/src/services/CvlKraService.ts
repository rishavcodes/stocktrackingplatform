import axios, { type AxiosResponse } from "axios";
import { encryptCvl, decryptCvl } from "../helpers/CvlKraCrypto";
import {
  CVLKRA_REQ_FIELD_CANDIDATES,
  CVLKRA_RES_FIELDS,
} from "../config/cvlKra";
import {
  parseSolicit,
  mapSolicitKyc,
  CvlKraResult,
} from "../helpers/CvlKraResponseParser";

/**
 * CVL KRA HTTP orchestration.
 *
 * Flow: GetToken (cached ~1 day, per provider) -> SolicitPANDetailsFetchALLKRA.
 * Both request bodies are AES-encrypted with the calling provider's own AES key
 * and both responses come back as an encrypted `resdtls` envelope.
 *
 * Credentials are passed in per call (each service provider has their own CVL
 * credentials, stored in the DB).
 */

export interface CvlKraCreds {
  apiKey: string;
  username: string;
  posCode: string;
  password: string;
  aesKey: string; // base64URL provider AES key
  fetchType: string; // E | I | X
  baseUrl: string; // resolved from the provider's environment
  cacheKey: string; // stable per-provider key for the token cache (credential _id)
}

const USER_AGENT = "CustomUsrAgnt";
const LOG_PREFIX = "[CVL KRA]";

// Remember which request wrapper field worked per provider (data vs reqdtls).
const reqFieldCache = new Map<string, string>();

function log(step: string, data: Record<string, unknown>): void {
  console.log(LOG_PREFIX, step, JSON.stringify(data));
}

/** Redact secrets but keep enough shape for debugging. */
function redactPayload(obj: Record<string, unknown>): Record<string, unknown> {
  const out = { ...obj };
  if (typeof out.password === "string") out.password = "***";
  return out;
}

function formatAxiosError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : String(error);
  }
  const status = error.response?.status;
  const body = error.response?.data;
  const bodyStr =
    typeof body === "string"
      ? body.slice(0, 500)
      : body
        ? JSON.stringify(body).slice(0, 500)
        : "";
  return [
    error.message,
    status ? `HTTP ${status}` : "",
    bodyStr ? `body=${bodyStr}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

// ---- token cache (in-process, per provider) -------------------------------
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/** Parse a yyyyMMddHHmmss validity string into an epoch (ms). NaN if unparseable. */
function parseValidity(validity: string): number {
  const m = (validity || "").match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,
  );
  if (!m) return NaN;
  const [, y, mo, d, h, mi, sec] = m;
  return new Date(+y, +mo - 1, +d, +h, +mi, +sec).getTime();
}

function wrapRequest(
  encrypted: string,
  field: string,
): Record<string, string> {
  return { [field]: encrypted };
}

function looksLikeCvlCipher(value: string): boolean {
  const sep = value.indexOf(":");
  if (sep <= 0 || sep >= value.length - 1) return false;
  const iv = value.slice(0, sep);
  const ct = value.slice(sep + 1);
  return /^[A-Za-z0-9_-]+$/.test(iv) && /^[A-Za-z0-9_-]+$/.test(ct);
}

function cvlHeaders(
  creds: CvlKraCreds,
  token?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "user-agent": USER_AGENT,
    api_key: creds.apiKey,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function resolveReqFieldCandidates(cacheKey: string): string[] {
  const cached = reqFieldCache.get(cacheKey);
  if (!cached) return CVLKRA_REQ_FIELD_CANDIDATES;
  return [cached, ...CVLKRA_REQ_FIELD_CANDIDATES.filter((f) => f !== cached)];
}

function formatCvlError(errorCode: string, errorMessage: string): string {
  const code = errorCode.trim();
  const msg = errorMessage.trim();
  if (code && msg) return `${code}: ${msg}`;
  return msg || code;
}

interface CvlEnvelope {
  decrypted: string;
  errorCode: string;
  errorMessage: string;
}

/** Pull the decrypted body + error fields out of a CVL response envelope. */
function readEnvelope(data: any, aesKey: string): CvlEnvelope {
  const errorCode = String(data?.error_code ?? data?.errorCode ?? "");
  const errorMessage = String(data?.error_message ?? data?.errorMessage ?? "");

  let encrypted: string | undefined;
  if (data && typeof data === "object") {
    for (const field of CVLKRA_RES_FIELDS) {
      const value = data[field];
      if (typeof value === "string" && value && looksLikeCvlCipher(value)) {
        encrypted = value;
        break;
      }
    }
  } else if (typeof data === "string" && looksLikeCvlCipher(data)) {
    encrypted = data;
  }

  let decrypted = "";
  if (encrypted) {
    try {
      decrypted = decryptCvl(encrypted, aesKey);
    } catch (err) {
      log("decrypt_failed", {
        error: err instanceof Error ? err.message : String(err),
        encryptedPreview: encrypted.slice(0, 80) + "...",
        hint: "Check AES key (base64URL), algorithm (AES-256-CBC), and environment (UAT vs live)",
      });
    }
  }

  return { decrypted, errorCode, errorMessage };
}

async function postEncrypted(
  url: string,
  encrypted: string,
  creds: CvlKraCreds,
  reqField: string,
  token?: string,
): Promise<AxiosResponse> {
  return axios.post(url, wrapRequest(encrypted, reqField), {
    headers: cvlHeaders(creds, token),
    timeout: 20000,
  });
}

/**
 * Get a (cached) JWT for the given provider credentials. Exported so the
 * "Test connection" flow can validate credentials + IP whitelisting.
 */
export async function getCvlKraToken(
  creds: CvlKraCreds,
  forceRefresh = false,
): Promise<string> {
  const cached = tokenCache.get(creds.cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const url = `${creds.baseUrl}/GetToken`;
  const tokenPayload = {
    username: creds.username,
    poscode: creds.posCode,
    password: creds.password,
  };
  const encrypted = encryptCvl(JSON.stringify(tokenPayload), creds.aesKey);
  const reqFields = resolveReqFieldCandidates(creds.cacheKey);

  let lastEnv: CvlEnvelope = { decrypted: "", errorCode: "", errorMessage: "" };
  let lastField = reqFields[0];

  for (const reqField of reqFields) {
    lastField = reqField;
    log("GetToken_request", {
      url,
      environment: creds.baseUrl.includes("krapancheck") ? "uat" : "live",
      payload: redactPayload(tokenPayload),
      encryptedPreview: encrypted.slice(0, 80) + "...",
      wrapField: reqField,
      headers: {
        "Content-Type": "application/json",
        "user-agent": USER_AGENT,
        api_key: "***",
      },
    });

    let res;
    try {
      res = await postEncrypted(url, encrypted, creds, reqField);
    } catch (err) {
      log("GetToken_http_error", { url, wrapField: reqField, error: formatAxiosError(err) });
      throw new Error(`CVL KRA GetToken failed: ${formatAxiosError(err)}`);
    }

    log("GetToken_response", {
      status: res.status,
      wrapField: reqField,
      error_code: res.data?.error_code ?? res.data?.errorCode,
      error_message: res.data?.error_message ?? res.data?.errorMessage,
      hasResdtls: Boolean(res.data?.resdtls),
      hasData: Boolean(res.data?.data),
      rawBodyPreview:
        typeof res.data === "string"
          ? res.data.slice(0, 200)
          : JSON.stringify(res.data).slice(0, 200),
    });

    const env = readEnvelope(res.data, creds.aesKey);
    lastEnv = env;

    if (env.decrypted) {
      reqFieldCache.set(creds.cacheKey, reqField);
      log("GetToken_decrypted", {
        wrapField: reqField,
        preview: env.decrypted.slice(0, 200),
      });

      const parsed = JSON.parse(env.decrypted);
      const token: string = parsed?.token || "";
      if (parsed?.success !== "1" || !token) {
        throw new Error(
          formatCvlError(
            parsed?.error_code || "",
            parsed?.error_message || "CVL KRA authentication failed",
          ),
        );
      }

      const validityMs = parseValidity(parsed?.validity || "");
      const fallback = Date.now() + 23 * 60 * 60 * 1000;
      const expiresAt = Number.isNaN(validityMs)
        ? fallback
        : Math.min(validityMs, fallback);
      tokenCache.set(creds.cacheKey, { token, expiresAt });
      return token;
    }

    // Wrong wrapper field — try the next candidate.
    if (env.errorCode === "WEBERR-022") continue;

    log("GetToken_no_decrypted_body", {
      wrapField: reqField,
      errorCode: env.errorCode,
      errorMessage: env.errorMessage,
    });
    throw new Error(
      formatCvlError(env.errorCode, env.errorMessage) ||
        "CVL KRA GetToken failed (check AES key, api_key header, and IP whitelist)",
    );
  }

  log("GetToken_no_decrypted_body", {
    wrapField: lastField,
    triedFields: reqFields,
    errorCode: lastEnv.errorCode,
    errorMessage: lastEnv.errorMessage,
  });
  throw new Error(
    formatCvlError(lastEnv.errorCode, lastEnv.errorMessage) ||
      "CVL KRA GetToken returned no token (check AES key, api_key header, and IP whitelist)",
  );
}

/**
 * Fetch the full KYC record for a PAN using the given provider credentials.
 * `dob` must already be dd/mm/yyyy. Retries once with a fresh token on an
 * expired/invalid-token error.
 */
export async function solicitFullKyc(
  pan: string,
  dob: string,
  creds: CvlKraCreds,
): Promise<CvlKraResult> {
  const url = `${creds.baseUrl}/SolicitPANDetailsFetchALLKRA`;

  const requestPayload = {
    APP_REQ_ROOT: {
      APP_PAN_INQ: {
        APP_PAN_NO: pan,
        APP_DOB_INCORP: dob,
        APP_POS_CODE: creds.posCode,
        FETCH_TYPE: creds.fetchType,
      },
    },
  };

  const call = async (token: string) => {
    const encrypted = encryptCvl(JSON.stringify(requestPayload), creds.aesKey);
    const reqField =
      reqFieldCache.get(creds.cacheKey) || CVLKRA_REQ_FIELD_CANDIDATES[0];

    log("Solicit_request", {
      url,
      pan,
      dob,
      fetchType: creds.fetchType,
      posCode: creds.posCode,
      wrapField: reqField,
      payload: requestPayload,
      encryptedPreview: encrypted.slice(0, 80) + "...",
    });

    try {
      const response = await postEncrypted(
        url,
        encrypted,
        creds,
        reqField,
        token,
      );

      log("Solicit_response", {
        status: response.status,
        wrapField: reqField,
        tokenPreview: token.slice(0, 12) + "...",
        error_code: response.data?.error_code ?? response.data?.errorCode,
        error_message:
          response.data?.error_message ?? response.data?.errorMessage,
        hasResdtls: Boolean(response.data?.resdtls),
        hasData: Boolean(response.data?.data),
        rawBodyPreview: JSON.stringify(response.data).slice(0, 200),
      });

      return response;
    } catch (err) {
      log("Solicit_http_error", { url, pan, error: formatAxiosError(err) });
      throw new Error(`CVL KRA Solicit failed: ${formatAxiosError(err)}`);
    }
  };

  let token = await getCvlKraToken(creds);
  let res = await call(token);
  let env = readEnvelope(res.data, creds.aesKey);

  // Token expired/invalid -> refresh once and retry.
  if (!env.decrypted && /WEBERR-019|WEBERR-020/i.test(env.errorCode)) {
    token = await getCvlKraToken(creds, true);
    res = await call(token);
    env = readEnvelope(res.data, creds.aesKey);
  }

  if (!env.decrypted) {
    log("Solicit_no_decrypted_body", {
      pan,
      errorCode: env.errorCode,
      errorMessage: env.errorMessage,
    });
    throw new Error(
      formatCvlError(env.errorCode, env.errorMessage) ||
        "CVL KRA returned no KYC data for this PAN",
    );
  }

  log("Solicit_decrypted", { pan, preview: env.decrypted.slice(0, 300) });

  const parsed = await parseSolicit(env.decrypted);
  return mapSolicitKyc(parsed, {
    error_code: env.errorCode,
    error_message: env.errorMessage,
  });
}

/** Drop a provider's cached token (e.g. after credentials change). */
export function clearCvlKraTokenCache(cacheKey?: string): void {
  if (cacheKey) {
    tokenCache.delete(cacheKey);
    reqFieldCache.delete(cacheKey);
  } else {
    tokenCache.clear();
    reqFieldCache.clear();
  }
}
