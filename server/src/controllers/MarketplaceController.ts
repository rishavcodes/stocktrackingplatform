import type { Request, Response } from "express";
import { Types } from "mongoose";
import shortid from "shortid";
import { z } from "zod";
import { Portfolio } from "../lib/schema";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { MarketplaceModel } from "../models/MarketplaceModel";
import { deleteObject } from "../helpers/providerRegFileHelper";
import { ArticleModel, EventModel, ServiceModel, EventRegistrationModel } from "../models/PostModels";
import { ScoreCardModel } from "../models/ScoreCardModel";
import { CourseModel } from "../models/CourseModel";
import { OrderModel, LeadModel, WalletTransactionModel } from "../models/TransactionModels";
import { PackageModel } from "../models/PackageModel";
import { CourseOrderModel } from "../models/CourseOrder";
import { EnrollmentModel } from "../models/Enrollment";
import { isOnline } from "../helpers/presence";


const createMarketplaceBodySchema = z.object({
	name: z
		.string({
			required_error: "Marketplace name is required",
			invalid_type_error: "Marketplace name must be a string",
		})
		.trim()
		.min(3, "Marketplace name must be at least 3 characters long")
		.max(120, "Marketplace name cannot exceed 120 characters"),
	description: z
		.string({
			invalid_type_error: "Description must be a string",
		})
		.trim()
		.max(500, "Description cannot exceed 500 characters")
		.optional()
		.or(z.literal("").transform(() => undefined)),
	invitedRaIds: z
		.array(
			z
				.string({
					required_error: "RA id is required",
					invalid_type_error: "RA id must be a string",
				})
				.trim()
				.min(1, "RA id cannot be empty"),
		)
		.optional(),
});

const footerLinkSchema = z.object({
	label: z.string().trim().max(100).default(""),
	url: z.string().trim().max(500).default(""),
});

const footerConfigSchema = z.object({
	socials: z
		.object({
			facebook: z.string().trim().max(500).optional().or(z.literal("")),
			instagram: z.string().trim().max(500).optional().or(z.literal("")),
			linkedin: z.string().trim().max(500).optional().or(z.literal("")),
			twitter: z.string().trim().max(500).optional().or(z.literal("")),
			threads: z.string().trim().max(500).optional().or(z.literal("")),
			youtube: z.string().trim().max(500).optional().or(z.literal("")),
		})
		.optional(),
	appLinks: z
		.object({
			googlePlay: z.string().trim().max(500).optional().or(z.literal("")),
			appStore: z.string().trim().max(500).optional().or(z.literal("")),
			webApp: z.string().trim().max(500).optional().or(z.literal("")),
		})
		.optional(),
	sections: z
		.array(
			z.object({
				title: z.string().trim().min(1).max(50),
				links: z.array(footerLinkSchema).max(10),
			}),
		)
		.max(4)
		.optional(),
	support: z
		.object({
			phone: z.string().trim().max(20).optional().or(z.literal("")),
			email: z.string().trim().max(100).optional().or(z.literal("")),
			queryLink: z.string().trim().max(500).optional().or(z.literal("")),
		})
		.optional(),
	copyrightText: z.string().trim().max(200).optional().or(z.literal("")),
	poweredByVisible: z.boolean().optional(),
});

const updateMarketplaceBodySchema = z.object({
	name: z
		.string({
			invalid_type_error: "Marketplace name must be a string",
		})
		.trim()
		.min(3, "Marketplace name must be at least 3 characters long")
		.max(120, "Marketplace name cannot exceed 120 characters")
		.optional(),
	description: z
		.string({
			invalid_type_error: "Description must be a string",
		})
		.trim()
		.max(500, "Description cannot exceed 500 characters")
		.optional()
		.or(z.literal("").transform(() => undefined)),
	removeRaIds: z
		.array(
			z
				.string({
					invalid_type_error: "RA id must be a string",
				})
				.trim()
				.min(1, "RA id cannot be empty"),
		)
		.optional(),
	invitedRaIds: z
		.array(
			z
				.string({
					invalid_type_error: "RA id must be a string",
				})
				.trim()
				.min(1, "RA id cannot be empty"),
		)
		.optional(),
	footerConfig: footerConfigSchema.optional(),
	faqs: z
		.array(
			z.object({
				category: z.string().trim().min(1).max(100),
				icon: z.string().max(10).optional().or(z.literal("")),
				items: z
					.array(
						z.object({
							question: z.string().trim().min(1).max(500),
							answer: z.string().trim().min(1).max(2000),
						}),
					)
					.min(1)
					.max(20),
			}),
		)
		.max(15)
		.optional(),
});

const marketplaceTypeSchema = z.enum([
	"ra",
	"recommendations",
	"portfolio",
	"services",
	"articles",
	"algo_strategies",
	"lms",
	"subscribers",
	"events",
]);

const slugify = (value: string): string => {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
};

const generateUniqueSlug = async (name: string): Promise<string> => {
	const baseSlug = slugify(name) || `marketplace-${shortid.generate()}`;
	let uniqueSlug = baseSlug;
	let suffix = 1;

	while (await MarketplaceModel.exists({ slug: uniqueSlug })) {
		uniqueSlug = `${baseSlug}-${suffix}`;
		suffix += 1;
	}

	return uniqueSlug;
};

export const createMarketplaceController = async (
	req: Request,
	res: Response,
) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			message: "Unauthorized - User context missing",
		});
	}

	const actor = req.user as { category?: string; _id?: string; id?: string };

	if ((actor.category || "") !== "Broker") {
		return res.status(403).json({
			success: false,
			message: "Only brokers can create marketplaces",
		});
	}

	const parsedBody = createMarketplaceBodySchema.safeParse(req.body);

	if (!parsedBody.success) {
		return res.status(400).json({
			success: false,
			message: "Invalid input",
			errors: parsedBody.error.flatten(),
		});
	}

	const { name, description } = parsedBody.data;

	try {
		const brokerId = actor._id || actor.id;
		const invitedRaIdsRaw = (parsedBody.data.invitedRaIds ?? []).map((id) =>
			id.trim(),
		);
		const invalidIds = invitedRaIdsRaw.filter(
			(id) => !Types.ObjectId.isValid(id),
		);

		if (invalidIds.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Invalid RA id format",
				invalidIds,
			});
		}
		const invitedRaIds = Array.from(
			new Set(invitedRaIdsRaw.filter((id) => id.length > 0)),
		);

		const broker = await ServiceProviderRegModel.findById(brokerId);

		if (!broker) {
			return res.status(404).json({
				success: false,
				message: "Broker profile not found",
			});
		}

		const existingMarketplace = await MarketplaceModel.findOne({
			name: new RegExp(`^${name}$`, "i"),
		});

		const brokerIdString = broker._id.toString();

		if (
			invitedRaIds.length > 0 &&
			invitedRaIds.some((id) => id === brokerIdString)
		) {
			return res.status(400).json({
				success: false,
				message: "Broker cannot invite themselves",
			});
		}

		if (existingMarketplace) {
			return res.status(409).json({
				success: false,
				message: "Marketplace with this name already exists",
			});
		}

		let invitations: Array<{ raId: Types.ObjectId }> = [];

		if (invitedRaIds.length > 0) {
			const raProfiles = await ServiceProviderRegModel.find({
				_id: { $in: invitedRaIds },
			}).select("_id email name profileUrl");

			const foundRaIds = new Set(raProfiles.map((ra) => ra._id.toString()));
			const missingRaIds = invitedRaIds.filter((id) => !foundRaIds.has(id));

			if (missingRaIds.length > 0) {
				return res.status(404).json({
					success: false,
					message: "Some RA profiles were not found",
					missingRaIds,
				});
			}

			invitations = raProfiles.map((ra) => ({
				raId: ra._id,
			}));
		}

		const slug = await generateUniqueSlug(name);

		const marketplace = await MarketplaceModel.create({
			name,
			description,
			slug,
			createdByBrokerId: broker._id,
			brokerSnapshot: {
				name: broker.name || broker.companyName || broker.RegName,
				email: broker.email,
				profileUrl: broker.profileUrl,
			},
			invitations,
		});

		return res.status(201).json({
			success: true,
			message: "Marketplace created successfully",
			data: marketplace,
		});
	} catch (error) {
		console.error("Failed to create marketplace:", error);

		return res.status(500).json({
			success: false,
			message: "Failed to create marketplace",
		});
	}
};

// Get all pending invitations for the logged-in RA
export const getMyInvitationsController = async (
	req: Request,
	res: Response,
) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			message: "Unauthorized - User context missing",
		});
	}

	const actor = req.user as { 
		category?: string; 
		_id?: string; 
		id?: string;
	};
	const raId = actor._id || actor.id;

	try {
		// First, get the user's full profile to check type and addedby
		let userProfile: any = null;
		let userType = "";
		let parentId :any = null;
		
		if (raId) {
			userProfile = await ServiceProviderRegModel.findById(raId)
				.select("type addedby category")
				.lean();
			
			if (userProfile) {
				userType = userProfile.type || "";
				parentId = userProfile.addedby?.id;
			}
		}

		// Build query to find invitations for:
		// 1. Direct invitations to this RA
		// 2. If sub-profile, invitations to parent Non-Individual RA
		const queryConditions: any[] = [
			{
				invitations: {
					$elemMatch: {
						raId: raId,
						status: "pending",
					},
				},
			}
		];

		// If user is a sub-profile, also check invitations sent to parent
		if (userType === "sub profile" && parentId) {
			queryConditions.push({
				invitations: {
					$elemMatch: {
						raId: parentId,
						status: "pending",
					},
				},
			});
		}

		// Find all marketplaces with any of the conditions
		const marketplaces = await MarketplaceModel.find({
			$or: queryConditions,
			status: "active"
		})
		.select("name description slug brokerSnapshot invitations createdAt")
		.lean();

		// Filter to show relevant invitations
		const invitations = marketplaces.map((marketplace) => {
			let myInvitation = null;
			let invitationType = "direct"; // direct, parent, or child
			
			// First check direct invitation
			myInvitation = marketplace.invitations.find(
				(inv: any) => inv.raId?.toString() === raId?.toString() && inv.status === "pending",
			);
			
			// If no direct invitation and user is sub-profile, check parent's invitation
			if (!myInvitation && userType === "sub profile" && parentId) {
				myInvitation = marketplace.invitations.find(
					(inv: any) => inv.raId?.toString() === parentId && inv.status === "pending",
				);
				if (myInvitation) {
					invitationType = "parent";
				}
			}

			if (myInvitation) {
				return {
					marketplaceId: marketplace._id,
					marketplaceName: marketplace.name,
					description: marketplace.description,
					slug: marketplace.slug,
					broker: marketplace.brokerSnapshot,
					invitation: myInvitation,
					invitationType: invitationType,
					createdAt: marketplace.createdAt,
					userType: userType,
				};
			}
			
			return null;
		}).filter(inv => inv !== null); // Remove null entries

console.log("invitations", invitations);
		return res.status(200).json({
			success: true,
			data: invitations,
			count: invitations.length,
		});
	} catch (error) {
		console.error("Failed to fetch invitations:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch invitations",
		});
	}
};

// Respond to an invitation (accept or reject)
const respondToInvitationSchema = z.object({
	action: z.enum(["accept", "reject"], {
		required_error: "Action is required",
		invalid_type_error: "Action must be either 'accept' or 'reject'",
	}),
	note: z
		.string()
		.trim()
		.max(500, "Note cannot exceed 500 characters")
		.optional(),
});

export const respondToInvitationController = async (
	req: Request,
	res: Response,
) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			message: "Unauthorized - User context missing",
		});
	}

	const actor = req.user as { 
		category?: string;
		role?: string; 
		_id?: string; 
		id?: string;
	};
	const raId = actor._id || actor.id;
	const { marketplaceId } = req.params;

	// Validate marketplace ID
	if (!Types.ObjectId.isValid(marketplaceId)) {
		return res.status(400).json({
			success: false,
			message: "Invalid marketplace ID",
		});
	}

	const parsedBody = respondToInvitationSchema.safeParse(req.body);

	if (!parsedBody.success) {
		return res.status(400).json({
			success: false,
			message: "Invalid input",
			errors: parsedBody.error.flatten(),
		});
	}

	const { action, note } = parsedBody.data;

	try {
		const marketplace = await MarketplaceModel.findById(marketplaceId);

		if (!marketplace) {
			return res.status(404).json({
				success: false,
				message: "Marketplace not found",
			});
		}

		// Get user profile to check if Non-Individual
		const userProfile = await ServiceProviderRegModel.findById(raId)
			.select("type category addedby");

		// Find the invitation for this RA or their parent (if sub-profile)
		let invitationIndex = marketplace.invitations.findIndex(
			(inv: any) =>
				inv.raId?.toString() === raId?.toString() && inv.status === "pending",
		);

		// If no direct invitation and user is sub-profile, check parent's invitation
		if (invitationIndex === -1 && userProfile?.type === "sub profile" && userProfile.addedby?.id) {
			invitationIndex = marketplace.invitations.findIndex(
				(inv: any) =>
					inv.raId?.toString() === userProfile.addedby?.id && inv.status === "pending",
			);
		}

		if (invitationIndex === -1) {
			return res.status(404).json({
				success: false,
				message: "No pending invitation found for this marketplace",
			});
		}

		// Update invitation status
		const newStatus = action === "accept" ? "accepted" : "declined";
		marketplace.invitations[invitationIndex].status = newStatus;
		marketplace.invitations[invitationIndex].respondedAt = new Date();
		marketplace.invitations[invitationIndex].respondedBy = new Types.ObjectId(
			raId,
		);

		if (note) {
			marketplace.invitations[invitationIndex].note = note;
		}

		// If accepted, add RA(s) to activeRaIds
		if (action === "accept") {
			const raObjectId = new Types.ObjectId(raId);
			
			// Add current RA to activeRaIds if not already there
			if (!marketplace.activeRaIds.some((id: any) => 
				id.toString() === raId?.toString()
			)) {
				marketplace.activeRaIds.push(raObjectId);
			}

			// If Non-Individual RA accepted, add all their sub-profiles
			if (userProfile?.type === "Non Individual") {
				// Find all sub-profiles of this Non-Individual RA
				const subProfiles = await ServiceProviderRegModel.find({
					"addedby.id": raId,
					type: "sub profile",
					category: "Research Analyst"
				}).select("_id").lean();
				
				// Add each sub-profile to activeRaIds
				subProfiles.forEach((subProfile: any) => {
					const subProfileId = subProfile._id;
					
					// Check if sub-profile is already in activeRaIds
					const alreadyExists = marketplace.activeRaIds.some((id: any) => 
						id.toString() === subProfileId.toString()
					);
					
					if (!alreadyExists) {
						marketplace.activeRaIds.push(subProfileId);
						
						// Also create auto-accepted invitation for sub-profile
						const existingInvitationIndex = marketplace.invitations.findIndex(
							(inv: any) => inv.raId?.toString() === subProfileId.toString()
						);
						
						if (existingInvitationIndex === -1) {
							marketplace.invitations.push({
								raId: subProfileId,
								status: "accepted",
								createdAt: new Date(),
								autoAcceptedFor: raObjectId,
								note: "Automatically added as sub-profile of Non-Individual RA"
							} as any);
						}
					}
				});
			}
			
			// If sub-profile accepted, also add them to activeRaIds (already done above)
			// and ensure parent is also added if not already
			if (userProfile?.type === "sub profile" && userProfile.addedby?.id) {
				const parentId = userProfile.addedby.id;
				if (!marketplace.activeRaIds.some((id: any) => 
					id.toString() === parentId
				)) {
					marketplace.activeRaIds.push(new Types.ObjectId(parentId));
				}
			}
		}

		await marketplace.save();

		return res.status(200).json({
			success: true,
			message: `Invitation ${action}ed successfully`,
			data: {
				marketplaceId: marketplace._id,
				marketplaceName: marketplace.name,
				status: newStatus,
			},
		});
	} catch (error) {
		console.error("Failed to respond to invitation:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to respond to invitation",
		});
	}
};

// Get single marketplace by ID or slug with full details or specific type data
// Public endpoint - no authentication required
export const getSingleMarketplaceController = async (
	req: Request,
	res: Response,
) => {
	const { marketplaceId } = req.params;
	const typeParam = req.query.type as string | undefined;

	const isObjectId = Types.ObjectId.isValid(marketplaceId);
	const findQuery = isObjectId
		? { _id: marketplaceId }
		: { slug: marketplaceId };

	// Pagination params
	const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
	const limit = Math.min(
		100,
		Math.max(1, Number.parseInt(req.query.limit as string, 10) || 10),
	);
	const skip = (page - 1) * limit;

	try {
		// If no type parameter, return marketplace details (original behavior)
		if (!typeParam) {
			const marketplace = await MarketplaceModel.findOne(findQuery)
				.populate({
					path: "activeRaIds",
					select: "name email RegName companyName profileUrl _id type addedby",
				})
				.populate({
					path: "invitations.raId",
					select: "name email RegName companyName profileUrl _id",
				})
				.lean();

			if (!marketplace) {
				return res.status(404).json({
					success: false,
					message: "Marketplace not found",
				});
			}

			return res.status(200).json({
				success: true,
				data: marketplace,
			});
		}

		// Validate type parameter
		const typeValidation = marketplaceTypeSchema.safeParse(typeParam);
		if (!typeValidation.success) {
			return res.status(400).json({
				success: false,
				message: "Invalid type parameter",
				validTypes: [
					"ra",
					"recommendations",
					"portfolio",
					"services",
					"articles",
					"algo_strategies",
					"lms",
					"subscribers",
					"events",
				],
			});
		}

		const type = typeValidation.data;

		// Fetch marketplace to get activeRaIds
		const marketplace = await MarketplaceModel.findOne(findQuery)
			.select("activeRaIds name")
			.lean();

		if (!marketplace) {
			return res.status(404).json({
				success: false,
				message: "Marketplace not found",
			});
		}

		const resolvedMarketplaceId = (marketplace as any)._id;

		// Convert activeRaIds to string array for filtering
		const activeRaIds = (marketplace as any).activeRaIds || [];
		const activeRaIdStrings = activeRaIds.map((id: Types.ObjectId) =>
			id.toString(),
		);

		// Handle different types
		switch (type) {
			case "ra": {
				// Pagination
				const totalCount = activeRaIdStrings.length;
				const paginatedRaIds = activeRaIdStrings.slice(skip, skip + limit);

				// Fetch RA documents (drop the cached `stats` field — we compute live below)
				const activeRAs = await ServiceProviderRegModel.find({
					_id: { $in: paginatedRaIds },
				})
					.select(
						"name email RegName companyName profileUrl companyLogo regNumber type category city state website description AboutMe verified approved socials addedby _id createdAt",
					)
					.lean();

				// Expand to include sub-profiles for Non-Individual RAs (matches other cases)
				const expandedAuthorIds = await getAllRelevantRAIds(paginatedRaIds);

				// Build a parent → family map so we can sum sub-profile counts back to the parent.
				// For Individual RAs, family === [self]; for Non-Individual, family includes sub-profiles.
				const familyMap: Record<string, string[]> = {};
				for (const raId of paginatedRaIds) {
					familyMap[raId] = await getAllRelevantRAIds([raId]);
				}

				// Cast expanded ids to ObjectIds for the Course query (uses ObjectId ref, not string)
				const expandedObjectIds = expandedAuthorIds
					.filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
					.map((id) => new Types.ObjectId(id));

				// Run all stat aggregations in parallel.
				// NOTE: These show GLOBAL counts across the entire platform per RA
				// (not scoped to this marketplace) so subscribers see the expert's full reach.
				const [
					tradingIdeasAgg,
					plansAgg,
					portfoliosAgg,
					coursesAgg,
					articlesAgg,
					eventsAgg,
					subscribersAgg,
				] = await Promise.all([
					// Trading Ideas: ALL scorecards (open + closed) by this RA
					ScoreCardModel.aggregate([
						{
							$match: {
								"authorData.id": { $in: expandedAuthorIds },
							},
						},
						{
							$group: {
								_id: "$authorData.id",
								total: { $sum: 1 },
								open: {
									$sum: {
										$cond: [{ $eq: ["$status", "open"] }, 1, 0],
									},
								},
								close: {
									$sum: {
										$cond: [{ $eq: ["$status", "closed"] }, 1, 0],
									},
								},
							},
						},
					]),

					// Plans: ALL services by this RA (no approval filter, no marketplace filter)
					ServiceModel.aggregate([
						{
							$match: {
								"authorData.id": { $in: expandedAuthorIds },
							},
						},
						{ $group: { _id: "$authorData.id", count: { $sum: 1 } } },
					]),

					// Portfolios: ALL portfolios by this RA
					Portfolio.aggregate([
						{
							$match: {
								"authorData.id": { $in: expandedAuthorIds },
							},
						},
						{ $group: { _id: "$authorData.id", count: { $sum: 1 } } },
					]),

					// Courses: ALL courses by this RA (no status filter, no marketplace filter)
					// CourseModel uses `instructorId` (ObjectId), not `authorData.id`
					CourseModel.aggregate([
						{
							$match: {
								instructorId: { $in: expandedObjectIds },
							},
						},
						{ $group: { _id: "$instructorId", count: { $sum: 1 } } },
					]),

					// Articles: ALL articles by this RA
					ArticleModel.aggregate([
						{
							$match: {
								"authorData.id": { $in: expandedAuthorIds },
							},
						},
						{ $group: { _id: "$authorData.id", count: { $sum: 1 } } },
					]),

					// Events: ALL events by this RA (no approval filter, no marketplace filter)
					EventModel.aggregate([
						{
							$match: {
								"authorData.id": { $in: expandedAuthorIds },
							},
						},
						{ $group: { _id: "$authorData.id", count: { $sum: 1 } } },
					]),

					// Subscribers: unique users across ALL of this RA's services
					ServiceModel.aggregate([
						{
							$match: {
								"authorData.id": { $in: expandedAuthorIds },
							},
						},
						{ $unwind: { path: "$subscribedBy", preserveNullAndEmptyArrays: false } },
						{
							$group: {
								_id: "$authorData.id",
								subs: { $addToSet: "$subscribedBy" },
							},
						},
						{ $project: { count: { $size: "$subs" } } },
					]),
				]);

				// Build lookup maps: author id → count
				const toMap = (arr: any[]): Record<string, number> =>
					Object.fromEntries(arr.map((r: any) => [String(r._id), r.count]));

				// Trading ideas has 3 fields per entry (total/open/close), needs special handling
				const tradingIdeasMap: Record<
					string,
					{ total: number; open: number; close: number }
				> = Object.fromEntries(
					(tradingIdeasAgg as any[]).map((r) => [
						String(r._id),
						{ total: r.total || 0, open: r.open || 0, close: r.close || 0 },
					]),
				);

				const plansMap = toMap(plansAgg);
				const portfoliosMap = toMap(portfoliosAgg);
				const coursesMap = toMap(coursesAgg);
				const articlesMap = toMap(articlesAgg);
				const eventsMap = toMap(eventsAgg);
				const subscribersMap = toMap(subscribersAgg);

				// For each RA, sum counts across its family (parent + sub-profiles)
				const sumFamily = (
					map: Record<string, number>,
					family: string[],
				): number =>
					family.reduce((acc, id) => acc + (map[id] || 0), 0);

				// Sum trading ideas (multi-field) across family
				const sumTradingIdeas = (family: string[]) => {
					let total = 0,
						open = 0,
						close = 0;
					for (const id of family) {
						const v = tradingIdeasMap[id];
						if (v) {
							total += v.total;
							open += v.open;
							close += v.close;
						}
					}
					return { total, open, close };
				};

				// Attach computed marketplace-scoped stats to each RA (legacy stats shape preserved)
				const enriched = activeRAs.map((ra: any) => {
					const family = familyMap[ra._id.toString()] || [ra._id.toString()];
					const articlesCount = sumFamily(articlesMap, family);
					const eventsCount = sumFamily(eventsMap, family);
					const plansCount = sumFamily(plansMap, family);
					const subscribersCount = sumFamily(subscribersMap, family);
					const ti = sumTradingIdeas(family);
					const portfoliosCount = sumFamily(portfoliosMap, family);
					const coursesCount = sumFamily(coursesMap, family);

					return {
						...ra,
						stats: {
							Followers: [],
							Following: [],
							Subscribers: [],
							contentStats: {
								articles: articlesCount,
								videos: 0,
								podcasts: 0,
								events: eventsCount,
								services: plansCount,
							},
							serviceStats: {
								totalPlans: plansCount,
								totalSubscribers: subscribersCount,
								totalLeads: 0,
							},
							recommendationStats: {
								total: ti.total,
								open: ti.open,
								close: ti.close,
								returnRatio: 0,
								returnPercentage: 0,
							},
							modelPortfolioStates: {
								totalPortfolios: portfoliosCount,
								activePortfolios: 0,
								closedPortfolios: 0,
								totalSubscribers: 0,
								avgReturnPercentage: 0,
								avgRiskLevel: 0,
							},
							courseStates: {
								totalCourses: coursesCount,
								publishedCourses: coursesCount,
								draftCourses: 0,
								totalEnrollments: 0,
								totalRevenue: 0,
							},
						},
					};
				});

				const totalPages = Math.ceil(totalCount / limit);

				return res.status(200).json({
					success: true,
					data: enriched,
					pagination: {
						currentPage: page,
						totalPages,
						totalCount,
						limit,
						hasNextPage: page < totalPages,
						hasPrevPage: page > 1,
					},
				});
			}
        

			case "recommendations": {
				// Get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
				const allAuthorIds = await getAllRelevantRAIds(activeRaIdStrings);
				
				const baseQuery: any = {
					"authorData.id": { $in: allAuthorIds },
					shareWithMarketplaces: resolvedMarketplaceId,
				};

				const totalCount = await ScoreCardModel.countDocuments(baseQuery);
				const recommendations = await ScoreCardModel.find(baseQuery)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.lean();

				const totalPages = Math.ceil(totalCount / limit);

				return res.status(200).json({
					success: true,
					data: recommendations,
					pagination: {
						currentPage: page,
						totalPages,
						totalCount,
						limit,
						hasNextPage: page < totalPages,
						hasPrevPage: page > 1,
					},
				});
			}

			case "portfolio": {
				// Get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
				const allAuthorIds = await getAllRelevantRAIds(activeRaIdStrings);
				
				const baseQuery: any = {
					"authorData.id": { $in: allAuthorIds },
					shareWithMarketplaces: resolvedMarketplaceId,
				};

				const totalCount = await Portfolio.countDocuments(baseQuery);
				const portfolios = await Portfolio.find(baseQuery)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.lean();

				const totalPages = Math.ceil(totalCount / limit);
            

				return res.status(200).json({
					success: true,
					data: portfolios,
					pagination: {
						currentPage: page,
						totalPages,
						totalCount,
						limit,
						hasNextPage: page < totalPages,
						hasPrevPage: page > 1,
					},
				});
			}

			case "services": {
				// Get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
				const allAuthorIds = await getAllRelevantRAIds(activeRaIdStrings);
				
				const baseQuery: any = {
					"authorData.id": { $in: allAuthorIds },
					shareWithMarketplaces: resolvedMarketplaceId,
					approvalStatus: true,
				};

				const totalCount = await ServiceModel.countDocuments(baseQuery);
				const services = await ServiceModel.find(baseQuery)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.lean();

				// Aggregate call stats (active/closed/total) per service from scorecards
				const serviceIds = services.map((s: any) => s._id.toString());
				let callStatsMap: Record<string, { activeCalls: number; closedCalls: number; totalCalls: number }> = {};
				if (serviceIds.length > 0) {
					const callStats = await ScoreCardModel.aggregate([
						{ $match: { shareWithPlans: { $in: serviceIds } } },
						{ $unwind: "$shareWithPlans" },
						{ $match: { shareWithPlans: { $in: serviceIds } } },
						{
							$group: {
								_id: "$shareWithPlans",
								totalCalls: { $sum: 1 },
								activeCalls: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
								closedCalls: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
							},
						},
					]);
					for (const stat of callStats) {
						callStatsMap[stat._id] = {
							activeCalls: stat.activeCalls,
							closedCalls: stat.closedCalls,
							totalCalls: stat.totalCalls,
						};
					}
				}

				const servicesWithStats = services.map((s: any) => ({
					...s,
					callStats: callStatsMap[s._id.toString()] || { activeCalls: 0, closedCalls: 0, totalCalls: 0 },
				}));

				const totalPages = Math.ceil(totalCount / limit);

				return res.status(200).json({
					success: true,
					data: servicesWithStats,
					pagination: {
						currentPage: page,
						totalPages,
						totalCount,
						limit,
						hasNextPage: page < totalPages,
						hasPrevPage: page > 1,
					},
				});
			}

			case "articles": {
				// Get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
				const allAuthorIds = await getAllRelevantRAIds(activeRaIdStrings);
				
				const baseQuery: any = {
					"authorData.id": { $in: allAuthorIds },
					shareWithMarketplaces: resolvedMarketplaceId,
				};

				const totalCount = await ArticleModel.countDocuments(baseQuery);
				const articles = await ArticleModel.find(baseQuery)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.lean();

				const totalPages = Math.ceil(totalCount / limit);

				return res.status(200).json({
					success: true,
					data: articles,
					pagination: {
						currentPage: page,
						totalPages,
						totalCount,
						limit,
						hasNextPage: page < totalPages,
						hasPrevPage: page > 1,
					},
				});
			}

			case "events": {
				// Get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
				const allAuthorIds = await getAllRelevantRAIds(activeRaIdStrings);
				
				const baseQuery: any = {
					"authorData.id": { $in: allAuthorIds },
					shareWithMarketplaces: resolvedMarketplaceId,
					approvalStatus: true,
				};

				const totalCount = await EventModel.countDocuments(baseQuery);
				const events = await EventModel.find(baseQuery)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.lean();

				const totalPages = Math.ceil(totalCount / limit);

				return res.status(200).json({
					success: true,
					data: events,
					pagination: {
						currentPage: page,
						totalPages,
						totalCount,
						limit,
						hasNextPage: page < totalPages,
						hasPrevPage: page > 1,
					},
				});
			}
			case "lms": {
				// Courses: filter by marketplace share and published status (no authorData/approvalStatus)
				const baseQuery: any = {
					shareWithMarketplaces: resolvedMarketplaceId,
					status: "published",
				};

				const totalCount = await CourseModel.countDocuments(baseQuery);
				const courses = await CourseModel.find(baseQuery)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.lean();

				const totalPages = Math.ceil(totalCount / limit);

				return res.status(200).json({
					success: true,
					data: courses,
					pagination: {
						currentPage: page,
						totalPages,
						totalCount,
						limit,
						hasNextPage: page < totalPages,
						hasPrevPage: page > 1,
					},
				});
			}

			case "algo_strategies":
			case "subscribers": {
				return res.status(200).json({
					success: true,
					message: "Coming soon",
				});
			}

			default: {
				return res.status(400).json({
					success: false,
					message: "Invalid type parameter",
				});
			}
		}
	} catch (error) {
		console.error("Failed to fetch marketplace data:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch marketplace data",
		});
	}
};

// Helper function to get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
export const getAllRelevantRAIds = async (raIds: string[]): Promise<string[]> => {
	if (!raIds.length) return [];
	
	let allIds = [...raIds];
	
	// Find Non-Individual RAs among the provided IDs
	const nonIndividualRAs = await ServiceProviderRegModel.find({
		_id: { $in: raIds },
		type: "Non Individual",
		category: "Research Analyst"
	}).select("_id").lean();
	
	if (nonIndividualRAs.length > 0) {
		const nonIndividualIds = nonIndividualRAs.map((ra: any) => ra._id.toString());
		
		// Find all sub-profiles of these Non-Individual RAs
		const subProfiles = await ServiceProviderRegModel.find({
			"addedby.id": { $in: nonIndividualIds },
			type: "sub profile",
			category: "Research Analyst"
		}).select("_id").lean();
		
		const subProfileIds = subProfiles.map((sp: any) => sp._id.toString());
		allIds = [...allIds, ...subProfileIds];
	}
	
	// Remove duplicates
	return Array.from(new Set(allIds));
};

export const getAllMarketplacesController = async (
	req: Request,
	res: Response,
) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			message: "Unauthorized - User context missing",
		});
	}

	const actor = req.user as { 
		category?: string; 
		_id?: string; 
		id?: string;
	};
	const userId = actor._id || actor.id;
	const userCategory = actor.category;

	// Pagination params
	const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
	const limit = Math.min(
		100,
		Math.max(1, Number.parseInt(req.query.limit as string, 10) || 10),
	);
	const skip = (page - 1) * limit;

	// Search params
	const searchQuery = ((req.query.search as string) || "").trim();

	try {
		// First, get the user's full profile
		let userProfile: any = null;
		let userType = "";
		let parentId :any= null;
		
		if (userId) {
			userProfile = await ServiceProviderRegModel.findById(userId)
				.select("type addedby category")
				.lean();
			
			if (userProfile) {
				userType = userProfile.type || "";
				parentId = userProfile.addedby?.id;
			}
		}

		// Build base query based on user role
		const baseQuery: any = { status: "active" };

		// IMPORTANT: Different logic for different user roles
		if (userCategory === "Broker") {
			// Brokers see marketplaces they created
			baseQuery.createdByBrokerId = new Types.ObjectId(userId);
		} else if (userCategory === "Research Analyst") {
			// For Research Analysts, we need to handle different types
			
			// Get all relevant user IDs to check
			const userIdsToCheck: Types.ObjectId[] = [new Types.ObjectId(userId)];
			
			// If user is a sub-profile, also include their parent RA ID
			if (userType === "sub profile" && parentId) {
				userIdsToCheck.push(new Types.ObjectId(parentId));
			}
			
			// If user is Non-Individual, also get all their sub-profiles
			if (userType === "Non Individual") {
				// Find all sub-profiles of this Non-Individual RA
				const subProfiles = await ServiceProviderRegModel.find({
					"addedby.id": userId,
					type: "sub profile",
					category: "Research Analyst"
				}).select("_id").lean();
				
				// Add sub-profile IDs to the list
				subProfiles.forEach((subProfile: any) => {
					userIdsToCheck.push(subProfile._id);
				});
			}

			// Create $or conditions for all relevant user IDs
			const orConditions: any[] = [];
			
			userIdsToCheck.forEach(userIdObj => {
				orConditions.push(
					{ activeRaIds: userIdObj }
				);
			});

			// Remove duplicates from orConditions
			const uniqueOrConditions = orConditions.length > 0 
				? Array.from(new Set(orConditions.map(cond => JSON.stringify(cond))))
					.map(str => JSON.parse(str))
				: [];

			if (uniqueOrConditions.length > 0) {
				baseQuery.$or = uniqueOrConditions;
			} else {
				// If no conditions, return empty
				return res.status(200).json({
					success: true,
					data: [],
					pagination: {
						currentPage: page,
						totalPages: 0,
						totalCount: 0,
						limit,
						hasNextPage: false,
						hasPrevPage: false,
					},
				});
			}
		} else {
			// For other categories (PMS, AIF, etc.) - use standard logic
			baseQuery.activeRaIds = new Types.ObjectId(userId);
		}

		// Add search filters if search query exists
		if (searchQuery) {
			const searchConditions: any[] = [
				{ name: { $regex: searchQuery, $options: "i" } },
				{ description: { $regex: searchQuery, $options: "i" } },
				{ "brokerSnapshot.name": { $regex: searchQuery, $options: "i" } },
			];

			const searchQueryObj = { $or: searchConditions };
			
			// Handle combining search with existing query
			if (baseQuery.$or) {
				baseQuery.$and = [
					{ $or: baseQuery.$or },
					searchQueryObj
				];
				delete baseQuery.$or;
			} else {
				baseQuery.$or = searchConditions;
			}
		}

		// Get total count for pagination
		const totalCount = await MarketplaceModel.countDocuments(baseQuery);

		// Fetch marketplaces without populating RA details
		const marketplaces = await MarketplaceModel.find(baseQuery)
			.select(
				"name description slug brokerSnapshot activeRaIds createdAt updatedAt createdByBrokerId",
			)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		// Format response for card layout
		const formattedMarketplaces = marketplaces.map((marketplace: any) => {
			// Check if current user is directly in activeRaIds
			const isDirectMember = marketplace.activeRaIds?.some((id: any) => 
				id?.toString() === userId?.toString()
			) || false;
			
			// Check if user is in activeRaIds through parent (for sub-profiles)
			let isMemberThroughParent = false;
			if (userType === "sub profile" && parentId) {
				isMemberThroughParent = marketplace.activeRaIds?.some((id: any) => 
					id?.toString() === parentId
				) || false;
			}

			return {
				id: marketplace._id,
				name: marketplace.name,
				description: marketplace.description,
				slug: marketplace.slug,
				broker: {
					name: marketplace.brokerSnapshot?.name || "Unknown Broker",
					email: marketplace.brokerSnapshot?.email,
					profileUrl: marketplace.brokerSnapshot?.profileUrl,
				},
				activeRAsCount: (marketplace.activeRaIds || []).length,
				createdAt: marketplace.createdAt,
				updatedAt: marketplace.updatedAt,
				createdByBrokerId: marketplace.createdByBrokerId,
				// Membership info
				isMember: isDirectMember || isMemberThroughParent,
				membershipType: isDirectMember ? "direct" : 
								isMemberThroughParent ? "through_parent" : "none",
				userType: userType,
			};
		});

		// Pagination metadata
		const totalPages = Math.ceil(totalCount / limit);
		const hasNextPage = page < totalPages;
		const hasPrevPage = page > 1;

		return res.status(200).json({
			success: true,
			data: formattedMarketplaces,
			pagination: {
				currentPage: page,
				totalPages,
				totalCount,
				limit,
				hasNextPage,
				hasPrevPage,
			},
		});
	} catch (error) {
		console.error("Failed to fetch marketplaces:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch marketplaces",
		});
	}
};


// Update a marketplace (broker only)
export const updateMarketplaceController = async (
	req: Request,
	res: Response,
) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			message: "Unauthorized - User context missing",
		});
	}

	const actor = req.user as { category?: string; _id?: string; id?: string };
	const brokerId = actor._id || actor.id;
	const userCategory = (actor.category || "");

	if (userCategory !== "Broker") {
		return res.status(403).json({
			success: false,
			message: "Only brokers can update marketplaces",
		});
	}

	const { marketplaceId } = req.params;

	// Validate marketplace ID
	if (!Types.ObjectId.isValid(marketplaceId)) {
		return res.status(400).json({
			success: false,
			message: "Invalid marketplace ID",
		});
	}

	const parsedBody = updateMarketplaceBodySchema.safeParse(req.body);

	if (!parsedBody.success) {
		return res.status(400).json({
			success: false,
			message: "Invalid input",
			errors: parsedBody.error.flatten(),
		});
	}

	const { name, description, removeRaIds, invitedRaIds, footerConfig, faqs } = parsedBody.data;

	// Check if at least one field is provided
	if (!name && description === undefined && !removeRaIds && !invitedRaIds && footerConfig === undefined && faqs === undefined) {
		return res.status(400).json({
			success: false,
			message:
				"At least one field (name, description, removeRaIds, invitedRaIds, footerConfig, or faqs) must be provided",
		});
	}

	try {
		const marketplace = await MarketplaceModel.findById(marketplaceId);

		if (!marketplace) {
			return res.status(404).json({
				success: false,
				message: "Marketplace not found",
			});
		}

		// Check if the broker is the creator of this marketplace
		if (marketplace.createdByBrokerId.toString() !== brokerId?.toString()) {
			console.log(marketplace.createdByBrokerId)
			console.log(brokerId)
			return res.status(403).json({
				success: false,
				message: "You can only update marketplaces you created",
			});
		}

		// Check if new name conflicts with existing marketplace
		if (name && name !== marketplace.name) {
			const existingMarketplace = await MarketplaceModel.findOne({
				name: new RegExp(`^${name}$`, "i"),
				_id: { $ne: marketplaceId },
			});

			if (existingMarketplace) {
				return res.status(409).json({
					success: false,
					message: "Marketplace with this name already exists",
				});
			}
 
			// Update name and regenerate slug
			marketplace.name = name;
			marketplace.slug = await generateUniqueSlug(name);
		}

		// Update description if provided
		if (description !== undefined) {
			marketplace.description = description;
		}

		// Update footer config if provided
		if (footerConfig !== undefined) {
			marketplace.footerConfig = footerConfig;
		}

		// Update FAQs if provided
		if (faqs !== undefined) {
			marketplace.faqs = faqs;
		}

		// Handle adding new RAs
		if (invitedRaIds && invitedRaIds.length > 0) {
			const invitedRaIdsRaw = invitedRaIds.map((id) => id.trim());
			const invalidIds = invitedRaIdsRaw.filter(
				(id) => !Types.ObjectId.isValid(id),
			);

			if (invalidIds.length > 0) {
				return res.status(400).json({
					success: false,
					message: "Invalid RA id format",
					invalidIds,
				});
			}

			const invitedRaIdsSet = new Set(invitedRaIdsRaw);
			const brokerIdString = brokerId?.toString();

			// Check if broker is trying to invite themselves
			if (invitedRaIdsSet.has(brokerIdString || "")) {
				return res.status(400).json({
					success: false,
					message: "Broker cannot invite themselves",
				});
			}

			// Verify all RAs exist
			const raProfiles = await ServiceProviderRegModel.find({
				_id: { $in: Array.from(invitedRaIdsSet) },
			}).select("_id");

			const foundRaIds = new Set(raProfiles.map((ra) => ra._id.toString()));
			const missingRaIds = Array.from(invitedRaIdsSet).filter(
				(id) => !foundRaIds.has(id),
			);

			if (missingRaIds.length > 0) {
				return res.status(404).json({
					success: false,
					message: "Some RA profiles were not found",
					missingRaIds,
				});
			}

			// Add new invitations for RAs that don't already have one
			for (const raIdStr of invitedRaIdsSet) {
				const existingInvitation = marketplace.invitations.find(
					(inv: any) => inv.raId?.toString() === raIdStr,
				);

				if (!existingInvitation) {
					marketplace.invitations.push({
						raId: new Types.ObjectId(raIdStr),
					} as any);
				}
			}
		}

		// Handle removing RAs
		if (removeRaIds && removeRaIds.length > 0) {
			const removeRaIdsRaw = removeRaIds.map((id) => id.trim());
			const invalidIds = removeRaIdsRaw.filter(
				(id) => !Types.ObjectId.isValid(id),
			);

			if (invalidIds.length > 0) {
				return res.status(400).json({
					success: false,
					message: "Invalid RA id format",
					invalidIds,
				});
			}

			const removeRaIdsSet = new Set(removeRaIdsRaw);

			for (const raIdStr of removeRaIdsSet) {
				const raObjectId = new Types.ObjectId(raIdStr);

				// Remove from activeRaIds
				marketplace.activeRaIds = marketplace.activeRaIds.filter(
					(id: any) => id.toString() !== raIdStr,
				);

				// Add to revokedRaIds if not already there
				if (
					!marketplace.revokedRaIds.some((id: any) => id.toString() === raIdStr)
				) {
					marketplace.revokedRaIds.push(raObjectId);
				}

				// Update invitation status to "revoked"
				const invitationIndex = marketplace.invitations.findIndex(
					(inv: any) => inv.raId?.toString() === raIdStr,
				);

				if (invitationIndex !== -1) {
					marketplace.invitations[invitationIndex].status = "revoked";
					marketplace.invitations[invitationIndex].respondedAt = new Date();
				}
			}
		}

		await marketplace.save();

		return res.status(200).json({
			success: true,
			message: "Marketplace updated successfully",
			data: marketplace,
		});
	} catch (error) {
		console.error("Failed to update marketplace:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to update marketplace",
		});
	}
};

// Delete a marketplace (broker only)
export const deleteMarketplaceController = async (
	req: Request,
	res: Response,
) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			message: "Unauthorized - User context missing",
		});
	}

	const actor = req.user as { 
		category?: string;
		role?: string; 
		_id?: string; 
		id?: string;
	};
	const brokerId = actor._id || actor.id;
	const userCategory = actor.category || "";

	if (userCategory !== "Broker") {
		return res.status(403).json({
			success: false,
			message: "Only brokers can delete marketplaces",
		});
	}

	const { marketplaceId } = req.params;

	// Validate marketplace ID
	if (!Types.ObjectId.isValid(marketplaceId)) {
		return res.status(400).json({
			success: false,
			message: "Invalid marketplace ID",
		});
	}

	try {
		const marketplace = await MarketplaceModel.findById(marketplaceId);

		if (!marketplace) {
			return res.status(404).json({
				success: false,
				message: "Marketplace not found",
			});
		}

		// Check if the broker is the creator of this marketplace
		if (marketplace.createdByBrokerId.toString() !== brokerId?.toString()) {
			return res.status(403).json({
				success: false,
				message: "You can only delete marketplaces you created",
			});
		}

		// Hard delete the marketplace
		await MarketplaceModel.findByIdAndDelete(marketplaceId);

		return res.status(200).json({
			success: true,
			message: "Marketplace deleted successfully",
			data: {
				marketplaceId: marketplace._id,
				marketplaceName: marketplace.name,
			},
		});
	} catch (error) {
		console.error("Failed to delete marketplace:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to delete marketplace",
		});
	}
};

// ─── Broker Dashboard APIs ──────────────────────────────────────────────

export const getBrokerSubscribers = async (req: Request, res: Response) => {
	if (!req.user) {
		return res.status(401).json({ success: false, message: "Unauthorized" });
	}

	const actor = req.user as { category?: string; _id?: string; id?: string };
	const brokerId = actor._id || actor.id;

	if ((actor.category || "") !== "Broker") {
		return res.status(403).json({ success: false, message: "Only brokers can access this" });
	}

	try {
		const marketplaces = await MarketplaceModel.find({ createdByBrokerId: brokerId })
			.select("_id name")
			.lean();

		if (!marketplaces.length) {
			return res.status(200).json({ success: true, data: [], count: 0 });
		}

		const marketplaceIds = marketplaces.map((m: any) => m._id.toString());
		const marketplaceNameMap: Record<string, string> = {};
		marketplaces.forEach((m: any) => { marketplaceNameMap[m._id.toString()] = m.name; });

		const orders = await OrderModel.find({
			marketplaceId: { $in: marketplaceIds },
			paymentStatus: "verified",
		})
			.sort({ createdAt: -1 })
			.lean();

		const userIds = [...new Set(orders.map((o: any) => o.orderdBy?.id).filter(Boolean))];
		const users = await UserModel.find({ _id: { $in: userIds } })
			.select("name email number lastSeenAt")
			.lean();
		const userMap: Record<string, any> = {};
		users.forEach((u: any) => { userMap[u._id.toString()] = u; });

		const data = orders.map((order: any) => {
			const user = userMap[order.orderdBy?.id] || null;
			return {
				_id: order._id,
				serviceName: order.serviceName,
				// Raw subscriber userId so the frontend can key presence (and future
				// socket deltas) — the name/email/phone fields below aren't unique.
				userId: order.orderdBy?.id || null,
				lastSeenAt: user?.lastSeenAt || null,
				isOnline: isOnline(user?.lastSeenAt),
				userName: user?.name || order.orderdBy?.name || "N/A",
				userEmail: user?.email || order.orderdBy?.email || "N/A",
				userPhone: user?.number || "N/A",
				amount: order.total,
				subtotal: order.subtotal,
				brokerCommission: order.brokerCommission || 0,
				marketplaceName: marketplaceNameMap[order.marketplaceId] || "N/A",
				marketplaceId: order.marketplaceId,
				purchaseDate: order.createdAt,
				startDate: order.startDate,
				endDate: order.endDate,
				isExpired: order.isExpired,
				paymentStatus: order.paymentStatus,
				validity: order.validity,
				soldBy: order.soldBy,
			};
		});

		return res.status(200).json({ success: true, data, count: data.length });
	} catch (error) {
		console.error("Failed to fetch broker subscribers:", error);
		return res.status(500).json({ success: false, message: "Failed to fetch subscribers" });
	}
};

export const getBrokerLeads = async (req: Request, res: Response) => {
	if (!req.user) {
		return res.status(401).json({ success: false, message: "Unauthorized" });
	}

	const actor = req.user as { category?: string; _id?: string; id?: string };
	const brokerId = actor._id || actor.id;

	if ((actor.category || "") !== "Broker") {
		return res.status(403).json({ success: false, message: "Only brokers can access this" });
	}

	try {
		const marketplaces = await MarketplaceModel.find({ createdByBrokerId: brokerId })
			.select("_id name activeRaIds")
			.lean();

		if (!marketplaces.length) {
			return res.status(200).json({ success: true, data: [], count: 0 });
		}

		const allRaIds = [...new Set(
			marketplaces.flatMap((m: any) => (m.activeRaIds || []).map((id: any) => id.toString()))
		)];

		const expandedRaIds = await getAllRelevantRAIds(allRaIds);

		const leads = await LeadModel.find({
			providerId: { $in: expandedRaIds },
			status: { $nin: ["payment_success", "converted"] },
		})
			.sort({ createdAt: -1 })
			.lean();

		const userIds = [...new Set(leads.map((l: any) => l.userId).filter(Boolean))];
		const serviceIds = [...new Set(leads.map((l: any) => l.serviceId).filter(Boolean))];

		const [usersArr, servicesArr, portfoliosArr, rasArr] = await Promise.all([
			UserModel.find({ _id: { $in: userIds } }).select("name email number").lean(),
			ServiceModel.find({ _id: { $in: serviceIds } }).select("title authorData").lean(),
			Portfolio.find({ _id: { $in: serviceIds } }).select("portfolioName authorData").lean(),
			ServiceProviderRegModel.find({ _id: { $in: expandedRaIds } }).select("name RegName companyName").lean(),
		]);

		const userMap: Record<string, any> = {};
		usersArr.forEach((u: any) => { userMap[u._id.toString()] = u; });

		const serviceMap: Record<string, any> = {};
		servicesArr.forEach((s: any) => { serviceMap[s._id.toString()] = s; });
		portfoliosArr.forEach((p: any) => { serviceMap[p._id.toString()] = p; });

		const raMap: Record<string, string> = {};
		rasArr.forEach((r: any) => { raMap[r._id.toString()] = r.RegName || r.name || r.companyName || "N/A"; });

		const data = leads.map((lead: any) => {
			const user = userMap[lead.userId] || null;
			const service = serviceMap[lead.serviceId] || null;
			return {
				_id: lead._id,
				type: lead.type,
				status: lead.status,
				serviceName: lead.type === "portfolio"
					? (service?.portfolioName || "N/A")
					: (service?.title || "N/A"),
				serviceProviderId: lead.providerId,
				serviceProviderName: raMap[lead.providerId] || "N/A",
				user: user ? { id: user._id, name: user.name, email: user.email, number: user.number } : null,
				createdAt: lead.createdAt,
				updatedAt: lead.updatedAt,
			};
		});

		return res.status(200).json({ success: true, data, count: data.length });
	} catch (error) {
		console.error("Failed to fetch broker leads:", error);
		return res.status(500).json({ success: false, message: "Failed to fetch leads" });
	}
};

export const getBrokerStats = async (req: Request, res: Response) => {
	if (!req.user) {
		return res.status(401).json({ success: false, message: "Unauthorized" });
	}

	const actor = req.user as { category?: string; _id?: string; id?: string };
	const brokerId = actor._id || actor.id;

	if ((actor.category || "") !== "Broker") {
		return res.status(403).json({ success: false, message: "Only brokers can access this" });
	}

	try {
		const marketplaces = await MarketplaceModel.find({ createdByBrokerId: brokerId })
			.select("_id activeRaIds")
			.lean();

		if (!marketplaces.length) {
			return res.status(200).json({
				success: true,
				data: {
					registeredRAs: 0,
					recommendations: 0,
					modelPortfolios: 0,
					services: 0,
					courses: 0,
					events: 0,
					totalMarketplaces: 0,
				},
			});
		}

		const marketplaceIds = marketplaces.map((m: any) => m._id);

		// Collect unique RA IDs across all marketplaces
		const uniqueRaIds = [
			...new Set(
				marketplaces.flatMap((m: any) =>
					(m.activeRaIds || []).map((id: any) => id.toString()),
				),
			),
		];

		// Expand RA IDs to include sub-profiles
		const expandedRaIds = await getAllRelevantRAIds(uniqueRaIds);

		// Run all count queries in parallel
		const [recommendations, modelPortfolios, services, courses, events] =
			await Promise.all([
				ScoreCardModel.countDocuments({
					"authorData.id": { $in: expandedRaIds },
					shareWithMarketplaces: { $in: marketplaceIds },
				}),
				Portfolio.countDocuments({
					"authorData.id": { $in: expandedRaIds },
					shareWithMarketplaces: { $in: marketplaceIds },
				}),
				ServiceModel.countDocuments({
					"authorData.id": { $in: expandedRaIds },
					shareWithMarketplaces: { $in: marketplaceIds },
					approvalStatus: true,
				}),
				CourseModel.countDocuments({
					shareWithMarketplaces: { $in: marketplaceIds },
					status: "published",
				}),
				EventModel.countDocuments({
					"authorData.id": { $in: expandedRaIds },
					shareWithMarketplaces: { $in: marketplaceIds },
					approvalStatus: true,
				}),
			]);

		return res.status(200).json({
			success: true,
			data: {
				registeredRAs: uniqueRaIds.length,
				recommendations,
				modelPortfolios,
				services,
				courses,
				events,
				totalMarketplaces: marketplaces.length,
			},
		});
	} catch (error) {
		console.error("Failed to fetch broker stats:", error);
		return res.status(500).json({ success: false, message: "Failed to fetch stats" });
	}
};

export const getBrokerProviders = async (req: Request, res: Response) => {
	if (!req.user) {
		return res.status(401).json({ success: false, message: "Unauthorized" });
	}

	const actor = req.user as { category?: string; _id?: string; id?: string };
	const brokerId = actor._id || actor.id;

	if ((actor.category || "") !== "Broker") {
		return res.status(403).json({ success: false, message: "Only brokers can access this" });
	}

	try {
		const marketplaces = await MarketplaceModel.find({ createdByBrokerId: brokerId })
			.select("_id name activeRaIds")
			.lean();

		if (!marketplaces.length) {
			return res.status(200).json({ success: true, data: [], count: 0 });
		}

		const raToMarketplaces: Record<string, string[]> = {};
		marketplaces.forEach((m: any) => {
			(m.activeRaIds || []).forEach((raId: any) => {
				const key = raId.toString();
				if (!raToMarketplaces[key]) raToMarketplaces[key] = [];
				raToMarketplaces[key].push(m.name);
			});
		});

		const uniqueRaIds = Object.keys(raToMarketplaces);

		if (!uniqueRaIds.length) {
			return res.status(200).json({ success: true, data: [], count: 0 });
		}

		const providers = await ServiceProviderRegModel.find({ _id: { $in: uniqueRaIds } })
			.select("name RegName companyName email number profileUrl regNumber type category city state verified approved stats services createdAt")
			.lean();

		const data = providers.map((p: any) => ({
			_id: p._id,
			name: p.RegName || p.name || p.companyName || "N/A",
			email: p.email,
			phone: p.number,
			profileUrl: p.profileUrl,
			regNumber: p.regNumber,
			type: p.type,
			category: p.category,
			city: p.city,
			state: p.state,
			verified: p.verified,
			approved: p.approved,
			subscriberCount: p.stats?.Subscribers?.length || 0,
			serviceCount: p.stats?.contentStats?.services || 0,
			marketplaces: raToMarketplaces[p._id.toString()] || [],
			createdAt: p.createdAt,
		}));

		return res.status(200).json({ success: true, data, count: data.length });
	} catch (error) {
		console.error("Failed to fetch broker providers:", error);
		return res.status(500).json({ success: false, message: "Failed to fetch providers" });
	}
};

// ─── Broker Analytics ────────────────────────────────────────────────────────

export const getBrokerAnalytics = async (req: Request, res: Response) => {
	if (!req.user) {
		return res.status(401).json({ success: false, message: "Unauthorized" });
	}

	const actor = req.user as { category?: string; _id?: string; id?: string };
	const brokerId = actor._id || actor.id;

	if ((actor.category || "") !== "Broker") {
		return res.status(403).json({ success: false, message: "Only brokers can access this" });
	}

	try {
		const marketplaces = await MarketplaceModel.find({ createdByBrokerId: brokerId })
			.select("_id name slug activeRaIds")
			.lean();

		if (!marketplaces.length) {
			return res.status(200).json({
				success: true,
				data: {
					overview: { totalMarketplaces: 0, totalRAs: 0, totalRecommendations: 0, activeRecommendations: 0, closedRecommendations: 0, totalServices: 0, totalPortfolios: 0, totalCourses: 0, totalEvents: 0, totalPackages: 0, totalArticles: 0 },
					revenue: { totalCommission: 0, totalServiceSales: 0, totalCourseSales: 0, totalSubscribers: 0, monthlySales: [] },
					recommendationStats: { total: 0, open: 0, closed: 0, avgPnlPercentage: 0, profitable: 0, stoplossHit: 0, timedOut: 0, byExchange: [] },
					providers: [],
					leads: { total: 0, converted: 0, abandoned: 0, conversionRate: 0, byStatus: [] },
					content: { articles: 0, events: 0, upcomingEvents: 0, eventRegistrations: 0, courses: 0, courseEnrollments: 0 },
					marketplaces: [],
				},
			});
		}

		const marketplaceIds = marketplaces.map((m: any) => m._id);
		const marketplaceIdStrings = marketplaceIds.map((id: any) => id.toString());

		const uniqueRaIds = [
			...new Set(
				marketplaces.flatMap((m: any) =>
					(m.activeRaIds || []).map((id: any) => id.toString()),
				),
			),
		];

		const expandedRaIds = await getAllRelevantRAIds(uniqueRaIds);

		// ── Six months ago boundary ──
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
		sixMonthsAgo.setDate(1);
		sixMonthsAgo.setHours(0, 0, 0, 0);

		const now = new Date();

		// ── Parallel queries ──
		const [
			recommendations,
			recsByResult,
			recsByExchange,
			recsPnl,
			services,
			portfolios,
			courses,
			events,
			articles,
			packages,
			upcomingEvents,
			eventRegistrations,
			courseEnrollments,
			monthlySalesAgg,
			totalCommissionAgg,
			courseSalesCount,
			leadsByStatus,
			providerDocs,
			// Per-marketplace breakdown queries
			recsPerMp,
			servicesPerMp,
			portfoliosPerMp,
		] = await Promise.all([
			// Recommendation counts
			ScoreCardModel.countDocuments({
				"authorData.id": { $in: expandedRaIds },
				shareWithMarketplaces: { $in: marketplaceIds },
			}),
			ScoreCardModel.aggregate([
				{ $match: { "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds } } },
				{ $group: { _id: "$result", count: { $sum: 1 } } },
			]),
			ScoreCardModel.aggregate([
				{ $match: { "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds } } },
				{ $group: { _id: { $toUpper: "$exchange" }, count: { $sum: 1 } } },
			]),
			ScoreCardModel.aggregate([
				{ $match: { "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds }, status: "closed", pnlpercentage: { $ne: null } } },
				{ $group: { _id: null, avg: { $avg: "$pnlpercentage" } } },
			]),

			// Content counts
			ServiceModel.countDocuments({ "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds }, approvalStatus: true }),
			Portfolio.countDocuments({ "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds } }),
			CourseModel.countDocuments({ shareWithMarketplaces: { $in: marketplaceIds }, status: "published" }),
			EventModel.countDocuments({ "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds }, approvalStatus: true }),
			ArticleModel.countDocuments({ "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds } }),
			PackageModel.countDocuments({ "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds }, activated: true }),

			// Events & courses engagement
			EventModel.countDocuments({ "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds }, schedule: { $gte: now } }),
			EventRegistrationModel.countDocuments({
				eventId: {
					$in: await EventModel.find({ "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds } }).distinct("_id"),
				},
			}),
			EnrollmentModel.countDocuments({
				courseId: {
					$in: await CourseModel.find({ shareWithMarketplaces: { $in: marketplaceIds }, status: "published" }).distinct("_id"),
				},
			}),

			// Monthly sales (last 6 months)
			OrderModel.aggregate([
				{ $match: { marketplaceId: { $in: marketplaceIdStrings }, createdAt: { $gte: sixMonthsAgo } } },
				{
					$group: {
						_id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
						orders: { $sum: 1 },
						revenue: { $sum: { $ifNull: ["$brokerCommission", 0] } },
					},
				},
				{ $sort: { _id: 1 } },
			]),

			// Total commission
			OrderModel.aggregate([
				{ $match: { marketplaceId: { $in: marketplaceIdStrings } } },
				{ $group: { _id: null, total: { $sum: { $ifNull: ["$brokerCommission", 0] } }, count: { $sum: 1 }, subscribers: { $addToSet: "$orderdBy.id" } } },
			]),

			// Course sales
			CourseOrderModel.countDocuments({
				courseId: {
					$in: await CourseModel.find({ shareWithMarketplaces: { $in: marketplaceIds } }).distinct("_id"),
				},
				status: "paid",
			}),

			// Leads by status
			LeadModel.aggregate([
				{ $match: { providerId: { $in: expandedRaIds } } },
				{ $group: { _id: "$status", count: { $sum: 1 } } },
			]),

			// Provider details
			ServiceProviderRegModel.find({ _id: { $in: uniqueRaIds } })
				.select("_id RegName name profileUrl category verified stats")
				.lean(),

			// Per-marketplace breakdowns
			ScoreCardModel.aggregate([
				{ $match: { "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds } } },
				{ $unwind: "$shareWithMarketplaces" },
				{ $match: { shareWithMarketplaces: { $in: marketplaceIds } } },
				{ $group: { _id: "$shareWithMarketplaces", count: { $sum: 1 } } },
			]),
			ServiceModel.aggregate([
				{ $match: { "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds }, approvalStatus: true } },
				{ $unwind: "$shareWithMarketplaces" },
				{ $match: { shareWithMarketplaces: { $in: marketplaceIds } } },
				{ $group: { _id: "$shareWithMarketplaces", count: { $sum: 1 } } },
			]),
			Portfolio.aggregate([
				{ $match: { "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds } } },
				{ $unwind: "$shareWithMarketplaces" },
				{ $match: { shareWithMarketplaces: { $in: marketplaceIds } } },
				{ $group: { _id: "$shareWithMarketplaces", count: { $sum: 1 } } },
			]),
		]);

		// ── Process results ──

		const openRecs = (recsByResult as any[]).find((r) => r._id === "open")?.count || 0;
		const closedRecs = recommendations - openRecs;
		const profitable = (recsByResult as any[]).find((r) => r._id === "tp")?.count || 0;
		const stoplossHit = (recsByResult as any[]).find((r) => r._id === "sl")?.count || 0;
		const timedOut = (recsByResult as any[]).find((r) => r._id === "timeout")?.count || 0;
		const avgPnl = (recsPnl as any[])[0]?.avg || 0;

		const commissionData = (totalCommissionAgg as any[])[0];
		const totalCommission = commissionData?.total || 0;
		const totalServiceSales = commissionData?.count || 0;
		const totalSubscribers = commissionData?.subscribers?.length || 0;

		// Fill monthly sales (ensure all 6 months present)
		const monthlySales: { month: string; orders: number; revenue: number }[] = [];
		for (let i = 5; i >= 0; i--) {
			const d = new Date();
			d.setMonth(d.getMonth() - i);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			const found = (monthlySalesAgg as any[]).find((m) => m._id === key);
			monthlySales.push({
				month: key,
				orders: found?.orders || 0,
				revenue: Math.round((found?.revenue || 0) * 100) / 100,
			});
		}

		// Leads
		const totalLeads = (leadsByStatus as any[]).reduce((sum, l) => sum + l.count, 0);
		const convertedLeads = (leadsByStatus as any[]).find((l) => l._id === "converted")?.count || 0;
		const abandonedLeads = (leadsByStatus as any[]).find((l) => l._id === "abandoned")?.count || 0;

		// Provider leaderboard
		const recsPerProvider = await ScoreCardModel.aggregate([
			{ $match: { "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds } } },
			{ $group: { _id: "$authorData.id", total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } } } },
		]);
		const servicesPerProvider = await ServiceModel.aggregate([
			{ $match: { "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds }, approvalStatus: true } },
			{ $group: { _id: "$authorData.id", count: { $sum: 1 }, subscribers: { $sum: { $size: { $ifNull: ["$subscribedBy", []] } } } } },
		]);
		const coursesPerProvider = await CourseModel.aggregate([
			{ $match: { instructorId: { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds }, status: "published" } },
			{ $group: { _id: "$instructorId", count: { $sum: 1 } } },
		]);
		const portfoliosPerProvider = await Portfolio.aggregate([
			{ $match: { "authorData.id": { $in: expandedRaIds }, shareWithMarketplaces: { $in: marketplaceIds } } },
			{ $group: { _id: "$authorData.id", count: { $sum: 1 } } },
		]);

		const toMap = (arr: any[], valKey = "count") =>
			Object.fromEntries(arr.map((a) => [a._id, a]));
		const recsMap = toMap(recsPerProvider);
		const svcMap = toMap(servicesPerProvider);
		const crsMap = toMap(coursesPerProvider);
		const ptfMap = toMap(portfoliosPerProvider);

		const providers = (providerDocs as any[]).map((p) => ({
			_id: p._id.toString(),
			name: p.RegName || p.name || "Unknown",
			profileUrl: p.profileUrl || "",
			category: p.category || "",
			verified: p.verified || false,
			recommendations: recsMap[p._id.toString()]?.total || 0,
			activeRecs: recsMap[p._id.toString()]?.active || 0,
			services: svcMap[p._id.toString()]?.count || 0,
			subscribers: svcMap[p._id.toString()]?.subscribers || 0,
			courses: crsMap[p._id.toString()]?.count || 0,
			portfolios: ptfMap[p._id.toString()]?.count || 0,
		}));

		// Per-marketplace breakdown
		const recsPerMpMap = toMap(recsPerMp as any[]);
		const svcPerMpMap = toMap(servicesPerMp as any[]);
		const ptfPerMpMap = toMap(portfoliosPerMp as any[]);

		const marketplaceBreakdown = marketplaces.map((m: any) => ({
			_id: m._id.toString(),
			name: m.name,
			slug: m.slug,
			raCount: (m.activeRaIds || []).length,
			recommendations: recsPerMpMap[m._id.toString()]?.count || 0,
			services: svcPerMpMap[m._id.toString()]?.count || 0,
			portfolios: ptfPerMpMap[m._id.toString()]?.count || 0,
		}));

		return res.status(200).json({
			success: true,
			data: {
				overview: {
					totalMarketplaces: marketplaces.length,
					totalRAs: uniqueRaIds.length,
					totalRecommendations: recommendations,
					activeRecommendations: openRecs,
					closedRecommendations: closedRecs,
					totalServices: services,
					totalPortfolios: portfolios,
					totalCourses: courses,
					totalEvents: events,
					totalPackages: packages,
					totalArticles: articles,
				},
				revenue: {
					totalCommission,
					totalServiceSales,
					totalCourseSales: courseSalesCount,
					totalSubscribers,
					monthlySales,
				},
				recommendationStats: {
					total: recommendations,
					open: openRecs,
					closed: closedRecs,
					avgPnlPercentage: Math.round(avgPnl * 100) / 100,
					profitable,
					stoplossHit,
					timedOut,
					byExchange: (recsByExchange as any[]).map((e) => ({ exchange: e._id, count: e.count })),
				},
				providers,
				leads: {
					total: totalLeads,
					converted: convertedLeads,
					abandoned: abandonedLeads,
					conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 10000) / 100 : 0,
					byStatus: (leadsByStatus as any[]).map((l) => ({ status: l._id, count: l.count })),
				},
				content: {
					articles,
					events,
					upcomingEvents,
					eventRegistrations,
					courses,
					courseEnrollments,
				},
				marketplaces: marketplaceBreakdown,
			},
		});
	} catch (error) {
		console.error("Failed to fetch broker analytics:", error);
		return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
	}
};

// ─── Marketplace Banner Controllers ─────────────────────────────────────────

const MAX_BANNERS = 10;

export const uploadMarketplaceBannersController = async (
	req: Request,
	res: Response,
) => {
	if (!req.user) {
		return res.status(401).json({ success: false, message: "Unauthorized" });
	}

	const actor = req.user as { category?: string; _id?: string; id?: string };
	const brokerId = actor._id || actor.id;

	if ((actor.category || "") !== "Broker") {
		return res.status(403).json({ success: false, message: "Only brokers can upload banners" });
	}

	const { marketplaceId } = req.params;
	if (!Types.ObjectId.isValid(marketplaceId)) {
		return res.status(400).json({ success: false, message: "Invalid marketplace ID" });
	}

	try {
		const marketplace = await MarketplaceModel.findById(marketplaceId);
		if (!marketplace) {
			return res.status(404).json({ success: false, message: "Marketplace not found" });
		}

		if (marketplace.createdByBrokerId.toString() !== brokerId?.toString()) {
			return res.status(403).json({ success: false, message: "You can only update marketplaces you created" });
		}

		const files = req.files as Express.MulterS3.File[];
		if (!files || files.length === 0) {
			return res.status(400).json({ success: false, message: "No files uploaded" });
		}

		const currentBanners: { imageUrl: string; ctaLink?: string }[] = marketplace.banners || [];
		const newBanners = files.map((f) => ({ imageUrl: f.location, ctaLink: "" }));

		if (currentBanners.length + newBanners.length > MAX_BANNERS) {
			return res.status(400).json({
				success: false,
				message: `Maximum ${MAX_BANNERS} banners allowed. You have ${currentBanners.length} and are trying to add ${newBanners.length}.`,
			});
		}

		marketplace.banners = [...currentBanners, ...newBanners];
		await marketplace.save();

		return res.status(200).json({
			success: true,
			message: "Banners uploaded successfully",
			data: { banners: marketplace.banners },
		});
	} catch (error) {
		console.error("Failed to upload banners:", error);
		return res.status(500).json({ success: false, message: "Failed to upload banners" });
	}
};

export const updateMarketplaceBannersController = async (
	req: Request,
	res: Response,
) => {
	if (!req.user) {
		return res.status(401).json({ success: false, message: "Unauthorized" });
	}

	const actor = req.user as { category?: string; _id?: string; id?: string };
	const brokerId = actor._id || actor.id;

	if ((actor.category || "") !== "Broker") {
		return res.status(403).json({ success: false, message: "Only brokers can update banners" });
	}

	const { marketplaceId } = req.params;
	const { banners } = req.body;

	if (!Types.ObjectId.isValid(marketplaceId)) {
		return res.status(400).json({ success: false, message: "Invalid marketplace ID" });
	}

	if (!Array.isArray(banners)) {
		return res.status(400).json({ success: false, message: "banners must be an array" });
	}

	try {
		const marketplace = await MarketplaceModel.findById(marketplaceId);
		if (!marketplace) {
			return res.status(404).json({ success: false, message: "Marketplace not found" });
		}

		if (marketplace.createdByBrokerId.toString() !== brokerId?.toString()) {
			return res.status(403).json({ success: false, message: "You can only update marketplaces you created" });
		}

		// Update CTA links (only allow updating ctaLink, not imageUrl)
		const currentBanners: { imageUrl: string; ctaLink?: string }[] = marketplace.banners || [];
		const updatedBanners = currentBanners.map((existing) => {
			const match = banners.find((b: any) => b.imageUrl === existing.imageUrl);
			if (match && typeof match.ctaLink === "string") {
				return { imageUrl: existing.imageUrl, ctaLink: match.ctaLink };
			}
			return existing;
		});

		marketplace.banners = updatedBanners;
		await marketplace.save();

		return res.status(200).json({
			success: true,
			message: "Banners updated successfully",
			data: { banners: marketplace.banners },
		});
	} catch (error) {
		console.error("Failed to update banners:", error);
		return res.status(500).json({ success: false, message: "Failed to update banners" });
	}
};

export const deleteMarketplaceBannerController = async (
	req: Request,
	res: Response,
) => {
	if (!req.user) {
		return res.status(401).json({ success: false, message: "Unauthorized" });
	}

	const actor = req.user as { category?: string; _id?: string; id?: string };
	const brokerId = actor._id || actor.id;

	if ((actor.category || "") !== "Broker") {
		return res.status(403).json({ success: false, message: "Only brokers can delete banners" });
	}

	const { marketplaceId } = req.params;
	const { imageUrl } = req.body;

	if (!Types.ObjectId.isValid(marketplaceId)) {
		return res.status(400).json({ success: false, message: "Invalid marketplace ID" });
	}

	if (!imageUrl || typeof imageUrl !== "string") {
		return res.status(400).json({ success: false, message: "imageUrl is required" });
	}

	try {
		const marketplace = await MarketplaceModel.findById(marketplaceId);
		if (!marketplace) {
			return res.status(404).json({ success: false, message: "Marketplace not found" });
		}

		if (marketplace.createdByBrokerId.toString() !== brokerId?.toString()) {
			return res.status(403).json({ success: false, message: "You can only update marketplaces you created" });
		}

		const currentBanners: { imageUrl: string; ctaLink?: string }[] = marketplace.banners || [];
		if (!currentBanners.some((b) => b.imageUrl === imageUrl)) {
			return res.status(404).json({ success: false, message: "Banner not found" });
		}

		// Delete from S3
		try {
			const decodedURL = decodeURIComponent(imageUrl);
			const keyStart = decodedURL.indexOf("MarketplaceBanners");
			if (keyStart !== -1) {
				await deleteObject(decodedURL.substring(keyStart));
			}
		} catch (s3Err) {
			console.error("S3 delete failed (continuing):", s3Err);
		}

		marketplace.banners = currentBanners.filter((b) => b.imageUrl !== imageUrl);
		await marketplace.save();

		return res.status(200).json({
			success: true,
			message: "Banner deleted successfully",
			data: { banners: marketplace.banners },
		});
	} catch (error) {
		console.error("Failed to delete banner:", error);
		return res.status(500).json({ success: false, message: "Failed to delete banner" });
	}
};