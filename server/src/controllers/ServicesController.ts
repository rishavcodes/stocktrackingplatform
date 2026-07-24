import { Request, Response } from "express";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { CouponModel, EventModel, ServiceModel } from "../models/PostModels";
import { OrderModel } from "../models/TransactionModels";
import { PackageModel } from "../models/PackageModel";
import mongoose from "mongoose";
// import { addUserToChannel, findUserByPhoneNumber } from "../config/telegram";
import { tryCatch } from "bullmq";
import { CourseModel } from "../models/CourseModel";
import {
  isCouponExpired,
  isCouponNotYetActive,
} from "../utils/couponDateRange";
import { validateCoupon } from "../helpers/validateCoupon";
import { getProfileFamilyIds, getFirmFamilyIds } from "../utils/profileHelpers";

export const getAllSPServices = async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Failed to fetch services",
    });
  }

  try {
    // Plans belong to the whole firm, so resolve to the FIRM family — every
    // member (master, admin sub, AND user sub) sees the firm's plans. This is
    // why we use getFirmFamilyIds, not getProfileFamilyIds: the latter scopes a
    // user sub to just itself (correct for their own recommendations) which
    // would leave their plan picker (Quick Message, recommendation sharing)
    // empty since user subs don't own plans.
    const familyIds = await getFirmFamilyIds(String(id));

    const data = await ServiceModel.aggregate([
      {
        $match: {
          "authorData.id": { $in: familyIds },
          activated: true,
        },
      },
      {
        $addFields: {
          price: { $round: [ "$price", 2] },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "service fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error,
    });
  }
};

export const getServicesByProvider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Provider ID missing" });
    }

    const services = await ServiceModel.find({ "authorData.id": id }).select(
      "_id title"
    );

    return res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error: any) {
    console.error("Error fetching provider services:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getAllSharewithSPServices = async (
  req: Request,
  res: Response
) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Failed to fetch services",
    });
  }

  try {
    // First find the service provider from the serviceproviderregmodel
    const serviceProvider = await ServiceProviderRegModel.findById(id);

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    // Get services associated with the service provider
    const services = await ServiceModel.find({
      "authorData.id": id,
      approvalStatus: true,
    }).sort({ createdAt: -1 });

    // If provider type is Non Individual, also get services for sub profiles
    let subProfileServices: any[] = [];
    if (serviceProvider.type === "Non Individual") {
      const subProfiles = await ServiceProviderRegModel.find({
        "addedby.id": id,
      });

      const subProfileIds = subProfiles.map((profile: any) => profile._id);

      if (subProfileIds.length > 0) {
        subProfileServices = await ServiceModel.find({
          "authorData.id": { $in: subProfileIds },
          approvalStatus: true,
        }).sort({ createdAt: -1 });
      }
    }

    // If provider is a sub profile, also get parent profile's plans
    let parentProfileServices: any[] = [];
    if (
      serviceProvider.type === "sub profile" &&
      serviceProvider.addedby?.id
    ) {
      parentProfileServices = await ServiceModel.find({
        "authorData.id": serviceProvider.addedby.id,
        approvalStatus: true,
      }).sort({ createdAt: -1 });
    }

    const combinedServices = [
      ...services,
      ...subProfileServices,
      ...parentProfileServices,
    ];

    // console.log(combinedServices)

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      data: combinedServices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error,
    });
  }
};

export const getAllDocuments = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "No Id provided",
    });
  }

  try {
    const { id } = req.query;

    const documents = await ServiceProviderRegModel.findById(id).select(
      "Documents"
    );

    if (documents?.Documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No Doc Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fetched documents",
      data: documents?.Documents[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch decuments",
      error: error,
    });
  }
};

export const getSubscribedServices = async (req: Request, res: Response) => {
  if (!req.query.id || !req.query.role) {
    return res.status(400).json({
      success: false,
      message: "No Id or role provided",
    });
  }

  try {
    const { id, role } = req.query;

    let user: any;

    if (role === "provider") {
      user = await ServiceProviderRegModel.findById(id);
    } else if (role === "user") {
      user = await UserModel.findById(id);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const serviceIds = user?.ServicesAndOrders?.services || [];

    // ✅ CRITICAL FIX
    const validObjectIds = serviceIds
      .filter((sid: string) => mongoose.Types.ObjectId.isValid(sid))
      .map((sid: string) => new mongoose.Types.ObjectId(sid));

    // ✅ If no services, return early
    if (validObjectIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No subscribed services",
        data: [],
      });
    }

    // A package buyer's ServicesAndOrders.services holds only the PACKAGE id
    // (not its included service ids — see PaymentController package flow). So we
    // expand any package ids here into their includedServices at read time, the
    // same way Telegram/expiry handling already expands packages.
    const packages = await PackageModel.find({ _id: { $in: validObjectIds } })
      .select("title includedServices")
      .lean();

    const packageIdSet = new Set(packages.map((p) => String(p._id)));
    // includedService id -> source package (first package that contributes it)
    const packageByServiceId = new Map<string, { id: string; title: string }>();
    for (const pkg of packages) {
      for (const sid of (pkg as any).includedServices || []) {
        const key = String(sid);
        if (!packageByServiceId.has(key)) {
          packageByServiceId.set(key, {
            id: String(pkg._id),
            title: (pkg as any).title,
          });
        }
      }
    }

    // Directly-purchased services = subscribed ids that are NOT packages.
    const directServiceIdSet = new Set<string>(
      validObjectIds
        .map((oid: any) => String(oid))
        .filter((id: string) => !packageIdSet.has(id))
    );

    // Union (dedup) of directly-purchased services + services pulled in via packages.
    const allServiceObjectIds = [
      ...new Set<string>([...directServiceIdSet, ...packageByServiceId.keys()]),
    ].map((s) => new mongoose.Types.ObjectId(s));

    const services = await ServiceModel.aggregate([
      {
        $match: {
          _id: { $in: allServiceObjectIds },
        },
      },
      {
        $addFields: {
          price: {
            $cond: [
              { $ifNull: ["$price", false] },
              { $multiply: ["$price", 1.18] },
              null,
            ],
          },
        },
      },
    ]);

    // Tag services accessible ONLY via a package (not bought directly) so the UI
    // can label them and resolve their order from the package order.
    const enriched = services.map((s: any) => {
      const idStr = String(s._id);
      if (!directServiceIdSet.has(idStr) && packageByServiceId.has(idStr)) {
        const src = packageByServiceId.get(idStr)!;
        return { ...s, sourcePackageId: src.id, sourcePackageTitle: src.title };
      }
      return s;
    });

    return res.status(200).json({
      success: true,
      message: "Fetched services",
      data: enriched,
    });
  } catch (error) {
    console.error("getSubscribedServices error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error,
    });
  }
};

export const claimFreeTrial = async (req: Request, res: Response) => {
  try {
    const {
      serviceId,
      serviceName,
      orderedByName,
      orderedByEmail,
      orderedById,
      soldByName,
      soldById,
      validTill,
    } = req.body;

    return res
      .status(200)
      .json({ success: true, message: "Claimed free trial" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to claim trial",
      error: error,
    });
  }
}


export const applyCoupon = async (req: Request, res: Response) => {
  try {
    const { serviceId, couponCode, price, validity } = req.body;

    const result = await validateCoupon({
      serviceId,
      couponCode,
      price,
      validity,
    });

    if (!result.ok) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      discountedPrice: result.discountedPrice,
      discountType: result.coupon.type,
      originalPrice: price,
      discountValue: result.coupon.value,
      coupon: result.coupon,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const applyCouponOnEvent = async (req: Request, res: Response) => {
  try {
    const { couponCode, eventId, price } = req.body;

    if (!couponCode || !eventId || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: "Coupon code, event ID, and price are required",
      });
    }

    // Find coupon mapped to this event
    const coupon = await CouponModel.findOne({
      code: couponCode,
      eventId: eventId,
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon for this event",
      });
    }

    /* ---------------- DATE CHECK ---------------- */

    if (isCouponNotYetActive(coupon.startDate)) {
      return res.status(400).json({
        success: false,
        message: "Coupon not yet active",
      });
    }

    if (isCouponExpired(coupon.expiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Coupon has expired",
      });
    }

    /* ---------------- USAGE LIMIT ---------------- */

    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit exceeded",
      });
    }

    /* ---------------- CALCULATION ---------------- */

    let discountedPrice: number;

    if (coupon.discountType === "percentage") {
      discountedPrice = price - (price * coupon.discount) / 100;
    } else {
      discountedPrice = price - coupon.discount;
    }

    discountedPrice = Math.max(discountedPrice, 0);

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      discountedPrice,
      originalPrice: price,
      discountType: coupon.discountType,
      discountValue: coupon.discount,
    });
  } catch (error) {
    console.error("Error applying event coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const checkSubscribedService = async (req: Request, res: Response) => {
  const { userId, serviceId } = req.body; // Get userId and serviceId from request body

  if (!userId || !serviceId) {
    return res.status(400).json({ message: "Missing userId or serviceId" });
  }

  try {
    // Find the service by ID and check if the user is in the subscribers array
    const service = await ServiceModel.findById(serviceId);
    const isSubscribed = service?.subscribedBy.some(
      (subscriber) => subscriber.toString() === userId
    );

    return res.status(200).json({ isSubscribed });
  } catch (error) {
    console.error("Error checking subscription: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export const getSpSubscription = async (req: Request, res: Response) => {
  try {
    const { providerId } = req.query;

    if (!providerId) {
      return res
        .status(400)
        .json({ error: "Provider ID or email is required" });
    }

    const provider = await ServiceProviderRegModel.findById(providerId);

    if (!provider) {
      return res.status(404).json({ error: "Service provider not found" });
    }

    // Sub-profiles work under the master's subscription/services. Resolve to
    // the master so the sidebar fills in correctly for sub-profile sessions.
    // Falls back to the sub-profile itself if the master can't be found.
    let source: any = provider;
    if ((provider as any).addedby?.isSubProfile && (provider as any).addedby?.id) {
      const master = await ServiceProviderRegModel.findById(
        (provider as any).addedby.id
      );
      if (master) source = master;
    }

    const subscriptionDetails = source.subscriptionDetails;
    const isSubscriptionActive = !!(
      subscriptionDetails && subscriptionDetails.subscriptionActive === true
    );

    const lmsEnabled = source.lmsCommercial?.enabled === true;

    return res.status(200).json({
      isSubscription: isSubscriptionActive,
      services: source.services || {},
      lms: {
        enabled: lmsEnabled,
      },
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const getSubscribedCourses = async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "User id required",
    });
  }

  try {
    const user = await UserModel.findById(id)
      .select("enrolledCourses")
      .populate({
        path: "enrolledCourses",
        model: CourseModel,
      });

    return res.status(200).json({
      success: true,
      message: "Fetched enrolled courses",
      data: user?.enrolledCourses || [],
    });
  } catch (error) {
    console.error("getSubscribedCourses error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrolled courses",
      error,
    });
  }
};
