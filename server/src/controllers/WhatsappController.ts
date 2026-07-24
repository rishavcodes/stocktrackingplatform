import type { Request, Response } from "express";
import { logger } from "../config/logger";
import { ServiceProviderRegModel } from "../models/AuthModels";

interface ConnectWhatsappRequestBody {
	businessId: string;
	phoneNumberId: string;
	isConnected: boolean;
	wabaId: string;
	userId: string;
}

const WHATSAPP_API_URL = "https://graph.facebook.com/v23.0";

/**
 * Send WhatsApp message using the Business API
 * @param phoneNumber - WhatsApp phone number with country code (e.g., "919876543210")
 * @param message - Message content
 * @param phoneNumberId - WhatsApp Business phone number ID
 * @param templateName - Optional template name for template messages
 * @param templateParams - Optional template parameters
 */
export const sendWhatsappMessage = async (
	phoneNumber: string,
	name: string,
	message: string,
	phoneNumberId: string,
	templateName?: string,
	templateParams?: string[],
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
	try {
		const accessToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;

		console.log("BODY", {
			phoneNumber,
			name,
			message,
			phoneNumberId,
			templateName,
			templateParams,
		});

		if (!accessToken) {
			throw new Error("WhatsApp access token not configured");
		}

		// Clean phone number - remove any non-digit characters except +
		const cleanPhoneNumber = phoneNumber.replace(/[^\d+]/g, "");
		// Add 91 (India country code) if phone number is 10 digits
		const formattedPhoneNumber =
			cleanPhoneNumber.length === 10
				? `91${cleanPhoneNumber}`
				: cleanPhoneNumber;

		let payload: any;

		if (templateName && templateParams) {
			// Template message - handle different template structures
			let components: any[] = [];

			if (templateName === "trade_change") {
				// componentOne: HEADER + BODY template
				// templateParams should be: [headerText, userName, tradeDetails, authorName]
				components = [
					{
						type: "header",
						parameters: [
							{
								type: "text",
								text: templateParams[0] || "Trade Alert", // Header text like "Target Achieved"
							},
						],
					},
					{
						type: "body",
						parameters: [
							{
								type: "text",
								text: name || "Subscriber", // User name
							},
							{
								type: "text",
								text: templateParams[1] || "Trade update", // Trade details
							},
							{
								type: "text",
								text: templateParams[2] || "Research Team", // Author name
							},
						],
					},
				];
			} else if (templateName === "new_recommendation") {
				// componentTwo: HEADER (fixed) + BODY template
				// templateParams should be: [tradeType, rate, target, stopLoss, cmp, riskReward, authorName]
				components = [
					{
						type: "body",
						parameters: [
							{
								type: "text",
								text: templateParams[0] || "BUY: SCRIPT", // Trade type and script
							},
							{
								type: "text",
								text: templateParams[1] || "0", // Rate
							},
							{
								type: "text",
								text: templateParams[2] || "0", // Target
							},
							{
								type: "text",
								text: templateParams[3] || "0", // Stop Loss
							},
							{
								type: "text",
								text: templateParams[4] || "0", // CMP
							},
							{
								type: "text",
								text: templateParams[5] || "1:1", // Risk Reward Ratio
							},
							{
								type: "text",
								text: templateParams[6] || "Research Team", // Author name
							},
						],
					},
				];
			} else {
				// Fallback for unknown templates - simple body
				components = [
					{
						type: "body",
						parameters: templateParams.map((param) => ({
							type: "text",
							text: param,
						})),
					},
				];
			}

			payload = {
				messaging_product: "whatsapp",
				to: formattedPhoneNumber,
				type: "template",
				template: {
					name: templateName,
					language: {
						code: "en_US",
					},
					components: components,
				},
			};
		} else {
			// Text message
			payload = {
				messaging_product: "whatsapp",
				to: formattedPhoneNumber,
				type: "text",
				text: {
					preview_url: false,
					body: message,
				},
			};
		}

		console.log("Payload", payload);

		// const response = await fetch(`${WHATSAPP_API_URL}/827582673763615/messages`, {
		const response = await fetch(
			`${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify(payload),
				// body: JSON.stringify({
				// 	messaging_product: "whatsapp",
				// 	to: "919133533051",
				// 	type: "text",
				// 	text: {
				// 		body: `📈 New Recommendation:\n\nBUY:${templateParams?.[0]}\nRate: 864.1\nTarget: 2344\nStop Loss: 3432.96\nCMP: 864.1\nRisk Reward Ratio: -1:-0.6\n\nRecommended By: Deepak Gupta\n(SEBI-Registered Research Analyst)`,
				// 	},
				// }),
			},
		);

		const responseData = await response.json();

		console.log(
			"Response for sending whatsapp message for phone number",
			phoneNumber,
			responseData,
		);

		if (!response.ok) {
			console.error("WhatsApp API error:", responseData);
			return {
				success: false,
				error:
					responseData.error?.message ||
					`HTTP ${response.status}: ${response.statusText}`,
			};
		}
		return {
			success: true,
			messageId: responseData.messages?.[0]?.id,
		};
	} catch (error) {
		console.error("Error sending WhatsApp message:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
};

/**
 * Format scorecard data into template parameters for WhatsApp Business templates
 * @param scorecard - The scorecard data
 * @param templateName - The template to format for
 * @returns Array of template parameters in the correct order
 */
export const formatScorecardForWhatsappTemplate = (
	scorecard: any,
	templateName: string,
	headerText?: string,
	message?: string,
): string[] => {
	console.log("SCORECARD", scorecard);
	console.log("TEMPLATE NAME", templateName);

	if (templateName === "new_recommendation") {
		// Template expects: [tradeType, rate, target, stopLoss, cmp, riskReward, authorName]
		const tradeType = scorecard?.scriptname
			? `${scorecard.entryType.toUpperCase()}: ${scorecard.scriptname}`
			: `${scorecard.entryType.toUpperCase()}: SCRIPT`;

		const rate =
			scorecard?.rate?.toString() || scorecard?.entryPrice?.toString() || "N/A";
		const target = scorecard.target?.toString() || "N/A";
		const stopLoss = scorecard.stoploss?.toString() || "N/A";
		const cmp =
			scorecard?.ltp?.toString() || scorecard?.rate?.toString() || "N/A";
		const riskReward = scorecard?.riskRewardRatio?.toString() || "1:1";
		const authorName = scorecard?.authorData?.name || "Research Team";

		return [tradeType, rate, target, stopLoss, cmp, riskReward, authorName];
	}

	if (templateName === "trade_change") {
		// Template expects: [headerText, userName, tradeDetails, authorName]
		// This would be used for trade exits/updates
		const header = headerText || "Trade Update";
		const tradeDetails = message || `Update on ${scorecard?.scriptname}`;
		const authorName = scorecard?.authorData?.name || "Research Team";

		return [header, tradeDetails, authorName];
	}

	// Fallback - return basic parameters
	return [
		scorecard?.scriptname || "Trade",
		scorecard?.authorData?.name || "Research Team",
	];
};

export const ConnectWhatsapp = async (req: Request, res: Response) => {
	try {
		console.log("Connecting whatsapp", req.body.userId);
		const { businessId, phoneNumberId, wabaId, userId } =
			req.body as ConnectWhatsappRequestBody;

		if (!businessId || !phoneNumberId || !wabaId || !userId) {
			return res.status(400).json({ message: "Invalid request body" });
		}

		const user = await ServiceProviderRegModel.findById(userId);
		console.log("User found", user);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		if (user.metadata?.whatsapp?.isConnected) {
			return res.status(400).json({ message: "Whatsapp already connected" });
		}

		console.log("Connecting whatsapp");

		const componentOne = [
			{
				type: "HEADER",
				format: "TEXT",
				text: "{{1}}",
				example: {
					header_text: ["Target Achieved"],
				},
			},
			{
				type: "BODY",
				text: "Hi {{1}}, your trade alert is here 📢\n\n{{2}}\n\nRecommended by - {{3}}.\n\nHappy trading, and thank you for staying with us!",
				example: {
					body_text: [
						[
							"John Doe",
							"Target Hit on IEX26JUN25200CE at 11.5 with gain of 10.26% ",
							"Front Wave Research LLP",
						],
					],
				},
			},
		];

		const componentTwo = [
			{
				type: "HEADER",
				format: "TEXT",
				text: "New Trade Recommendation",
			},
			{
				type: "BODY",
				text: "📈 Trade Details:\n\n{{1}}\nRate: {{2}}\nTarget: {{3}}\nStop Loss: {{4}}\nCMP: {{5}}\nRisk Reward Ratio: {{6}}\n\nRecommended By: {{7}}\n(SEBI-Registered Research Analyst)",
				example: {
					body_text: [
						[
							"BUY: SBIN26JUN25820CE",
							"10.5",
							"11.5",
							"10.0",
							"10.5",
							"1:1",
							"Front Wave Research LLP",
						],
					],
				},
			},
		];

		const storeWhatsappDataResult = await storeWhatsappDatainDB(
			businessId,
			phoneNumberId,
			wabaId,
			userId,
		);
		// console.log("Store whatsapp data result", storeWhatsappDataResult);
		logger.info("Store whatsapp data result", storeWhatsappDataResult);
		const addSystemUserToWABAResult = await addSystemUserToWABA(wabaId);
		logger.info("Add system user to WABA result", addSystemUserToWABAResult);
		// console.log("Add system user to WABA result", addSystemUserToWABAResult);
		const registerCustomerCloudAPIResult =
			await registerCustomerCloudAPI(phoneNumberId);
		logger.info(
			"Register customer cloud API result",
			registerCustomerCloudAPIResult,
		);
		// console.log("Register customer cloud API result", registerCustomerCloudAPIResult);
		const subscribeWabaToWebhooksResult = await subscribeWabaToWebhooks(wabaId);
		logger.info(
			"Subscribe WABA to webhooks result",
			subscribeWabaToWebhooksResult,
		);
		// console.log("Subscribe WABA to webhooks result", subscribeWabaToWebhooksResult);
		const trendTemplateResult = await createWhatsappTemplate(
			wabaId,
			"trend_change",
			componentOne,
		);
		logger.info("Trend template result", trendTemplateResult);
		// console.log("Trend template result", trendTemplateResult);
		const recommendationTemplateResult = await createWhatsappTemplate(
			wabaId,
			"new_recommendation",
			componentTwo,
		);
		logger.info("Recommendation template result", recommendationTemplateResult);
		// console.log("Recommendation template result", recommendationTemplateResult);
		if (
			!storeWhatsappDataResult.success ||
			!addSystemUserToWABAResult.success ||
			!registerCustomerCloudAPIResult.success ||
			!trendTemplateResult.success ||
			!recommendationTemplateResult.success ||
			!subscribeWabaToWebhooksResult.success
		) {
			return res.status(500).json({ message: "Failed to connect whatsapp" });
		}

		return res.status(200).json({ message: "Whatsapp connected successfully" });
	} catch (error) {
		// console.error("Error connecting whatsapp", error);
		logger.error("Error connecting whatsapp", error);
		return res.status(500).json({ message: "Internal server error" });
	}
};

async function storeWhatsappDatainDB(
	businessId: string,
	phoneNumberId: string,
	wabaId: string,
	userId: string,
) {
	try {
		// Store the whatsapp data in the database
		const updatedServiceProvider =
			await ServiceProviderRegModel.findByIdAndUpdate(
				userId,
				{
					$set: {
						"metadata.whatsapp.businessId": businessId,
						"metadata.whatsapp.phoneNumberId": phoneNumberId,
						"metadata.whatsapp.wabaId": wabaId,
						"metadata.whatsapp.isConnected": true,
						"metadata.whatsapp.onboardedAt": new Date(),
					},
				},
				{ new: true },
			);
		return {
			success: true,
			data: updatedServiceProvider,
		};
	} catch (error) {
		// console.error("Error storing whatsapp data in database", error);
		logger.error("Error storing whatsapp data in database", error);
		return {
			success: false,
		};
	}
}

async function addSystemUserToWABA(waba_id: string) {
	try {
		// Add System Users to a WhatsApp Business Account
		const baseUrl = `${WHATSAPP_API_URL}/${waba_id}/assigned_users`;
		const params = new URLSearchParams({
			user: process.env.WHATSAPP_SYSTEM_USER_ID as string,
			tasks: '["MANAGE"]',
			access_token: process.env.WHATSAPP_SYSTEM_USER_TOKEN as string,
		});
		const url = `${baseUrl}?${params.toString()}`;
		const result = await fetch(url, {
			method: "POST",
		});
		if (result.ok) {
			return {
				success: true,
			};
		}
		const resultJson = await result.json();
		logger.info("Result JSON for adding system user to WABA", resultJson);
		// console.log("Result JSON", resultJson);
		return {
			success: false,
		};
	} catch (error) {
		logger.error("Error adding system user to WABA", error);
		return {
			success: false,
		};
	}
}

async function registerCustomerCloudAPI(phoneNumberId: string) {
	try {
		const payload = {
			messaging_product: "whatsapp",
			certificate: "cert",
			pin: "000000",
		};
		const response = await fetch(
			`${WHATSAPP_API_URL}/${phoneNumberId}/register`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN as string}`,
				},
				body: JSON.stringify(payload),
			},
		);

		const resultJson = await response.json();
		logger.info("Result JSON for registering customer cloud API", resultJson);
		if (response.ok) {
			return {
				success: true,
			};
		}

		return {
			success: false,
		};
	} catch (error) {
		// console.error("Error registering customer cloud API", error);
		logger.error("Error registering customer cloud API", error);
		return {
			success: false,
		};
	}
}

async function createWhatsappTemplate(
	wabaId: string,
	templateName: string,
	components: any,
) {
	try {
		const response = await fetch(
			`${WHATSAPP_API_URL}/${wabaId}/message_templates`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN as string}`,
				},
				body: JSON.stringify({
					name: templateName,
					language: "en_US",
					category: "MARKETING",
					// parameter_format: "NAMED",
					// parameter_format: "POSITIONAL",
					components: components,
				}),
			},
		);
		const resultJson = await response.json();
		logger.info("Result JSON for creating whatsapp template", resultJson);
		if (response.ok) {
			return {
				success: true,
				data: resultJson,
			};
		}
		// console.log("Result JSON for template creation", resultJson);
		return {
			success: false,
		};
	} catch (error) {
		logger.error("Error creating whatsapp template", error);
		// console.error("Error creating whatsapp template", error);
		return {
			success: false,
		};
	}
}

async function subscribeWabaToWebhooks(wabaId: string) {
	try {
		const response = await fetch(
			`${WHATSAPP_API_URL}/${wabaId}/subscribed_apps?access_token=${process.env.WHATSAPP_SYSTEM_USER_TOKEN as string}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN as string}`,
				},
			},
		);
		const resultJson = await response.json();
		logger.info("Result JSON for subscribing WABA to webhooks", resultJson);
		if (response.ok) {
			return {
				success: true,
				data: resultJson,
			};
		}
		// console.log("Result JSON for subscribing WABA to webhooks", resultJson);
		return {
			success: false,
		};
	} catch (error) {
		logger.error("Error subscribing WABA to webhooks", error);
		// console.error("Error subscribing WABA to webhooks", error);
		return {
			success: false,
		};
	}
}
