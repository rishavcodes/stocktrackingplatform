import { type Job, Worker } from "bullmq";
import { connection } from "../config/redisConnection";
import { sendWhatsappMessage } from "../controllers/WhatsappController";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import type { WhatsappMessageJob } from "../queues/WhatsappMessageQueue";

/**
 * WhatsApp Message Worker
 * Processes WhatsApp message jobs from the queue with acknowledgment-based processing
 * Implements retry logic and error handling for reliable message delivery
 */
export function whatsappMessageWorker() {
	const whatsappMessageWorker = new Worker(
		"whatsapp-message-queue",
		async (job: Job<WhatsappMessageJob>) => {
			const {
				phoneNumber,
				message,
				name,
				templateName,
				templateParams,
				subscriberId,
				planId,
				scorecardId,
				authorId,
			} = job.data;

			try {
				console.log(
					`Processing WhatsApp message job for subscriber ${subscriberId}`,
				);

				// Get the service provider's WhatsApp configuration
				const serviceProvider =
					await ServiceProviderRegModel.findById(authorId);
				if (!serviceProvider) {
					throw new Error(`Service provider not found: ${authorId}`);
				}

				if (!serviceProvider.metadata?.whatsapp?.isConnected) {
					throw new Error(
						`WhatsApp not connected for service provider: ${authorId}`,
					);
				}

				const phoneNumberId = serviceProvider.metadata.whatsapp.phoneNumberId;
				if (!phoneNumberId) {
					throw new Error(
						`WhatsApp phone number ID not found for service provider: ${authorId}`,
					);
				}

				// Validate subscriber exists
				const subscriber = await UserModel.findById(subscriberId);
				if (!subscriber) {
					throw new Error(`Subscriber not found: ${subscriberId}`);
				}

				// Validate phone number format (should include country code)
				if (!phoneNumber || phoneNumber.length < 10) {
					throw new Error(`Invalid phone number format: ${phoneNumber}`);
				}

				// Send the WhatsApp message
				const result = await sendWhatsappMessage(
					phoneNumber,
					name,
					message,
					phoneNumberId,
					templateName,
					templateParams,
				);

				if (!result.success) {
					throw new Error(`WhatsApp API error: ${result.error}`);
				}

				// Log successful delivery
				console.log(`WhatsApp message sent successfully:`, {
					subscriberId,
					phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, "*"), // Mask phone number for privacy
					messageId: result.messageId,
					planId,
					scorecardId,
				});

				// Return job result for monitoring
				return {
					success: true,
					messageId: result.messageId,
					subscriberId,
					timestamp: new Date().toISOString(),
				};
			} catch (error) {
				console.error(
					`WhatsApp message job failed for subscriber ${subscriberId}:`,
					error,
				);

				// Log the error with context for debugging
				const errorDetails = {
					subscriberId,
					planId,
					scorecardId,
					authorId,
					error: error instanceof Error ? error.message : "Unknown error",
					attempt: job.attemptsMade,
					maxAttempts: job.opts?.attempts || 1,
				};

				console.error("WhatsApp job error details:", errorDetails);

				// Re-throw error to trigger retry mechanism
				throw error;
			}
		},
		{
			connection,
			// Worker configuration for optimal performance
			concurrency: 5, // Process up to 5 jobs simultaneously
			// Rate limiting to respect WhatsApp API limits
			limiter: {
				max: 100, // Maximum 100 jobs
				duration: 60000, // Per minute (60 seconds)
			},
			// Retry configuration
			maxStalledCount: 3, // Maximum number of stalled jobs before they are considered failed
			stalledInterval: 30000, // Check for stalled jobs every 30 seconds
		},
	);
	return whatsappMessageWorker;
}
