import cron from "node-cron";
import { addDays } from "date-fns";

import { OrderModel } from "../models/TransactionModels";
import { UserModel } from "../models/AuthModels";
import { notificationModel } from "../models/NotificationModel";
import { sendNotification } from "../helpers/sendNotification";
import { TelegramInviteModel } from "../models/TelegramString";
import { ServiceModel } from "../models/PostModels";
import { PackageModel } from "../models/PackageModel";

import { mailQueue } from "../queues/MailQueues";
import { telegramQueue } from "../queues/TelegramMessageQueue";
import { removeUserFromChannel } from "../config/telegram";

// Expiry decisions live on the IST calendar. Bucket every timestamp into
// IST day numbers so a UTC-stored endDate and a "now" computed on any host
// agree on which IST date a moment belongs to.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function istCalendarDaysBetween(a: Date, b: Date): number {
	const aDay = Math.floor((a.getTime() + IST_OFFSET_MS) / ONE_DAY_MS);
	const bDay = Math.floor((b.getTime() + IST_OFFSET_MS) / ONE_DAY_MS);
	return aDay - bDay;
}

/** Match PaymentController / user-order: parse day count from stored validity. */
function parseValidityDaysFromStored(v: string | undefined): number {
	if (v == null || v === "") return 0;
	const m = String(v).match(/\d+/);
	return m ? parseInt(m[0], 10) : 0;
}

/**
 * Renewal/expiry reminder emails only for renewable tiers.
 * One-time service tiers → no email / Telegram / in-app renewal nudges.
 * Portfolio & package orders keep existing behaviour (always remind).
 */
function shouldSendRenewalRemindersForOrder(
	order: {
		type?: string;
		subscribedToId?: string;
		validity?: string;
	},
	serviceById: Map<
		string,
		{
			pricingPlans?: { validity: number; purchaseType?: string }[];
			purchaseType?: string;
			serviceType?: string;
		}
	>
): boolean {
	const t = (order.type || "service").toLowerCase();
	if (t === "portfolio" || t === "package") {
		return true;
	}

	const service = serviceById.get(order.subscribedToId || "");
	if (!service) {
		return true;
	}

	/* Funds: single service-level purchaseType only */
	if (service.serviceType === "fund") {
		const legacy = service.purchaseType ?? "RENEWABLE";
		return legacy !== "ONE_TIME";
	}

	const plans = service.pricingPlans;
	if (!Array.isArray(plans) || plans.length === 0) {
		const legacy = service.purchaseType ?? "RENEWABLE";
		return legacy !== "ONE_TIME";
	}

	// Send the reminder if AT LEAST ONE tier in this service is renewable.
	// This way, customers who bought a ONE_TIME tier still get reminded if there
	// is another renewable tier they can switch to. Only skip if EVERY tier is
	// ONE_TIME (nothing to renew or upsell to).
	const hasRenewableTier = plans.some((p) => {
		const tierPurchase = p.purchaseType ?? service.purchaseType ?? "RENEWABLE";
		return tierPurchase !== "ONE_TIME";
	});
	return hasRenewableTier;
}

function getRenewPathByOrderType(type?: string) {
  switch (type?.toLowerCase()) {
    case "service":
      return "services";
    case "portfolio":
      return "portfolio";
    case "package":
      return "packages";
    default:
      return "services";
  }
}

function resolveExpiryDate(order: {
	endDate?: Date | string | null;
	startDate?: Date | string | null;
	createdAt?: Date | string | null;
	validity?: string;
}): Date | null {
	if (order.endDate) return new Date(order.endDate);
	const startDate = order.startDate ?? order.createdAt;
	if (!startDate) return null;
	const validityDays = Number(order.validity);
	if (!validityDays || isNaN(validityDays)) return null;
	return addDays(new Date(startDate), validityDays);
}

async function fetchActiveOrderContext() {
	const activeOrders = await OrderModel.find({
		isExpired: false,
		paymentStatus: "verified",
	}).lean();

	if (!activeOrders.length) {
		return {
			activeOrders,
			userMap: new Map<string, any>(),
			spMap: new Map<string, any>(),
			serviceById: new Map<string, any>(),
		};
	}

	const userIds = [
		...new Set(activeOrders.map((o) => o.orderdBy?.id).filter(Boolean)),
	];
	const spIds = [
		...new Set(activeOrders.map((o) => o.soldBy?.id).filter(Boolean)),
	];

	const users = await UserModel.find({ _id: { $in: userIds } }).lean();
	const serviceProviders = await UserModel.find({
		_id: { $in: spIds },
	}).lean();

	const userMap = new Map(users.map((u) => [u._id.toString(), u]));
	const spMap = new Map(
		serviceProviders.map((sp) => [sp._id.toString(), sp])
	);

	const serviceIdsForReminders = [
		...new Set(
			activeOrders
				.filter((o) => {
					const t = (o.type || "service").toLowerCase();
					return t !== "portfolio" && t !== "package" && o.subscribedToId;
				})
				.map((o) => o.subscribedToId as string)
		),
	];

	const services = await ServiceModel.find({
		_id: { $in: serviceIdsForReminders },
	})
		.select("pricingPlans purchaseType serviceType")
		.lean();

	const serviceById = new Map(
		services.map((s) => [s._id.toString(), s])
	);

	return { activeOrders, userMap, spMap, serviceById };
}

async function runReminderPass() {
	console.log(
		"[CRON] Plan reminder pass started at",
		new Date().toISOString()
	);
	const now = new Date();

	try {
		const { activeOrders, userMap, spMap, serviceById } =
			await fetchActiveOrderContext();

		console.log(
			`[CRON] Reminder pass: found ${activeOrders.length} active verified orders`
		);
		if (!activeOrders.length) {
			console.log("[CRON] No active orders to process, exiting reminder pass");
			return;
		}

		// 5 days -> first reminder, 3 days -> second, 1 day -> third, 0 days -> last chance
		const reminderMap: Record<number, number> = {
			5: 0,
			3: 1,
			1: 2,
			0: 3,
		};

		for (const order of activeOrders) {
			try {
				const user = userMap.get(order.orderdBy!.id);
				if (!user?.email) continue;

				const serviceProvider = spMap.get(order.soldBy!.id);

				const expiryDate = resolveExpiryDate(order);
				if (!expiryDate) continue;

				const daysLeft = istCalendarDaysBetween(expiryDate, now);

				if (!(daysLeft in reminderMap)) continue;
				if (order.remainder !== reminderMap[daysLeft]) continue;

				const sendRenewalReminders = shouldSendRenewalRemindersForOrder(
					order,
					serviceById
				);

				if (!sendRenewalReminders) {
					console.log(
						`[CRON] Skipping renewal reminders (one-time tier) for order ${order._id} (${order.serviceName})`
					);
					continue;
				}

				const updated = await OrderModel.findOneAndUpdate(
					{
						_id: order._id,
						remainder: reminderMap[daysLeft],
					},
					{ $inc: { remainder: 1 } }
				);

				if (!updated) continue;

				console.log(
					`[CRON] Sending ${daysLeft}-day reminder for order ${order._id} (${order.serviceName}) to ${user.email}`
				);

				const renewPath = getRenewPathByOrderType(order.type);
				const renewLink = `${process.env.NEXTAUTH_URL}/view/${renewPath}/${order.subscribedToId}`;

				const subjectText =
					daysLeft === 0
						? `Plan ${order.serviceName} expires today!`
						: `Plan ${order.serviceName} expiring soon`;

				/* ---------- EMAIL ---------- */
				await mailQueue.add(
					user.email,
					{
						mailOptions: {
							from: process.env.EMAIL,
							to: user.email,
							cc: serviceProvider?.email ? [serviceProvider.email] : [],
							subject: subjectText,
							html: `
                <p>Dear ${user.name},</p>
                <p>Your plan <b>${order.serviceName}</b> ${
								daysLeft === 0
									? "expires <b>today</b>"
									: `expires in <b>${daysLeft} day(s)</b>`
							}.</p>
                <p>
                  <a href="${renewLink}"
                     style="padding:10px 16px;background:#4CAF50;color:#fff;border-radius:5px;text-decoration:none;">
                    Renew Now
                  </a>
                </p>
                <p>Regards,<br/>Trade Box Fintech Solutions</p>
              `,
						},
					},
					{ removeOnComplete: true, removeOnFail: true }
				);

				/* ---------- TELEGRAM ---------- */
				if (user.telegramUserId) {
					await telegramQueue.add("send-telegram-dm", {
						telegramUserId: user.telegramUserId,
						message: `
⏰ <b>Plan Expiry Reminder</b>

Hello ${user.name},
Your plan <b>${order.serviceName}</b> ${
							daysLeft === 0
								? "expires <b>today</b>"
								: `expires on <b>${expiryDate.toDateString()}</b>`
						}.

Please renew to avoid interruption.
`,
					});
				}

				/* ---------- IN-APP NOTIFICATION ---------- */
				await sendNotification({
					recipientIds: [user._id.toString()],
					recipientRole: "user",
					message:
						daysLeft === 0
							? `Your plan ${order.serviceName} expires today! Renew now to avoid losing access.`
							: `Your plan ${order.serviceName} will expire on ${expiryDate.toDateString()}.`,
					type: daysLeft === 0 ? "plan-expired" : "plan-expiring",
					category: "admin",
					sentBy: { id: "admin", name: "Tradebox" },
					postLink: "/dashboard/user/subscribedservices",
					ctaLabel: "Renew Now",
				});
			} catch (err) {
				console.error(
					`[CRON] Reminder processing failed for order ${order._id}:`,
					err
				);
			}
		}

		console.log(
			"[CRON] Plan reminder pass completed at",
			new Date().toISOString()
		);
	} catch (err) {
		console.error("[CRON] Reminder pass crashed:", err);
	}
}

async function runExpiryAndRemovalPass() {
	console.log(
		"[CRON] Plan expiry/removal pass started at",
		new Date().toISOString()
	);
	const now = new Date();

	try {
		/* =====================================================
		   1. MARK EXPIRED — orders whose IST expiry day is today or earlier.
		      The cron fires at 23:00 IST, so daysLeft === 0 means
		      "right now is 23:00 IST on the expiry date".
		===================================================== */
		const { activeOrders } = await fetchActiveOrderContext();

		console.log(
			`[CRON] Expiry pass: found ${activeOrders.length} active verified orders`
		);

		for (const order of activeOrders) {
			try {
				const expiryDate = resolveExpiryDate(order);
				if (!expiryDate) continue;

				const daysLeft = istCalendarDaysBetween(expiryDate, now);

				if (daysLeft <= 0) {
					await OrderModel.findByIdAndUpdate(order._id, {
						isExpired: true,
					});
					console.log(
						`[CRON] Marked order ${order._id} (${order.serviceName}) as expired (daysLeft=${daysLeft})`
					);
				}
			} catch (err) {
				console.error(
					`[CRON] Expiry-mark failed for order ${order._id}:`,
					err
				);
			}
		}

		/* =====================================================
		   2. TELEGRAM CLEANUP — remove expired users from channels
		===================================================== */
		const expiredOrders = await OrderModel.find({
			isExpired: true,
			telegramRemoved: false,
			telegramRemovalAttempts: { $lt: 5 },
		}).lean();

		console.log(
			`[CRON] Found ${expiredOrders.length} expired orders pending telegram removal`
		);

		if (expiredOrders.length) {
			// Build a dedicated user map for expired orders
			const expiredUserIds = [
				...new Set(
					expiredOrders.map((o) => o.orderdBy?.id).filter(Boolean)
				),
			];
			const expiredUsers = await UserModel.find({
				_id: { $in: expiredUserIds },
			}).lean();
			const expiredUserMap = new Map(
				expiredUsers.map((u) => [u._id.toString(), u])
			);

			for (const order of expiredOrders) {
				try {
					const user = expiredUserMap.get(order.orderdBy!.id);

					if (!user?.telegramUserId) {
						console.log(
							`[CRON] Order ${order._id}: user ${order.orderdBy?.id} has no telegramUserId, skipping removal`
						);
						await OrderModel.findByIdAndUpdate(order._id, {
							telegramRemoved: true,
						});
						continue;
					}

					const isPackage =
						(order.type || "").toLowerCase() === "package";

					if (!isPackage) {
						/* ============================================================
						   SERVICE ORDER — original flow, kept exactly as before.
						============================================================ */
						// Skip removal if user has another active order for the same service
						const hasActiveOrder = await OrderModel.exists({
							"orderdBy.id": order.orderdBy?.id,
							subscribedToId: order.subscribedToId,
							isExpired: false,
						});

						if (hasActiveOrder) {
							console.log(
								`[CRON] Order ${order._id}: user ${user._id} has an active order for same service, skipping removal`
							);
							await OrderModel.findByIdAndUpdate(order._id, {
								telegramRemoved: true,
							});
							continue;
						}

						await removeUserFromChannel(
							order.subscribedToId,
							user.telegramUserId,
							user._id.toString()
						);

						await OrderModel.findByIdAndUpdate(order._id, {
							telegramRemoved: true,
						});

						// Record removal in TelegramInviteModel
						await TelegramInviteModel.findOneAndUpdate(
							{
								orderId: order._id.toString(),
								status: "joined",
							},
							{
								$set: {
									status: "removed",
									removedAt: new Date(),
									removedReason: "plan_expired",
								},
							}
						);

						console.log(
							`[CRON] Successfully removed user ${user._id} (telegram: ${user.telegramUserId}) from channel for order ${order._id}`
						);
						continue;
					}

					/* ================================================================
					   PACKAGE ORDER — new flow.
					   A package can include multiple services, each with its own
					   Telegram channel. We must look up the package, iterate its
					   includedServices, and remove the user from each linked channel.
					================================================================ */
					const pkg = await PackageModel.findById(order.subscribedToId)
						.populate({
							path: "includedServices",
							select: "telegramChannelId",
						})
						.lean();

					if (!pkg) {
						console.log(
							`[CRON] Order ${order._id}: package ${order.subscribedToId} not found, marking removed`
						);
						await OrderModel.findByIdAndUpdate(order._id, {
							telegramRemoved: true,
						});
						continue;
					}

					const channelsToRemove: { serviceId: string }[] = [];
					for (const svc of (pkg.includedServices as any[]) || []) {
						if (svc?.telegramChannelId) {
							channelsToRemove.push({ serviceId: svc._id.toString() });
						}
					}

					if (channelsToRemove.length === 0) {
						console.log(
							`[CRON] Order ${order._id}: package has no telegram channels, marking removed`
						);
						await OrderModel.findByIdAndUpdate(order._id, {
							telegramRemoved: true,
						});
						continue;
					}

					// Compute services the user still has access to via OTHER active
					// orders (a separate service order, or a different active package
					// that includes the same service).
					const otherActiveOrders = await OrderModel.find({
						_id: { $ne: order._id },
						"orderdBy.id": order.orderdBy?.id,
						isExpired: false,
						paymentStatus: "verified",
					})
						.select("type subscribedToId")
						.lean();

					const stillAccessibleServiceIds = new Set<string>();
					const otherActivePackageIds: string[] = [];
					for (const ao of otherActiveOrders) {
						const t = (ao.type || "service").toLowerCase();
						if (!ao.subscribedToId) continue;
						if (t === "package") {
							otherActivePackageIds.push(ao.subscribedToId);
						} else if (t !== "portfolio") {
							stillAccessibleServiceIds.add(ao.subscribedToId);
						}
					}
					if (otherActivePackageIds.length) {
						const otherPkgs = await PackageModel.find({
							_id: { $in: otherActivePackageIds },
						})
							.select("includedServices")
							.lean();
						for (const p of otherPkgs) {
							for (const sid of p.includedServices || []) {
								stillAccessibleServiceIds.add(String(sid));
							}
						}
					}

					// Remove from each channel the user no longer has access to.
					let allOk = true;
					for (const { serviceId } of channelsToRemove) {
						if (stillAccessibleServiceIds.has(serviceId)) {
							console.log(
								`[CRON] Order ${order._id}: user ${user._id} still has active access to service ${serviceId}, skipping`
							);
							continue;
						}
						try {
							await removeUserFromChannel(
								serviceId,
								user.telegramUserId,
								user._id.toString()
							);
							console.log(
								`[CRON] Order ${order._id}: removed user ${user._id} from service ${serviceId} channel`
							);
						} catch (err) {
							allOk = false;
							console.error(
								`[CRON] Order ${order._id}: removal failed for service ${serviceId}:`,
								err
							);
						}
					}

					if (allOk) {
						await OrderModel.findByIdAndUpdate(order._id, {
							telegramRemoved: true,
						});

						await TelegramInviteModel.updateMany(
							{
								orderId: order._id.toString(),
								status: "joined",
							},
							{
								$set: {
									status: "removed",
									removedAt: new Date(),
									removedReason: "plan_expired",
								},
							}
						);

						console.log(
							`[CRON] Successfully processed telegram removal for package order ${order._id}`
						);
					} else {
						await OrderModel.findByIdAndUpdate(order._id, {
							$inc: { telegramRemovalAttempts: 1 },
						});
					}
				} catch (err) {
					await OrderModel.findByIdAndUpdate(order._id, {
						$inc: { telegramRemovalAttempts: 1 },
					});

					console.error(
						`[CRON] Telegram removal failed for order ${order._id}:`,
						err
					);
				}
			}
		}

		console.log(
			"[CRON] Plan expiry/removal pass completed at",
			new Date().toISOString()
		);
	} catch (err) {
		console.error("[CRON] Expiry/removal pass crashed:", err);
	}
}

export default function planValidityReminderCron() {
	// Reminders: 09:00 IST daily — morning nudges for 5/3/1/0-day windows.
	cron.schedule("0 9 * * *", () => runReminderPass(), {
		timezone: "Asia/Kolkata",
	});

	// Removal: 23:00 IST daily — marks expired and kicks from Telegram at
	// 11:00 PM IST on the exact expiry date the user sees in the UI.
	cron.schedule("0 23 * * *", () => runExpiryAndRemovalPass(), {
		timezone: "Asia/Kolkata",
	});
}
