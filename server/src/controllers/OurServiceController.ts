// import { addBotAsAdmin, createChannel, sendBotAdminRequest } from "../config/telegram";
import { tryCatch } from "bullmq";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { CouponModel, EventModel, ServiceModel } from "../models/PostModels";
import { OrderModel } from "../models/TransactionModels";
import { invalidateServiceNameCache } from "../services/ServiceNameCache";
import { getProfileFamilyIds } from "../utils/profileHelpers";

/** Normalize pricing tiers and derive legacy service-level purchaseType for filters / admin. */
/** Parse calls commitment; omit when quota is 0 / empty (store null to clear on update). */
function parseCallsCommitment(parsed: {
	callsQuota?: unknown;
	callsPeriod?: unknown;
}): { callsQuota: number | null; callsPeriod: "DAY" | "WEEK" | "MONTH" | null } {
	const raw =
		parsed.callsQuota === "" || parsed.callsQuota === undefined
			? NaN
			: Number(parsed.callsQuota);
	const q = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
	const p = String(parsed.callsPeriod || "DAY").toUpperCase();
	const period = ["DAY", "WEEK", "MONTH"].includes(p)
		? (p as "DAY" | "WEEK" | "MONTH")
		: ("DAY" as const);
	if (q <= 0) {
		return { callsQuota: null, callsPeriod: null };
	}
	return { callsQuota: q, callsPeriod: period };
}

function normalizePricingPlansForNormalService(pricingPlans: unknown[]) {
	const normalized = (pricingPlans as Record<string, unknown>[]).map((p) => ({
		validity: p.validity,
		price: p.price,
		purchaseType:
			p.purchaseType === "ONE_TIME" ? "ONE_TIME" : ("RENEWABLE" as const),
	}));
	const derivedPurchaseType = normalized.some((p) => p.purchaseType === "RENEWABLE")
		? ("RENEWABLE" as const)
		: ("ONE_TIME" as const);
	return { normalized, derivedPurchaseType };
}

export const PostNewService = async (req: Request, res: Response) => {
	if (!req.body) {
		return res
			.status(400)
			.json({ success: false, message: "No Data provided" });
	}

	try {
		const parsedBody = JSON.parse(req.body.data);

		const { id, telegramConfig } = parsedBody;

		const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };

		const bannerFile = files?.bannerURL?.[0]; // Get banner image
		const tncFile = files?.tncFile?.[0]; // Get TnC PDF

		if (!bannerFile) {
			return res
				.status(400)
				.json({ success: false, message: "file not found" });
		}

		if (!tncFile) {
			return res
				.status(400)
				.json({ success: false, message: "Terms & Conditions PDF not found" });
		}

		//  console.log("Banner URL:", bannerFile.location);
		//  console.log("TnC PDF URL:", tncFile.location);

		const {
      name,
      email,
      type,
      segment,
      title,
      description,
      pricingPlans,
      faqs,
      coupon,
      serviceType,
      authorImage,
      AUM,
      NoOfClients,
      inceptionDate,
      Fundmanager,
      returnsByTime,
      AsOn,
      isFreeTrial,
      freeTrailDays,
      Documents,
      aboutAuthor,
      keyFeatures,
      bonusFeatures,
      shareWithMarketplaces,
      purchaseType,
      callsQuota: callsQuotaRaw,
      callsPeriod: callsPeriodRaw,
      allowRecurringPayment,
    } = parsedBody;

		const callsCommitment = parseCallsCommitment({
			callsQuota: callsQuotaRaw,
			callsPeriod: callsPeriodRaw,
		});

		let normalizedPricingPlans: ReturnType<
			typeof normalizePricingPlansForNormalService
		>["normalized"] = [];
		let derivedPurchaseType: "ONE_TIME" | "RENEWABLE" = "RENEWABLE";

		// Validate pricing plans for non-fund services
		if (serviceType === "normal") {
			if (!pricingPlans || pricingPlans.length === 0) {
				return res.status(400).json({
					success: false,
					message: "At least one pricing plan is required",
				});
			}

			// Validate each pricing plan
			for (const plan of pricingPlans) {
				if (!plan.validity || plan.validity <= 0) {
					return res.status(400).json({
						success: false,
						message: "Validity must be a positive number for all pricing plans",
					});
				}

				if (!plan.price || plan.price < 0) {
					return res.status(400).json({
						success: false,
						message:
							"Price must be a non-negative number for all pricing plans",
					});
				}
			}

			const n = normalizePricingPlansForNormalService(pricingPlans);
			normalizedPricingPlans = n.normalized;
			derivedPurchaseType = n.derivedPurchaseType;
		}
		const excistingplan = await ServiceModel.findOne({ title });
		if (excistingplan)
			return res.status(409).json({
				message: "Plan with this name is already exist",
				success: false,
			});

		const scheduledDateTimeinceptionDate = new Date(inceptionDate);
		const scheduledDateTimeAsOn = new Date(AsOn);

		const newService = new ServiceModel({
      authorData: {
        id,
        name,
        email,
        type,
        authorImage,
        aboutAuthor,
      },
      title,
      description,
      tncFileURL: tncFile.location,
      pricingPlans:
				serviceType === "normal" ? normalizedPricingPlans : undefined, // Only include for normal services
      faqs,
      segment,
      coupon,
      serviceType,
      AUM,
      NoOfClients,
      inceptionDate: scheduledDateTimeinceptionDate,
      Fundmanager,
      returnsByTime,
      isFreeTrial,
      freeTrailDays,
      AsOn: scheduledDateTimeAsOn,
      Documents,
      keyFeatures,
      bonusFeatures,
      bannerURL: bannerFile.location,
      // NEW: Initialize Telegram fields
      telegramChannelId: telegramConfig?.channelId || null,
      telegramChannelAccessHash: null,
      approvalStatus: true,
      shareWithMarketplaces,
      purchaseType:
				serviceType === "normal"
					? derivedPurchaseType
					: purchaseType || "RENEWABLE",
      callsQuota: callsCommitment.callsQuota,
      callsPeriod: callsCommitment.callsPeriod,
      allowRecurringPayment: !!allowRecurringPayment,
    });

		await newService.save();

		await ServiceProviderRegModel.findByIdAndUpdate(
			id,
			{ $inc: { "stats.contentStats.services": 1 } },
			{ new: true },
		);

		// Drop the live-dashboard's service-name cache so the new plan's
		// title shows up under "Shared Plans" immediately instead of after
		// the 60s TTL — relevant when an SP creates a service and the
		// next recommendation they post should display the title not the id.
		invalidateServiceNameCache();

		return res
			.status(200)
			.json({ success: true, message: "Service Created", id: newService._id });
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			success: false,
			message: "failed to create service",
			error: error,
		});
	}
};

export const UpdateService = async (req: Request, res: Response) => {
	try {
		if (!req.body?.data) {
			return res
				.status(400)
				.json({ success: false, message: "No Data provided" });
		}

		const parsedBody = JSON.parse(req.body.data);
		const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };

		// ✅ Replace file URLs if new files uploaded
		if (files?.bannerURL?.[0]) {
			parsedBody.bannerURL = files.bannerURL[0].location;
		}

		if (files?.tncFile?.[0]) {
			parsedBody.tncFileURL = files.tncFile[0].location;
		}

		// ✅ Fix date parsing
		const inceptionDate = new Date(parsedBody.inceptionDate);
		const AsOn = new Date(parsedBody.AsOn);

		let pricingPlansUpdate = parsedBody.pricingPlans;
		let purchaseTypeUpdate = parsedBody.purchaseType;
		if (parsedBody.serviceType === "normal" && Array.isArray(parsedBody.pricingPlans)) {
			const n = normalizePricingPlansForNormalService(parsedBody.pricingPlans);
			pricingPlansUpdate = n.normalized;
			purchaseTypeUpdate = n.derivedPurchaseType;
		}

		const callsCommitmentUpdate = parseCallsCommitment({
			callsQuota: parsedBody.callsQuota,
			callsPeriod: parsedBody.callsPeriod,
		});

		// ✅ Build updated data object
		const updateFields: any = {
      title: parsedBody.title,
      description: parsedBody.description,
      segment: parsedBody.segment,
      serviceType: parsedBody.serviceType,
      pricingPlans: pricingPlansUpdate,
      faqs: parsedBody.faqs,
      coupon: parsedBody.coupon,
      AUM: parsedBody.AUM,
      NoOfClients: parsedBody.NoOfClients,
      inceptionDate: isNaN(inceptionDate.getTime()) ? null : inceptionDate,
      Fundmanager: parsedBody.Fundmanager,
      returnsByTime: parsedBody.returnsByTime || [
        parsedBody.onemonth,
        parsedBody.sixmonths,
        parsedBody.oneyear,
        parsedBody.threeyears,
        parsedBody.fiveyears,
      ],
      isFreeTrial: parsedBody.isFreeTrial,
      freeTrailDays: parsedBody.freeTrailDays,
      AsOn: isNaN(AsOn.getTime()) ? null : AsOn,
      Documents: parsedBody.Documents,
      keyFeatures: parsedBody.keyFeatures,
      bonusFeatures: parsedBody.bonusFeatures,
      bannerURL: parsedBody.bannerURL, // updated above if file uploaded
      tncFileURL: parsedBody.tncFileURL, // updated above if file uploaded
      telegramChannelId: parsedBody.telegramConfig?.channelId || null,
      shareWithMarketplaces: parsedBody.shareWithMarketplaces,
      purchaseType: purchaseTypeUpdate,
      callsQuota: callsCommitmentUpdate.callsQuota,
      callsPeriod: callsCommitmentUpdate.callsPeriod,
      allowRecurringPayment: !!parsedBody.allowRecurringPayment,
    };

		const updatedService = await ServiceModel.findByIdAndUpdate(
			parsedBody.id,
			{ $set: updateFields },
			{ new: true },
		);

		if (!updatedService) {
			return res.status(404).json({
				success: false,
				message: "Service not found",
			});
		}

		// Title (or any other cached field) may have changed — invalidate so
		// the next dashboard tick resolves the fresh name.
		invalidateServiceNameCache();

		return res.status(200).json({
			success: true,
			message: "Service Updated Successfully",
			data: updatedService,
		});
	} catch (error) {
		console.error("Update error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to update service",
			error,
		});
	}
};

export const getAllPaidEvents = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch services",
		});
	}

	try {
		const data = await EventModel.find({
			"authorData.id": id,
			couponCode: { $exists: false },
		}).sort({ createdAt: -1 });

		return res.status(200).json({
			success: true,
			message: "Events fetched",
			data: data,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch Events",
			error: error,
		});
	}
};

export const getAllServicesForCoupon = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch services",
		});
	}

	try {
		const data = await ServiceModel.find({
			"authorData.id": id,
		}).sort({ createdAt: -1 });

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

export const getAllServices = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch services",
		});
	}

	try {
		// Pool the whole profile family so a Non-Individual master AND its
		// sub-profiles all see the firm's plans. Plans are authored under the
		// master (or whichever RA created them), so a sub-profile querying only
		// its own id would see nothing. getProfileFamilyIds resolves:
		//   master    -> master + all sub-profiles
		//   admin sub  -> the master's whole family (master + siblings)
		//   user sub   -> just itself
		//   individual -> just itself
		const authorIds = await getProfileFamilyIds(id as string);

		const data = await ServiceModel.find({
			"authorData.id": { $in: authorIds },
		}).sort({ createdAt: -1 });

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

export const deactivateService = async (req: Request, res: Response) => {
	const { id } = req.body;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "no id provided",
		});
	}

	try {
		await ServiceModel.findByIdAndUpdate(id, { $set: { activated: false } });

		return res.status(200).json({
			success: true,
			message: "service deactivated",
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to deactivate service",
			error: error,
		});
	}
};

export const activateService = async (req: Request, res: Response) => {
	const { id } = req.body;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "no id provided",
		});
	}

	try {
		const service = await ServiceModel.findById(id);

		await ServiceModel.findByIdAndUpdate(id, { $set: { activated: true } });

		return res.status(200).json({
			success: true,
			message: "service activated",
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to activate service",
			error: error,
		});
	}
};

export const deleteService = async (req: Request, res: Response) => {
	const { id } = req.body;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "no id provided",
		});
	}

	try {
		const deleted = await ServiceModel.findByIdAndDelete(id);

		if (!deleted) {
			return res.status(404).json({
				success: false,
				message: "Service not found",
			});
		}

		// Deleted service should stop resolving to its old title in
		// dashboard payloads.
		invalidateServiceNameCache();

		return res.status(200).json({
			success: true,
			message: "Service deleted",
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to delete service",
			error,
		});
	}
};

export const getOneService = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch services",
		});
	}

	try {
		const data = await ServiceModel.findById(id);

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

export const getAllCoupons = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({ message: "Author ID is required" });
	}

	try {
		// Pool the whole profile family so a Non-Individual master AND its
		// sub-profiles all see the firm's coupons. Coupons are authored under the
		// master (or whichever RA created them), so a sub-profile querying only
		// its own id would see nothing. Resolves master -> master + subs; admin
		// sub -> the master's whole family; user sub / individual -> just itself.
		const authorIds = await getProfileFamilyIds(id.toString());
		const authorObjectIds = authorIds.map(
			(a) => new mongoose.Types.ObjectId(a),
		);

		// Try both variations just in case
		const coupons = await CouponModel.find({
			$or: [
				{ "authorData._id": { $in: authorObjectIds } },
				{ "authorData.id": { $in: authorIds } },
			],
		})
			.populate({ path: "serviceIds", select: "title price" })
			.populate({ path: "packageIds", select: "title" })
			.sort({ createdAt: -1 });
		return res.status(200).json({ coupons });
	} catch (error) {
		console.error("Error fetching coupons:", error);
		return res.status(500).json({ message: "Error fetching coupons", error });
	}
};

export const getDisclaimer = async (req: Request, res: Response) => {
	const { id } = req.query;
	if (!id) {
		return res.status(400).json({ success: false, message: "No ID provided" });
	}

	try {
		const SP = await ServiceProviderRegModel.findById(id).select("disclaimer");

		const data = SP?.disclaimer;
		return res.status(200).json({
			success: true,
			message: "disclaimer fetched",
			data: data,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "failed to fetch disclaimer",
			error: error,
		});
	}
};

// Normalises the frontend payload into the storage shape used by both
// addNewCoupon and updateCoupon. New clients send the *Validities arrays;
// older clients may still send plain serviceIds/packageIds — handle both.
type ServiceValidityRow = { serviceId: string; validity: number };
type PackageValidityRow = { packageId: string; validity: number };

function normaliseCouponTargeting(body: any): {
  serviceIds: string[];
  packageIds: string[];
  serviceValidities: ServiceValidityRow[];
  packageValidities: PackageValidityRow[];
} {
  const rawServiceValidities: ServiceValidityRow[] = Array.isArray(body.serviceValidities)
    ? body.serviceValidities.filter((r: any) => r && r.serviceId && typeof r.validity === "number")
    : [];
  const rawPackageValidities: PackageValidityRow[] = Array.isArray(body.packageValidities)
    ? body.packageValidities.filter((r: any) => r && r.packageId && typeof r.validity === "number")
    : [];

  // Derive serviceIds/packageIds from the validity rows so legacy reads
  // ("does this coupon target service X?") keep working with no extra logic.
  const serviceIds = rawServiceValidities.length
    ? Array.from(new Set(rawServiceValidities.map((r) => String(r.serviceId))))
    : Array.isArray(body.serviceIds)
    ? body.serviceIds
    : [];
  const packageIds = rawPackageValidities.length
    ? Array.from(new Set(rawPackageValidities.map((r) => String(r.packageId))))
    : Array.isArray(body.packageIds)
    ? body.packageIds
    : [];

  return {
    serviceIds,
    packageIds,
    serviceValidities: rawServiceValidities,
    packageValidities: rawPackageValidities,
  };
}

export const addNewCoupon = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      id,
      type,
      code,
      discountType,
      discount,
      startDate,
      expiryDate,
      usageLimit,
      perCustomerLimit,
      eventId,
      couponType,
    } = req.body;

    const { serviceIds, packageIds, serviceValidities, packageValidities } =
      normaliseCouponTargeting(req.body);

    // Validation based on couponType
    if (couponType === "event" && !eventId) {
      return res
        .status(400)
        .json({ error: "Event ID is required for event coupons." });
    }

    if (couponType === "plans" && serviceValidities.length === 0 && serviceIds.length === 0) {
      return res.status(400).json({
        error: "At least one plan validity is required for plan coupons.",
      });
    }

    if (couponType === "packages" && packageValidities.length === 0 && packageIds.length === 0) {
      return res.status(400).json({
        error: "At least one package validity is required for package coupons.",
      });
    }

    // Check duplicate code (scoped to author)
    const existingCoupon = await CouponModel.findOne({
      code,
      "authorData.id": id,
    });
    if (existingCoupon) {
      return res
        .status(409)
        .json({ message: "Coupon code already exists for your account." });
    }

    const newCoupon = new CouponModel({
      authorData: { name, email, id, type },
      code,
      discountType,
      discount,
      startDate,
      expiryDate,
      usageLimit,
      perCustomerLimit,
      eventId: couponType === "event" ? eventId : null,
      serviceIds: couponType === "plans" ? serviceIds : [],
      packageIds: couponType === "packages" ? packageIds : [],
      serviceValidities: couponType === "plans" ? serviceValidities : [],
      packageValidities: couponType === "packages" ? packageValidities : [],
      couponType: couponType || "plans",
    });

    const savedCoupon = await newCoupon.save();

    return res.status(201).json(savedCoupon);
  } catch (error) {
    console.error("Error adding coupon:", error);
    return res.status(500).json({ error: "Failed to add coupon" });
  }
};

export const updateCoupon = async (req: Request, res: Response) => {
	try {
		const {
			id, // Coupon ID to be updated
			code,
			discountType,
			discount,
			startDate,
			expiryDate,
			usageLimit,
			perCustomerLimit,
			eventId,
			couponType,
			authorData,
		} = req.body;

		if (!id) {
			return res.status(400).json({
				success: false,
				message: "Coupon ID is required for update.",
			});
		}

		const { serviceIds, packageIds, serviceValidities, packageValidities } =
			normaliseCouponTargeting(req.body);

		const effectiveType = couponType || "plans";

		if (effectiveType === "event" && !eventId) {
			return res.status(400).json({
				success: false,
				message: "Event ID is required for event coupons.",
			});
		}
		if (
			effectiveType === "plans" &&
			serviceValidities.length === 0 &&
			serviceIds.length === 0
		) {
			return res.status(400).json({
				success: false,
				message: "At least one plan validity is required for plan coupons.",
			});
		}
		if (
			effectiveType === "packages" &&
			packageValidities.length === 0 &&
			packageIds.length === 0
		) {
			return res.status(400).json({
				success: false,
				message: "At least one package validity is required for package coupons.",
			});
		}

		// Build the update payload, clearing the unused-branch fields so
		// re-targeting (e.g. plans → event) doesn't leave stale arrays.
		const updateFields: Record<string, unknown> = {
			code,
			discountType,
			discount,
			startDate,
			expiryDate,
			usageLimit,
			perCustomerLimit,
			couponType: effectiveType,
			eventId: effectiveType === "event" ? eventId : null,
			serviceIds: effectiveType === "plans" ? serviceIds : [],
			packageIds: effectiveType === "packages" ? packageIds : [],
			serviceValidities: effectiveType === "plans" ? serviceValidities : [],
			packageValidities: effectiveType === "packages" ? packageValidities : [],
		};

		if (
			authorData &&
			authorData.id &&
			authorData.name &&
			authorData.email &&
			authorData.type
		) {
			updateFields.authorData = authorData;
		}

		const updatedCoupon = await CouponModel.findByIdAndUpdate(
			id,
			updateFields,
			{ new: true },
		);

		if (!updatedCoupon) {
			return res.status(404).json({
				success: false,
				message: "Coupon not found.",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Coupon updated successfully.",
			data: updatedCoupon,
		});
	} catch (error) {
		console.error("Error in updateCoupon:", error);
		return res.status(500).json({
			success: false,
			message: (error as Error).message,
		});
	}
};

//deleteCopupon
export const deleteCoupon = async (req: Request, res: Response) => {
	try {
		const { id } = req.body;

		if (!id) {
			return res.status(400).json({
				success: false,
				message: "No ID provided",
			});
		}

		const deletedCoupon = await CouponModel.findByIdAndDelete(id);

		if (!deletedCoupon) {
			return res.status(404).json({
				success: false,
				message: "Coupon not found",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Coupon deleted successfully",
		});
	} catch (error) {
		console.error("Error in the deleteCoupon controller:", error);
		return res.status(500).json({
			success: false,
			message: (error as Error).message,
		});
	}
};

//getcouponbyid
export const getCouponByID = async (req: Request, res: Response) => {
	try {
		const { id } = req.query;

		if (!id || typeof id !== "string") {
			return res.status(400).json({
				success: false,
				message: "Coupon ID is required",
			});
		}

		const coupon = await CouponModel.findById(id);

		if (!coupon) {
			return res.status(404).json({
				success: false,
				message: "Coupon not found",
			});
		}

		return res.status(200).json({
			success: true,
			data: coupon,
		});
	} catch (error) {
		console.error("Error fetching coupon:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to get coupon",
		});
	}
};

/**
 * GET /api/post/plan-analytics?providerId=...&serviceId=...
 *
 * Returns plan-wise analytics for a service provider:
 *   • subscriber counts (total, active, expired)
 *   • total revenue + monthly revenue trend
 *   • renewal count + renewal rate
 *   • state-wise distribution (from User.state)
 *   • gender distribution
 *   • top 10 subscribers by total spend
 *
 * If `serviceId` is provided, results are scoped to that single plan;
 * otherwise the response covers the SP's entire catalog.
 */
export const getPlanAnalytics = async (req: Request, res: Response) => {
	try {
		const providerId = (req.query.providerId as string) || "";
		const serviceId = (req.query.serviceId as string) || "";

		if (!providerId) {
			return res.status(400).json({
				success: false,
				message: "providerId is required",
			});
		}

		// 1. Pull every plan the SP owns — feeds the dropdown selector.
		const plans = await ServiceModel.find(
			{ "authorData.id": providerId },
			"title segment serviceType"
		).lean();

		// 2. Build the order match — scope to specific plan if requested.
		const orderMatch: Record<string, unknown> = {
			"soldBy.id": providerId,
			paymentStatus: { $ne: "rejected" },
		};
		if (serviceId) orderMatch.subscribedToId = serviceId;

		const orders = await OrderModel.find(orderMatch).lean();

		// Quick KPIs straight off the orders array.
		const totalOrders = orders.length;
		const totalRevenue = orders.reduce(
			(s, o: any) => s + (Number(o.total) || 0),
			0
		);
		const renewals = orders.filter((o: any) => o.isRenewal).length;
		const activeOrders = orders.filter((o: any) => !o.isExpired).length;
		const expiredOrders = totalOrders - activeOrders;

		// Distinct subscribers (paying users), counted once even if they bought multiple plans.
		const allSubscriberIds = Array.from(
			new Set(orders.map((o: any) => o?.orderdBy?.id).filter(Boolean))
		);
		const activeSubscriberIds = Array.from(
			new Set(
				orders
					.filter((o: any) => !o.isExpired)
					.map((o: any) => o?.orderdBy?.id)
					.filter(Boolean)
			)
		);

		// 3. Monthly revenue trend (last 12 calendar months).
		const monthlyMap = new Map<
			string,
			{ revenue: number; orders: number }
		>();
		for (const o of orders as any[]) {
			const d = new Date(o.createdAt);
			if (Number.isNaN(d.getTime())) continue;
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			const cur = monthlyMap.get(key) || { revenue: 0, orders: 0 };
			cur.revenue += Number(o.total) || 0;
			cur.orders += 1;
			monthlyMap.set(key, cur);
		}
		const monthlyRevenue = Array.from(monthlyMap.entries())
			.map(([month, v]) => ({ month, ...v }))
			.sort((a, b) => (a.month < b.month ? -1 : 1))
			.slice(-12);

		// 4. Pull the user docs for state / gender / top-spender enrichment.
		const users = allSubscriberIds.length
			? await UserModel.find(
					{ _id: { $in: allSubscriberIds } },
					"name email state gender"
				).lean()
			: [];
		const userMap = new Map(users.map((u: any) => [String(u._id), u]));

		// State distribution
		const stateMap = new Map<string, number>();
		const genderMap = new Map<string, number>();
		for (const id of allSubscriberIds) {
			const u: any = userMap.get(String(id));
			const state = (u?.state || "Unknown").trim() || "Unknown";
			stateMap.set(state, (stateMap.get(state) || 0) + 1);
			const g = u?.gender ? String(u.gender).toUpperCase() : "U";
			const genderLabel =
				g === "M" || g === "MALE"
					? "Male"
					: g === "F" || g === "FEMALE"
						? "Female"
						: g === "O" || g === "OTHER"
							? "Other"
							: "Unknown";
			genderMap.set(genderLabel, (genderMap.get(genderLabel) || 0) + 1);
		}
		const stateDistribution = Array.from(stateMap.entries())
			.map(([state, count]) => ({ state, count }))
			.sort((a, b) => b.count - a.count);
		const genderDistribution = Array.from(genderMap.entries()).map(
			([gender, count]) => ({ gender, count })
		);

		// 5. Top 10 subscribers by total spend.
		const spendMap = new Map<
			string,
			{ totalSpent: number; orders: number; lastPurchase?: Date }
		>();
		for (const o of orders as any[]) {
			const id = o?.orderdBy?.id;
			if (!id) continue;
			const cur = spendMap.get(id) || {
				totalSpent: 0,
				orders: 0,
				lastPurchase: undefined,
			};
			cur.totalSpent += Number(o.total) || 0;
			cur.orders += 1;
			const created = new Date(o.createdAt);
			if (!cur.lastPurchase || created > cur.lastPurchase) {
				cur.lastPurchase = created;
			}
			spendMap.set(id, cur);
		}
		const top10 = Array.from(spendMap.entries())
			.map(([userId, v]) => {
				const u: any = userMap.get(String(userId));
				return {
					userId,
					name: u?.name || "Unknown",
					email: u?.email || "",
					state: u?.state || "—",
					ordersCount: v.orders,
					totalSpent: v.totalSpent,
					lastPurchase: v.lastPurchase,
				};
			})
			.sort((a, b) => b.totalSpent - a.totalSpent)
			.slice(0, 10);

		return res.status(200).json({
			success: true,
			plans: plans.map((p: any) => ({
				_id: String(p._id),
				title: p.title,
				segment: p.segment,
				serviceType: p.serviceType,
			})),
			selectedServiceId: serviceId || null,
			metrics: {
				totalSubscribers: allSubscriberIds.length,
				activeSubscribers: activeSubscriberIds.length,
				expiredSubscribers:
					allSubscriberIds.length - activeSubscriberIds.length,
				totalOrders,
				activeOrders,
				expiredOrders,
				totalRevenue,
				renewals,
				renewalRate:
					totalOrders > 0 ? (renewals / totalOrders) * 100 : 0,
				avgOrderValue:
					totalOrders > 0 ? totalRevenue / totalOrders : 0,
			},
			monthlyRevenue,
			stateDistribution,
			genderDistribution,
			top10,
		});
	} catch (error) {
		console.error("Error in getPlanAnalytics:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to compute plan analytics",
		});
	}
};
