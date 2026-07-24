import { Request, Response } from "express";
import axios from "axios";
import crypto from "crypto";
import { getAliceBlueConfig, getAliceBlueSSOUrl } from "../../config/aliceBlue";
import {
  getContractBySymbol,
  type ContractMasterExchange,
} from "../../helpers/contractMaster";

/**
 * @route GET /api/aliceblue/sso-url
 * @desc Get SSO login URL for Alice Blue authentication
 * @access Public
 */
export const getSSOUrl = async (req: Request, res: Response) => {
  try {
    const config = getAliceBlueConfig();
    const appCode = req.query.appCode as string | undefined;
    
    const ssoUrl = getAliceBlueSSOUrl(appCode);

    return res.status(200).json({
      success: true,
      message: "SSO URL generated successfully",
      data: {
        ssoUrl,
        appCode: appCode || config.appKey,
      },
    });
  } catch (error: any) {
    console.error("Error generating SSO URL:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate SSO URL",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/aliceblue/get-session
 * @desc Get user session after SSO login
 * @access Public
 * 
 * After user logs in via SSO, they will be redirected with authCode and userId.
 * This endpoint creates checksum and gets the user session.
 * 
 * Request body:
 * {
 *   "userId": "string",
 *   "authCode": "string"
 * }
 */
export const getSession = async (req: Request, res: Response) => {
  try {
    const { userId, authCode } = req.body;

    // Validate required fields
    if (!userId || !authCode) {
      return res.status(400).json({
        success: false,
        message: "userId and authCode are required",
      });
    }

    const config = getAliceBlueConfig();

    // Validate app secret is configured
    if (!config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Alice Blue API secret is not configured",
      });
    }

    // Create checksum: SHA-256 hash of userId + authCode + apiSecret
    const checksumString = userId + authCode + config.appSecret;
    const checkSum = crypto
      .createHash("sha256")
      .update(checksumString)
      .digest("hex");

    // Call Alice Blue API to get user session
    const response = await axios.post(
      "https://ant.aliceblueonline.com/open-api/od/v1/vendor/getUserDetails",
      {
        checkSum: checkSum,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: config.timeout as number,
      }
    );

    // Check response status
    if (response.data.stat === "Ok") {
      return res.status(200).json({
        success: true,
        message: "Session created successfully",
        data: {
          userId: response.data.clientId,
          userSession: response.data.userSession,
          clientId: response.data.clientId,
        },
      });
    } else {
      // Handle error response
      return res.status(400).json({
        success: false,
        message: response.data.emsg || "Failed to create session",
        error: response.data.emsg,
      });
    }
  } catch (error: any) {
    console.error("Error getting Alice Blue session:", error);

    // Handle axios errors
    if (error.response) {
      const errorData = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: errorData.emsg || "Failed to create session",
        error: errorData.emsg || error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const VALID_EXCHANGES: ContractMasterExchange[] = ["NSE", "BSE", "MCX"];

/**
 * @route GET /api/aliceblue/contract
 * @desc Get contract details (including token for instrumentId) by exchange and symbol
 * @access Public
 * Query: exchange=NSE|BSE|MCX, symbol=RELIANCE
 */
export const getContract = async (req: Request, res: Response) => {
  try {
    const exchange = (req.query.exchange as string)?.toUpperCase();
    const symbol = req.query.symbol as string;

    if (!exchange || !symbol) {
      return res.status(400).json({
        success: false,
        message: "Query params 'exchange' and 'symbol' are required",
      });
    }

    if (!VALID_EXCHANGES.includes(exchange as ContractMasterExchange)) {
      return res.status(400).json({
        success: false,
        message: "exchange must be one of: NSE, BSE, MCX",
      });
    }

    const contract = await getContractBySymbol(
      exchange as ContractMasterExchange,
      symbol.trim()
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: `No contract found for symbol '${symbol}' on ${exchange}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...contract,
        instrumentId: contract.token,
      },
    });
  } catch (error: any) {
    console.error("Error fetching contract:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contract",
      error: error.message,
    });
  }
};
