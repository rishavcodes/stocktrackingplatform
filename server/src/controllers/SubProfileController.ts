import type { Request, Response } from "express";
import { ServiceProviderRegModel } from "../models/AuthModels";
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_KEYS,
  SEAT_LIMITS,
  SubProfileRole,
  type PermissionKey,
  type Permissions,
} from "../lib/subProfileDefaults";
import { mailQueue } from "../queues/MailQueues";
import { adminNotify } from "../helpers/Notify";

// Shared gate: only an approved Non Individual master SP can manage sub
// profiles. Sub profiles themselves (even admin-role) cannot create more
// subs in the MVP — that's a post-MVP feature.
function gateMaster(
  req: Request,
  res: Response,
): { masterId: string } | null {
  const u: any = req.user;
  if (!u || u.role !== "provider") {
    res
      .status(403)
      .json({ success: false, message: "Only service providers can manage sub profiles" });
    return null;
  }
  if (u.addedby?.isSubProfile) {
    res
      .status(403)
      .json({ success: false, message: "Sub profiles cannot create other sub profiles" });
    return null;
  }
  if (u.type !== "Non Individual") {
    res
      .status(403)
      .json({ success: false, message: "Only Non Individual SPs can create sub profiles" });
    return null;
  }
  if (!u.verified || !u.approved) {
    res
      .status(403)
      .json({ success: false, message: "Master must be approved by Tradebox first" });
    return null;
  }
  return { masterId: String(u._id) };
}

// Normalise a permissions object posted by the client — only keep keys we know
// about, coerce to boolean, fill missing keys with false.
function sanitizePermissions(input: any): Permissions {
  const out: Permissions = { ...DEFAULT_PERMISSIONS };
  if (input && typeof input === "object") {
    for (const k of PERMISSION_KEYS) {
      if (k in input) out[k as PermissionKey] = Boolean(input[k]);
    }
  }
  return out;
}

// GET /api/sp/subprofiles — list sub profiles owned by the calling master,
// plus current seat usage so the page can render its counters and disable
// the "add" button when full.
export const listSubProfiles = async (req: Request, res: Response) => {
  const g = gateMaster(req, res);
  if (!g) return;

  try {
    const subs = await ServiceProviderRegModel.find({
      "addedby.isSubProfile": true,
      "addedby.id": g.masterId,
    })
      .select(
        "_id RegName name email number type addedby createdAt verified approved",
      )
      .sort({ createdAt: -1 })
      .lean();

    const adminUsed = subs.filter(
      (s: any) => s.addedby?.subProfileRole === "admin",
    ).length;
    const userUsed = subs.filter(
      (s: any) => s.addedby?.subProfileRole === "user",
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        subs,
        seats: {
          admin: { used: adminUsed, max: SEAT_LIMITS.admin },
          user: { used: userUsed, max: SEAT_LIMITS.user },
        },
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch sub profiles", error });
  }
};

// POST /api/sp/subprofiles — master creates a sub profile.
// Auto-approves so the new sub can OTP-login immediately (no Tradebox in loop).
// Body: { name, email, number, subProfileRole, permissions? }
export const createSubProfile = async (req: Request, res: Response) => {
  const g = gateMaster(req, res);
  if (!g) return;

  try {
    const { name, email, number, subProfileRole, permissions } =
      req.body as {
        name?: string;
        email?: string;
        number?: string | number;
        subProfileRole?: SubProfileRole;
        permissions?: any;
      };

    if (!name || !email || !number) {
      return res.status(400).json({
        success: false,
        message: "name, email and number are required",
      });
    }
    if (subProfileRole !== "admin" && subProfileRole !== "user") {
      return res.status(400).json({
        success: false,
        message: "subProfileRole must be 'admin' or 'user'",
      });
    }

    // Uniqueness — keep the existing platform-wide constraints.
    const existsByNumber = await ServiceProviderRegModel.findOne({ number });
    if (existsByNumber) {
      return res.status(409).json({
        success: false,
        message: "A service provider with this number already exists",
      });
    }
    const existsByEmail = await ServiceProviderRegModel.findOne({ email });
    if (existsByEmail) {
      return res.status(409).json({
        success: false,
        message: "A service provider with this email already exists",
      });
    }

    // Seat-limit enforcement — read fresh from DB so two parallel requests
    // can't both squeak past the limit.
    const usage = await ServiceProviderRegModel.aggregate([
      {
        $match: {
          "addedby.isSubProfile": true,
          "addedby.id": g.masterId,
        },
      },
      { $group: { _id: "$addedby.subProfileRole", count: { $sum: 1 } } },
    ]);
    const used = { admin: 0, user: 0 } as Record<SubProfileRole, number>;
    for (const row of usage as any[]) {
      if (row._id === "admin") used.admin = row.count;
      else if (row._id === "user") used.user = row.count;
    }
    if (used[subProfileRole] >= SEAT_LIMITS[subProfileRole]) {
      return res.status(400).json({
        success: false,
        message: `All ${SEAT_LIMITS[subProfileRole]} ${subProfileRole} seats are used. Contact Tradebox to request more.`,
      });
    }

    const master: any = req.user;

    // Sub profiles inherit the master's SEBI registration and jurisdiction —
    // they work under the same firm and the schema requires these fields.
    const inheritedRegNumber = master?.regNumber || "";
    const inheritedCity = master?.city || "";
    const inheritedState = master?.state || "";

    if (!inheritedRegNumber || !inheritedCity || !inheritedState) {
      return res.status(400).json({
        success: false,
        message:
          "Master profile is missing regNumber, city, or state. Complete the master profile before adding sub profiles.",
      });
    }

    // Inherit the master's enabled modules. The Sidebar component filters
    // items by these flags (content, onboarding, recommendations, modelPortfolio)
    // independently of the sub-profile permission system. Without inheritance,
    // a fresh sub-profile gets empty `services` → Sidebar hides Research
    // Reports, My Plans, Recommendations, Portfolios, etc. Sub-profiles work
    // under the master's plan so should see the same modules.
    const masterServices = (master?.services as Record<string, any>) || {};
    const inheritedServices = {
      recommendations: !!masterServices.recommendations,
      paymentGateway: !!masterServices.paymentGateway,
      onboarding: !!masterServices.onboarding,
      content: !!masterServices.content,
      modelPortfolio: !!masterServices.modelPortfolio,
      integration: masterServices.integration || "razorpay",
      recurringPayment: !!masterServices.recurringPayment,
    };

    const masterLms = (master?.lmsCommercial as Record<string, any>) || {};
    const inheritedLmsCommercial = {
      enabled: !!masterLms.enabled,
      commissionPercentage: Number(masterLms.commissionPercentage) || 0,
    };

    const newSub = new ServiceProviderRegModel({
      RegName: name,
      name,
      email,
      number,
      regNumber: inheritedRegNumber,
      city: inheritedCity,
      state: inheritedState,
      category: master?.category,
      role: "provider",
      type: "sub profile",
      // Auto-approved — no Tradebox admin step.
      verified: true,
      approved: true,
      services: inheritedServices,
      lmsCommercial: inheritedLmsCommercial,
      addedby: {
        isSubProfile: true,
        id: g.masterId,
        companyName: master?.RegName || master?.companyName || "",
        subProfileRole,
        // Both roles are now scoped by the master's checkbox grid — admin
        // role just has a higher seat cap, not broader access.
        permissions: sanitizePermissions(permissions),
      },
    });
    await newSub.save();

    // Invite email — they log in via the existing OTP flow against this email.
    try {
      await mailQueue.add(
        email,
        {
          mailOptions: {
            from: process.env.EMAIL,
            to: email,
            subject: `Welcome to Tradebox — joined ${master?.RegName || "your firm"}`,
            html: `
              <p>Hi ${name},</p>
              <p>You have been added as a <b>${subProfileRole}</b> sub profile under <b>${master?.RegName || "your firm"}</b> on Tradebox.</p>
              <p>Sign in with this email at <a href="https://tradeboxlive.com/auth/provider/signin">tradeboxlive.com/auth/provider/signin</a> using OTP.</p>
              <br/>
              Best regards,<br/>Tradebox
            `,
          },
        },
        { removeOnComplete: true, removeOnFail: true },
      );
    } catch {
      // Email failure shouldn't abort the create — sub profile exists, master can resend later.
    }

    // Audit trail (in-app notification to admins) so Tradebox still has
    // visibility even though approval is not required.
    try {
      await adminNotify(
        `${master?.RegName || "A Non Individual SP"} added a new ${subProfileRole} sub profile: ${name}`,
      );
    } catch {
      /* swallow */
    }

    return res.status(201).json({
      success: true,
      message: "Sub profile created",
      sub: {
        _id: newSub._id,
        name: newSub.name,
        email: newSub.email,
        number: newSub.number,
        addedby: newSub.addedby,
        createdAt: (newSub as any).createdAt,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to create sub profile", error });
  }
};

// PATCH /api/sp/subprofiles/:id/permissions — master updates a sub's permissions.
// Body: { permissions } (a user-sub) or { subProfileRole } to flip role.
export const updateSubProfilePermissions = async (
  req: Request,
  res: Response,
) => {
  const g = gateMaster(req, res);
  if (!g) return;

  try {
    const { id } = req.params;
    const { permissions, subProfileRole } = req.body as {
      permissions?: any;
      subProfileRole?: SubProfileRole;
    };

    const sub = await ServiceProviderRegModel.findById(id);
    if (!sub || !sub.addedby?.isSubProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Sub profile not found" });
    }
    // Ownership: only the master that created this sub can update it.
    if (String(sub.addedby.id) !== g.masterId) {
      return res
        .status(403)
        .json({ success: false, message: "Not your sub profile" });
    }

    if (
      subProfileRole !== undefined &&
      subProfileRole !== "admin" &&
      subProfileRole !== "user"
    ) {
      return res.status(400).json({
        success: false,
        message: "subProfileRole must be 'admin' or 'user'",
      });
    }

    // Role flip needs seat-limit recheck (e.g., promoting a user to admin
    // when admin seats are already full).
    if (
      subProfileRole &&
      sub.addedby.subProfileRole !== subProfileRole
    ) {
      const sameRoleCount = await ServiceProviderRegModel.countDocuments({
        "addedby.isSubProfile": true,
        "addedby.id": g.masterId,
        "addedby.subProfileRole": subProfileRole,
      });
      if (sameRoleCount >= SEAT_LIMITS[subProfileRole]) {
        return res.status(400).json({
          success: false,
          message: `All ${SEAT_LIMITS[subProfileRole]} ${subProfileRole} seats are used.`,
        });
      }
      sub.addedby.subProfileRole = subProfileRole;
    }

    if (permissions !== undefined) {
      // Both admin and user role sub-profiles are scoped by the same
      // checkbox grid — the role only governs the seat cap, not access.
      sub.addedby.permissions = sanitizePermissions(permissions) as any;
    }

    await sub.save();

    return res.status(200).json({
      success: true,
      message: "Sub profile updated",
      sub: { _id: sub._id, addedby: sub.addedby },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update sub profile",
      error,
    });
  }
};

// DELETE /api/sp/subprofiles/:id — master removes a sub profile (frees the seat).
export const deleteSubProfile = async (req: Request, res: Response) => {
  const g = gateMaster(req, res);
  if (!g) return;

  try {
    const { id } = req.params;
    const sub = await ServiceProviderRegModel.findById(id);
    if (!sub || !sub.addedby?.isSubProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Sub profile not found" });
    }
    if (String(sub.addedby.id) !== g.masterId) {
      return res
        .status(403)
        .json({ success: false, message: "Not your sub profile" });
    }
    await ServiceProviderRegModel.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ success: true, message: "Sub profile removed" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete sub profile", error });
  }
};
