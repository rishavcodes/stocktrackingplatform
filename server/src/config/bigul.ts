"use strict";

/**
 * Bigul API Configuration
 *
 * Partner API (papi.bigul.co): session-login, session-logout, order APIs.
 * SSO: connect.bigul.co/login?app_key=...&sessionid={sessionId}&state={state}
 */

const BIGUL_CONFIG: {
  [key: string]: string | boolean | number;
  papiBaseUrl: string;
  ssoBaseUrl: string;
  appKey: string;
  appSecret: string;
  marketDataApiKey: string;
  marketDataApiSecret: string;
  wsUrl: string;
  orderWsUrl: string;
  partnerSource: string;
  partnerCode: string;
  partnerPassword: string;
  masterCsvUrl: string;
  timeout: number;
  debug: boolean;
} = {
  papiBaseUrl: process.env.BIGUL_PAPI_BASE_URL || "https://papi.bigul.co",
  ssoBaseUrl:
    process.env.BIGUL_SSO_BASE_URL || "https://connect.bigul.co/login",
  appKey: process.env.BIGUL_APP_KEY || process.env.BIGUL_API_KEY || "",
  appSecret: process.env.BIGUL_SECRET_KEY || process.env.BIGUL_APP_SECRET || "",
  marketDataApiKey: process.env.BIGUL_MARKET_DATA_API_KEY || "",
  marketDataApiSecret: process.env.BIGUL_MARKET_DATA_API_SECRET || "",
  wsUrl: process.env.BIGUL_WS_URL || "wss://cbc.bigul.co/broadcast/socket",
  orderWsUrl: process.env.BIGUL_ORDER_WS_URL || "wss://cbc.bigul.co/socket",
  partnerSource: process.env.BIGUL_PARTNER_SOURCE || "",
  partnerCode: process.env.BIGUL_PARTNER_CODE || "",
  partnerPassword: process.env.BIGUL_PARTNER_PASSWORD || "",
  masterCsvUrl:
    process.env.BIGUL_MASTER_CSV_URL ||
    "https://bigul.s3.ap-south-1.amazonaws.com/BigulMasters/Bigulmastercsv.zip",
  timeout: 7000,
  debug: false,
};

export function getBigulConfig() {
  return {
    papiBaseUrl: BIGUL_CONFIG.papiBaseUrl,
    ssoBaseUrl: BIGUL_CONFIG.ssoBaseUrl,
    appKey: BIGUL_CONFIG.appKey,
    appSecret: BIGUL_CONFIG.appSecret,
    marketDataApiKey: BIGUL_CONFIG.marketDataApiKey,
    marketDataApiSecret: BIGUL_CONFIG.marketDataApiSecret,
    wsUrl: BIGUL_CONFIG.wsUrl,
    orderWsUrl: BIGUL_CONFIG.orderWsUrl,
    partnerSource: BIGUL_CONFIG.partnerSource,
    partnerCode: BIGUL_CONFIG.partnerCode,
    partnerPassword: BIGUL_CONFIG.partnerPassword,
    timeout: BIGUL_CONFIG.timeout,
    debug: BIGUL_CONFIG.debug,
  };
}

export function getBigulWsUrl(): string {
  return BIGUL_CONFIG.wsUrl as string;
}

export function getBigulOrderWsUrl(): string {
  return BIGUL_CONFIG.orderWsUrl as string;
}

export function getBigulMarketDataCredentials() {
  return {
    apiKey: BIGUL_CONFIG.marketDataApiKey || BIGUL_CONFIG.appKey,
    apiSecret: BIGUL_CONFIG.marketDataApiSecret || BIGUL_CONFIG.appSecret,
  };
}

/** True if partner credentials are set for cron refresh */
export function hasBigulPartnerCredentials(): boolean {
  return !!(BIGUL_CONFIG.partnerCode && BIGUL_CONFIG.partnerPassword);
}

/**
 * Build SSO URL for client login after partner session is created.
 * @param sessionId - Session ID from partner auth/session-login
 * @param state - Optional state value (e.g. for CSRF or redirect)
 */
export function getBigulSSOUrl(sessionId: string, state?: string): string {
  const config = getBigulConfig();
  const stateVal = state || "tradebox";
  return `${config.ssoBaseUrl}?app_key=${config.appKey}&sessionid=${encodeURIComponent(sessionId)}&state=${encodeURIComponent(stateVal)}`;
}

export function getBigulPapiBaseUrl(): string {
  return BIGUL_CONFIG.papiBaseUrl as string;
}

export function getBigulCredentials() {
  return {
    appKey: BIGUL_CONFIG.appKey,
    appSecret: BIGUL_CONFIG.appSecret,
  };
}

export function getBigulMasterCsvUrl(): string {
  return BIGUL_CONFIG.masterCsvUrl as string;
}

export default BIGUL_CONFIG;
