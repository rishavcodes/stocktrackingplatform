import type { Request, Response } from "express";
import { sendNotification } from "../helpers/sendNotification";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { notificationModel } from "../models/NotificationModel";
import {
	ArticleModel,
	EventModel,
	EventRegistrationModel,
	PodcastModel,
	ServiceModel,
	VideoModel,
} from "../models/PostModels";
import { tryCatch } from "bullmq";
import { userCanAccessArticlePdf } from "../helpers/articlePdfAccess";
import {
	InvalidArticlePdfError,
	WatermarkFailedError,
	fetchAndWatermarkArticlePdf,
	fetchRawArticlePdf,
} from "../helpers/articlePdfStream";
import { signArticlePdfShareToken } from "../helpers/articlePdfShareToken";

/**
 * Strip the raw S3 URL from outgoing article payloads so it never reaches
 * a viewer. Replaces `articlePDF` with a `hasArticlePDF` boolean so the
 * frontend can still toggle the "View PDF" CTA without learning the URL.
 *
 * Mongoose documents need `.toObject()` before destructuring, otherwise
 * `articlePDF` lives on the prototype and survives the spread.
 */
export function sanitizeArticleForResponse<T extends { articlePDF?: string } | null>(
	article: T
): T extends null ? null : Omit<NonNullable<T>, "articlePDF"> & { hasArticlePDF: boolean } {
	if (!article) return article as any;
	const plain =
		typeof (article as any).toObject === "function"
			? (article as any).toObject()
			: { ...(article as any) };
	const { articlePDF, ...rest } = plain;
	return {
		...rest,
		hasArticlePDF: typeof articlePDF === "string" && articlePDF.length > 0,
	} as any;
}

export function sanitizeArticleListForResponse(
	articles: Array<{ articlePDF?: string } | null>
) {
	return articles.map((a) => sanitizeArticleForResponse(a));
}

export const PostNewArticle = async (req: Request, res: Response) => {
	if (!req.body.data) {
		return res
			.status(400)
			.json({ success: false, message: "No Data provided" });
	}

	const expectedKeys = [
		"name",
		"email",
		"id",
		"title",
		"category",
		"content",
		"scheduleDate",
		"scheduleTime",
		"type",
		"language",
		"authorImage",
	];

	try {
		const parsedBody = JSON.parse(req.body.data);
		const allElementsPresent = expectedKeys.every((key) =>
			// biome-ignore lint/suspicious/noPrototypeBuiltins: <>
			Object.prototype.hasOwnProperty.call(parsedBody, key),
		);
		if (!allElementsPresent)
			return res
				.status(400)
				.json({ success: false, message: "All fields are required" });

		const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };

		const {
			id,
			name,
			email,
			title,
			category,
			content,
			scheduleDate,
			scheduleTime,
			type,
			language,
			link,
			authorImage,
			shareWith,
			shareWithPlans,
			shareWithMarketplaces,
		} = parsedBody;

		// Scheduling has been removed from the SP-facing form, so always stamp
		// the article with the server's current time. This guarantees the
		// article shows up on /postedarticles immediately after posting,
		// regardless of clock skew between the browser and the server, or the
		// timezone of the host. If scheduling is ever re-enabled, parse the
		// frontend-sent date+time as IST (`+05:30`) instead of falling here.
		const scheduledDateTime = new Date().toISOString();

		const newArticle = new ArticleModel({
			authorData: {
				id,
				name,
				email,
				authorImage,
				type,
			},
			title,
			category,
			content,
			image: files["image"] ? files["image"][0].location : "",
			articlePDF: files["articlePDF"] ? files["articlePDF"][0].location : "",
			articleLink: link,
			schedule: scheduledDateTime,
			language,
			shareWith,
			shareWithPlans,
			shareWithMarketplaces,
		});

		await newArticle.save();

		await ServiceProviderRegModel.findByIdAndUpdate(
			id,
			{ $inc: { "stats.contentStats.articles": 1 } },
			{ new: true },
		);

		const followers = await ServiceProviderRegModel.findById(id);
		const followersArray = (followers?.stats?.Followers || []).map(String);
		await sendNotification({
			recipientIds: followersArray,
			recipientRole: "user",
			message: `${name} posted a new article`,
			type: "content-added",
			category: "sp",
			sentBy: { id, name },
			postLink: "/dashboard/user/researchreports",
			ctaLabel: "View Article",
			sendToLabel: `Followers of ${name}`,
		});


		// PDF-attached articles get a `?t=` share token so the Telegram link
		// works inside Telegram's in-app browser (which carries no NextAuth
		// session). The page-only path doesn't need it. See helpers/
		// articlePdfShareToken.ts for the trust model.
		const articleLink =
			newArticle.articlePDF && newArticle.articlePDF !== ""
				? `${process.env.NEXTAUTH_URL}/view/researchreport/pdf/${newArticle.id}?t=${signArticlePdfShareToken(String(newArticle.id))}`
				: `${process.env.NEXTAUTH_URL}/view/researchreport/page/${newArticle.id}`;

		// Structured message for the bot using Telegram's HTML formatting

		const eventDate = new Date(newArticle.schedule);
		const date = eventDate.toLocaleDateString(undefined, {
			weekday: "long",
			year: "numeric",
			month: "short",
			day: "2-digit",
		});
		const botMessage = `
   🆕🆕 ${newArticle.title} 🆕🆕

📝 Posted By: ${newArticle.authorData?.name}

🗓️ Date: ${date}

👉👉 <a href="${articleLink}">Read full article</a> 👈👈
       `;

		// Sending the bot message with the optional image

		if (shareWith.includes("all")) {
		}
		if (shareWith.includes("subscribers") && shareWithPlans.length > 0) {
			const plans = await ServiceModel.find({ _id: { $in: shareWithPlans } });
			for (const plan of plans) {
				const planSubscribers = (plan.subscribedBy || []).map(String);
				await sendNotification({
					recipientIds: planSubscribers,
					recipientRole: "both",
					message: `${name} shared a new article with plan ${plan.title}`,
					type: "content-added",
					category: "sp",
					sentBy: { id, name },
					postLink: "/dashboard/user/researchreports",
					ctaLabel: "View Article",
					sendToLabel: `Subscribers of ${plan.title}`,
				});

				if (plan?.telegramChannelId) {
				}
			}
		}

		return res.status(200).json({ success: true, message: "Article Saved" });
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to save article",
			error: error,
		});
	}
};

export const getAllArticles = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch article",
		});
	}

	try {
		const data = await ArticleModel.find({ "authorData.id": id })
			.sort({ createdAt: -1 })
			.lean();

		return res.status(200).json({
			success: true,
			message: "Article fetched",
			data: sanitizeArticleListForResponse(data as any),
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch article",
			error: error,
		});
	}
};

export const getAllPreviousArticles = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch article",
		});
	}

	try {
		const data = await ArticleModel.find({
			"authorData.id": id,
			schedule: { $lte: new Date().toISOString() },
		})
			.sort({ createdAt: -1 })
			.lean();

		return res.status(200).json({
			success: true,
			message: "Article fetched",
			data: sanitizeArticleListForResponse(data as any),
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch article",
			error: error,
		});
	}
};

export const getAllScheduledArticles = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch article",
		});
	}

	try {
		const data = await ArticleModel.find({
			"authorData.id": id,
			schedule: { $gte: new Date().toISOString() },
		})
			.sort({ createdAt: -1 })
			.lean();

		return res.status(200).json({
			success: true,
			message: "Article fetched",
			data: sanitizeArticleListForResponse(data as any),
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch article",
			error: error,
		});
	}
};

export const PostNewVideo = async (req: Request, res: Response) => {
	if (!req.body.data) {
		return res
			.status(400)
			.json({ success: false, message: "No Data provided" });
	}

	const expectedKeys = [
		"name",
		"email",
		"id",
		"title",
		"category",
		"description",
		"scheduleDate",
		"scheduleTime",
		"type",
		"disclaimer",
		"link",
		"language",
	];

	try {
		const parsedBody = JSON.parse(req.body.data);
		const allElementsPresent = expectedKeys.every((key) =>
			// biome-ignore lint/suspicious/noPrototypeBuiltins: <>
			Object.prototype.hasOwnProperty.call(parsedBody, key),
		);
		if (!allElementsPresent)
			return res
				.status(400)
				.json({ success: false, message: "All fields are required" });

		const file = req.file as Express.MulterS3.File;

		// if (!file || !file.location) {
		//   return res
		//     .status(400)
		//     .json({ success: false, message: "Image Not Saved" });
		// }

		const {
			id,
			name,
			email,
			title,
			category,
			description,
			disclaimer,
			scheduleDate,
			scheduleTime,
			type,
			link,
			ExtraThumbnailUrl,
			authorImage,
			language,
			videoID,
		} = parsedBody;

		// scheduleDate ("2026-04-24") and scheduleTime ("14:30") come from the
		// SP's browser in IST. Without an explicit timezone, `new Date(...)`
		// would interpret the string as the server's local time — on a UTC
		// host that pushes the article ~5.5 hours into the future and it
		// wrongly lands in "scheduled" instead of "posted". Append +05:30 so
		// the value is unambiguously IST regardless of where the server runs.
		let combinedDateTime;
		if (scheduleDate === scheduleTime) {
			combinedDateTime = `${scheduleDate}T00:00:00+05:30`;
		} else {
			combinedDateTime = `${scheduleDate}T${scheduleTime}:00+05:30`;
		}

		const scheduledDateTime = new Date(combinedDateTime).toISOString();


		const newVideo = new VideoModel({
			authorData: {
				id,
				name,
				email,
				authorImage,
				type,
			},
			title,
			category,
			description,
			image: file ? file.location : ExtraThumbnailUrl,
			schedule: scheduledDateTime,
			link,
			disclaimer,
			language,
			videoID,
		});

		await newVideo.save();

		await ServiceProviderRegModel.findByIdAndUpdate(
			id,
			{ $inc: { "stats.contentStats.videos": 1 } },
			{ new: true },
		);

		const followers = await ServiceProviderRegModel.findById(id);
		const followersArray = (followers?.stats?.Followers || []).map(String);
		await sendNotification({
			recipientIds: followersArray,
			recipientRole: "user",
			message: `${name} posted a new video`,
			type: "content-added",
			category: "sp",
			sentBy: { id, name },
			postLink: "/dashboard/user/videos",
			ctaLabel: "Watch Video",
			sendToLabel: `Followers of ${name}`,
		});


		const videoLink = `https://tradeboxlive.com/view/video/${newVideo.videoID}`;

		const botMessage = `
${newVideo.title}

Posted By: ${newVideo.authorData?.name}

Watch Video: (${videoLink})
    `;

		const thumbnailUrl = `https://img.youtube.com/vi/${newVideo.videoID}/0.jpg`;


		return res.status(200).json({ success: true, message: "Video Saved" });
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to save video",
			error: error,
		});
	}
};

export const getAllVideos = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch videos",
		});
	}

	try {
		const data = await VideoModel.find({ "authorData.id": id }).sort({
			createdAt: -1,
		});

		return res.status(200).json({
			success: true,
			message: "Video fetched",
			data: data,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch video",
			error: error,
		});
	}
};

export const getAllPreviousVideos = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch videos",
		});
	}

	try {
		const data = await VideoModel.find({
			"authorData.id": id,
			schedule: { $lte: new Date().toISOString() },
		}).sort({
			createdAt: -1,
		});

		return res.status(200).json({
			success: true,
			message: "Video fetched",
			data: data,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch video",
			error: error,
		});
	}
};

export const getAllScheduledVideos = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch videos",
		});
	}

	try {
		const data = await VideoModel.find({
			"authorData.id": id,
			schedule: { $gte: new Date().toISOString() },
		}).sort({
			createdAt: -1,
		});

		return res.status(200).json({
			success: true,
			message: "Video fetched",
			data: data,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch video",
			error: error,
		});
	}
};

export const PostNewPodcast = async (req: Request, res: Response) => {
	if (!req.body.data) {
		return res
			.status(400)
			.json({ success: false, message: "No Data provided" });
	}

	const expectedKeys = [
		"name",
		"email",
		"id",
		"title",
		"category",
		"scheduleDate",
		"disclaimer",
		"scheduleTime",
		"type",
		"link",
		"description",
		"language",
	];

	try {
		const parsedBody = JSON.parse(req.body.data);
		const allElementsPresent = expectedKeys.every((key) =>
			// biome-ignore lint/suspicious/noPrototypeBuiltins: <>
			Object.prototype.hasOwnProperty.call(parsedBody, key),
		);
		if (!allElementsPresent)
			return res
				.status(400)
				.json({ success: false, message: "All fields are required" });

		const file = req.file as Express.MulterS3.File;

		const {
			id,
			name,
			email,
			title,
			category,
			scheduleDate,
			scheduleTime,
			ExtraThumbnailUrl,
			type,
			link,
			description,
			disclaimer,
			language,
			videoID,
		} = parsedBody;

		// scheduleDate ("2026-04-24") and scheduleTime ("14:30") come from the
		// SP's browser in IST. Without an explicit timezone, `new Date(...)`
		// would interpret the string as the server's local time — on a UTC
		// host that pushes the article ~5.5 hours into the future and it
		// wrongly lands in "scheduled" instead of "posted". Append +05:30 so
		// the value is unambiguously IST regardless of where the server runs.
		let combinedDateTime;
		if (scheduleDate === scheduleTime) {
			combinedDateTime = `${scheduleDate}T00:00:00+05:30`;
		} else {
			combinedDateTime = `${scheduleDate}T${scheduleTime}:00+05:30`;
		}

		const scheduledDateTime = new Date(combinedDateTime).toISOString();

		const newPodcast = new PodcastModel({
			authorData: {
				id,
				name,
				email,
				type,
			},
			title,
			category,
			image: file ? file.location : ExtraThumbnailUrl,
			schedule: scheduledDateTime,
			link,
			description,
			disclaimer,
			language,
			videoID,
		});

		await newPodcast.save();

		await ServiceProviderRegModel.findByIdAndUpdate(
			id,
			{ $inc: { "stats.contentStats.podcasts": 1 } },
			{ new: true },
		);

		const followers = await ServiceProviderRegModel.findById(id);
		const followersArray = (followers?.stats?.Followers || []).map(String);
		await sendNotification({
			recipientIds: followersArray,
			recipientRole: "user",
			message: `${name} posted a new podcast`,
			type: "content-added",
			category: "sp",
			sentBy: { id, name },
			postLink: "/dashboard/user/videos",
			ctaLabel: "Listen Now",
			sendToLabel: `Followers of ${name}`,
		});


		// Fetch thumbnail URL from YouTube
		const thumbnailUrl = `https://img.youtube.com/vi/${videoID}/0.jpg`;

		// Format bot message structure
		const botMessage = `
    ${title}

Posted By: ${name}

Listen to Podcast: ${link}
  `;

		// Send bot public message with the thumbnail URL

		return res.status(200).json({ success: true, message: "Podcast Saved" });
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "failed to save podcast",
			error: error,
		});
	}
};

export const getAllPodcasts = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch podcasts",
		});
	}

	try {
		const data = await PodcastModel.find({ "authorData.id": id }).sort({
			createdAt: -1,
		});

		return res.status(200).json({
			success: true,
			message: "Podcast fetched",
			data: data,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch Podcast",
			error: error,
		});
	}
};

export const getAllPreviousPodcasts = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch podcasts",
		});
	}

	try {
		const data = await PodcastModel.find({
			"authorData.id": id,
			schedule: { $lte: new Date().toISOString() },
		}).sort({
			createdAt: -1,
		});

		return res.status(200).json({
			success: true,
			message: "Podcast fetched",
			data: data,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch Podcast",
			error: error,
		});
	}
};

export const getAllScheduledPodcasts = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch podcasts",
		});
	}

	try {
		const data = await PodcastModel.find({
			"authorData.id": id,
			schedule: { $gte: new Date().toISOString() },
		}).sort({
			createdAt: -1,
		});

		return res.status(200).json({
			success: true,
			message: "Podcast fetched",
			data: data,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch Podcast",
			error: error,
		});
	}
};

export const PostNewEvent = async (req: Request, res: Response) => {
	if (!req.body.data) {
		return res
			.status(400)
			.json({ success: false, message: "No Data provided" });
	}

	const expectedKeys = [
		"name",
		"email",
		"id",
		"title",
		"type",
		"category",
		"scheduledDateTime",
		"description",
		// "disclaimer" is now optional — not in the required-keys list
		"eventEmail",
		"eventType",
		"language",
		"authorImage",
		"eventCostType",
		"price",
		"targetAudience",
	];

	try {
		const parsedBody = JSON.parse(req.body.data);
		const allElementsPresent = expectedKeys.every((key) =>
			// biome-ignore lint/suspicious/noPrototypeBuiltins: <>
			Object.prototype.hasOwnProperty.call(parsedBody, key),
		);
		if (!allElementsPresent)
			return res
				.status(400)
				.json({ success: false, message: "All fields are required" });

		const { id } = parsedBody;

		const file = req.file as Express.MulterS3.File;

		const {
			name,
			email,
			title,
			category,
			scheduledDateTime,
			type,
			link,
			description,
			disclaimer,
			eventEmail,
			eventType,
			language,
			location,
			authorImage,
			eventCostType,
			price,
			targetAudience,
			shareWithMarketplaces,
		} = parsedBody;

		const isAdmin = type === "Admin";

		// A sub-profile publishes under its PARENT RA (master): the event should
		// carry the firm/RA's identity — name, image, id — not the individual
		// staff member's. Resolve the creator → master and use the master's
		// author data everywhere (event doc, stats credit, follower fan-out).
		// Admins and regular SPs keep the posted author data. Falls back to the
		// posted data if the master lookup fails.
		const author = { id, name, email, type, authorImage };
		if (!isAdmin) {
			try {
				const creator = await ServiceProviderRegModel.findById(id).select(
					"addedby",
				);
				const addedby: any = (creator as any)?.addedby;
				if (addedby?.isSubProfile && addedby?.id) {
					const master = await ServiceProviderRegModel.findById(
						addedby.id,
					).select("RegName email category profileUrl");
					if (master) {
						author.id = String((master as any)._id);
						author.name = (master as any).RegName || name;
						author.email = (master as any).email || email;
						author.type = (master as any).category || type;
						author.authorImage = (master as any).profileUrl || authorImage;
					}
				}
			} catch {
				// keep the posted author data on lookup failure
			}
		}

		const newEvent = new EventModel({
			authorData: {
				id: author.id,
				name: author.name,
				email: author.email,
				type: author.type,
				authorImage: author.authorImage,
			},
			title,
			category,
			schedule: scheduledDateTime,
			link,
			image: file ? file.location : "",
			description,
			eventEmail,
			disclaimer,
			eventType,
			location,
			language,
			eventCostType,
			price,
			// Omit approvalStatus for providers → schema default (true) applies; Admin explicitly gets true
			...(isAdmin ? { approvalStatus: true } : {}),
			targetAudience,
			shareWithMarketplaces,
		});

		await newEvent.save();

		if (!isAdmin) {
			await ServiceProviderRegModel.findByIdAndUpdate(
				author.id,
				{ $inc: { "stats.contentStats.events": 1 } },
				{ new: true },
			);


			const sp = await ServiceProviderRegModel.findById(author.id);
			const followersArray = (sp?.stats?.Followers || []).map(String);
			await sendNotification({
				recipientIds: followersArray,
				recipientRole: "user",
				message: `${author.name} scheduled a new event: ${title}`,
				type: "event",
				category: "sp",
				sentBy: { id: author.id, name: author.name },
				postLink: "/dashboard/user/events",
				ctaLabel: "View Event",
				sendToLabel: `Followers of ${author.name}`,
			});
		}

		return res.status(200).json({ success: true, message: "Event Saved" });
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "failed to save event",
			error: error,
		});
	}
};

// Backend route handler to fetch all approved events
export const getAllApprovedEvents = async (req: Request, res: Response) => {
	try {
		const approvedEvents = await EventModel.find({ approvalStatus: true }).lean();
		const eventIds = approvedEvents.map((e) => e._id);
		const regCounts = await EventRegistrationModel.aggregate([
			{ $match: { eventId: { $in: eventIds } } },
			{ $group: { _id: "$eventId", count: { $sum: 1 } } },
		]);
		const countMap = new Map(regCounts.map((r: any) => [r._id.toString(), r.count]));
		const eventsWithCount = approvedEvents.map((e) => ({
			...e,
			registrationCount: countMap.get(e._id.toString()) ?? 0,
		}));
		return res.status(200).json({ data: eventsWithCount });
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch events",
			error: error,
		});
	}
};

export const getAllEvents = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Failed to fetch events",
		});
	}

	try {
		const data = await EventModel.find({ "authorData.id": id })
			.sort({ createdAt: -1 })
			.lean();

		const eventIds = data.map((e) => e._id);
		const regCounts = await EventRegistrationModel.aggregate([
			{ $match: { eventId: { $in: eventIds } } },
			{ $group: { _id: "$eventId", count: { $sum: 1 } } },
		]);
		const countMap = new Map(
			regCounts.map((r: any) => [r._id.toString(), r.count]),
		);

		const eventsWithCount = data.map((e) => ({
			...e,
			registrationCount: countMap.get(e._id.toString()) ?? 0,
		}));

		return res.status(200).json({
			success: true,
			message: "event fetched",
			data: eventsWithCount,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch events",
			error: error,
		});
	}
};


export const getArticleById = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id || typeof id !== "string") {
		return res.status(400).json({
			success: false,
			message: "Article ID is required",
		});
	}

	try {
		const article = await ArticleModel.findById(id).lean();
		if (!article) {
			return res.status(404).json({
				success: false,
				message: "Article not found",
			});
		}
		return res.status(200).json({
			success: true,
			message: "Article fetched",
			data: sanitizeArticleForResponse(article as any),
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch article",
			error: error,
		});
	}
};

export const updateArticle = async (req: Request, res: Response) => {
	if (!req.body.data) {
		return res.status(400).json({
			success: false,
			message: "No data provided",
		});
	}

	try {
		const parsedBody = JSON.parse(req.body.data);
		const {
			id,
			title,
			category,
			content,
			scheduleDate,
			scheduleTime,
			language,
			link,
			shareWith,
			shareWithPlans,
			shareWithMarketplaces,
		} = parsedBody;

		if (!id) {
			return res.status(400).json({
				success: false,
				message: "Article ID is required",
			});
		}

		const existing = await ArticleModel.findById(id);
		if (!existing) {
			return res.status(404).json({
				success: false,
				message: "Article not found",
			});
		}

		const files = req.files as { [fieldname: string]: Express.MulterS3.File[] } | undefined;
		let combinedDateTime: string;
		if (scheduleDate && scheduleTime) {
			combinedDateTime =
				scheduleDate === scheduleTime
					? scheduleDate
					: `${scheduleDate}T${scheduleTime}:00`;
		} else {
			combinedDateTime = existing.schedule;
		}
		const scheduledDateTime = new Date(combinedDateTime).toISOString();

		const updatePayload: Record<string, unknown> = {
			title: title ?? existing.title,
			category: category ?? existing.category,
			content: content ?? existing.content,
			schedule: scheduledDateTime,
			language: language ?? existing.language,
			articleLink: link !== undefined ? link : existing.articleLink,
			shareWith: shareWith ?? existing.shareWith,
			shareWithPlans: shareWithPlans ?? existing.shareWithPlans,
			shareWithMarketplaces: shareWithMarketplaces ?? existing.shareWithMarketplaces,
		};

		if (files?.["image"]?.[0]?.location) {
			updatePayload.image = files["image"][0].location;
		}
		if (files?.["articlePDF"]?.[0]?.location) {
			updatePayload.articlePDF = files["articlePDF"][0].location;
		}

		const updated = await ArticleModel.findByIdAndUpdate(
			id,
			{ $set: updatePayload },
			{ new: true },
		);

		return res.status(200).json({
			success: true,
			message: "Article updated successfully",
			data: updated,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to update article",
			error: error,
		});
	}
};

/**
 * Stream a watermarked copy of an article's PDF to an authenticated subscriber.
 *
 * The S3 URL is never returned to the client. Bytes are pulled from S3
 * server-side, watermarked per-request with the viewer's name/email/timestamp
 * via pdf-lib, and streamed back inline. Browser caching is disabled so a
 * leaked tab cannot be replayed by another user.
 *
 * Requires `verifyUserRATokenMiddleware` upstream — relies on `req.user`.
 */
export const streamArticlePDF = async (req: Request, res: Response) => {
	const { articleId } = req.params;
	const user = (req as any).user;
	// Set by articlePdfAuth in PostContentRoutes when a valid `?t=` share
	// token authorises this request (Telegram-link path). In that case we
	// trust the channel-membership boundary and skip the per-user
	// subscription check — there is no `req.user` to check against anyway.
	const shareTokenAuth = Boolean((req as any).articlePdfShareAuth);

	if (!articleId) {
		return res
			.status(400)
			.json({ success: false, message: "Article ID is required" });
	}
	if (!shareTokenAuth && !user?._id) {
		return res
			.status(401)
			.json({ success: false, message: "Unauthorized" });
	}

	try {
		const article = await ArticleModel.findById(articleId).lean();
		if (!article) {
			return res
				.status(404)
				.json({ success: false, message: "Article not found" });
		}

		if (!article.articlePDF) {
			return res
				.status(404)
				.json({ success: false, message: "This article has no PDF" });
		}

		if (!shareTokenAuth) {
			const userId = String(user._id);
			const allowed = await userCanAccessArticlePdf(userId, article as any);
			if (!allowed) {
				return res
					.status(403)
					.json({ success: false, message: "Subscription required" });
			}
		}

		// Env-gated debug bypass. When ALLOW_RAW_PDF_DEBUG=true, a request to
		// `?raw=1` returns the un-watermarked S3 object. Used to isolate
		// whether a "Could not render this PDF" failure originates in the
		// source file, pdf-lib's watermark step, or the browser viewer.
		// Never enable in production — it defeats the per-viewer watermark.
		const rawDebugRequested =
			req.query.raw === "1" &&
			process.env.ALLOW_RAW_PDF_DEBUG === "true";

		if (rawDebugRequested) {
			const raw = await fetchRawArticlePdf(article.articlePDF);
			console.warn("streamArticlePDF: serving RAW (unwatermarked) PDF", {
				articleId,
				size: raw.length,
				header: raw.subarray(0, 8).toString("latin1"),
			});
			res.setHeader("Content-Type", "application/pdf");
			res.setHeader("Content-Disposition", "inline");
			res.setHeader("Cache-Control", "private, no-store, max-age=0");
			res.setHeader("X-Content-Type-Options", "nosniff");
			res.setHeader("Content-Length", String(raw.length));
			return res.status(200).end(raw);
		}

		// Brand-attribution watermark: stamp every page with the authoring SP's
		// registered name. `RegName` is the legal/registered name on
		// ServiceProviderRegModel; older SP records may have it empty, so fall
		// back to the SP's display name, then to the snapshot stored on
		// authorData when the article was published.
		const spId = article.authorData?.id;
		let watermark = "";
		if (spId) {
			const sp = await ServiceProviderRegModel
				.findById(spId)
				.select("RegName name")
				.lean();
			watermark = (sp?.RegName || sp?.name || "").trim();
		}
		if (!watermark) {
			watermark = String(article.authorData?.name || "").trim();
		}

		// If the watermark pipeline can't round-trip this PDF (pdf-lib drops
		// pages on certain real-world files), fall back to serving the raw S3
		// object un-watermarked. Losing the watermark on a problem file is a
		// better outcome than losing the user's content.
		let buffer: Buffer;
		try {
			buffer = await fetchAndWatermarkArticlePdf(article.articlePDF, watermark);
		} catch (err) {
			if (err instanceof WatermarkFailedError) {
				console.warn(
					"streamArticlePDF: watermark pipeline failed, falling back to RAW PDF",
					{
						articleId,
						key: err.key,
						stage: err.stage,
						cause:
							err.cause instanceof Error
								? { name: err.cause.name, message: err.cause.message }
								: String(err.cause),
					}
				);
				buffer = await fetchRawArticlePdf(article.articlePDF);
			} else {
				throw err;
			}
		}

		// Confirm what we're about to send is still a real PDF after the
		// pdf-lib round-trip. If this fires it points at a watermark-side
		// regression rather than a browser issue.
		const outHeader = buffer.subarray(0, 8).toString("latin1");
		console.log("streamArticlePDF: watermarked output", {
			articleId,
			size: buffer.length,
			header: outHeader,
		});

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", "inline");
		res.setHeader("Cache-Control", "private, no-store, max-age=0");
		res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("Content-Length", String(buffer.length));
		return res.status(200).end(buffer);
	} catch (error) {
		// Bad data (non-PDF persisted before the upload fileFilter existed) is
		// not a system error — degrade to a 422 + warn so it's distinguishable
		// from real failures in log dashboards.
		if (error instanceof InvalidArticlePdfError) {
			console.warn(
				"streamArticlePDF: corrupt article PDF",
				{
					articleId,
					key: error.key,
					size: error.size,
					header: error.header,
				}
			);
			return res.status(422).json({
				success: false,
				code: "INVALID_ARTICLE_PDF",
				message:
					"The PDF attached to this article is corrupt or not a valid PDF file. Please re-upload it from the edit-article page.",
			});
		}

		console.error("streamArticlePDF error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to load article PDF",
		});
	}
};

export const deleteArticle = async (req: Request, res: Response) => {
	const { id } = req.body;

	if (!id) {
		return res.status(400).json({
			success: false,
			message: "Article ID is not found",
		});
	}

	try {
		const deletedArticle = await ArticleModel.findByIdAndDelete(id);
		if (!deletedArticle) {
			return res.status(404).json({
				success: false,
				message: "Article not found",
			});
		}
		return res.status(200).json({
			success: true,
			message: "Article deleted successfully",
			deletedArticle,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to delete article",
			error: error,
		});
	}
};