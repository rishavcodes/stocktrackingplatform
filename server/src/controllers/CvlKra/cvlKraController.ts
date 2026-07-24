import { Request, Response } from "express";
import { getCvlKraBaseUrl } from "../../config/cvlKra";
import { solicitFullKyc, CvlKraCreds } from "../../services/CvlKraService";
import { normalizeDobToDDMMYYYY } from "../../helpers/CvlKraResponseParser";
import { decryptField } from "../../helpers/CvlKraFieldCrypto";
import { UserModel } from "../../models/AuthModels";
import { CvlKraCredentialModel } from "../../models/IntegrationModels";
import { CvlKraResultModel } from "../../models/CvlKraResultModel";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * @route POST /api/cvlkra/check
 * @desc  Fetch a subscriber's full KYC record from CVL KRA and cache it. Uses
 *        the logged-in service provider's own CVL KRA credentials.
 * @access Private (verifyUserRATokenMiddleware)
 *
 * Body: { subscriberId: string }
 * PAN + DOB are re-resolved server-side from the User record (the client value
 * is never trusted).
 */
export const checkCvlKra = async (req: Request, res: Response) => {
  try {
    const spId = (req.user as any)?._id;
    if (!spId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Resolve the logged-in provider's own CVL KRA credentials.
    const cred = await CvlKraCredentialModel.findOne({ userId: spId });
    if (!cred) {
      return res.status(400).json({
        success: false,
        message:
          "Configure your CVL KRA credentials in My Profile → KRA Integration",
      });
    }

    const { subscriberId } = req.body ?? {};
    if (!subscriberId) {
      return res
        .status(400)
        .json({ success: false, message: "subscriberId is required" });
    }

    const user = await UserModel.findById(subscriberId).select(
      "pannumber dob",
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Subscriber not found" });
    }

    const pan = String((user as any).pannumber || "")
      .trim()
      .toUpperCase();
    if (!PAN_REGEX.test(pan)) {
      return res.status(400).json({
        success: false,
        message: "Subscriber has no valid PAN on file",
      });
    }

    const dob = normalizeDobToDDMMYYYY((user as any).dob);
    if (!dob) {
      return res.status(400).json({
        success: false,
        message: "Subscriber has no valid date of birth on file",
      });
    }

    const creds: CvlKraCreds = {
      apiKey: decryptField(cred.apiKey),
      username: cred.username,
      posCode: cred.posCode,
      password: decryptField(cred.password),
      aesKey: decryptField(cred.aesKey),
      fetchType: cred.fetchType || "E",
      baseUrl: getCvlKraBaseUrl(cred.environment),
      cacheKey: String(cred._id),
    };

    const result = await solicitFullKyc(pan, dob, creds);

    await CvlKraResultModel.findOneAndUpdate(
      { panNumber: pan },
      {
        userId: subscriberId,
        providerId: spId,
        panNumber: pan,
        appName: result.appName,
        appStatus: result.appStatus,
        statusLabel: result.statusLabel,
        kraName: result.kraName,
        appStatusDt: result.appStatusDt,
        fatcaApplicable: result.fatcaApplicable,
        raw: result.raw,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        checkedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error("CVL KRA check error:", error?.message || error);
    const status = error?.response?.status || 502;
    return res.status(status).json({
      success: false,
      message: error?.message || "CVL KRA check failed",
    });
  }
};
