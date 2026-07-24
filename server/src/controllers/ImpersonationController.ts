import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { ImpersonationLogModel } from "../models/ImpersonationLog";

// Short TTL on purpose: impersonation tokens are stateless (no Session row),
// so we can't revoke them server-side once issued. Keeping the window small
// caps the blast radius if a token leaks. Bump only if there's a concrete
// need — never set this above 4h without thinking through revocation.
const IMPERSONATION_TTL_SECONDS = 60 * 60; // 1 hour

// POST /api/admin/impersonate
// The outer `verifyUserRATokenMiddleware` on `/api/admin` already verified
// the JWT signature, expiry, and SessionModel state. We re-decode here only
// to (a) confirm the caller's role is admin and (b) extract their id for
// the audit log. No further token verification needed.
// Body: { targetId: string, targetType?: "provider" | "user" }
// Returns: { token, user, expiresAt }
export const impersonateUser = async (req: Request, res: Response) => {
  try {
    const callerToken = req.headers.authorization?.split(" ")[1];
    if (!callerToken) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }
    const decodedCaller = jwt.decode(callerToken) as {
      id?: string;
      role?: string;
    } | null;
    const adminId = decodedCaller?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: "Invalid caller token" });
    }
    // Defence in depth — the outer middleware admits any authenticated role,
    // so we enforce admin here. Accepts the various admin role variants this
    // codebase uses.
    const role = decodedCaller?.role;
    if (role !== "admin" && role !== "sub_admin" && role !== "super_admin") {
      return res
        .status(403)
        .json({ success: false, message: "Only admins can impersonate" });
    }

    const { targetId, targetType } = req.body as {
      targetId?: string;
      targetType?: "provider" | "user";
    };

    if (!targetId) {
      return res
        .status(400)
        .json({ success: false, message: "targetId is required" });
    }

    const type: "provider" | "user" = targetType ?? "provider";
    const target =
      type === "provider"
        ? await ServiceProviderRegModel.findById(targetId).select("-password")
        : await UserModel.findById(targetId).select("-password");

    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "Target user not found" });
    }

    const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_SECONDS * 1000);

    // `impersonatedBy` is the marker that `verifyUserRATokenMiddleware` keys
    // on to skip the SessionModel lookup. The SP's real session record is
    // left untouched so they aren't booted from their own dashboard.
    const token = jwt.sign(
      {
        id: target._id,
        role: type === "provider" ? "provider" : "user",
        type: (target as any).type ?? type,
        impersonatedBy: adminId,
      },
      process.env.JWTSECRET as string,
      { expiresIn: IMPERSONATION_TTL_SECONDS },
    );

    await ImpersonationLogModel.create({
      adminId,
      targetId,
      targetType: type,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? "",
    });

    return res.status(200).json({
      success: true,
      token,
      user: target,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("impersonateUser failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to issue impersonation token" });
  }
};
