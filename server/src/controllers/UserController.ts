import { id_ID } from "@faker-js/faker";
import { asyncSend } from "bullmq";
import { type Request, type Response, response } from "express";
import fs from "fs";
import pdf from "pdf-parse";
import { message } from "telegram/client";
import { adminNotify } from "../helpers/Notify";
import { sendNotification } from "../helpers/sendNotification";
import { ServiceProviderRegModel, UserModel, userOTPModel } from "../models/AuthModels";
import bcrypt from "bcrypt";
import { notificationModel } from "../models/NotificationModel";
import {
	ArticleModel,
	EventModel,
	EventRegistrationModel,
	// LeadsModel,
	ServiceModel,
} from "../models/PostModels";
import { OrderModel } from "../models/TransactionModels";
import { mailQueue } from "../queues/MailQueues";

export const getUserDetails = async (req: Request, res: Response) => {
	const { id } = req.query;

	if (!id) {
		return res.status(500).json({
			success: false,
			message: "Id required",
		});
	}

	try {
		console.time("UserModel")
		const data = await UserModel.findById(id).select("-password -__v");
	console.timeEnd("UserModel")
		return res.status(200).json({
			success: true,
			message: "User Fetched",
			data,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to Fetch User",
			error: error,
		});
	}
};

export const FollowUser = async (req: Request, res: Response) => {
	const { targetId, initiatingId, role, targetName } = req.body;

	if (!targetId || !initiatingId || !role || !targetName) {
		return res.status(500).json({
			success: false,
			message: "Not enough details provided",
		});
	}

	let name;

	try {
		if (role === "provider") {
			const res = await ServiceProviderRegModel.findByIdAndUpdate(
				initiatingId,
				{
					$addToSet: { "stats.Following": targetId },
				},
				{ new: true },
			);

			name = res?.RegName;
		}

		if (role === "user") {
			const res = await UserModel.findByIdAndUpdate(
				initiatingId,
				{
					$addToSet: { "stats.Following": targetId },
				},
				{ new: true },
			);

			name = res?.name;
		}

		const notification = new notificationModel({
			message: `${name} Followed you`,
			sendTo: [{ id: targetId, name: targetName }],
			sentBy: { id: initiatingId, name },
		});
		await notification.save();

		const target = await ServiceProviderRegModel.findByIdAndUpdate(
			targetId,
			{
				$addToSet: {
					"stats.Followers": initiatingId,
					notifications: notification._id,
				},
			},
			{ new: true },
		);

		await adminNotify(`${name} started following ${target?.RegName}`);

		return res.status(200).json({
			success: true,
			message: "User Followed",
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to Follow User",
			error: error,
		});
	}
};

export const UnFollowUser = async (req: Request, res: Response) => {
	const { targetId, initiatingId, role } = req.body;

	if (!targetId || !initiatingId || !role) {
		return res.status(500).json({
			success: false,
			message: "No Id provided",
		});
	}

	try {
		if (role === "provider") {
			await ServiceProviderRegModel.findByIdAndUpdate(initiatingId, {
				$pull: { "stats.Following": targetId },
			});
		}

		if (role === "user") {
			await UserModel.findByIdAndUpdate(initiatingId, {
				$pull: { "stats.Following": targetId },
			});
		}

		await ServiceProviderRegModel.findByIdAndUpdate(targetId, {
			$pull: { "stats.Followers": initiatingId },
		});

		return res.status(200).json({
			success: true,
			message: "User un Followed",
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to Un Follow User",
			error: error,
		});
	}
};

export const getfollowinglist = async (req: Request, res: Response) => {
	const { id, role } = req.query;

	if (!id || !role) {
		return res.status(500).json({
			success: false,
			message: "No data provided",
		});
	}

	try {
		let list: string[];
		let data;

		if (role === "provider") {
			data = await ServiceProviderRegModel.findById(id)
				.select("stats.Following")
				.sort({ createdAt: -1 });
		} else if (role === "user") {
			data = await UserModel.findById(id)
				.select("stats.Following")
				.sort({ createdAt: -1 });
		}

		list = data?.stats?.Following || [];

		return res.status(200).json({
			success: true,
			message: "List fetched",
			data: list,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch Following List",
			error: error,
		});
	}
};

export const getFollowingDetails = async (req: Request, res: Response) => {
	const { id, role } = req.query;

	if (!id || !role) {
		return res.status(500).json({
			success: false,
			message: "No data provided",
		});
	}

	try {
		let data;

		if (role === "provider") {
			data =
				await ServiceProviderRegModel.findById(id).select("stats.Following");
		} else if (role === "user") {
			data = await UserModel.findById(id).select("stats.Following");
		}

		const list = await ServiceProviderRegModel.find({
			_id: { $in: data?.stats?.Following },
		})
			.select(
				"type category RegName regNumber profileUrl companyLogo stats.Followers",
			)
			.sort({ createdAt: -1 });

		return res.status(200).json({
			success: true,
			message: "List fetched",
			data: list,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch Following List",
			error: error,
		});
	}
};

export const getFollowers = async (req: Request, res: Response) => {
	if (!req.query.id) {
		return res.status(500).json({
			success: false,
			message: "No Id provided",
		});
	}

	try {
		const { id } = req.query;

		const followersArr =
			await ServiceProviderRegModel.findById(id).select("stats.Followers");

		const users = await UserModel.find({
			_id: { $in: followersArr?.stats?.Followers },
		}).select("_id name role profileUrl");

		const sps = await ServiceProviderRegModel.find({
			_id: { $in: followersArr?.stats?.Followers },
		}).select("_id name role profileUrl");

		const combinedFollowers = [...users, ...sps];

		return res.status(200).json({
			success: true,
			message: "List fetched",
			data: combinedFollowers,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch Following List",
			error: error,
		});
	}
};

export const getSubscribers = async (req: Request, res: Response) => {
	if (!req.query.id) {
		return res.status(400).json({
			success: false,
			message: "No Id provided",
		});
	}

	try {
		const { id } = req.query;

		// Fetch orders where soldBy matches the given id. Only verified
		// subscribers belong here — manual orders still pending verification
		// (or rejected) live in the Leads section, not Subscribers.
		const orders = await OrderModel.find({
			"soldBy.id": id,
			$nor: [{ paymentMethod: "Manual", paymentStatus: { $in: ["pending", "rejected"] } }],
		})
			.select(
				"orderdBy serviceName validity createdAt signedDocumentUrl paymentProof kycDetails isExpired",
			)
			.sort({ createdAt: -1 })
			.lean();

		if (!orders.length) {
			return res.status(200).json({
				success: true,
				message: "No subscribers found",
				data: [],
			});
		}

		// Collect all unique subscriber IDs
		const subscriberIds = [
			...new Set(orders.map((order) => order?.orderdBy?.id)),
		];

		// Fetch subscriber details from both user and service provider collections
		const userSubscribers = await UserModel.find({
			_id: { $in: subscriberIds },
		})
			.select("_id name email number role profileUrl")
			.lean();

		const spSubscribers = await ServiceProviderRegModel.find({
			_id: { $in: subscriberIds },
		})
			.select("_id name email number role profileUrl")
			.lean();

		const combinedSubscribers = [...userSubscribers, ...spSubscribers];

		// Map orders to include subscriber details
		const responseData = orders
			.map((order) => {
				const subscriber = combinedSubscribers.find(
					(sub) => sub._id.toString() === order?.orderdBy?.id,
				);

				if (subscriber) {
					return {
						...subscriber,
						plan: order.serviceName,
						purchaseDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
						validity: order.validity,
						serviceName: order.serviceName,
						signedDocumentUrl: order.signedDocumentUrl,
						paymentProof: order.paymentProof,
						kycDetails: order.kycDetails,
						isExpired: order.isExpired,
					};
				}
				return null;
			})
			.filter(Boolean);

		return res.status(200).json({
			success: true,
			message: "Subscribers fetched successfully",
			data: responseData,
		});
	} catch (error) {
		console.error("Error fetching subscribers:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch subscribers",
			error: error,
		});
	}
};

export const getActiveSubscribers = async (req: Request, res: Response) => {
	if (!req.query.id) {
		return res.status(400).json({
			success: false,
			message: "No Id provided",
		});
	}

	try {
		const { id } = req.query;

		// Find all services authored by the given user
		const services = await ServiceModel.find({
			"authorData.id": id,
		}).select("title subscribedBy");

		const activeSubscribersPromises = services.map(async (service) => {
			return Promise.all(
				service.subscribedBy.map(async (subscriberId) => {
					// Fetch user details (either normal user or service provider)
					const user = await UserModel.findById(subscriberId).select(
						"_id name email number role profileUrl",
					);
					const sp = await ServiceProviderRegModel.findById(
						subscriberId,
					).select("_id name email number role profileUrl");

					if (user || sp) {
						// Fetch the latest active order
						const order = await OrderModel.findOne({
							subscribedToId: service._id.toString(),
							"orderdBy.id": subscriberId,
							isExpired: false, // Only fetch active orders
							// Exclude unverified manual orders (they belong in Leads).
							$nor: [{ paymentMethod: "Manual", paymentStatus: { $in: ["pending", "rejected"] } }],
						})
							.select("createdAt validity serviceName")
							.sort({ createdAt: -1 });

						if (order) {
							return {
								...(user ? user.toObject() : sp?.toObject()),
								plan: service.title,
								purchaseDate: order.createdAt,
								validity: order.validity,
								serviceName: order.serviceName,
							};
						}
					}
					return null; // Skip if no active order found
				}),
			);
		});

		const activeSubscribers = (await Promise.all(activeSubscribersPromises))
			.flat()
			.filter(Boolean); // Remove null values

		return res.status(200).json({
			success: true,
			message: "Active subscribers fetched successfully",
			data: activeSubscribers,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch active subscribers",
			error: error,
		});
	}
};

export const getInactiveSubscribers = async (req: Request, res: Response) => {
	if (!req.query.id) {
		return res.status(400).json({
			success: false,
			message: "No Id provided",
		});
	}

	try {
		const { id } = req.query;

		// Find all services authored by the given user
		const services = await ServiceModel.find({
			"authorData.id": id,
		}).select("title subscribedBy");

		const inactiveSubscribersPromises = services.map(async (service) => {
			return Promise.all(
				service.subscribedBy.map(async (subscriberId) => {
					// Fetch user details (either normal user or service provider)
					const user = await UserModel.findById(subscriberId).select(
						"_id name email number role profileUrl",
					);
					const sp = await ServiceProviderRegModel.findById(
						subscriberId,
					).select("_id name email number role profileUrl");

					if (user || sp) {
						// Fetch the latest inactive order
						const order = await OrderModel.findOne({
							subscribedToId: service._id.toString(),
							"orderdBy.id": subscriberId,
							isExpired: true, // Only fetch inactive orders
							// Exclude unverified manual orders (they belong in Leads).
							$nor: [{ paymentMethod: "Manual", paymentStatus: { $in: ["pending", "rejected"] } }],
						})
							.select("createdAt validity serviceName")
							.sort({ createdAt: -1 });

						if (order) {
							return {
								...(user ? user.toObject() : sp?.toObject()),
								plan: service.title,
								purchaseDate: order.createdAt,
								validity: order.validity,
								serviceName: order.serviceName,
							};
						}
					}
					return null; // Skip if no inactive order found
				}),
			);
		});

		const inactiveSubscribers = (await Promise.all(inactiveSubscribersPromises))
			.flat()
			.filter(Boolean); // Remove null values

		return res.status(200).json({
			success: true,
			message: "Inactive subscribers fetched successfully",
			data: inactiveSubscribers,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch inactive subscribers",
			error: error,
		});
	}
};

export const getLeadsNormal = async (req: Request, res: Response) => {
	if (!req.query.id) {
		return res.status(500).json({
			success: false,
			message: "No Id provided",
		});
	}

	try {
		const { id } = req.query;

		const data = await OrderModel.find({
			"soldBy.id": id,
		}).select("orderdBy serviceName validity createdAt");

		const emails: string[] = [];

		data.map((item) => {
			emails.push(item.orderdBy?.id!);
		});

		const userEmails = await UserModel.find({ _id: { $in: emails } }).select(
			"email",
		);
		const spEmails = await ServiceProviderRegModel.find({
			_id: { $in: emails },
		}).select("email");

		const combinedMails = [...userEmails, ...spEmails];

		const ResponseData = data.map((item) => {
			const matchingMail = combinedMails.find(
				(mail) => mail._id.toString() === item.orderdBy?.id,
			);

			if (matchingMail) {
				const { orderdBy, ...rest } = item.toObject();
				return {
					...rest,
					email: matchingMail.email,
					name: orderdBy?.name,
					createdAt: new Date(rest.createdAt)
						.toLocaleString("en-IN")
						.split(",")[0],
					validity: rest.validity.split(",")[0],
				};
			}

			const { orderdBy, ...rest } = item.toObject();
			return { ...rest };
		});

		return res.status(200).json({
			success: true,
			message: "fetched leads",
			data: ResponseData,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to get leads data",
			error: error,
		});
	}
};

// export const getLeadsFund = async (req: Request, res: Response) => {
// 	if (!req.query.id) {
// 		return res.status(500).json({
// 			success: false,
// 			message: "No Id provided",
// 		});
// 	}

// 	try {
// 		const { id } = req.query;

// 		const leads = await LeadsModel.find({ "sendTo.id": id }).sort({
// 			createdAt: -1,
// 		});

// 		const formattedLeads = leads.map((lead) => {
// 			return {
// 				name: lead.sentBy?.name,
// 				email: lead.sentBy?.email,
// 				number: lead.sentBy?.number,
// 				planName: lead.planName,
// 				createdAt: new Date(lead.createdAt)
// 					.toLocaleString("en-IN")
// 					.split(",")[0],
// 			};
// 		});

// 		return res.status(200).json({
// 			success: true,
// 			message: "fetched leads",
// 			data: formattedLeads,
// 		});
// 	} catch (error) {
// 		return res.status(500).json({
// 			success: false,
// 			message: "Failed to fetch Leads",
// 			error: error,
// 		});
// 	}
// };

export const getSPContactDetails = async (req: Request, res: Response) => {
	if (!req.query.id) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch no id provided",
		});
	}

	const { id } = req.query;

	try {
		const data = await ServiceProviderRegModel.findById(id).select(
			"RegName email profileUrl number address1 address2",
		);

		return res.status(200).json({
			success: true,
			message: "SP contact details fetched",
			data: data,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to fetch SP contact details",
			error: error,
		});
	}
};

export const registerForEvent = async (req: Request, res: Response) => {
	const { id, name, email, number, eventId, eventMode } = req.body;

	try {
		// Find the event by ID
		const event = await EventModel.findById(eventId);
		if (!event) {
			return res.status(404).json({ message: "Event not found" });
		}

		// For hybrid events, require eventMode
		if (event.eventType === "Hybrid" && !eventMode) {
			return res
				.status(400)
				.json({ message: "Event mode is required for hybrid events" });
		}

		// Determine the event mode
		let finalEventMode = eventMode;
		if (!finalEventMode) {
			if (event.eventType === "Online") {
				finalEventMode = "online";
			} else if (event.eventType === "Offline") {
				finalEventMode = "offline";
			} else {
				finalEventMode = "online";
			}
		}

		// Create registration (unique index prevents duplicates atomically)
		try {
			await EventRegistrationModel.create({
				eventId: eventId,
				userId: id,
				userName: name,
				userEmail: email,
				eventMode: finalEventMode,
			});
		} catch (err: any) {
			if (err.code === 11000) {
				return res.status(400).json({ message: "User already registered" });
			}
			throw err;
		}

		const eventDate = new Date(event.schedule);
		const date = eventDate.toLocaleDateString(undefined, {
			weekday: "long",
			year: "numeric",
			month: "short",
			day: "2-digit",
		});
		const time = eventDate.toLocaleTimeString("en-IN", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
			timeZone: "Asia/Kolkata",
		});

		// Determine event details based on mode
		let eventDetails = "";
		if (finalEventMode === "online") {
			eventDetails = event.link
				? `<li><span>Event Link</span>: <a href="${event.link}">${event.link}</a></li>`
				: "";
		} else if (finalEventMode === "offline") {
			eventDetails = event.location
				? `<li><span>Event Location</span>: ${event.location}</li>`
				: "";
		}

		// Add mode information to email
		const modeInfo = `<p>You have registered for the <span>${finalEventMode}</span> mode of this event.</p>`;

		// Email content
		const mailOptions = {
			from: process.env.EMAIL,
			to: email,
			subject: `Thank You for Registering - ${event.title}`,
			html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          span{
            font-weight: bold;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: left;
          }
          .logo {
            display: block;
            width: 150px;
            background-color: white;
            padding: 10px;
            border-radius: 10px;
          }
          .content {
            margin: 20px 0;
          }
          li{
            padding: 5px 0;
          }
          p{
            line-height: 22px;
          }
          .button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            border-radius: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #888;
          }
          .mode-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 15px;
            color: white;
            font-weight: bold;
            margin-left: 10px;
          }
          .online {
            background-color: #3B82F6;
          }
          .offline {
            background-color: #10B981;
          }
        </style>
      </head>
      <body>
       <div class="container">
          <div class="header">
            <img src="https://tradeboxfintech.s3.ap-south-1.amazonaws.com/Images/TradeBox_Black_logo.png" alt="Light Logo" class="logo">
          </div>
          <div class="content">
            <h2>Thank you for registering for the event! 
              <span class="mode-badge ${finalEventMode}">${finalEventMode.toUpperCase()}</span>
            </h2>
            <p>Hello <span>${name}</span>,</p>
            ${modeInfo}
            <p class="event-note">Thank you for registering for the event <span>"${event.title}"</span>.</p>
            <p>Event Details:</p>
            <ul>
              <li><span>Date</span>: ${date}</li>
              <li><span>Time</span>: ${time}</li>
              ${eventDetails}
              ${finalEventMode === "online" ? `<li><span>Instructions</span>:Please ensure that Google Meet is accessible on your device and join the meeting at least five minutes early to avoid any connectivity issues.</li>` : ""}
              ${finalEventMode === "offline" ? `<li><span>Instructions</span>: Please arrive 15 minutes early at the venue for smooth registration.</li>` : ""}
            </ul>
            <p>We look forward to seeing you there!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 TradeBox. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>`,

			text: `Dear ${name},

Thank you for registering for our event: ${event.title}.

You have registered for the ${finalEventMode} mode of this event.

Event: ${event.title}

Date & Time: ${date} at ${time}

${finalEventMode === "online" ? `Event Link: ${event.link}` : ""}
${finalEventMode === "offline" ? `Event Location: ${event.location}` : ""}

${finalEventMode === "online" ? "Please ensure that Google Meet is accessible on your device and join the meeting at least five minutes early to avoid any connectivity issues." : ""}
${finalEventMode === "offline" ? "Please arrive 15 minutes early at the venue for smooth registration." : ""}

We look forward to your participation!

Best regards,
TradeBox Team`,
		};

		await mailQueue.add(
			email,
			{ mailOptions },
			{ removeOnComplete: true, removeOnFail: true },
		);

		// Update notification message to include mode
		const notificationMessage = `${name} subscribed to your ${event.title} event (${finalEventMode} mode)`;

		const notification = new notificationModel({
			message: notificationMessage,
			sendTo: { name: `${event.authorData?.name}` },
			sentBy: { id: id, name },
		});
		await notification.save();

		await ServiceProviderRegModel.updateMany({
			$addToSet: { notifications: notification._id },
		});

		// Update admin notification to include mode
		const adminMessage = `${name} subscribed to ${event.title} event (${finalEventMode} mode)`;

		await adminNotify(adminMessage);

		return res.status(200).json({
			message: "Registration successful",
			eventMode: finalEventMode,
		});
	} catch (error) {
		console.error("Error registering for event:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const checkRegistration = async (req: Request, res: Response) => {
	const { userId, eventId } = req.body;

	try {
		if (!eventId || !userId) {
			return res.status(404).json({ message: "Missing required field" });
		}

		const registration = await EventRegistrationModel.findOne({
			eventId,
			userId,
		});

		if (registration) {
			return res.status(200).json({
				success: true,
				isRegistered: true,
				registrationMode: registration.eventMode,
			});
		}

		return res.status(200).json({
			success: true,
			isRegistered: false,
		});
	} catch (error) {
		console.error("Error checking registration status:", error);
		return res.status(500).json({ message: "Internal Server Error" });
	}
};

// export const contactedViaServicePage = async (req: Request, res: Response) => {
// 	const expectedKeys = [
// 		"initiatingId",
// 		"initiatingname",
// 		"number",
// 		"email",
// 		"plan",
// 		"targetId",
// 		"targetname",
// 		"targetEmail",
// 	];

// 	try {
// 		const parsedBody = req.body;
// 		const allElementsPresent = expectedKeys.every((key) =>
// 			// biome-ignore lint/suspicious/noPrototypeBuiltins: <>
// 			Object.prototype.hasOwnProperty.call(parsedBody, key),
// 		);
// 		if (!allElementsPresent)
// 			return res
// 				.status(400)
// 				.json({ success: false, message: "All fields are required" });

// 		const {
// 			initiatingId,
// 			initiatingname,
// 			number,
// 			email,
// 			plan,
// 			targetId,
// 			targetname,
// 			targetEmail,
// 		} = req.body;

// 		const newLead = new LeadModel({
// 			type: "fund",
// 			sendTo: { id: targetId, name: targetname },
// 			sentBy: { id: initiatingId, name: initiatingname, email, number },
// 			planName: plan,
// 		});

// 		await newLead.save();

// 		const newNotification = new notificationModel({
// 			message: `${initiatingname} tried contacting you for ${plan}`,
// 			sendTo: [{ id: targetId, name: targetname }],
// 			sentBy: { id: initiatingId, name: initiatingname },
// 			type: "contact",
// 		});

// 		await newNotification.save();

// 		await ServiceProviderRegModel.findByIdAndUpdate(targetId, {
// 			$addToSet: { notifications: newNotification._id },
// 		});

// 		const mailOptions = {
// 			from: process.env.EMAIL,
// 			to: targetEmail,
// 			subject: `Someone tried reaching out to you`,
// 			html: `<p>${initiatingname} tried contacting you for ${plan}</p>`,
// 		};

// 		await mailQueue.add(
// 			email,
// 			{ mailOptions },
// 			{ removeOnComplete: true, removeOnFail: true },
// 		);

// 		return res.status(200).json({
// 			success: true,
// 			message: "Notification Sent",
// 			data: "",
// 		});
// 	} catch (error) {
// 		return res.status(500).json({
// 			success: false,
// 			message: "Failed to set contact notification",
// 			error: error,
// 		});
// 	}
// };

export const checkTelegram = async (req: Request, res: Response) => {
	const { userId } = req.body;

	try {
		const user = await UserModel.findOne({
			_id: userId,
			telegram: { $exists: true },
		});

		if (user) {
			return res.status(200).json({ hasTelegram: true });
		} else {
			return res.status(200).json({ hasTelegram: false });
		}
	} catch (error) {
		console.error("Error in /api/user/has-telegram route:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const savaAadhaar = async (req: Request, res: Response) => {
	try {
		const { userId, aadhaarData } = req.body;

		// Find the user and update Aadhaar data
		const user = await UserModel.findByIdAndUpdate(
			userId,
			{ aadhaar: aadhaarData, kycStatus: "verified" },
			{ new: true },
		);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		await sendNotification({
			recipientIds: [String(userId)],
			recipientRole: "user",
			message: "Your KYC has been verified. You can now access all features.",
			type: "kyc-approved",
			category: "admin",
			sentBy: { id: "admin", name: "Tradebox" },
			postLink: "/dashboard/user/kyc",
			ctaLabel: "View KYC",
		});

		return res
			.status(200)
			.json({ message: "Aadhaar data saved successfully", user });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
};

// export const uploadKycDocuments = async (req: Request, res: Response) => {
// 	try {
// 		const { userId, urls } = req.body;

// 		// 1️⃣ Validate Input
// 		if (!userId || !Array.isArray(urls) || urls.length < 2) {
// 			return res.status(400).json({ message: "Invalid request, missing data" });
// 		}

// 		console.log("Received userId:", userId);
// 		console.log("Received URLs:", urls);

// 		// 3️⃣ Fetch Files from URLs
// 		const files = await Promise.all(
// 			urls.map(async (url: string) => {
// 				try {
// 					const response = await fetch(url);
// 					if (!response.ok)
// 						throw new Error(
// 							`Failed to fetch file: ${url} - Status: ${response.status}`,
// 						);

// 					const contentType = response.headers.get("content-type") || "";
// 					if (!["application/xml", "application/pdf"].includes(contentType)) {
// 						throw new Error(`Unsupported file type: ${contentType}`);
// 					}

// 					const fileExtension = contentType.includes("xml") ? "xml" : "pdf";
// 					const fileName = `${Date.now()}.${fileExtension}`;
// 					const buffer = Buffer.from(await response.arrayBuffer());

// 					return { buffer, originalname: fileName, mimetype: contentType };
// 				} catch (error) {
// 					console.error("Error fetching document:", error);
// 					throw error;
// 				}
// 			}),
// 		);

// 		console.log(
// 			"Fetched files successfully:",
// 			files.map((f) => f.originalname),
// 		);

// 		// Ensure we got valid files
// 		if (!files || files.length < 2) {
// 			return res.status(500).json({ message: "Failed to fetch all documents" });
// 		}

// 		// Upload files using Multer-S3
// 		const uploadedFiles = await Promise.all(files.map(uploadBufferFileToS3));

// 		// Extract S3 URLs
// 		const s3Urls = uploadedFiles.map((file) => file.location);

// 		if (s3Urls.length < 2) {
// 			return res
// 				.status(500)
// 				.json({ message: "Failed to upload all documents" });
// 		}

// 		console.log("S3 URLs:", s3Urls);

// 		// 7️⃣ Return Success Response
// 		return res.json({
// 			message: "Documents uploaded successfully",
// 			data: s3Urls,
// 		});
// 	} catch (error: any) {
// 		console.error("Error processing documents:", error);

// 		return res.status(500).json({
// 			message: "Internal server error",
// 			error: error.message || "Unknown error",
// 		});
// 	}
// };

// export const uploadEsignDocument = async (req: Request, res: Response) => {
// 	try {
// 		const { userId, signedDocURL, serviceId } = req.body;

// 		// 1️⃣ Validate Input
// 		if (!userId || !signedDocURL) {
// 			return res.status(400).json({ message: "Invalid request, missing data" });
// 		}

// 		console.log("Received userId:", userId);
// 		console.log("Received signed document URL:", signedDocURL);

// 		// 2️⃣ Fetch the Signed Document
// 		const response = await fetch(signedDocURL);
// 		if (!response.ok) {
// 			throw new Error(
// 				`Failed to fetch signed document - Status: ${response.status}`,
// 			);
// 		}

// 		const contentType = response.headers.get("content-type") || "";
// 		if (contentType !== "application/pdf") {
// 			throw new Error(`Unsupported file type: ${contentType}`);
// 		}

// 		const fileName = `signed_documents/${userId}/${serviceId}}.pdf`;
// 		const fileBuffer = Buffer.from(await response.arrayBuffer());

// 		console.log("Fetched signed document successfully:", fileName);

// 		// 3️⃣ Upload to S3
// 		const uploadedFile = await uploadBufferFileToS3({
// 			buffer: fileBuffer,
// 			originalname: fileName,
// 			mimetype: contentType,
// 		});

// 		if (!uploadedFile || !uploadedFile.location) {
// 			return res
// 				.status(500)
// 				.json({ message: "Failed to upload signed document" });
// 		}

// 		const s3Url = uploadedFile.location;
// 		console.log("S3 URL for signed document:", s3Url);

// 		// 4️⃣ Update User Model
// 		const updatedUser = await UserModel.findByIdAndUpdate(userId, {
// 			signedDocumentUrl: s3Url,
// 		});

// 		console.log("User signed document URL updated successfully.");

// 		// 5️⃣ Return Success Response
// 		return res.json({
// 			message: "Signed document uploaded successfully",
// 			s3Url,
// 		});
// 	} catch (error: any) {
// 		console.error("Error uploading signed document:", error);
// 		return res.status(500).json({
// 			message: "Internal server error",
// 			error: error.message || "Unknown error",
// 		});
// 	}
// };

export const pdfParseDocument = async (req: Request, res: Response) => {
	if (req.method !== "POST") {
		return res.status(405).json({ message: "Method Not Allowed" });
	}

	try {
		const { pdfUrl } = req.body;

		// Download the PDF file
		const response = await fetch(pdfUrl);
		const buffer = await response.arrayBuffer();
		const pdfData = await pdf(Buffer.from(buffer));

		return res.json({
			text: pdfData.text,
			pageCount: pdfData.numpages, // ✅ send total pages
		});
	} catch (error) {
		return res.status(500).json({ message: "Error extracting text", error });
	}
};

export const uploadPanManuallyandGenerateLink = async (
	req: Request,
	res: Response,
) => {
	try {
		const file = req.file as Express.MulterS3.File;

		if (!file) {
			return res.status(400).json({
				success: false,
				message: "No file uploaded",
			});
		}

		return res.status(200).json({
			success: true,
			message: "PAN uploaded successfully",
			data: {
				panUrl: file.location, // S3 URL
				key: file.key, // S3 key
				originalName: file.originalname,
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to Update",
			error: error,
		});
	}
};

export const getPreviousOrderDetails = async (req: Request, res: Response) => {
	try {
		const { userId, serviceId } = req.body;

		// Validate request body
		if (!userId || !serviceId) {
			return res.status(400).json({
				success: false,
				message: "User ID and Service ID are required",
			});
		}

		// Get current date for validity check
		const currentDate = new Date();

		// Find the most recent completed order for this user and service
		// that is still valid (endDate is in the future)
		const previousOrder = await OrderModel.findOne({
			"orderdBy.id": userId,
			subscribedToId: serviceId,
			isExpired: false,
			endDate: { $gte: currentDate }, // Only orders that haven't expired yet
		})
			.sort({ createdAt: -1 }) // Get the most recent order
			.lean();

		if (!previousOrder) {
			// If no current valid order, check for any completed order (even expired)
			const anyPreviousOrder = await OrderModel.findOne({
				"orderdBy.id": userId,
				subscribedToId: serviceId,
			})
				.sort({ createdAt: -1 })
				.lean();

			if (!anyPreviousOrder) {
				return res.status(404).json({
					success: false,
					message: "No previous order found for this service",
				});
			}

			// Return expired order data but indicate it's expired
			const responseData = {
				signedDocumentUrl: anyPreviousOrder.signedDocumentUrl || null,
				panNumber: anyPreviousOrder.kycDetails?.panNumber || null,
				dateOfBirth: anyPreviousOrder.kycDetails?.dob || null,
				// aadhaarURL: anyPreviousOrder.kycDetails?.aadhaarURL || null,
				// panURL: anyPreviousOrder.kycDetails?.panURL || null,
				orderId: anyPreviousOrder._id,
				orderDate: anyPreviousOrder.createdAt,
				serviceTitle: anyPreviousOrder.serviceName || "Unknown Service",
				isExpired: true,
				endDate: anyPreviousOrder.endDate,
				validity: anyPreviousOrder.validity,
			};

			return res.status(200).json({
				success: true,
				data: responseData,
				message: "Order found but has expired",
			});
		}

		// Extract the required data for renewal from valid order
		const responseData = {
			signedDocumentUrl: previousOrder.signedDocumentUrl || null,
			panNumber: previousOrder.kycDetails?.panNumber || null,
			dateOfBirth: previousOrder.kycDetails?.dob || null,
			// aadhaarURL: previousOrder.kycDetails?.aadhaarURL || null,
			// panURL: previousOrder.kycDetails?.panURL || null,
			orderId: previousOrder._id,
			orderDate: previousOrder.createdAt,
			serviceTitle: previousOrder.serviceName || "Unknown Service",
			isExpired: false,
			endDate: previousOrder.endDate,
			validity: previousOrder.validity,
		};

		return res.status(200).json({
			success: true,
			data: responseData,
		});
	} catch (error) {
		console.error("Error fetching previous order:", error);
		return res.status(500).json({
			success: false,
			message: "Server error while fetching previous order details",
		});
	}
};

interface ServiceProviderQueryParams {
	page?: string;
	limit?: string;
	search?: string;
}

export const getAllServiceProviders = async (req: Request, res: Response) => {
	try {
		const {
			page = "1",
			limit = "20",
			search = "",
		} = req.query as ServiceProviderQueryParams;

		// Convert page and limit to numbers
		const pageNumber = parseInt(page, 10);
		const limitNumber = parseInt(limit, 10);

		// Validate pagination parameters
		if (Number.isNaN(pageNumber) || pageNumber < 1) {
			return res.status(400).json({
				success: false,
				message: "Invalid page number",
			});
		}

		if (Number.isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
			return res.status(400).json({
				success: false,
				message: "Invalid limit number. Must be between 1 and 100",
			});
		}

		// Calculate skip value for pagination
		const skip = (pageNumber - 1) * limitNumber;

		// Build search query - search across name, RegName, email, companyName
		const searchQuery = search
			? {
					$or: [
						{ name: { $regex: search, $options: "i" } },
						{ RegName: { $regex: search, $options: "i" } },
						{ email: { $regex: search, $options: "i" } },
						{ companyName: { $regex: search, $options: "i" } },
					],
				}
			: {};

		// Execute query with pagination
		const [serviceProviders, totalCount] = await Promise.all([
			ServiceProviderRegModel.find(searchQuery)
				.select(
					"_id name RegName email number profileUrl companyLogo type category companyName",
				)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limitNumber)
				.lean(),
			ServiceProviderRegModel.countDocuments(searchQuery),
		]);

		// Format data for multiselect dropdown
		const formattedProviders = serviceProviders.map((provider) => ({
			id: provider._id,
			name:
				provider.RegName || provider.name || provider.companyName || "Unknown",
			email: provider.email,
			number: provider.number,
			profileUrl: provider.profileUrl,
			companyLogo: provider.companyLogo,
			type: provider.type,
			category: provider.category,
			companyName: provider.companyName,
		}));

		// Calculate pagination metadata
		const totalPages = Math.ceil(totalCount / limitNumber);
		const hasNextPage = pageNumber < totalPages;
		const hasPrevPage = pageNumber > 1;

		return res.status(200).json({
			success: true,
			message: "Service providers retrieved successfully",
			data: {
				serviceProviders: formattedProviders,
				pagination: {
					currentPage: pageNumber,
					totalPages,
					totalItems: totalCount,
					itemsPerPage: limitNumber,
					hasNextPage,
					hasPrevPage,
				},
			},
		});
	} catch (error) {
		console.error("Error fetching service providers:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};


// GET /api/events/enrolled?userId=xxx
export const getEnrolledEvents = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const registrations = await EventRegistrationModel.find({ userId }).lean();
    const eventIds = registrations.map((r) => r.eventId);
    const events = await EventModel.find({ _id: { $in: eventIds } }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Get enrolled events error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrolled events",
    });
  }
};

/**
 * POST /api/user/send-email-otp
 * Sends a 4-digit OTP to the user's email for verification.
 * Body: { userId: string }
 */
export const sendEmailVerificationOTP = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const user = await UserModel.findById(userId).select("email emailVerified");
    if (!user || !user.email) {
      return res.status(404).json({ success: false, message: "User or email not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    // Check if OTP already sent recently
    const existing = await userOTPModel.findOne({ email: user.email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "OTP already sent. Please check your email or try again in 10 minutes.",
      });
    }

    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedOtp = await bcrypt.hash(otp, 10);

    await new userOTPModel({
      email: user.email,
      otp: hashedOtp,
      createdAt: Date.now(),
      expiredAt: Date.now() + 600000,
    }).save();

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: "TradeBox - Verify Your Email",
      html: `<p>Your email verification code is: <strong>${otp}</strong>. This code is valid for 10 minutes.</p>`,
    };

    await mailQueue.add(user.email, { mailOptions }, { removeOnComplete: true, removeOnFail: true });

    return res.status(200).json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Send email OTP error:", error);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

/**
 * POST /api/user/verify-email-otp
 * Verifies the OTP and marks the user's email as verified.
 * Body: { userId: string, otp: string }
 */
export const verifyEmailOTP = async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: "userId and otp are required" });
    }

    const user = await UserModel.findById(userId).select("email emailVerified");
    if (!user || !user.email) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    const otpRecord = await userOTPModel.findOne({ email: user.email });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "OTP expired or not found. Please request a new one." });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await UserModel.findByIdAndUpdate(userId, { $set: { emailVerified: true } });
    await userOTPModel.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email OTP error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};
