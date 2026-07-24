"use strict";

/**
 * Alice Blue API Configuration
 * 
 * This file contains configuration for Alice Blue trading API integration.
 * It includes base URLs, SSO link, and API credentials.
 */

const ALICE_BLUE_CONFIG: {
  [key: string]: string | boolean | number;
  baseUrl: string;
  ssoLink: string;
  appKey: string;
  appSecret: string;
  timeout: number;
  debug: boolean;
} = {
  baseUrl: process.env.ALICE_BLUE_BASE_URL || "https://a3.aliceblueonline.com",
  ssoLink: process.env.ALICE_BLUE_SSO_LINK || "https://ant.aliceblueonline.com/?appcode=",
  appKey: process.env.ALICE_BLUE_APP_KEY || "",
  appSecret: process.env.ALICE_BLUE_APP_SECRET || "",
  timeout: 7000,
  debug: false,
};

/**
 * Get Alice Blue configuration
 * @returns Configuration object with base URL, SSO link, and credentials
 */
export function getAliceBlueConfig() {
  return {
    baseUrl: ALICE_BLUE_CONFIG.baseUrl,
    ssoLink: ALICE_BLUE_CONFIG.ssoLink,
    appKey: ALICE_BLUE_CONFIG.appKey,
    appSecret: ALICE_BLUE_CONFIG.appSecret,
    timeout: ALICE_BLUE_CONFIG.timeout,
    debug: ALICE_BLUE_CONFIG.debug,
  };
}

/**
 * Get SSO login URL with app code
 * @param appCode - Application code to append to SSO link
 * @returns Complete SSO URL
 */
export function getAliceBlueSSOUrl(appCode?: string): string {
  const code = appCode || ALICE_BLUE_CONFIG.appKey;
  return `${ALICE_BLUE_CONFIG.ssoLink}${code}`;
}

/**
 * Get base URL for API requests
 * @returns Base URL string
 */
export function getAliceBlueBaseUrl(): string {
  return ALICE_BLUE_CONFIG.baseUrl;
}

/**
 * Get API credentials
 * @returns Object containing app key and app secret
 */
export function getAliceBlueCredentials() {
  return {
    appKey: ALICE_BLUE_CONFIG.appKey,
    appSecret: ALICE_BLUE_CONFIG.appSecret,
  };
}

export default ALICE_BLUE_CONFIG;
