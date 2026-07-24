import axios from "axios";
import cron from "node-cron";
import {
  getBigulConfig,
  getBigulPapiBaseUrl,
  hasBigulPartnerCredentials,
} from "../config/bigul";
import {
  getPartnerSession,
  setPartnerSession,
  clearPartnerSession,
} from "../services/BigulPartnerSession";

async function refreshBigulPartnerSession(): Promise<void> {
  const config = getBigulConfig();
  if (!hasBigulPartnerCredentials()) {
    return;
  }
  if (!config.appKey || !config.appSecret) {
    console.warn("[Bigul] Partner refresh skipped: API credentials not set");
    return;
  }

  const baseUrl = getBigulPapiBaseUrl();
  const { partnerSource, partnerCode, partnerPassword } = config;

  try {
    const current = await getPartnerSession();
    if (current?.accessToken) {
      try {
        await axios.post(
          `${baseUrl}/api/v1/partner/auth/session-logout`,
          { source: partnerSource, code: partnerCode },
          {
            headers: {
              "Content-Type": "application/json",
              "x-access-token": current.accessToken,
            },
            timeout: config.timeout as number,
          }
        );
      } catch (logoutErr: any) {
        if (logoutErr.response?.status !== 401) {
          console.warn("[Bigul] Partner logout before refresh failed:", logoutErr.message);
        }
      }
      await clearPartnerSession();
    }

    const loginRes = await axios.post(
      `${baseUrl}/api/v1/partner/auth/session-login`,
      {
        source: partnerSource,
        code: partnerCode,
        password: partnerPassword,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-vendor-key": config.appKey,
          "x-vendor-auth": config.appSecret,
        },
        timeout: config.timeout as number,
      }
    );

    const data = loginRes.data;
    const success = data.status === true || data.status === "true";

    if (success && data.data) {
      const sessionId =
        data.data.sessionId ?? data.data.session_id ?? data.data.session;
      const accessToken =
        data.data["x-access-token"] ?? data.data.accessToken;
      // x-vendor-auth in order APIs is the sessionId from partner login

      if (sessionId) {
        await setPartnerSession({
          sessionId,
          accessToken: accessToken || sessionId,
          vendorAuth: sessionId,
        });
        console.log("[Bigul] Partner session refreshed successfully");
      }
    } else {
      console.warn("[Bigul] Partner refresh login failed:", data.message ?? data);
    }
  } catch (error: any) {
    console.error("[Bigul] Partner session refresh error:", error.message);
  }
}

export function startBigulPartnerSessionRefresh(): void {
  refreshBigulPartnerSession().catch((err) => {
    console.error("[Bigul] Initial partner session bootstrap failed:", err.message);
  });

  cron.schedule("0 */6 * * *", () => {
    refreshBigulPartnerSession();
  });
  console.log("[Bigul] Partner session refresh cron registered (every 6 hours)");
}
