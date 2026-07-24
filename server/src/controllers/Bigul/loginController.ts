import { Request, Response } from "express";
import axios from "axios";
import {
  getBigulConfig,
  getBigulPapiBaseUrl,
  getBigulSSOUrl,
} from "../../config/bigul";
import { setPartnerSession, clearPartnerSession, getPartnerSession } from "../../services/BigulPartnerSession";

/**
 * @route POST /api/bigul/partner/session-login
 * @desc Partner session login – creates a vendor session. Returns sessionId for SSO and optional access token.
 * @access Public
 *
 * Body: { source, code, password }
 * Example: { "source": "B2B", "code": "TRA10001", "password": "Infinity@1810" }
 */
export const partnerSessionLogin = async (req: Request, res: Response) => {
  try {
    // const { source, code, password } = req.body;

    // if (!source || !code || !password) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "source, code and password are required",
    //   });
    // }

    const config = getBigulConfig();
    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/partner/auth/session-login`;

    const response = await axios.post(
      endpoint,
      { source: config.partnerSource, code: config.partnerCode, password: config.partnerPassword },
      {
        headers: {
          "Content-Type": "application/json",
          "x-vendor-key": config.appKey,
          "x-vendor-auth": config.appSecret,
        },
        timeout: config.timeout as number,
      }
    );

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success && data.data) {
      const sessionId = data.data.sessionId ?? data.data.session_id ?? data.data.session;
      const accessToken = data.data["x-access-token"] ?? data.data.accessToken;
      // x-vendor-auth in order APIs is the sessionId from partner login
      const state = req.body.state || "tradebox";
      const ssoUrl = sessionId ? getBigulSSOUrl(sessionId, state) : undefined;

      if (sessionId) {
        await setPartnerSession({
          sessionId,
          accessToken: accessToken || sessionId,
          vendorAuth: sessionId,
        });
      }

      return res.status(200).json({
        success: true,
        message: data.message || "Partner session created successfully",
        data: {
          ...data.data,
          sessionId,
          accessToken,
          vendorAuth: sessionId,
          ssoUrl,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Partner login failed",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul partner session login error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Partner login failed",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @route GET /api/bigul/sso-url
 * @desc Get SSO login URL given sessionId (and optional state).
 * @access Public
 * Query: sessionId=...&state=... (state optional)
 */
export const getSSOUrl = async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    const state = req.query.state as string | undefined;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Query parameter sessionId is required",
      });
    }

    const ssoUrl = getBigulSSOUrl(sessionId, state);

    return res.status(200).json({
      success: true,
      message: "SSO URL generated successfully",
      data: { ssoUrl, sessionId, state: state || "tradebox" },
    });
  } catch (error: any) {
    console.error("Error generating Bigul SSO URL:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate SSO URL",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/bigul/partner/session-logout
 * @desc Terminate partner vendor session.
 * @access Public
 *
 * Body: { source, code }
 * Headers: x-access-token (session token from partner session login)
 */
export const sessionLogout = async (req: Request, res: Response) => {
  try {
    const { source, code } = req.body;
    const accessToken =
      (req.headers["x-access-token"] as string) ||
      (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ""));

    if (!source || !code) {
      return res.status(400).json({
        success: false,
        message: "source and code are required in body",
      });
    }

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "x-access-token header or Authorization Bearer is required",
      });
    }

    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/partner/auth/session-logout`;

    const response = await axios.post(
      endpoint,
      { source, code },
      {
        headers: {
          "Content-Type": "application/json",
          "x-access-token": accessToken,
        },
        timeout: getBigulConfig().timeout as number,
      }
    );

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success) {
      await clearPartnerSession();
      return res.status(200).json({
        success: true,
        message: data.message || "Session logged out successfully",
        data: data.data ?? {},
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Logout failed",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul session logout error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Logout failed",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @route GET /api/bigul/partner/sso-redirect
 * @desc Build SSO URL from the stored partner sessionId in Redis. No sessionId param needed.
 * @access Public
 * Query: state=... (optional – marketplace path to return to after Bigul login)
 */
export const getSSORedirectUrl = async (req: Request, res: Response) => {
  try {
    const state = req.query.state as string | undefined;
    const session = await getPartnerSession();

    if (!session?.sessionId) {
      return res.status(503).json({
        success: false,
        message: "No active partner session. Partner must log in first.",
      });
    }

    const ssoUrl = getBigulSSOUrl(session.sessionId, state);

    return res.status(200).json({
      success: true,
      message: "SSO redirect URL generated successfully",
      data: { ssoUrl, sessionId: session.sessionId, state: state || "tradebox" },
    });
  } catch (error: any) {
    console.error("Error generating Bigul SSO redirect URL:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate SSO redirect URL",
      error: error.message,
    });
  }
};
