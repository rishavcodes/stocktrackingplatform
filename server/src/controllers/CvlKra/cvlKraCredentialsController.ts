import { Request, Response } from "express";
import { CvlKraCredentialModel } from "../../models/IntegrationModels";
import {
  encryptField,
  decryptField,
  isFieldCryptoReady,
} from "../../helpers/CvlKraFieldCrypto";
import { getCvlKraBaseUrl } from "../../config/cvlKra";
import {
  getCvlKraToken,
  clearCvlKraTokenCache,
  CvlKraCreds,
} from "../../services/CvlKraService";

/** Resolve the logged-in service provider's id from the verified token. */
function providerId(req: Request): string | null {
  const id = (req.user as any)?._id;
  return id ? String(id) : null;
}

/** Build the per-call creds object from a stored (encrypted) credential doc. */
function toCreds(cred: any): CvlKraCreds {
  return {
    apiKey: decryptField(cred.apiKey),
    username: cred.username,
    posCode: cred.posCode,
    password: decryptField(cred.password),
    aesKey: decryptField(cred.aesKey),
    fetchType: cred.fetchType || "E",
    baseUrl: getCvlKraBaseUrl(cred.environment),
    cacheKey: String(cred._id),
  };
}

/**
 * @route GET /api/cvlkra/credentials
 * @desc  Return the provider's CVL KRA credential metadata (NO secret values).
 * @access Private (verifyUserRATokenMiddleware)
 */
export const getCvlKraCredentials = async (req: Request, res: Response) => {
  try {
    const spId = providerId(req);
    if (!spId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const cred = await CvlKraCredentialModel.findOne({ userId: spId });
    if (!cred) {
      return res.status(200).json({ success: true, data: { configured: false } });
    }
    return res.status(200).json({
      success: true,
      data: {
        configured: true,
        username: cred.username,
        posCode: cred.posCode,
        environment: cred.environment,
        fetchType: cred.fetchType,
        name: cred.name || "",
        hasApiKey: Boolean(cred.apiKey),
        hasPassword: Boolean(cred.password),
        hasAesKey: Boolean(cred.aesKey),
        updatedAt: cred.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("getCvlKraCredentials error:", error?.message || error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch CVL KRA credentials" });
  }
};

/**
 * @route POST /api/cvlkra/credentials/save
 * @desc  Upsert the provider's CVL KRA credentials. Secrets are write-only:
 *        only overwritten when a non-blank value is supplied.
 * @access Private (verifyUserRATokenMiddleware)
 */
export const saveCvlKraCredentials = async (req: Request, res: Response) => {
  try {
    if (!isFieldCryptoReady()) {
      return res.status(500).json({
        success: false,
        message: "Server encryption key (CVLKRA_DB_ENC_KEY) is not configured",
      });
    }
    const spId = providerId(req);
    if (!spId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      apiKey,
      password,
      aesKey,
      username,
      posCode,
      environment,
      fetchType,
      name,
      email,
    } = req.body ?? {};

    if (!username || !posCode) {
      return res
        .status(400)
        .json({ success: false, message: "Username and POS code are required" });
    }

    const existing = await CvlKraCredentialModel.findOne({ userId: spId });

    const set: Record<string, any> = {
      userId: spId,
      username: String(username).trim(),
      posCode: String(posCode).trim(),
      environment: environment === "live" ? "live" : "uat",
      fetchType: ["E", "I", "X"].includes(fetchType) ? fetchType : "E",
    };
    if (name !== undefined) set.name = name;
    if (email !== undefined) set.email = email;

    // Secrets: encrypt + set only when provided; require all on first create.
    const secretInputs: Array<[string, unknown]> = [
      ["apiKey", apiKey],
      ["password", password],
      ["aesKey", aesKey],
    ];
    for (const [field, value] of secretInputs) {
      const v = typeof value === "string" ? value.trim() : "";
      if (v) {
        set[field] = encryptField(v);
      } else if (!existing) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    await CvlKraCredentialModel.findOneAndUpdate(
      { userId: spId },
      { $set: set },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Credentials changed -> drop any cached token for this provider.
    if (existing) clearCvlKraTokenCache(String(existing._id));

    return res.status(200).json({
      success: true,
      message: "CVL KRA credentials saved",
    });
  } catch (error: any) {
    console.error("saveCvlKraCredentials error:", error?.message || error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to save CVL KRA credentials" });
  }
};

/**
 * @route POST /api/cvlkra/credentials/test
 * @desc  Validate the provider's saved credentials by calling CVL GetToken.
 * @access Private (verifyUserRATokenMiddleware)
 */
export const testCvlKraConnection = async (req: Request, res: Response) => {
  try {
    const spId = providerId(req);
    if (!spId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const cred = await CvlKraCredentialModel.findOne({ userId: spId });
    if (!cred) {
      return res.status(400).json({
        success: false,
        message: "No CVL KRA credentials saved yet",
      });
    }

    const creds = toCreds(cred);
    // Force a fresh token so the test actually hits CVL.
    clearCvlKraTokenCache(creds.cacheKey);
    await getCvlKraToken(creds, true);

    return res.status(200).json({
      success: true,
      message: "Connection successful — credentials are valid",
    });
  } catch (error: any) {
    const msg = error?.message || "Connection failed";
    return res.status(200).json({ success: false, message: msg });
  }
};
